from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.history import ChatSessionCreate, ChatSessionDetail, ChatSessionResponse
from app.services.rag_pipeline import RAGPipeline
from app.api.deps import get_rag_pipeline
from app.db.models import ChatSession, User
from app.db.session import get_db

router = APIRouter()


def get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_session_or_404(user_id: int, session_id: int, db: Session) -> ChatSession:
    session = (
        db.query(ChatSession)
        .options(selectinload(ChatSession.messages))
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session


@router.get("/users/{user_id}/sessions", response_model=list[ChatSessionResponse])
def list_chat_sessions(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(user_id, db)
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
        .all()
    )


@router.post("/users/{user_id}/sessions", response_model=ChatSessionResponse, status_code=201)
def create_chat_session(
    user_id: int,
    payload: ChatSessionCreate,
    db: Session = Depends(get_db),
):
    get_user_or_404(user_id, db)
    title = payload.title.strip() or "New chat"
    session = ChatSession(user_id=user_id, title=title[:80])
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/users/{user_id}/sessions/{session_id}", response_model=ChatSessionDetail)
def read_chat_session(user_id: int, session_id: int, db: Session = Depends(get_db)):
    return get_session_or_404(user_id, session_id, db)


@router.delete("/users/{user_id}/sessions/{session_id}")
def delete_chat_session(user_id: int, session_id: int, db: Session = Depends(get_db)):
    session = get_session_or_404(user_id, session_id, db)
    db.delete(session)
    db.commit()
    return {"message": "Chat deleted successfully", "id": session_id}


# ---------------------------------------
# 1. Standard Chat Endpoint (IMPROVED)
# ---------------------------------------
@router.post("/", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    debug: bool = Query(False, description="Enable debug mode"),
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline)
):
    """
    Chat endpoint for RAG system:
    - Normal mode → clean response
    - Debug mode → includes retrieval insights
    """

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # ✅ Debug Mode
        if debug:
            result = rag_pipeline.run_debug(request.message)

            return {
                "response": result["answer"],
                "sources": [],
                "debug": result["debug"]
            }

        # ✅ Normal Mode
        result = rag_pipeline.run(request.message)

        return ChatResponse(
            response=result["answer"],
            sources=result["sources"]
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Chat processing failed",
                "message": str(e)
            }
        )


# ---------------------------------------
# 2. Streaming Chat Endpoint (NEW)
# ---------------------------------------
@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline)
):
    """
    Streaming endpoint for real-time chat (used by frontend/WebSocket alternative)
    """

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    async def event_generator():
        try:
            async for token in rag_pipeline.stream(request.message):
                yield token
        except Exception as e:
            yield f"[ERROR]: {str(e)}"

    return StreamingResponse(event_generator(), media_type="text/plain")
