#!/usr/bin/env python
"""
Script to read from Supabase and examine document structure
"""
import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def test_supabase_read():
    """Read and examine documents in Supabase"""
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
    
    # Fetch documents
    try:
        # Query the table
        print("Querying knowledge_documents table...")
        response = client.table("knowledge_documents").select("*").limit(5).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"Error from Supabase: {response.error}")
            return
        
        # Print out document count
        if hasattr(response, 'data'):
            print(f"Retrieved {len(response.data)} documents")
            
            # Examine table structure from the first document
            if response.data:
                first_doc = response.data[0]
                print("\nTable structure:")
                for key, value in first_doc.items():
                    if key == "embedding":
                        print(f"  {key}: [Array of {len(value) if isinstance(value, list) else 'unknown'} elements]")
                    elif key == "metadata":
                        print(f"  {key}:")
                        if isinstance(value, dict):
                            for mk, mv in value.items():
                                print(f"    {mk}: {mv}")
                        else:
                            print(f"    Value type: {type(value)}")
                    else:
                        print(f"  {key}: {value}")
                
                # Print a summary of retrieved documents
                print("\nDocument summary:")
                for i, doc in enumerate(response.data):
                    title = doc.get("metadata", {}).get("title", "Unknown") if isinstance(doc.get("metadata"), dict) else "Unknown"
                    text_preview = doc.get("text", "")[:30] + "..." if len(doc.get("text", "")) > 30 else doc.get("text", "")
                    print(f"  {i+1}. ID: {doc.get('id')}, Title: {title}, Text: {text_preview}")
            else:
                print("No documents found in the table")
        else:
            print("No data in response")
    except Exception as e:
        print(f"Exception during query: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    test_supabase_read() 