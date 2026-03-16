from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from ..database import get_db
from ..models import Message, OwnerToken
from ..schemas import MessageOut
import uuid

router = APIRouter()

@router.get("/messages/{chat_id}", response_model=List[MessageOut])
async def get_messages(
    chat_id: uuid.UUID,
    owner_token: Optional[str] = Header(None, alias="X-Owner-Token"),
    db: AsyncSession = Depends(get_db)
):
    if not owner_token:
        raise HTTPException(status_code=403, detail="Owner token required")
    try:
        token_uuid = uuid.UUID(owner_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token format")

    result = await db.execute(
        select(OwnerToken).where(
            OwnerToken.token == token_uuid,
            OwnerToken.chat_id == chat_id
        )
    )
    token_record = result.scalar_one_or_none()
    if not token_record:
        raise HTTPException(status_code=403, detail="Invalid or expired owner token")

    msgs = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.timestamp.asc())
    )
    return msgs.scalars().all()


# NEW: get just the last message for preview
@router.get("/preview/{chat_id}", response_model=Optional[MessageOut])
async def get_preview(
    chat_id: uuid.UUID,
    owner_token: Optional[str] = Header(None, alias="X-Owner-Token"),
    db: AsyncSession = Depends(get_db)
):
    if not owner_token:
        raise HTTPException(status_code=403, detail="Owner token required")
    try:
        token_uuid = uuid.UUID(owner_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token format")

    result = await db.execute(
        select(OwnerToken).where(
            OwnerToken.token == token_uuid,
            OwnerToken.chat_id == chat_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Invalid token")

    msg = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(desc(Message.timestamp))
        .limit(1)
    )
    return msg.scalar_one_or_none()