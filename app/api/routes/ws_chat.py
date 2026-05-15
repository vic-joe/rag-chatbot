from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.api.deps import get_rag_pipeline
from app.db.models import ChatMessage, ChatSession
from app.db.session import SessionLocal
from app.services.rag_pipeline import RAGPipeline

router = APIRouter()


def save_chat_exchange(
    db: Session,
    user_id: int,
    session_id: int,
    user_message: str,
    assistant_message: str,
) -> bool:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )

    if not session:
        return False

    db.add(ChatMessage(session_id=session_id, role="user", content=user_message))
    db.add(ChatMessage(session_id=session_id, role="assistant", content=assistant_message))

    if session.title == "New chat":
        session.title = user_message[:80]

    db.commit()
    return True


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(
    websocket: WebSocket,
    user_id: str,
    rag_pipeline: RAGPipeline = Depends(get_rag_pipeline),
):
    await websocket.accept()

    try:
        while True:
            payload = await websocket.receive_json()
            message = payload.get("message", "").strip()
            session_id = payload.get("session_id")

            if not message:
                await websocket.send_json({
                    "type": "error",
                    "message": "Message cannot be empty",
                })
                continue

            assistant_response = ""

            async for token in rag_pipeline.stream(message):
                assistant_response += token
                await websocket.send_json({
                    "type": "stream",
                    "token": token,
                    "user_id": user_id,
                })

            if session_id:
                db = SessionLocal()
                try:
                    saved = save_chat_exchange(
                        db,
                        int(user_id),
                        int(session_id),
                        message,
                        assistant_response,
                    )
                except (TypeError, ValueError):
                    saved = False
                finally:
                    db.close()

                if not saved:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Unable to save chat history",
                    })
                    continue

            await websocket.send_json({"type": "done", "user_id": user_id})
    except WebSocketDisconnect:
        return
