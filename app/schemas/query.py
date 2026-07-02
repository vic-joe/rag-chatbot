"""
app/schemas/query.py
---------------------
Pydantic request / response models for the POST /query and GET /health endpoints.
"""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# POST /query
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="User question")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")


class RetrievedChunk(BaseModel):
    chunk_id: str
    document_id: str
    rrf_score: float
    dense_rank: int | None
    sparse_rank: int | None
    retrieval_sources: list[Literal["dense", "sparse"]]
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SourceItem(BaseModel):
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    retrieved_chunks: list[RetrievedChunk]
    latency_ms: float


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
class IndexStatus(BaseModel):
    vector_index: bool
    fts_index: bool


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "error"]
    database: bool
    indexes: IndexStatus
    detail: str | None = None
