import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.models.chat import ChatSession, Message, ChatRequest, ChatResponse
from app.utils.openai_utils import get_chat_completion
from app.utils.vector_store import vector_store

# In-memory storage for chat sessions (in a real app, use a database)
chat_sessions = {}

def create_session(db, user_id: str) -> ChatSession:
    """Create a new chat session."""
    # Create new session with a valid ID
    try:
        new_session = ChatSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Store session
        chat_sessions[new_session.id] = new_session
        
        # Return a copy to avoid reference issues
        return ChatSession(
            id=new_session.id,
            user_id=new_session.user_id,
            messages=[],
            created_at=new_session.created_at,
            updated_at=new_session.updated_at
        )
    except Exception as e:
        print(f"Error creating session: {e}")
        # Return a fallback session if there's an error
        fallback_id = str(uuid.uuid4())
        return ChatSession(
            id=fallback_id,
            user_id=user_id,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

def get_or_create_session(session_id: Optional[str], user_id: str) -> ChatSession:
    """Get or create a chat session."""
    if session_id and session_id in chat_sessions:
        return chat_sessions[session_id]
    
    # Create new session
    return create_session(None, user_id)

def add_message_to_session(session: ChatSession, role: str, content: str) -> Message:
    """Add a message to a chat session."""
    message = Message(
        role=role,
        content=content,
        timestamp=datetime.now()
    )
    session.messages.append(message)
    session.updated_at = datetime.now()
    return message

def get_relevant_context(query: str, top_k: int = 3) -> str:
    """Get relevant context from the knowledge base."""
    # Search for relevant documents without using embeddings for chat queries
    results = vector_store.search(query, top_k=top_k, is_chat_query=True)
    
    if not results:
        return ""
    
    # Combine results into a context string
    context = "Here is some information that might help answer the question:\n\n"
    for i, result in enumerate(results):
        context += f"Document {i+1}:\n{result['text']}\n\n"
    
    return context

def process_chat_request(request: ChatRequest) -> ChatResponse:
    """Process a chat request."""
    # Get or create session
    session = get_or_create_session(request.session_id, request.user_id)
    
    # Add user message to session
    add_message_to_session(session, "user", request.message)
    
    # Get relevant context from knowledge base
    context = get_relevant_context(request.message)
    
    # Prepare messages for OpenAI
    openai_messages = []
    
    # System message with instructions and context
    system_message = {
        "role": "system",
        "content": (
            "You are an HR assistant for a company. Answer questions about HR policies, "
            "benefits, leave, payroll, and other HR-related topics based on the provided context. "
            "If you don't know the answer or the information is not in the context, say so politely."
        )
    }
    openai_messages.append(system_message)
    
    # Add context if available
    if context:
        context_message = {
            "role": "system",
            "content": context
        }
        openai_messages.append(context_message)
    
    # Add recent conversation history (last 5 messages)
    for msg in session.messages[-10:]:
        openai_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Get response from OpenAI
    assistant_response = get_chat_completion(openai_messages)
    
    # Add assistant response to session
    add_message_to_session(session, "assistant", assistant_response)
    
    # Return response
    return ChatResponse(
        message=assistant_response,
        session_id=session.id
    )
