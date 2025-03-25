#!/usr/bin/env python
"""
Test Supabase Document Insertion

This script tests inserting a document directly to Supabase without going through the API.
"""

import os
import sys
import json
import traceback
from pathlib import Path
from dotenv import load_dotenv
import numpy as np

# Add the backend directory to the system path
app_dir = Path(__file__).parent
sys.path.append(str(app_dir))

def main():
    """Test direct insertion into Supabase."""
    # Load environment variables
    load_dotenv()
    
    from supabase import create_client
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_API_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in .env file.")
        print("Please run setup_supabase.py first.")
        return
    
    print(f"Using Supabase URL: {supabase_url}")
    print(f"API Key found: {'Yes' if supabase_key else 'No'}")
    
    # Initialize Supabase client
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Supabase client initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
        print(traceback.format_exc())
        return
    
    # Create test document
    document_data = {
        "text": "This is a test document for Supabase troubleshooting.",
        "metadata": {
            "title": "Supabase Test",
            "source": "Test Script",
            "category": "test"
        },
        "embedding": [0.1] * 1536  # Create a 1536-dimension vector with all 0.1
    }
    
    # Insert document
    try:
        print("\nInserting test document into Supabase...")
        response = supabase.table("knowledge_documents").insert(document_data).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"❌ Error inserting document: {response.error}")
        elif hasattr(response, 'data') and response.data:
            print("✅ Document inserted successfully!")
            print(f"Document ID: {response.data[0]['id']}")
        else:
            print("❓ Unexpected response format:")
            print(response)
    except Exception as e:
        print(f"❌ Exception during document insertion: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    main() 