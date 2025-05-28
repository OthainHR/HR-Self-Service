import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
import re

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

            "If the user asks about something the chatbot itself cannot directly resolve, you must:\n\n"
            "1. **Classify the issue** into the single *most specific* category from the list below.  \n"
            "2. **Respond** with the fallback template exactly as specified.\n\n"
            "────────────────────────────────────────────────────────\n"
            "CATEGORIES (pick one)                 \n"
            "────────────────────────────────────────────────────────\n"
            "• IT Requests  \n"
            "• HR Requests  \n"
            "• Payroll Requests  \n"
            "• Operations  \n"
            "• Accounts  \n"
            "• AI Requests  \n"
            "────────────────────────────────────────────────────────\n"
            "RESPONSE FORMAT (**exactly**)                          \n"
            "────────────────────────────────────────────────────────\n"
            "🚩 Ticket type: <Category>\n\n"
            "<Rotating opener from the list below, restating **only** the key issue>\n\n"
            "“Don’t worry, our support heroes are standing by!”\n\n"
            "“👉 Create a ticket so they can dive in right away.”\n"
            "────────────────────────────────────────────────────────\n"
            "APPROVED ROTATING OPENERS (use in this order, then loop)\n"
            "────────────────────────────────────────────────────────\n"
            "1. 😣 Oh no, that **<issue>** is a pain.  \n"
            "2. 😣 Oh no—**<issue>** is the worst.  \n"
            "3. 😭 Bummer, that **<issue>** sounds rough.  \n"
            "4. 🤔 Uh-oh, that **<issue>** must be annoying.  \n"
            "5. 😟 Yikes, **<issue>** must be so frustrating.  \n"
            "6. 😟 That **<issue>** is tough—sorry you're experiencing it.  \n\n"
            "────────────────────────────────────────────────────────\n"
            "NOTES\n"
            "────────────────────────────────────────────────────────\n"
            "• Never add extra text before or after the format; our code appends the ticket-creation link.  \n"
            "• Replace **<issue>** with a concise noun-phrase (“blue-screen”, “benefits inquiry”, etc.).  \n"
            "• Cycle through the six openers in order; do not invent new ones.  \n"
            "• If the user’s question is covered by built-in knowledge, answer normally—only invoke this fallback when escalation is needed.\n"
            
            "Othain Cab Service FAQ (handle directly; do NOT trigger fallback):\n"
            "• Othain Cab Service lets employees schedule a cab to and from work.\n"
            "• Book a cab via the Book A Cab page by selecting a pickup time and location. You must book a cab at least 3 hours in advance.\n"
            "• The service is available to all Othain employees.\n"
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

    # 3️⃣ Log the assistant's reply to DB
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
            "For example, if the user said \"my laptop is giving me a blue screen,\" you'd restate \"blue-screen\":\n"
            "  – \"😣 Oh no, that blue-screen is a pain.\"\n"
            "  – \"😣 Oh no—blue screens are the worst.\"\n"
            "  – \"😭 Bummer, that blue-screen sounds rough.\"\n"
            "  – \"🤔 Uh-oh, that blue-screen must be annoying.\"\n"
            "  – \"😟 Yikes, a blue-screen must be so frustrating.\"\n"
            "  – \"😟 That blue-screen is tough—sorry you're experiencing it.\"\n\n"

            "Follow with exactly:\n\n"
            "\"Don't worry, our IT heroes are standing by!\"\n\n"
            "\"👉 Create a ticket so they can dive in right away.\"\n\n"

            "If a ticket it IT related or a user asks for the point of contact for IT, respond with it@othainsoft.com"
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

    # 4️⃣ Log the full assistant response after streaming finishes
    if full_response: # Avoid logging empty responses
        db_add_chat_message(session_id, "assistant", full_response, user_email=user_email)
    else:
        print(f"Stream for session {session_id} resulted in an empty response. Not logging.")

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
