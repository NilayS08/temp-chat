from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json, uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
import os

load_dotenv()

from .database import engine, Base, AsyncSessionLocal
from .models import Message, OwnerToken, Session as ChatSession, Chat
from .routers import chats, messages
from .ws.manager import manager

app = FastAPI(title="TempChat API", version="1.0.0")

# CORS — allow the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chats.router)
app.include_router(messages.router)

@app.on_event("startup")
async def startup():
    # Create tables if they don't exist (for local dev with SQLite)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

# ─── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    await manager.connect(websocket, chat_id)

    # We expect the client to send an "init" message first with their identity
    session_id = None
    sender_name = "Guest"
    is_owner = False

    try:
        async with AsyncSessionLocal() as db:
            # Validate chat exists
            try:
                chat_uuid = uuid.UUID(chat_id)
            except ValueError:
                await websocket.close(code=4000)
                return

            result = await db.execute(select(Chat).where(Chat.chat_id == chat_uuid))
            chat = result.scalar_one_or_none()
            if not chat:
                await websocket.close(code=4004)
                return

        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            async with AsyncSessionLocal() as db:

                # ── Init: client identifies itself ──────────────────────────
                if msg_type == "init":
                    owner_token = data.get("owner_token")
                    nickname = data.get("nickname", "Guest")[:50]

                    if owner_token:
                        # Verify owner token
                        result = await db.execute(
                            select(OwnerToken).where(
                                OwnerToken.token == uuid.UUID(owner_token),
                                OwnerToken.chat_id == uuid.UUID(chat_id)
                            )
                        )
                        tok = result.scalar_one_or_none()
                        if tok:
                            is_owner = True
                            sender_name = "Owner"
                            session_id = str(tok.owner_id)

                    if not is_owner:
                        # Create guest session
                        session = ChatSession(
                            chat_id=uuid.UUID(chat_id),
                            nickname=nickname,
                            active=True
                        )
                        db.add(session)
                        await db.commit()
                        await db.refresh(session)
                        session_id = str(session.session_id)
                        sender_name = nickname

                    # Ack back to this client
                    await manager.send_personal(websocket, {
                        "type": "init_ack",
                        "session_id": session_id,
                        "sender_name": sender_name,
                        "is_owner": is_owner,
                        "user_count": manager.get_user_count(chat_id)
                    })

                    # Broadcast join notification to others
                    await manager.broadcast(chat_id, {
                        "type": "join",
                        "sender_name": sender_name,
                        "content": f"{sender_name} joined the chat",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, exclude=websocket)

                # ── Chat message ────────────────────────────────────────────
                elif msg_type == "message":
                    content = data.get("content", "").strip()
                    if not content or len(content) > 2000:
                        continue

                    # Persist to DB
                    msg = Message(
                        chat_id=uuid.UUID(chat_id),
                        sender_name=sender_name,
                        sender_type="owner" if is_owner else "guest",
                        content=content
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)

                    # Broadcast to all in room (including sender)
                    await manager.broadcast(chat_id, {
                        "type": "message",
                        "message_id": str(msg.message_id),
                        "sender_name": sender_name,
                        "sender_type": "owner" if is_owner else "guest",
                        "content": content,
                        "timestamp": msg.timestamp.isoformat(),
                        "session_id": session_id
                    })

                # ── Typing indicator ────────────────────────────────────────
                elif msg_type == "typing":
                    await manager.broadcast(chat_id, {
                        "type": "typing",
                        "sender_name": sender_name,
                        "is_typing": data.get("is_typing", False)
                    }, exclude=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, chat_id)
        if session_id and not is_owner:
            # Mark guest session inactive
            async with AsyncSessionLocal() as db:
                try:
                    sess_uuid = uuid.UUID(session_id)
                    result = await db.execute(
                        select(ChatSession).where(ChatSession.session_id == sess_uuid)
                    )
                    sess = result.scalar_one_or_none()
                    if sess:
                        sess.active = False
                        await db.commit()
                except Exception:
                    pass

        # Broadcast leave notification
        await manager.broadcast(chat_id, {
            "type": "leave",
            "sender_name": sender_name,
            "content": f"{sender_name} left the chat",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    except Exception as e:
        manager.disconnect(websocket, chat_id)