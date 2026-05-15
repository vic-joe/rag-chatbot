from typing import Optional

from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    content: str = Field(..., min_length=1)
    source: Optional[str] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    content: Optional[str] = Field(default=None, min_length=1)
    source: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: str
    chunk_count: int = 1
