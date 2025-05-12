import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator
from fastapi import HTTPException

# Import Supabase admin client
from app.utils.supabase_client import supabase_admin_client

# Import models
from app.models.chat import ChatSession, ChatRequest, ChatResponse
# Import OpenAI and vector store utils
from app.utils.openai_utils import get_chat_completion, get_chat_completion_stream
from app.utils.vector_store import vector_store
# Import Supabase chat utility functions
from app.utils.supabase_chat_utils import (
    db_create_chat_session, # Keep this if create_session uses it (though create_session seems unused now)
    db_add_chat_message,
    db_get_chat_sessions,
    db_get_chat_messages,
    db_delete_chat_session
)

# ── System prompt & ticket constants ──
SYSTEM_PROMPT = (
    "You are an HR assistant for Othain, branded as \"Othain Self Service.\" "
    "Answer questions about Othain's HR policies, benefits, leave, payroll, and other HR-related topics "
    "based on the provided context. "
    "If you don't know the answer or the information isn't in the context, say so politely and direct the user to contact hr@othainsoft.com. "
    "Always refer to the company as \"Othain\" and never discuss other companies, products, or topics.\n\n"

    "If someone asks about anything outside of HR (for example: hardware issues, software problems, login or account access, "
    "laptop/desktop support, etc.), you should first categorize the issue into one of four ticket types:\n"
    "  • Access Request — for Logins & Accounts or Applications\n"
    "  • Desktop/Laptop Support — for General IT Requests or Hardware & Software Issues\n"
    "  • Get IT Help — for General IT Requests or Hardware & Software Issues\n"
    "  • Request an AI Task — for AI-specific tasks\n\n"
    "After you've classified, respond **exactly** with:\n\n"
    "\"I'm sorry, but I can't help with that—our IT team can assist you right away.\"\n\n"
    "Your application code will then automatically append the \"Create A Ticket\" link in the correct queue based on your classification."
)

APOLOGY_TEXT = "I'm sorry, but I can't help with that—our IT team can assist you right away."
TICKET_LINK_MARKDOWN = "[Create A Ticket](https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1)"

# Keywords and phrases for ticket triggering (Using sets for potentially faster lookups)
TICKET_PHRASES = {"access request", "get it help", "hardware and software"}
TICKET_KEYWORDS = {"access", "desktop", "laptop", "support", "hardware", "software", "login", "account"}


def should_show_ticket_link(message: str) -> bool:
    """Check if the user message contains IT support related keywords or phrases."""
    msg = message.lower()
    if any(phrase in msg for phrase in TICKET_PHRASES):
        return True
    # Check individual keywords only if no multi-word phrase matched
    return any(kw in msg for kw in TICKET_KEYWORDS)


def get_relevant_context(query: str, top_k: int = 3) -> str:
    """Fetch relevant context from vector store."""
    results = vector_store.search(query, top_k=top_k, is_chat_query=True)
    if not results:
        return ""
    context = "Here is some information that might help answer the question:\n\n"
    for i, r in enumerate(results, start=1):
        context += f"Document {i}:\n{r['text']}\n\n"
    return context


def build_openai_messages(session_id: str, user_id: str, user_message: str) -> List[Dict[str, Any]]:
    """Assemble messages for OpenAI, including system prompt, context, history, and user input."""
    messages: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Fetch context from knowledge base
    context = get_relevant_context(user_message)
    if context:
        messages.append({"role": "system", "content": context})
        
    # Fetch recent message history
    history = db_get_chat_messages(session_id, user_id) 
    if history is None:
         # Handle case where session might exist but fetching messages fails or denies access
         # Depending on desired behavior, could raise HTTPException or just proceed without history
         print(f"Warning: Could not retrieve message history for session {session_id}, user {user_id}.")
         history = [] # Proceed without history
    
    # Add last N messages from history
    history_limit = 10 
    for msg in history[-history_limit:]:
        # Ensure only 'role' and 'content' are passed if that's what OpenAI expects
        messages.append({"role": msg['role'], "content": msg['content']})
        
    # Ensure the current user message is the last one, unless history already contains it
    # (Handling potential duplicates if db_get_chat_messages includes the message just added)
    if not messages or messages[-1].get('content') != user_message or messages[-1].get('role') != 'user':
         messages.append({"role": "user", "content": user_message})
         
    return messages


def canned_ticket_response(
    session_id: str, user_email: Optional[str]
) -> str:
    """Log and return the static IT-support apology + ticket link."""
    reply = f"{APOLOGY_TEXT}\n\n{TICKET_LINK_MARKDOWN}"
    db_add_chat_message(session_id, "assistant", reply, user_email=user_email)
    return reply


def process_chat_request(request: ChatRequest, user_email: Optional[str] = None) -> ChatResponse:
    """Processes a non-streaming chat request."""
    session_id = request.session_id
    user_id = request.user_id
    message = request.message.strip()

    # 1. Ensure session exists (handle creation if session_id is None - crucial!)
    if not session_id:
        # If a message arrives without a session_id, we need to create one first.
        # This depends on whether the frontend flow *always* guarantees a session_id exists.
        # Assuming it might not, let's attempt creation or raise error.
        print(f"Warning: process_chat_request called without session_id for user {user_id}. Attempting creation.")
        # Note: db_create_chat_session might not be intended to be called here. 
        # If session creation requires a separate endpoint call first, this is an error state.
        # Let's assume for now we raise an error if no session_id is provided.
        raise HTTPException(status_code=400, detail="Session ID is required for chat requests.")
        # Alternatively, if creating session here is okay:
        # new_session_db = db_create_chat_session(user_id, user_email=user_email)
        # if not new_session_db:
        #     raise HTTPException(status_code=500, detail="Failed to create chat session")
        # session_id = new_session_db['id']
        # print(f"Created new session {session_id} during chat processing.")

    # 2. Log user message
    db_add_chat_message(session_id, "user", message, user_email=user_email)

    # 3. IT-support bypass: static apology + link
    if should_show_ticket_link(message):
        reply = canned_ticket_response(session_id, user_email)
        db_add_chat_message(session_id, "assistant", reply, user_email=user_email) # Log static reply
        return ChatResponse(message=reply, session_id=session_id)

    # 4. Normal OpenAI flow
    openai_messages = build_openai_messages(session_id, user_id, message)
    assistant_response = get_chat_completion(openai_messages)
    
    # 5. Log the unmodified OpenAI response
    db_add_chat_message(session_id, "assistant", assistant_response, user_email=user_email)
    
    # 6. Return response
    return ChatResponse(message=assistant_response, session_id=session_id)


async def process_chat_request_stream(request: ChatRequest, user_email: Optional[str] = None):
    """Processes a streaming chat request."""
    session_id = request.session_id
    user_id = request.user_id
    message = request.message.strip()

    # 1. Ensure session exists (Streaming absolutely needs a session ID)
    if not session_id:
        print(f"Error: Streaming requires an existing session_id for user {user_id}.")
        raise HTTPException(status_code=400, detail="Session ID is required for streaming.")
        
    # Optional: Verify session ownership here if needed, although build_openai_messages will call db_get_chat_messages which does check.

    # 2. Log user message
    db_add_chat_message(session_id, "user", message, user_email=user_email)

    # 3. IT-support bypass: static apology + link
    if should_show_ticket_link(message):
        reply = canned_ticket_response(session_id, user_email)
        db_add_chat_message(session_id, "assistant", reply, user_email=user_email) # Log static reply
        yield reply # Yield the full static reply as a single chunk
        return

    # 4. Streaming LLM flow
    openai_messages = build_openai_messages(session_id, user_id, message)
    full_response = ""
    try:
        async for chunk in get_chat_completion_stream(openai_messages):
            full_response += chunk
            yield chunk
    except Exception as e:
        print(f"Stream Error during OpenAI call for session {session_id}: {e}")
        # Yield an error message chunk to the frontend
        error_msg = f"Sorry, an error occurred while generating the response: {e}"
        yield error_msg
        # Optionally log the error to the DB as an assistant message
        db_add_chat_message(session_id, "assistant", error_msg, user_email=user_email, is_error=True) # Assuming is_error flag exists or can be added
        return # Stop processing on stream error

    # 5. Log the full unmodified OpenAI response after streaming finishes
    if full_response: # Avoid logging empty responses
        db_add_chat_message(session_id, "assistant", full_response, user_email=user_email)
    else:
        print(f"Stream for session {session_id} resulted in an empty response. Not logging.")


# --- Service functions to interact with routers (Keep as before) ---

def get_chat_sessions(db, user_id: str) -> List[Dict[str, Any]]:
    """Service function to get sessions from DB."""
    # Assuming db param is unused if interacting directly with Supabase utils
    return db_get_chat_sessions(user_id)

def get_session_messages(db, session_id: str, user_id: str) -> Optional[List[Dict[str, Any]]]:
    """Service function to get messages from DB."""
    # Assuming db param is unused
    return db_get_chat_messages(session_id, user_id)

def delete_session(db, session_id: str, user_id: str) -> bool:
    """Service function to delete a session from DB."""
    # Assuming db param is unused
    return db_delete_chat_session(session_id, user_id)
