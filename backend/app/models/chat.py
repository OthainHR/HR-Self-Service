from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = datetime.now()

class ChatSession(BaseModel):
    id: Optional[str] = None
    user_id: str
    messages: List[Message] = []
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str

class ChatResponse(BaseModel):
    message: str
    session_id: str
