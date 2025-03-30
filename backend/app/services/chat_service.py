import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

# Import models
from app.models.chat import ChatSession, Message, ChatRequest, ChatResponse 
# Import OpenAI and vector store utils
from app.utils.openai_utils import get_chat_completion
from app.utils.vector_store import vector_store
# Import Supabase chat utility functions
from app.utils.supabase_chat_utils import (
    db_create_chat_session,
    db_add_chat_message,
    db_get_chat_sessions,
    db_get_chat_messages,
    db_delete_chat_session
)

# REMOVE In-memory storage 
# chat_sessions = {}

def create_session(db, user_id: str) -> Optional[ChatSession]: # db param might be unused now
    """Create a new chat session in Supabase."""
    db_session = db_create_chat_session(user_id)
    if db_session:
        # Map Supabase response to ChatSession Pydantic model
        return ChatSession(
            id=str(db_session['id']), # Ensure ID is string if model expects it
            user_id=db_session['user_id'],
            created_at=datetime.fromisoformat(db_session['created_at']), # Parse timestamp
            updated_at=datetime.fromisoformat(db_session['updated_at']),
            messages=[] # Messages are fetched separately
        )
    return None

# REMOVE get_or_create_session (logic will be handled in process_chat_request)

# REMOVE add_message_to_session (will call db function directly)

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
    """Process a chat request using Supabase for persistence."""
    session_id = request.session_id
    user_id = request.user_id
    message_content = request.message

    # 1. Ensure session exists (or handle creation if session_id is None)
    # Note: Current frontend flow seems to always create first, then send message.
    # If a message could arrive without a session_id, logic to create one here is needed.
    if not session_id:
        # This case might indicate an issue in the frontend flow if it happens
        print("Warning: process_chat_request called without session_id. Attempting to create.")
        new_session = db_create_chat_session(user_id)
        if not new_session:
             raise HTTPException(status_code=500, detail="Failed to create chat session")
        session_id = new_session['id']
        print(f"Created new session {session_id} during chat processing.")
    
    # 2. Add user message to Supabase
    db_add_chat_message(session_id, "user", message_content)
    
    # 3. Get recent messages from Supabase for context
    # We need the user_id to fetch messages because db_get_chat_messages checks ownership
    recent_messages_db = db_get_chat_messages(session_id, user_id)
    if recent_messages_db is None: # Handle case where session doesn't exist or user doesn't own it
        raise HTTPException(status_code=404, detail="Chat session not found or access denied")

    # Map DB messages to Message model if needed, or directly use dicts
    openai_messages = []
    system_message = {
        "role": "system",
        "content": (
            "You are an HR assistant for a company. Answer questions about HR policies, "
            "benefits, leave, payroll, and other HR-related topics based on the provided context. "
            "If you don't know the answer or the information is not in the context, say so politely."
        )
    }
    openai_messages.append(system_message)
    
    # 4. Get relevant context from knowledge base (as before)
    context = get_relevant_context(message_content)
    if context:
        context_message = {"role": "system", "content": context}
        openai_messages.append(context_message)

    # Add recent conversation history (last N messages from DB)
    history_limit = 10 # How many messages to include
    for msg in recent_messages_db[-history_limit:]:
        openai_messages.append({
            "role": msg['role'],
            "content": msg['content']
        })

    # Ensure the user's *current* message is the last one in the list for OpenAI
    if not openai_messages or openai_messages[-1]['content'] != message_content:
         openai_messages.append({"role": "user", "content": message_content}) 
            
    # 5. Get response from OpenAI (as before)
    assistant_response = get_chat_completion(openai_messages)
    
    # 6. Add assistant response to Supabase
    db_add_chat_message(session_id, "assistant", assistant_response)
    
    # 7. Return response
    return ChatResponse(
        message=assistant_response, # Corrected field name
        session_id=session_id
    )

# --- Add Service functions to interact with routers --- 

def get_chat_sessions(db, user_id: str) -> List[Dict[str, Any]]:
    """Service function to get sessions from DB."""
    return db_get_chat_sessions(user_id)
    
def get_session_messages(db, session_id: str, user_id: str) -> Optional[List[Dict[str, Any]]]:
    """Service function to get messages from DB."""
    return db_get_chat_messages(session_id, user_id)
    
def delete_session(db, session_id: str, user_id: str) -> bool:
    """Service function to delete a session from DB."""
    return db_delete_chat_session(session_id, user_id)
