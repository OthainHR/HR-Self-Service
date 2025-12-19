import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_supabase_admin_client() -> Client | None:
    """Initializes and returns the Supabase admin client."""
    supabase_url = os.getenv("SUPABASE_URL")
    # IMPORTANT: Use the SERVICE ROLE KEY for admin operations
    supabase_service_key = os.getenv("SUPABASE_API_KEY")

    if not supabase_url or not supabase_service_key:
        print("ERROR: SUPABASE_URL and SUPABASE_API_KEY (Service Role) must be set in the backend .env file.")
        return None

    try:
        supabase_admin = create_client(supabase_url, supabase_service_key)
        print("Supabase admin client initialized successfully.")
        return supabase_admin
    except Exception as e:
        print(f"Error initializing Supabase admin client: {e}")
        return None

# Initialize client immediately so it can be imported
supabase_admin_client = get_supabase_admin_client() 