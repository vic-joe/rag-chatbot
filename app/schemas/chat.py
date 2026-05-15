from pydantic import BaseModel
from typing import List, Dict, Any


class ChatRequest(BaseModel):
    message: str


class Source(BaseModel):
    content: str
    metadata: Dict[str, Any]


class ChatResponse(BaseModel):
    response: str
    sources: List[Source]