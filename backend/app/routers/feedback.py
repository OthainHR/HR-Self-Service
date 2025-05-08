from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Any

from app.models.feedback import FeedbackPayload
from app.utils.supabase_chat_utils import db_add_message_feedback
from app.utils.auth_utils import get_current_supabase_user # Import the Supabase user getter

router = APIRouter()

@router.post("/", status_code=201)
async def record_message_feedback_route(
    payload: FeedbackPayload,
    current_user: dict = Depends(get_current_supabase_user) # Use the Supabase user dependency
) -> Any:
    """
    Records feedback (thumbs up/down) for a specific message.
    The user is authenticated via a Supabase JWT token.
    """
    user_id = current_user.get("id")
    if not user_id:
        # This case should ideally be caught by get_current_supabase_user raising an HTTPException
        # but as a safeguard:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not identify user from token."
        )

    feedback_entry = db_add_message_feedback(
        user_id=user_id,
        feedback_data=payload
    )

    if not feedback_entry:
        raise HTTPException(
            status_code=500, 
            detail="Failed to record feedback in the database."
        )
    
    return {"status": "success", "feedback_id": feedback_entry.get("id")} 