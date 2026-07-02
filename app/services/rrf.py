"""
app/services/rrf.py
--------------------
Reciprocal Rank Fusion (RRF) implementation.

Formula
-------
    score(d) = Σ  1 / (k + rank(d, r))
               r ∈ retrievers

where rank is 1-based (rank 1 = best result).

References
----------
Cormack, Clarke & Buettcher (2009) — "Reciprocal Rank Fusion outperforms
Condorcet and individual Rank Learning Methods."
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from app.services.dense_retriever import DenseResult
from app.services.sparse_retriever import SparseResult


# ---------------------------------------------------------------------------
# Output type
# ---------------------------------------------------------------------------
@dataclass
class RRFResult:
    chunk_id: str
    document_id: str
    rrf_score: float
    dense_rank: int | None          # 1-based; None if not in dense results
    sparse_rank: int | None         # 1-based; None if not in sparse results
    retrieval_sources: list[Literal["dense", "sparse"]]
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "rrf_score": round(self.rrf_score, 6),
            "dense_rank": self.dense_rank,
            "sparse_rank": self.sparse_rank,
            "retrieval_sources": self.retrieval_sources,
            "text": self.text,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# RRF engine
# ---------------------------------------------------------------------------
class ReciprocalRankFusion:
    """
    Fuses dense and sparse ranked lists into a single merged ranking.

    Parameters
    ----------
    k : int
        RRF smoothing constant (default 60, per original paper).
        Higher values reduce the influence of top-ranked documents.
    """

    def __init__(self, k: int = 60) -> None:
        self.k = k

    # ------------------------------------------------------------------
    def fuse(
        self,
        dense_results: list[DenseResult],
        sparse_results: list[SparseResult],
        k: int | None = None,
    ) -> list[RRFResult]:
        """
        Merge dense and sparse ranked lists using RRF.

        Parameters
        ----------
        dense_results :  ordered list from DenseRetriever (index 0 = rank 1)
        sparse_results : ordered list from SparseRetriever (index 0 = rank 1)
        k :              override the instance-level k if provided

        Returns
        -------
        List of RRFResult sorted descending by rrf_score.
        Tie-breaking is deterministic: secondary sort on chunk_id (lexicographic).
        """
        rrf_k = k if k is not None else self.k

        # chunk_id → accumulator dict
        acc: dict[str, dict[str, Any]] = {}

        def _ensure(chunk_id: str, text: str, doc_id: str, meta: dict) -> None:
            if chunk_id not in acc:
                acc[chunk_id] = {
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "rrf_score": 0.0,
                    "dense_rank": None,
                    "sparse_rank": None,
                    "retrieval_sources": [],
                    "text": text,
                    "metadata": meta,
                }

        # ── Dense pass ──────────────────────────────────────────────────────
        for rank_0, result in enumerate(dense_results):
            rank = rank_0 + 1  # 1-based
            cid = result.chunk_id
            _ensure(cid, result.text, result.document_id, result.metadata)
            acc[cid]["rrf_score"] += 1.0 / (rrf_k + rank)
            acc[cid]["dense_rank"] = rank
            if "dense" not in acc[cid]["retrieval_sources"]:
                acc[cid]["retrieval_sources"].append("dense")

        # ── Sparse pass ─────────────────────────────────────────────────────
        for rank_0, result in enumerate(sparse_results):
            rank = rank_0 + 1  # 1-based
            cid = result.chunk_id
            _ensure(cid, result.text, result.document_id, result.metadata)
            acc[cid]["rrf_score"] += 1.0 / (rrf_k + rank)
            acc[cid]["sparse_rank"] = rank
            if "sparse" not in acc[cid]["retrieval_sources"]:
                acc[cid]["retrieval_sources"].append("sparse")

        # ── Sort: descending rrf_score, then ascending chunk_id (deterministic)
        merged = sorted(
            acc.values(),
            key=lambda x: (-x["rrf_score"], x["chunk_id"]),
        )

        return [
            RRFResult(
                chunk_id=item["chunk_id"],
                document_id=item["document_id"],
                rrf_score=item["rrf_score"],
                dense_rank=item["dense_rank"],
                sparse_rank=item["sparse_rank"],
                retrieval_sources=item["retrieval_sources"],
                text=item["text"],
                metadata=item["metadata"],
            )
            for item in merged
        ]
