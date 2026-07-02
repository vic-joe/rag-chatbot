"""
app/services/dense_retriever.py
--------------------------------
Dense (vector) retrieval using pgvector cosine similarity.

Returns the top-N chunks ranked by embedding cosine distance.
Each result is a plain dict so it is easy to pass across service boundaries
without importing LangChain types.
"""

from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session, joinedload

from app.db.models import DocumentChunk
from app.services.embedding_service import get_embedding


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
class DenseResult:
    """Lightweight result holder for a single dense-retrieval hit."""

    __slots__ = (
        "chunk_id",
        "document_id",
        "similarity_score",
        "text",
        "metadata",
    )

    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        similarity_score: float,
        text: str,
        metadata: dict[str, Any],
    ) -> None:
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.similarity_score = similarity_score
        self.text = text
        self.metadata = metadata

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "similarity_score": self.similarity_score,
            "text": self.text,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Retriever
# ---------------------------------------------------------------------------
class DenseRetriever:
    """
    Performs approximate-nearest-neighbour search using pgvector.

    The similarity score is **cosine similarity** (1 − cosine_distance),
    so higher = more relevant.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def retrieve(self, query: str, top_k: int = 20) -> list[DenseResult]:
        """
        Embed *query* and return the *top_k* most similar chunks.

        Parameters
        ----------
        query:  raw user query string
        top_k:  maximum number of results to return

        Returns
        -------
        List of DenseResult ordered best → worst (descending similarity).
        """
        if not query or not query.strip():
            return []

        query_embedding = get_embedding(query, self.db)

        # cosine_distance ∈ [0, 2]; smaller = more similar
        rows = (
            self.db.query(
                DocumentChunk,
                DocumentChunk.embedding.cosine_distance(query_embedding).label("dist"),
            )
            .options(joinedload(DocumentChunk.document))
            .order_by("dist")
            .limit(top_k)
            .all()
        )

        results: list[DenseResult] = []
        for chunk, dist in rows:
            chunk_id = str(chunk.id)
            doc_filename = chunk.document.filename if chunk.document and chunk.document.filename else "database"
            doc_id = str(chunk.document_id)
            
            results.append(
                DenseResult(
                    chunk_id=chunk_id,
                    document_id=doc_id,
                    # convert distance → similarity: sim = 1 - dist/2
                    similarity_score=round(1.0 - float(dist) / 2.0, 6),
                    text=chunk.chunk_text,
                    metadata={
                        "source": doc_filename,
                        "chunk_index": chunk.chunk_index,
                    },
                )
            )

        return results
