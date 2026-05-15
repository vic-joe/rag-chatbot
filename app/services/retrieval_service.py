from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector

from langchain_core.documents import Document

from app.db.models import Document as DBDocument
from app.services.embedding_service import get_embedding


class RetrievalService:
    def __init__(
        self,
        db: Session,
        top_k: int = 5,
    ):
        self.db = db
        self.top_k = top_k

    # ---------------------------------------
    # 1. Embed Query (NEW - REQUIRED)
    # ---------------------------------------
    def embed_query(self, query: str) -> List[float]:
        """
        Converts user query into embedding vector.
        """
        return get_embedding(query)

    # ---------------------------------------
    # 2. Retrieve Documents (CORE FIXED)
    # ---------------------------------------
    def retrieve(self, query: str) -> List[Document]:
        """
        Full retrieval:
        - embed query
        - perform pgvector similarity search
        - return LangChain Documents
        """

        query_embedding = self.embed_query(query)

        results = (
            self.db.query(DBDocument)
            .order_by(DBDocument.embedding.cosine_distance(query_embedding))
            .limit(self.top_k)
            .all()
        )

        documents = [
            Document(
                page_content=doc.content,
                metadata={
                    "id": str(doc.id),
                    "source": getattr(doc, "source", "database"),
                    "chunk_index": getattr(doc, "chunk_index", i),
                }
            )
            for i, doc in enumerate(results)
        ]

        return documents

    # ---------------------------------------
    # 3. Retrieve with Scores (DEBUG FRIENDLY)
    # ---------------------------------------
    def retrieve_with_scores(self, query: str) -> List[Tuple[Document, float]]:
        """
        Returns documents with similarity scores.
        Lower score = more similar (cosine distance).
        """

        query_embedding = self.embed_query(query)

        results = (
            self.db.query(
                DBDocument,
                DBDocument.embedding.cosine_distance(query_embedding).label("score")
            )
            .order_by("score")
            .limit(self.top_k)
            .all()
        )

        output = []

        for i, (doc, score) in enumerate(results):
            document = Document(
                page_content=doc.content,
                metadata={
                    "id": str(doc.id),
                    "source": getattr(doc, "source", "database"),
                    "chunk_index": getattr(doc, "chunk_index", i),
                }
            )

            output.append((document, float(score)))

        return output

    # ---------------------------------------
    # 4. Format Context (UNCHANGED BUT IMPROVED)
    # ---------------------------------------
    def format_context(self, documents: List[Document]) -> str:
        """
        Convert retrieved documents into structured LLM context.
        """

        if not documents:
            return "No relevant context found."

        formatted_chunks = []

        for i, doc in enumerate(documents):
            source = doc.metadata.get("source", "unknown")
            chunk_index = doc.metadata.get("chunk_index", i)

            chunk_text = (
                f"[Source: {source} | Chunk: {chunk_index}]\n"
                f"{doc.page_content.strip()}"
            )

            formatted_chunks.append(chunk_text)

        return "\n\n---\n\n".join(formatted_chunks)

    # ---------------------------------------
    # 5. Full Pipeline (FINAL FIX)
    # ---------------------------------------
    def get_context(self, query: str) -> Dict[str, Any]:
        """
        End-to-end retrieval pipeline:
        """

        docs = self.retrieve(query)
        context = self.format_context(docs)

        return {
            "query": query,
            "documents": docs,
            "context": context
        }
