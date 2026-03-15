from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class CreateChatResponse(BaseModel):
    chat_id: UUID
    owner_token: UUID
    shareable_link: str

class ChatInfo(BaseModel):
    chat_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    message_id: UUID
    sender_name: str
    sender_type: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True

class JoinSessionResponse(BaseModel):
    session_id: UUID
    chat_id: UUID
    nickname: str

class WSMessage(BaseModel):
    type: str             # 'message' | 'typing' | 'join' | 'leave'
    sender_name: str
    content: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: Optional[str] = None