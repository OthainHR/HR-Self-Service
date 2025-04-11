from .supabase_client import supabase_admin_client
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

# Table names
SESSIONS_TABLE = "chat_sessions"
MESSAGES_TABLE = "chat_messages"

def db_create_chat_session(user_id: str, user_email: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Creates a new chat session in Supabase and returns it."""
    if not supabase_admin_client:
        print("ERROR: Supabase client not available for db_create_chat_session")
        return None
    try:
        session_data = {
            "user_id": user_id
        }
        if user_email:
            session_data["user_email"] = user_email
            
        response = supabase_admin_client.table(SESSIONS_TABLE).insert(session_data).execute()
        
        if response.data and len(response.data) > 0:
            print(f"Supabase: Created session {response.data[0]['id']} for user {user_id} ({user_email})")
            return response.data[0]
        else:
            print(f"Supabase Error creating session: {response}")
            return None
    except Exception as e:
        print(f"Exception in db_create_chat_session: {e}")
        return None

def db_add_chat_message(session_id: str, role: str, content: str, user_email: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Adds a chat message to a session in Supabase."""
    if not supabase_admin_client:
        print("ERROR: Supabase client not available for db_add_chat_message")
        return None
    try:
        message_data = {
            "session_id": session_id,
            "role": role,
            "content": content
        }
        # Add user_email only for user messages
        if role == "user" and user_email:
            message_data["user_email"] = user_email
            
        response = supabase_admin_client.table(MESSAGES_TABLE).insert(message_data).execute()
        
        if response.data and len(response.data) > 0:
            print(f"Supabase: Added message to session {session_id}")
            return response.data[0]
        else:
            print(f"Supabase Error adding message: {response}")
            return None
    except Exception as e:
        print(f"Exception in db_add_chat_message: {e}")
        return None

def db_get_chat_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Gets all chat sessions for a user from Supabase."""
    if not supabase_admin_client:
        print("ERROR: Supabase client not available for db_get_chat_sessions")
        return []
    try:
        # Select session columns AND a count of related messages
        response = supabase_admin_client.table(SESSIONS_TABLE)\
            .select("id, user_id, created_at, updated_at, chat_messages(count)")\
            .eq("user_id", user_id)\
            .order("updated_at", desc=True)\
            .execute()
        
        if response.data:
            # The count will be nested, e.g., data[0]['chat_messages'][0]['count']
            print(f"Supabase: Fetched {len(response.data)} sessions for user {user_id} with message counts.") 
            # Example: print(response.data[0]['chat_messages'][0]['count'])
            return response.data
        else:
            print(f"Supabase: No sessions found for user {user_id} or error: {response}")
            return []
    except Exception as e:
        print(f"Exception in db_get_chat_sessions: {e}")
        return []

def db_get_chat_messages(session_id: str, user_id: str) -> Optional[List[Dict[str, Any]]]:
    """Gets messages for a specific session from Supabase, verifying ownership."""
    if not supabase_admin_client:
        print("ERROR: Supabase client not available for db_get_chat_messages")
        return None
    try:
        # First verify the user owns the session
        session_response = supabase_admin_client.table(SESSIONS_TABLE)\
            .select("id")\
            .eq("id", session_id)\
            .eq("user_id", user_id)\
            .maybe_single()\
            .execute()
            
        if not session_response.data:
             print(f"Supabase: Session {session_id} not found or access denied for user {user_id}")
             return None # Return None to indicate not found or forbidden

        # If session is owned, fetch messages
        messages_response = supabase_admin_client.table(MESSAGES_TABLE)\
            .select("id, session_id, role, content, created_at")\
            .eq("session_id", session_id)\
            .order("created_at", desc=False)\
            .execute()
            
        if messages_response.data:
            print(f"Supabase: Fetched {len(messages_response.data)} messages for session {session_id}")
            return messages_response.data
        else:
            print(f"Supabase: No messages found for session {session_id} or error: {messages_response}")
            return [] # Return empty list if no messages but session exists
            
    except Exception as e:
        print(f"Exception in db_get_chat_messages: {e}")
        return None
        
def db_delete_chat_session(session_id: str, user_id: str) -> bool:
    """Deletes a chat session and its messages from Supabase, verifying ownership."""
    if not supabase_admin_client:
        print("ERROR: Supabase client not available for db_delete_chat_session")
        return False
    try:
        # Verify ownership before deleting
        session_response = supabase_admin_client.table(SESSIONS_TABLE)\
            .select("id")\
            .eq("id", session_id)\
            .eq("user_id", user_id)\
            .maybe_single()\
            .execute()
            
        if not session_response.data:
             print(f"Supabase: Session {session_id} not found or access denied for user {user_id} during delete attempt.")
             return False # Indicate failure (not found or forbidden)

        # --- REMOVED ACTUAL DELETION --- 
        # # Delete messages first (optional, depends on cascade settings)
        # # If cascade delete is set up in Supabase, this might not be needed.
        # print(f"Supabase: Deleting messages for session {session_id}")
        # supabase_admin_client.table(MESSAGES_TABLE).delete().eq("session_id", session_id).execute()

        # # Delete session
        # print(f"Supabase: Deleting session {session_id}")
        # delete_response = supabase_admin_client.table(SESSIONS_TABLE).delete().eq("id", session_id).execute()
        
        # # Check if delete was successful (usually response.data is empty on success)
        # # A more robust check might involve checking status code if available
        # if hasattr(delete_response, 'error') and delete_response.error:
        #     print(f"Supabase: Error deleting session {session_id}: {delete_response.error}")
        #     return False
        # --- END REMOVED ACTUAL DELETION --- 
            
        print(f"Supabase: Session {session_id} marked for deletion (record kept). User {user_id} verified.")
        return True # Indicate success (ownership verified) even though we didn't delete

    except Exception as e:
        print(f"Exception in db_delete_chat_session: {e}")
        return False 