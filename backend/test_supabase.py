#!/usr/bin/env python
"""
Supabase Testing Script

This script tests saving documents to Supabase without requiring OpenAI API credits.
It creates documents with dummy embedding vectors instead of real embeddings.
"""

import os
import numpy as np
import sys
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Add the app directory to the system path so we can import our modules
app_dir = Path(__file__).parent
sys.path.append(str(app_dir))

# Import our Supabase configuration
from app.utils.supabase_config import supabase_client

def generate_dummy_embedding(dimension=1536):
    """Generate a random embedding vector of the specified dimension."""
    # Create a random vector of the same dimension as OpenAI embeddings
    return np.random.normal(0, 1, dimension).tolist()

def test_supabase_document_creation():
    """Test creating a document in Supabase with a dummy embedding."""
    # Check if Supabase is initialized
    if supabase_client is None:
        print("Error: Supabase not initialized. Please run setup_supabase.py first.")
        return False
    
    try:
        # Create a test document
        table_name = "knowledge_documents"
        document_data = {
            "text": "This is a test document for Supabase.",
            "metadata": {
                "title": "Test Document",
                "source": "Supabase Test Script",
                "category": "test"
            },
            "embedding": generate_dummy_embedding()
        }
        
        # Save to Supabase
        response = supabase_client.table(table_name).insert(document_data).execute()
        
        if not response.data or len(response.data) == 0:
            print("Error: Failed to insert document into Supabase")
            return False
            
        print(f"✅ Successfully created test document in Supabase with ID: {response.data[0]['id']}")
        return True
    except Exception as e:
        print(f"❌ Error creating test document: {e}")
        return False

def test_supabase_document_retrieval():
    """Test retrieving documents from Supabase."""
    if supabase_client is None:
        print("Error: Supabase not initialized. Please run setup_supabase.py first.")
        return False
    
    try:
        # Get all documents from the table
        table_name = "knowledge_documents"
        response = supabase_client.table(table_name).select("*").execute()
        
        # Count documents
        doc_count = len(response.data)
        
        for i, doc in enumerate(response.data[:3]):  # Show details for up to 3 documents
            print(f"Document ID: {doc['id']}")
            print(f"Title: {doc['metadata'].get('title', 'No title')}")
            print(f"Text: {doc['text'][:50]}...")
            print(f"Embedding length: {len(doc['embedding'])}")
            print("-" * 40)
            
        if doc_count > 3:
            print(f"... and {doc_count-3} more documents")
        
        print(f"✅ Found {doc_count} documents in Supabase table '{table_name}'")
        return True
    except Exception as e:
        print(f"❌ Error retrieving documents: {e}")
        return False

def main():
    """Main function to test Supabase functionality."""
    print("=" * 80)
    print("Supabase Testing Script")
    print("=" * 80)
    print("\nThis script tests Supabase document creation and retrieval without using OpenAI.")
    
    # Load environment variables
    load_dotenv()
    
    # Check if Supabase is initialized
    if supabase_client is None:
        print("\n❌ Supabase not initialized.")
        print("Please run setup_supabase.py to configure your Supabase credentials.")
        return
    
    # Menu
    while True:
        print("\nOptions:")
        print("1. Test creating a document in Supabase")
        print("2. List documents in Supabase")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            test_supabase_document_creation()
        elif choice == "2":
            test_supabase_document_retrieval()
        elif choice == "3":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main() 