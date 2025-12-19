#!/usr/bin/env python
"""
Firestore Testing Script

This script tests saving documents to Firestore without requiring OpenAI API credits.
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

# Import our Firebase configuration and other utilities
from app.utils.firebase_config import db
from firebase_admin import firestore

def generate_dummy_embedding(dimension=1536):
    """Generate a random embedding vector of the specified dimension."""
    # Create a random vector of the same dimension as OpenAI embeddings
    return np.random.normal(0, 1, dimension).tolist()

def test_firestore_document_creation():
    """Test creating a document in Firestore with a dummy embedding."""
    # Check if Firebase is initialized
    if db is None:
        print("Error: Firebase not initialized. Please run setup_firebase.py first.")
        return False
    
    try:
        # Create a test document
        collection_name = "knowledge_documents"
        document_data = {
            "text": "This is a test document for Firestore.",
            "metadata": {
                "title": "Test Document",
                "source": "Firestore Test Script",
                "category": "test"
            },
            "embedding": generate_dummy_embedding(),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        # Save to Firestore
        doc_ref = db.collection(collection_name).document()
        doc_ref.set(document_data)
        
        print(f"✅ Successfully created test document in Firestore with ID: {doc_ref.id}")
        return True
    except Exception as e:
        print(f"❌ Error creating test document: {e}")
        return False

def test_firestore_document_retrieval():
    """Test retrieving documents from Firestore."""
    if db is None:
        print("Error: Firebase not initialized. Please run setup_firebase.py first.")
        return False
    
    try:
        # Get all documents from the collection
        collection_name = "knowledge_documents"
        docs = db.collection(collection_name).stream()
        
        # Count documents
        doc_count = 0
        for doc in docs:
            doc_count += 1
            doc_data = doc.to_dict()
            print(f"Document ID: {doc.id}")
            print(f"Title: {doc_data.get('metadata', {}).get('title', 'No title')}")
            print(f"Text: {doc_data.get('text', '')[:50]}...")
            print(f"Embedding length: {len(doc_data.get('embedding', []))}")
            print("-" * 40)
            
            # Only show details for up to 3 documents
            if doc_count >= 3:
                print(f"... and {doc_count-3} more documents")
                break
        
        print(f"✅ Found {doc_count} documents in Firestore collection '{collection_name}'")
        return True
    except Exception as e:
        print(f"❌ Error retrieving documents: {e}")
        return False

def main():
    """Main function to test Firestore functionality."""
    print("=" * 80)
    print("Firestore Testing Script")
    print("=" * 80)
    print("\nThis script tests Firestore document creation and retrieval without using OpenAI.")
    
    # Load environment variables
    load_dotenv()
    
    # Check if Firebase credentials are set
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path or not os.path.exists(cred_path):
        print("\n❌ Firebase credentials not found.")
        print("Please run setup_firebase.py to configure your Firebase credentials.")
        return
    
    # Menu
    while True:
        print("\nOptions:")
        print("1. Test creating a document in Firestore")
        print("2. List documents in Firestore")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            test_firestore_document_creation()
        elif choice == "2":
            test_firestore_document_retrieval()
        elif choice == "3":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main() 