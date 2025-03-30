from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.chat import ChatRequest, ChatResponse, ChatSession
from app.services import chat_service
from app.utils.auth_utils import get_current_supabase_user
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Add this new model for session messages
class SessionMessageRequest(BaseModel):
    content: str

# Add the public chat endpoint
@router.post("/public", response_model=ChatResponse)
async def chat_public(request: ChatRequest):
    """
    Process a chat message and get a response without requiring authentication.
    
    This public endpoint can be used by the frontend when the user is not authenticated.
    It provides the same functionality as the authenticated endpoint but doesn't
    require a JWT token.
    """
    # Process the chat request directly without checking authentication
    try:
        # Validate user ID - use guest ID if not provided
        if not request.user_id:
            request.user_id = f"guest-{request.session_id}"
            
        # Process the request
        response = chat_service.process_chat_request(request)
        return response
    except Exception as e:
        # Log the error
        print(f"Error in chat_public endpoint: {str(e)}")
        
        # Return a friendly error message
        error_response = ChatResponse(
            response="I'm sorry, I encountered an error processing your request. Please try again later."
        )
        return error_response
    
# Add test routes first to ensure they're matched before the authenticated routes
# Get test sessions (no auth)
@router.get("/sessions/test", response_model=dict)
async def get_test_sessions():
    """Get all chat sessions for testing (no authentication)."""
    # Get all sessions
    user_sessions = []
    for session_id, session in chat_service.chat_sessions.items():
        # Format session data
        user_sessions.append({
            "id": session.id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": len(session.messages)
        })
    
    return {"sessions": user_sessions}

# Create test session (no auth)
@router.post("/sessions/test", response_model=ChatSession)
async def create_test_session():
    """Create a new test chat session without requiring authentication."""
    # Use "test-user" as the user ID
    session = chat_service.create_session(None, "test-user")
    return session

# Get test messages (no auth)
@router.get("/sessions/{session_id}/messages/test", response_model=dict)
async def get_test_session_messages(
    session_id: str,
):
    """Get messages for a specific chat session without authentication (for testing)."""
    # Check if session exists
    if session_id not in chat_service.chat_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session
    session = chat_service.chat_sessions[session_id]
    
    # Format messages
    messages = [
        {
            "id": str(i),
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp
        } for i, msg in enumerate(session.messages)
    ]
    
    return {"messages": messages}

# Send test message (no auth)
@router.post("/sessions/{session_id}/messages/test", response_model=dict)
async def send_test_message(
    session_id: str,
    message: SessionMessageRequest,
):
    """Send a message to a session without requiring authentication (for testing)."""
    # Check if session exists
    if session_id not in chat_service.chat_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session
    session = chat_service.chat_sessions[session_id]
    
    # Add user message to session
    user_message = chat_service.add_message_to_session(session, "user", message.content)
    
    # Process message and get AI response
    request = ChatRequest(
        message=message.content,
        session_id=session_id,
        user_id="test-user"
    )
    
    response = chat_service.process_chat_request(request)
    
    # Return user and assistant messages
    return {
        "message": {
            "id": str(len(session.messages) - 1),
            "role": "assistant",
            "content": response.message,
            "timestamp": session.messages[-1].timestamp
        }
    }

# Now for the authenticated routes
@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, 
             current_user: dict = Depends(get_current_supabase_user)):
    """Process a chat message using the updated service."""
    request.user_id = current_user.get('id') 
    # Call the main processing function which now uses Supabase
    response = chat_service.process_chat_request(request)
    return response

@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_supabase_user),
                      # db: Session = Depends(get_db) # db likely not needed anymore
                      ):
    """Get all chat sessions for the current user via the service."""
    supabase_user_id = current_user.get('id')
    print(f"Router: Fetching sessions for user ID: {supabase_user_id}")
    # Call the service function
    user_sessions_data = chat_service.get_chat_sessions(None, supabase_user_id) # Pass None for db if unused
    # The service now returns the data directly
    return {"sessions": user_sessions_data}

# GET /sessions/{session_id} - No longer needed if messages are fetched separately
# If needed, implement similarly using chat_service.get_session_details or similar
# @router.get("/sessions/{session_id}") ...

@router.post("/sessions", response_model=ChatSession)
async def create_chat_session(
    current_user: dict = Depends(get_current_supabase_user),
    # db: Session = Depends(get_db) # db likely not needed anymore
):
    """Create a new chat session via the service."""
    supabase_user_id = current_user.get('id')
    # Call the service function
    session = chat_service.create_session(None, supabase_user_id) # Pass None for db if unused
    if not session:
         raise HTTPException(status_code=500, detail="Failed to create chat session")
    return session

@router.post("/sessions/{session_id}/messages", response_model=dict)
async def send_message(
    session_id: str,
    message: SessionMessageRequest,
    current_user: dict = Depends(get_current_supabase_user),
    # db: Session = Depends(get_db) # db likely not needed anymore
):
    """Send a message to a specific chat session via the service."""
    supabase_user_id = current_user.get('id') 
    # Construct the ChatRequest model expected by the service
    request = ChatRequest(
        message=message.content,
        session_id=session_id,
        user_id=supabase_user_id 
    )
    # Call the main processing function
    response = chat_service.process_chat_request(request)
    
    # The process_chat_request now returns ChatResponse model.
    # We need to adapt the return structure if frontend expects something different.
    # Assuming frontend expects {"message": {<assistant_message_details>}}
    return {
        "message": {
            # ID might not be easily available here, maybe return full response?
            "id": None, # Placeholder 
            "role": "assistant",
            "content": response.message,
            "timestamp": datetime.now().isoformat() # Approximate timestamp
        }
    }

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_supabase_user),
    # db: Session = Depends(get_db) # db likely not needed anymore
):
    """Delete a specific chat session via the service."""
    supabase_user_id = current_user.get('id')
    # Call the service function
    success = chat_service.delete_session(None, session_id, supabase_user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Session not found or permission denied"
        )
    return 

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_supabase_user),
    # db: Session = Depends(get_db) # db likely not needed anymore
):
    """Get messages for a specific chat session via the service."""
    supabase_user_id = current_user.get('id')
    # Call the service function
    messages = chat_service.get_session_messages(None, session_id, supabase_user_id)
    if messages is None: 
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Session not found or permission denied"
        )
        
    # Format messages (already done in service?) - ensure matches frontend
    # Assuming service returns list of dicts ready for frontend
    return {"messages": messages}
