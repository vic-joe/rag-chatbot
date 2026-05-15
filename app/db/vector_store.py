from typing import List, Optional, Any, Dict, Iterable, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

from langchain_core.vectorstores import VectorStore
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings


class PGVectorStore(VectorStore):
    def __init__(
        self,
        connection_string: str,
        embedding: OpenAIEmbeddings,
        table_name: str = "documents",
    ):
        self.connection_string = connection_string
        self.embedding = embedding
        self.table_name = table_name

    # -----------------------------
    # DB CONNECTION
    # -----------------------------
    def _get_conn(self):
        return psycopg2.connect(self.connection_string)

    # -----------------------------
    # ADD TEXTS
    # -----------------------------
    def add_texts(
        self,
        texts: Iterable[str],
        metadatas: Optional[List[Dict]] = None,
        **kwargs: Any,
    ) -> List[str]:

        texts = list(texts)
        metadatas = metadatas or [{}] * len(texts)

        embeddings = self.embedding.embed_documents(texts)

        rows = [
            (text, embedding, metadata)
            for text, embedding, metadata in zip(texts, embeddings, metadatas)
        ]

        conn = self._get_conn()
        cur = conn.cursor()

        query = f"""
        INSERT INTO {self.table_name} (content, embedding, metadata)
        VALUES %s
        RETURNING id;
        """

        execute_values(cur, query, rows)

        ids = [str(row[0]) for row in cur.fetchall()]

        conn.commit()
        cur.close()
        conn.close()

        return ids

    # -----------------------------
    # SIMILARITY SEARCH
    # -----------------------------
    def similarity_search(
        self,
        query: str,
        k: int = 4,
        **kwargs: Any,
    ) -> List[Document]:

        query_embedding = self.embedding.embed_query(query)

        conn = self._get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        sql = f"""
        SELECT content, metadata
        FROM {self.table_name}
        ORDER BY embedding <-> %s
        LIMIT %s;
        """

        cur.execute(sql, (query_embedding, k))
        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [
            Document(
                page_content=row["content"],
                metadata=row["metadata"] or {}
            )
            for row in rows
        ]

    # -----------------------------
    # SIMILARITY SEARCH WITH SCORE
    # -----------------------------
    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        **kwargs: Any,
    ) -> List[Tuple[Document, float]]:

        query_embedding = self.embedding.embed_query(query)

        conn = self._get_conn()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        sql = f"""
        SELECT content, metadata,
               embedding <-> %s AS distance
        FROM {self.table_name}
        ORDER BY embedding <-> %s
        LIMIT %s;
        """

        cur.execute(sql, (query_embedding, query_embedding, k))
        rows = cur.fetchall()

        cur.close()
        conn.close()

        return [
            (
                Document(
                    page_content=row["content"],
                    metadata=row["metadata"] or {}
                ),
                float(row["distance"])
            )
            for row in rows
        ]

    # -----------------------------
    # CLASSMETHOD: FROM TEXTS
    # -----------------------------
    @classmethod
    def from_texts(
        cls,
        texts: List[str],
        embedding: OpenAIEmbeddings,
        metadatas: Optional[List[Dict]] = None,
        connection_string: Optional[str] = None,
        table_name: str = "documents",
        **kwargs: Any,
    ) -> "PGVectorStore":

        store = cls(
            connection_string=connection_string,
            embedding=embedding,
            table_name=table_name,
        )

        store.add_texts(texts, metadatas)

        return store

    # -----------------------------
    # CLASSMETHOD: FROM DOCUMENTS
    # -----------------------------
    @classmethod
    def from_documents(
        cls,
        documents: List[Document],
        embedding: OpenAIEmbeddings,
        connection_string: Optional[str] = None,
        table_name: str = "documents",
        **kwargs: Any,
    ) -> "PGVectorStore":

        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]

        return cls.from_texts(
            texts=texts,
            embedding=embedding,
            metadatas=metadatas,
            connection_string=connection_string,
            table_name=table_name,
        )

    # -----------------------------
    # REQUIRED (SAFE DEFAULT)
    # -----------------------------
    def as_retriever(self, **kwargs: Any):
        return super().as_retriever(**kwargs)