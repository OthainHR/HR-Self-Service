from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from typing import Any

# Comment out imports that might cause issues during startup temporarily
from app.models.feedback import FeedbackPayload
from app.utils.supabase_chat_utils import db_add_message_feedback
from app.utils.auth_utils import get_current_supabase_user

router = APIRouter()

# Simplified endpoint for testing registration
# @router.post("/", status_code=200)
# async def record_message_feedback_route_test(request: Request) -> Any:
#     """
#     TEST Endpoint: Simplified to check if the route registers.
#     Just logs the request body and returns success.
#     """
#     print("--- DEBUG: /api/v1/feedback route hit! ---")
#     try:
#         body = await request.json()
#         print(f"Request Body: {body}")
#     except Exception as e:
#         print(f"Error reading request body: {e}")
#     return {"status": "success - test endpoint reached"}

# Original endpoint commented out for now
@router.post("/", status_code=201)
async def record_message_feedback_route(
    payload: FeedbackPayload,
    current_user: dict = Depends(get_current_supabase_user) # Use the Supabase user dependency
) -> Any:
    """
    Records feedback (thumbs up/down) for a specific message.
    The user is authenticated via a Supabase JWT token.
    """
    print("--- INFO: Original /api/v1/feedback route hit! ---")
    user_id = current_user.get("id")
    if not user_id:
        # This case should ideally be caught by get_current_supabase_user raising an HTTPException
        # but as a safeguard:
        print("--- ERROR: User ID not found in current_user ---")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not identify user from token."
        )

    print(f"--- INFO: Recording feedback for user_id: {user_id}, message_id: {payload.message_id} ---")
    feedback_entry = db_add_message_feedback(
        user_id=user_id,
        feedback_data=payload
    )

    if not feedback_entry:
        print(f"--- ERROR: Failed to record feedback in DB for message_id: {payload.message_id} ---")
        raise HTTPException(
            status_code=500, 
            detail="Failed to record feedback in the database."
        )
    
    print(f"--- SUCCESS: Feedback recorded with ID: {feedback_entry.get('id')} ---")
    return {"status": "success", "feedback_id": feedback_entry.get("id")} 