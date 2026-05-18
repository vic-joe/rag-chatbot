from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None


class Source(BaseModel):
    content: str
    metadata: Dict[str, Any]


class ChatResponse(BaseModel):
    response: str
    sources: List[Source]
