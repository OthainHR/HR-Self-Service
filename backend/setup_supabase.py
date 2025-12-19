#!/usr/bin/env python
"""
Supabase Setup Script for HR Chatbot

This script guides you through setting up Supabase for the HR Chatbot application.
It helps you set up the necessary environment variables for Supabase integration.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key, find_dotenv

def main():
    """Guide the user through setting up Supabase credentials."""
    print("=" * 80)
    print("HR Chatbot - Supabase Setup")
    print("=" * 80)
    print("\nThis script will help you configure Supabase for storing vector embeddings.")
    print("\nBefore proceeding, make sure you have:")
    print("1. Created a Supabase project at https://app.supabase.io/")
    print("2. Created a 'knowledge_documents' table in your Supabase project")
    print("3. Enabled vector support in your Supabase project")
    print("4. Have your Supabase URL and API key ready")
    
    proceed = input("\nDo you want to proceed? (y/n): ")
    
    if proceed.lower() != 'y':
        print("Setup aborted. You can run this script again when ready.")
        return
    
    # Check for existing .env file
    env_file = find_dotenv()
    if not env_file:
        env_file = '.env'
        print(f"Creating new .env file at {os.path.abspath(env_file)}")
        with open(env_file, 'w') as f:
            f.write("# Environment variables for HR Chatbot\n")
    else:
        print(f"Found existing .env file at {env_file}")
        load_dotenv(env_file)
    
    # Get Supabase URL
    supabase_url = input("\nEnter your Supabase URL: ")
    while not supabase_url:
        print("Supabase URL is required.")
        supabase_url = input("Enter your Supabase URL: ")
    
    # Get Supabase API key
    supabase_key = input("\nEnter your Supabase API key: ")
    while not supabase_key:
        print("Supabase API key is required.")
        supabase_key = input("Enter your Supabase API key: ")
    
    # Update .env file
    set_key(env_file, "SUPABASE_URL", supabase_url)
    set_key(env_file, "SUPABASE_API_KEY", supabase_key)
    
    print(f"\nUpdated {env_file} with Supabase configuration.")
    
    # Set USE_MOCK_EMBEDDINGS for testing
    set_key(env_file, "USE_MOCK_EMBEDDINGS", "true")
    
    print("\n" + "=" * 80)
    print("Supabase setup complete!")
    print("=" * 80)
    print("\nYour application will now use Supabase to store vector embeddings.")
    print("\nBefore using the application, please create a table in Supabase with the following SQL:")
    print("""
    CREATE TABLE knowledge_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        text TEXT NOT NULL,
        metadata JSONB NOT NULL,
        embedding VECTOR(1536),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create a policy to allow all operations (customize as needed for your security requirements)
    ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Enable all operations for all users" ON knowledge_documents 
        USING (true) WITH CHECK (true);
    """)
    
    # Test Supabase connection
    test_supabase_connection(supabase_url, supabase_key)
    
    print("\nTo test your setup, run the backend application and try adding a document to the knowledge base.")
    print("\nIf you encounter any issues, check:")
    print("1. Your Supabase URL and API key")
    print("2. That the knowledge_documents table exists in your Supabase project")
    print("3. The application logs for detailed error messages")

def test_supabase_connection(url, key):
    """Test if we can connect to Supabase and if the required table exists."""
    try:
        from supabase import create_client
        
        print("\nTesting Supabase connection...")
        client = create_client(url, key)
        
        # Test connection by getting table info
        print("Testing table existence...")
        response = client.table("knowledge_documents").select("id", count="exact").execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"❌ Error accessing table: {response.error}")
            print("Please make sure you've created the knowledge_documents table.")
        else:
            count = response.count or 0
            print(f"✅ Connection successful! Found {count} documents in the knowledge_documents table.")
    except Exception as e:
        print(f"❌ Connection test failed: {str(e)}")
        print("Please check your Supabase URL and API key.")

if __name__ == "__main__":
    main() 