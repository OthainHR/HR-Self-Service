from pydantic import BaseModel
from typing import Optional

class FeedbackPayload(BaseModel):
    message_id: str
    feedback_type: str # "thumbs_up" or "thumbs_down"
    message_content: str
    chat_session_id: Optional[str] = None 