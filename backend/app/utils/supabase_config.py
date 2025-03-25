import os
from dotenv import load_dotenv
import supabase
from supabase import create_client, Client
import traceback

# Load environment variables
load_dotenv()

# Initialize Supabase client
def initialize_supabase() -> Client:
    """Initialize Supabase client with configuration."""
    try:
        # Get Supabase URL and API key from environment variables
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_API_KEY")
        
        if not supabase_url or not supabase_key:
            print(f"Error: Supabase URL or API key not found in environment variables.")
            print(f"SUPABASE_URL: {'Set' if supabase_url else 'Not set'}")
            print(f"SUPABASE_API_KEY: {'Set' if supabase_key else 'Not set'}")
            return None
        
        # Create Supabase client
        print(f"Initializing Supabase client with URL: {supabase_url}")
        client = create_client(supabase_url, supabase_key)
        
        # Test the connection by making a simple query
        try:
            # Use a simpler query for testing - just fetch one row
            test_response = client.table("knowledge_documents").select("*").limit(1).execute()
            if hasattr(test_response, 'error') and test_response.error:
                print(f"Warning: Connection test failed: {test_response.error}")
                print("Please make sure the knowledge_documents table exists.")
            else:
                print(f"Supabase connection test successful! Found {len(test_response.data)} documents in sample.")
        except Exception as e:
            print(f"Warning: Could not test Supabase connection: {e}")
        
        print(f"Initialized Supabase client")
        return client
    except Exception as e:
        print(f"Error initializing Supabase: {e}")
        print(traceback.format_exc())
        return None

# Initialize Supabase client
supabase_client = initialize_supabase() 