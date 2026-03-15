from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User, Chat, OwnerToken
from ..schemas import CreateChatResponse, ChatInfo, JoinSessionResponse
from ..models import Session as ChatSession
import os, uuid

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.post("/create_chat", response_model=CreateChatResponse)
async def create_chat(db: AsyncSession = Depends(get_db)):
    # 1. Create anonymous owner user
    user = User()
    db.add(user)
    await db.flush()

    # 2. Create the chat room
    chat = Chat(owner_id=user.user_id)
    db.add(chat)
    await db.flush()

    # 3. Generate owner token
    token = OwnerToken(chat_id=chat.chat_id, owner_id=user.user_id)
    db.add(token)
    await db.flush()

    shareable_link = f"{FRONTEND_URL}/chat/{chat.chat_id}"

    return CreateChatResponse(
        chat_id=chat.chat_id,
        owner_token=token.token,
        shareable_link=shareable_link
    )

@router.get("/chat/{chat_id}", response_model=ChatInfo)
async def get_chat(chat_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Chat).where(Chat.chat_id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@router.post("/join/{chat_id}", response_model=JoinSessionResponse)
async def join_chat(chat_id: uuid.UUID, nickname: str = "Guest", db: AsyncSession = Depends(get_db)):
    # Verify chat exists
    result = await db.execute(select(Chat).where(Chat.chat_id == chat_id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # Create a session for this guest
    session = ChatSession(chat_id=chat_id, nickname=nickname[:50])
    db.add(session)
    await db.flush()

    return JoinSessionResponse(
        session_id=session.session_id,
        chat_id=chat_id,
        nickname=session.nickname
    )