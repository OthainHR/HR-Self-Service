#!/usr/bin/env python
"""
Knowledge Base Testing Script

This script tests the knowledge base system using mock embeddings.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key, find_dotenv

# Add the app directory to the system path so we can import our modules
app_dir = Path(__file__).parent
sys.path.append(str(app_dir))

# Import our services and utilities
from app.services.knowledge_service import add_document, search_documents, Document
from app.utils.vector_store import vector_store
from app.utils.supabase_config import supabase_client

def test_knowledge_base():
    """Test the knowledge base by adding documents and searching."""
    print("=" * 80)
    print("Knowledge Base Testing Script")
    print("=" * 80)
    print("\nThis script tests the knowledge base with mock embeddings instead of OpenAI API.")
    
    # Load environment variables
    load_dotenv()
    
    # Check if Supabase is initialized
    if supabase_client is None:
        print("\n❌ Supabase not initialized.")
        print("Please run setup_supabase.py to configure your Supabase credentials.")
        return
    
    # Enable mock embeddings
    env_file = find_dotenv()
    set_key(env_file, "USE_MOCK_EMBEDDINGS", "true")
    print("\n✅ Enabled mock embeddings for testing")
    
    while True:
        print("\nOptions:")
        print("1. Add a test document")
        print("2. Search the knowledge base")
        print("3. List all documents")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ")
        
        if choice == "1":
            add_test_document()
        elif choice == "2":
            search_knowledge_base()
        elif choice == "3":
            list_documents()
        elif choice == "4":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

def add_test_document():
    """Add a test document to the knowledge base."""
    print("\n--- Add Test Document ---")
    
    title = input("\nEnter document title (or press Enter for default): ")
    if not title:
        title = "Test Document"
    
    source = input("Enter document source (or press Enter for default): ")
    if not source:
        source = "Test Source"
    
    category = input("Enter document category (or press Enter for default): ")
    if not category:
        category = "Test"
    
    text = input("Enter document text (or press Enter for default): ")
    if not text:
        text = "This is a test document for the knowledge base."
    
    # Create document object
    document = Document(
        text=text,
        title=title,
        source=source,
        category=category
    )
    
    # Add document to knowledge base
    success = add_document(document)
    
    if success:
        print("\n✅ Document added successfully!")
    else:
        print("\n❌ Failed to add document.")

def search_knowledge_base():
    """Search the knowledge base."""
    print("\n--- Search Knowledge Base ---")
    
    query = input("\nEnter search query: ")
    if not query:
        print("Search query cannot be empty.")
        return
    
    # Search knowledge base
    results = search_documents(query)
    
    if not results:
        print("\nNo results found.")
        return
    
    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results):
        print(f"\n{i+1}. {result['title']}")
        print(f"Source: {result['source']}")
        print(f"Category: {result['category']}")
        print(f"Relevance: {result['relevance_score']:.2f}")
        print(f"Text: {result['text'][:100]}...")

def list_documents():
    """List all documents in the knowledge base."""
    print("\n--- Knowledge Base Documents ---")
    
    try:
        # Just return all documents (up to 20) by using a technique that returns them all
        # This is a bit of a hack, but it works for testing
        results = vector_store.search("", top_k=20)
        
        print(f"\nFound {len(results)} documents:")
        for i, result in enumerate(results):
            print(f"\n{i+1}. {result['metadata'].get('title', 'Untitled')}")
            print(f"Source: {result['metadata'].get('source', 'Unknown')}")
            print(f"Category: {result['metadata'].get('category', 'Unknown')}")
            print(f"ID: {result['id']}")
            print(f"Text: {result['text'][:100]}...")
    except Exception as e:
        print(f"\n❌ Error listing documents: {e}")

if __name__ == "__main__":
    test_knowledge_base() 