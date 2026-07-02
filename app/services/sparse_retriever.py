"""
app/services/sparse_retriever.py
----------------------------------
Sparse (keyword) retrieval using PostgreSQL Full-Text Search.

Uses:
  - tsvector column  (pre-computed by DB trigger on every INSERT/UPDATE)
  - websearch_to_tsquery()  for natural query parsing (handles AND, OR, quotes)
  - ts_rank_cd()  for BM25-style positional scoring

The GIN index on fts_vector means this is fast even on large tables.
"""

from __future__ import annotations

import logging
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
class SparseResult:
    """Lightweight result holder for a single FTS hit."""

    __slots__ = (
        "chunk_id",
        "document_id",
        "fts_score",
        "text",
        "metadata",
    )

    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        fts_score: float,
        text: str,
        metadata: dict[str, Any],
    ) -> None:
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.fts_score = fts_score
        self.text = text
        self.metadata = metadata

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "fts_score": self.fts_score,
            "text": self.text,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------
_FTS_QUERY = text(
    """
    SELECT
        dc.id::text                           AS chunk_id,
        d.id::text                            AS document_id,
        d.filename                            AS source,
        dc.chunk_text                         AS text,
        dc.chunk_index                        AS chunk_index,
        ts_rank_cd(dc.tsv, tsq, 32)           AS fts_score
    FROM
        document_chunks dc
    JOIN
        documents d ON d.id = dc.document_id,
        websearch_to_tsquery('english', :query) AS tsq
    WHERE
        dc.tsv @@ tsq
    ORDER BY
        fts_score DESC
    LIMIT :top_k
    """
)


# ---------------------------------------------------------------------------
# Retriever
# ---------------------------------------------------------------------------
class SparseRetriever:
    """
    Keyword retrieval via PostgreSQL FTS.

    ``websearch_to_tsquery`` supports:
      - plain terms           → all terms must match
      - quoted phrases        → "exact phrase"
      - OR operator           → term1 OR term2
      - negation              → -term

    ``ts_rank_cd`` uses cover-density ranking which rewards
    proximity of matching terms (closer to BM25 than plain ts_rank).
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def retrieve(self, query: str, top_k: int = 20) -> list[SparseResult]:
        """
        Run FTS and return the *top_k* best-matching chunks.

        Returns an empty list (never raises) when:
          - the query is blank / produces no tsquery tokens
          - the FTS index finds no matches
          - any DB error occurs (logged as WARNING)
        """
        if not query or not query.strip():
            return []

        try:
            rows = self.db.execute(
                _FTS_QUERY,
                {"query": query.strip(), "top_k": top_k},
            ).fetchall()
        except Exception as exc:
            # Graceful degradation: FTS failure never kills the pipeline
            logger.warning("SparseRetriever FTS query failed: %s", exc)
            return []

        results: list[SparseResult] = []
        for row in rows:
            chunk_id = str(row.chunk_id)
            results.append(
                SparseResult(
                    chunk_id=chunk_id,
                    document_id=str(row.document_id),
                    fts_score=round(float(row.fts_score), 6),
                    text=row.text,
                    metadata={
                        "source": row.source or "database",
                        "chunk_index": row.chunk_index,
                    },
                )
            )

        return results
