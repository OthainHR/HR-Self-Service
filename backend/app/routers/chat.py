from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.chat import ChatRequest, ChatResponse, ChatSession
from app.services import chat_service
from app.utils.auth_utils import get_current_active_user
from typing import List
from pydantic import BaseModel

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
async def chat(request: ChatRequest, current_user = Depends(get_current_active_user)):
    """
    Process a chat message and get a response.
    
    The chat message is processed through the OpenAI API with relevant context
    from the knowledge base.
    """
    # Add user ID from the token
    request.user_id = current_user.username
    
    # Process the chat request
    response = chat_service.process_chat_request(request)
    
    return response

@router.get("/sessions")
async def get_sessions(current_user = Depends(get_current_active_user)):
    """
    Get all chat sessions for the current user.
    """
    # Get all sessions for the user
    user_sessions = []
    for session_id, session in chat_service.chat_sessions.items():
        if session.user_id == current_user.username:
            # Format session data
            user_sessions.append({
                "id": session.id,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "message_count": len(session.messages)
            })
    
    return {"sessions": user_sessions}

@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user = Depends(get_current_active_user)):
    """
    Get a specific chat session.
    """
    # Check if session exists
    if session_id not in chat_service.chat_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session
    session = chat_service.chat_sessions[session_id]
    
    # Check if user has access to session
    if session.user_id != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this session"
        )
    
    # Format session data
    session_data = {
        "id": session.id,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp
            } for msg in session.messages
        ]
    }
    
    return session_data

@router.post("/sessions", response_model=ChatSession)
async def create_chat_session(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new chat session."""
    session = chat_service.create_session(db, current_user.username)
    return session

@router.post("/sessions/{session_id}/messages", response_model=dict)
async def send_message(
    session_id: str,
    message: SessionMessageRequest,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a message to a specific chat session."""
    # Check if session exists
    if session_id not in chat_service.chat_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session
    session = chat_service.chat_sessions[session_id]
    
    # Check if user has access to session
    if session.user_id != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this session"
        )
    
    # Add user message to session
    user_message = chat_service.add_message_to_session(session, "user", message.content)
    
    # Process message and get AI response
    request = ChatRequest(
        message=message.content,
        session_id=session_id,
        user_id=current_user.username
    )
    
    response = chat_service.process_chat_request(request)
    
    # Return user and assistant messages
    return {
        "message": {
            "id": str(len(session.messages)),
            "role": "assistant",
            "content": response.message,
            "timestamp": session.messages[-1].timestamp
        }
    }

@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user = Depends(get_current_active_user)
):
    """Get messages for a specific chat session."""
    # Check if session exists
    if session_id not in chat_service.chat_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session
    session = chat_service.chat_sessions[session_id]
    
    # Check if user has access to session
    if session.user_id != current_user.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this session"
        )
    
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
