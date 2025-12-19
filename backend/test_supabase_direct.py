#!/usr/bin/env python
"""
Simple script to test direct insertion into Supabase
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def test_direct_supabase_insertion():
    """Test direct insertion into Supabase"""
    # Get Supabase URL and API key from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_API_KEY")
    
    if not supabase_url or not supabase_key:
        print(f"Error: Supabase URL or API key not found in environment variables.")
        print(f"SUPABASE_URL: {'Set' if supabase_url else 'Not set'}")
        print(f"SUPABASE_API_KEY: {'Set' if supabase_key else 'Not set'}")
        return
    
    # Create Supabase client
    print(f"Initializing Supabase client with URL: {supabase_url}")
    client = create_client(supabase_url, supabase_key)
    
    # Create a test document
    test_document = {
        "text": "This is a test document",
        "metadata": {
            "title": "Test Document",
            "source": "Test Script",
            "category": "test"
        },
        "embedding": [0.1] * 1536  # Simple mock embedding
    }
    
    print(f"Attempting to insert test document into knowledge_documents table...")
    
    # Insert document
    try:
        response = client.table("knowledge_documents").insert(test_document).execute()
        
        print(f"Full response: {response.__dict__ if hasattr(response, '__dict__') else response}")
        
        if hasattr(response, 'error') and response.error:
            print(f"Error from Supabase: {response.error}")
            return
        
        if hasattr(response, 'data') and response.data:
            print(f"Document inserted successfully with ID: {response.data[0].get('id')}")
            
            # Now fetch it back to confirm
            doc_id = response.data[0].get('id')
            fetch_response = client.table("knowledge_documents").select("*").eq("id", doc_id).execute()
            
            if fetch_response.data:
                print(f"Successfully retrieved document with ID: {doc_id}")
                return
            else:
                print(f"Failed to retrieve document with ID: {doc_id}")
        else:
            print("No data in response")
    except Exception as e:
        print(f"Exception during insertion: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    test_direct_supabase_insertion() 