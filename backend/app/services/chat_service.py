import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

# Import Supabase admin client
from app.utils.supabase_client import supabase_admin_client

# Import models
from app.models.chat import ChatSession, Message, ChatRequest, ChatResponse 
# Import OpenAI and vector store utils
from app.utils.openai_utils import get_chat_completion, get_chat_completion_stream
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

# ── Ticket shortcut logic constants and function ──
TICKET_TRIGGER_KEYWORDS = [
    "access request", "access", 
    "desktop", "laptop", "support", 
    "get it help", 
    "hardware", "software", 
    "login", "account", "accounts", 
]

TICKET_LINK_MARKDOWN = "[Create A Ticket](https://othaingroup.atlassian.net/servicedesk/customer/portal/7/group/-1)"

# Re-add the link text itself for checking
TICKET_LINK_TEXT = "Create A Ticket"

def should_show_ticket_link(message: str) -> bool:
    msg = message.lower()
    # check any multi-word phrases first
    for phrase in ("access request", "get it help", "hardware and software"):
        if phrase in msg:
            return True
    # then individual keywords
    for kw in ("access", "desktop", "laptop", "support", "hardware", "software", "login", "account"):
        if kw in msg:
            return True
    return False

def create_session(db, user_id: str, user_email: Optional[str] = None) -> Optional[ChatSession]: # db param might be unused now
    """Create a new chat session in Supabase."""
    db_session = db_create_chat_session(user_id, user_email=user_email)
    if db_session:
        # Map Supabase response to ChatSession Pydantic model
        return ChatSession(
            id=str(db_session['id']), # Ensure ID is string if model expects it
            user_id=db_session['user_id'],
            user_email=db_session.get('user_email'),
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

def process_chat_request(request: ChatRequest, user_email: Optional[str] = None) -> ChatResponse:
    session_id = request.session_id or str(uuid.uuid4())
    user_id = request.user_id
    message = request.message.strip()

    # 1️⃣ Log the user message
    db_add_chat_message(session_id, "user", message, user_email=user_email)

    # 2️⃣ Build and send to OpenAI as before
    # Build OpenAI messages (same as before)
    recent_messages_db = db_get_chat_messages(session_id, user_id)
    if recent_messages_db is None:
        raise HTTPException(status_code=404, detail="Chat session not found or access denied")
    openai_messages = []
    system_message = {
        "role": "system",
        "content": (
            "You are an HR assistant for Othain, branded as \"Othain Self Service.\" "
            "Answer questions about Othain's HR policies, benefits, leave, payroll, and other HR-related topics "
            "based on the provided context. "
            "If you don't know the answer or the information isn't in the context, say so politely and direct the user to contact hr@othainsoft.com. "
            "Always refer to the company as \"Othain\" and never discuss other companies, products, or topics.\n\n"

            "If someone asks about anything outside of HR (for example: hardware issues, software problems, login or account access, "
            "laptop/desktop support, etc.), you should first categorize the issue into one of four ticket types, then respond with a polite fallback.  "
            "The categories are:\n"
            "  • Access Request — for Logins and Accounts, Applications\n"
            "  • Desktop/Laptop Support — for General IT Requests and Hardware/Software Issues\n"
            "  • Get IT Help — for General IT Requests and Hardware/Software Issues\n"
            "  • Request an AI Task — for AI-specific tasks\n\n"

            "After classifying, respond in this friendly format (*exactly* – your code will append the link):\n\n"

            "🚩 Ticket type: <YourCategoryHere>\n\n"

            "Then begin your apology with one of these rotating openers, restating **only the key issue** (not the full sentence). "
            "For example, if the user said “my laptop is giving me a blue screen,” you’d restate “blue-screen”:\n"
            "  – “😣 Oh no, that blue-screen is a pain.”\n"
            "  – “😭 Bummer, that blue-screen sounds rough.”\n"
            "  – “🤔 Uh-oh, that blue-screen must be annoying.”\n"
            "  – “😟 That blue-screen is tough—sorry you’re experiencing it.”\n\n"

            "Follow with exactly:\n\n"
            "“While I can’t jump in and fix it myself, our IT heroes are standing by!”\n\n"

            "Then end with:\n\n"
            "“👉 Create a ticket so they can dive in right away.”"
        )
    }
    openai_messages.append(system_message)
    context = get_relevant_context(message)
    if context:
        openai_messages.append({"role": "system", "content": context})
    history_limit = 10
    for msg in recent_messages_db[-history_limit:]:
        openai_messages.append({"role": msg['role'], "content": msg['content']})
    if not openai_messages or openai_messages[-1]['content'] != message:
        openai_messages.append({"role": "user", "content": message})
    assistant_response = get_chat_completion(openai_messages)

    # 4️⃣ If it's an IT-support question AND the AI didn't already include the link text OR the full markdown link, append your link BEFORE saving
    if (
        should_show_ticket_link(message) 
        and TICKET_LINK_TEXT not in assistant_response 
        and TICKET_LINK_MARKDOWN not in assistant_response
    ):
        assistant_response = f"{assistant_response}\n\n{TICKET_LINK_MARKDOWN}"

    # 3️⃣ Log the potentially modified assistant's reply to DB
    db_add_chat_message(session_id, "assistant", assistant_response, user_email=user_email)

    return ChatResponse(
        message=assistant_response,
        session_id=session_id
    )

async def process_chat_request_stream(request: ChatRequest, user_email: Optional[str] = None):
    session_id = request.session_id or str(uuid.uuid4())
    user_id = request.user_id
    message = request.message.strip()

    # 1️⃣ Log the user message
    db_add_chat_message(session_id, "user", message, user_email=user_email)

    # 2️⃣ Build context and stream from OpenAI
    recent_messages_db = db_get_chat_messages(session_id, user_id)
    if recent_messages_db is None:
        raise HTTPException(status_code=404, detail="Chat session not found or access denied")
    openai_messages = []
    system_message = {
        "role": "system",
        "content": (
            "You are an HR assistant for Othain, branded as \"Othain Self Service.\" "
            "Answer questions about Othain's HR policies, benefits, leave, payroll, and other HR-related topics "
            "based on the provided context. "
            "If you don't know the answer or the information isn't in the context, say so politely and direct the user to contact hr@othainsoft.com. "
            "Always refer to the company as \"Othain\" and never discuss other companies, products, or topics.\n\n"

            "If someone asks about anything outside of HR (for example: hardware issues, software problems, login or account access, "
            "laptop/desktop support, etc.), you should first categorize the issue into one of four ticket types, then respond with a polite fallback.  "
            "The categories are:\n"
            "  • Access Request — for Logins and Accounts, Applications\n"
            "  • Desktop/Laptop Support — for General IT Requests and Hardware/Software Issues\n"
            "  • Get IT Help — for General IT Requests and Hardware/Software Issues\n"
            "  • Request an AI Task — for AI-specific tasks\n\n"

            "After classifying, respond in this friendly format (*exactly* – your code will append the link):\n\n"

            "🚩 Ticket type: <YourCategoryHere>\n\n"

            "Then begin your apology with one of these rotating openers, restating **only the key issue** (not the full sentence). "
            "For example, if the user said “my laptop is giving me a blue screen,” you’d restate “blue-screen”:\n"
            "  – “😣 Oh no, that blue-screen is a pain.”\n"
            "  – “😭 Bummer, that blue-screen sounds rough.”\n"
            "  – “🤔 Uh-oh, that blue-screen must be annoying.”\n"
            "  – “😟 That blue-screen is tough—sorry you’re experiencing it.”\n\n"

            "Follow with exactly:\n\n"
            "“While I can’t jump in and fix it myself, our IT heroes are standing by!”\n\n"

            "Then end with:\n\n"
            "“👉 Create a ticket so they can dive in right away.”"
        )
    }
    openai_messages.append(system_message)
    context = get_relevant_context(message)
    if context:
        openai_messages.append({"role": "system", "content": context})
    history_limit = 10
    for msg in recent_messages_db[-history_limit:]:
        openai_messages.append({"role": msg['role'], "content": msg['content']})
    if not openai_messages or openai_messages[-1]['content'] != message:
        openai_messages.append({"role": "user", "content": message})

    full_response = ""
    async for chunk in get_chat_completion_stream(openai_messages):
        full_response += chunk
        yield chunk

    # 4️⃣ If it matches an IT-support trigger AND the AI didn't already include the link text OR the full markdown link, append the ticket link to the full response BEFORE saving
    if (
        should_show_ticket_link(message) 
        and TICKET_LINK_TEXT not in full_response 
        and TICKET_LINK_MARKDOWN not in full_response
    ):
        full_response = f"{full_response}\n\n{TICKET_LINK_MARKDOWN}"

    # 3️⃣ Log the potentially modified full assistant response to DB
    db_add_chat_message(session_id, "assistant", full_response, user_email=user_email)

# --- Keep non-streaming function for now if needed elsewhere --- 
# def process_chat_request(request: ChatRequest, user_email: Optional[str] = None) -> ChatResponse:
#    ...

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
