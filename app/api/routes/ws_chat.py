from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import Dict, List

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


def load_chat_history(
    db: Session,
    user_id: int,
    session_id: int,
    limit: int = 12,
) -> List[Dict[str, str]]:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .first()
    )

    if not session:
        return []

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.desc())
        .limit(limit)
        .all()
    )

    return [
        {"role": message.role, "content": message.content}
        for message in reversed(messages)
    ]


def normalize_payload_history(history: object, limit: int = 12) -> List[Dict[str, str]]:
    if not isinstance(history, list):
        return []

    normalized = []

    for item in history[-limit:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = str(item.get("content", "")).strip()

        if role in {"user", "assistant"} and content:
            normalized.append({"role": role, "content": content})

    return normalized


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
            chat_history = normalize_payload_history(payload.get("history"))

            if session_id:
                db = SessionLocal()
                try:
                    chat_history = load_chat_history(db, int(user_id), int(session_id))
                except (TypeError, ValueError):
                    chat_history = []
                finally:
                    db.close()

            async for token in rag_pipeline.stream(message, chat_history=chat_history):
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
