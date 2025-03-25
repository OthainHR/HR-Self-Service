#!/usr/bin/env python
"""
Test Knowledge API endpoints

This script directly tests the Knowledge API endpoints without using the frontend.
Also includes direct Supabase database insertion test.
"""

import os
import sys
import requests
import json
import numpy as np
from pathlib import Path
from dotenv import load_dotenv

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

# Load environment variables
load_dotenv()

# Define the base URL
BASE_URL = "http://localhost:8000/api"  # Update if your server runs on a different host/port

def get_test_token():
    """Get a test token for authenticated requests."""
    response = requests.get(f"{BASE_URL}/auth/test-token")
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def test_add_document_api():
    """Test adding a document via the API endpoint."""
    
    # Create a test document
    test_document = {
        "text": "This is a test document created by the API test script.",
        "title": "API Test Document",
        "source": "API Test Script",
        "category": "test"
    }
    
    print(f"Sending test document: {json.dumps(test_document, indent=2)}")
    
    # Send request to the test-upload endpoint
    response = requests.post(
        f"{BASE_URL}/knowledge/test-upload",
        json=test_document
    )
    
    # Print response
    print(f"Status code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Raw response: {response.text}")
    
    return response.status_code == 200

def test_direct_supabase_insert():
    """Test inserting a document directly into Supabase."""
    print("Testing direct Supabase insertion...")
    
    # Import Supabase and related code
    try:
        from app.utils.supabase_config import supabase_client
        from app.services.knowledge_service import Document
        
        if supabase_client is None:
            print("❌ Supabase client not initialized")
            return False
            
        print("✅ Supabase client initialized")
        
        # Create test document
        document_data = {
            "text": "This is a direct Supabase insertion test.",
            "metadata": {
                "title": "Direct Supabase Test",
                "source": "Test Script",
                "category": "test"
            },
            "embedding": [0.1] * 1536  # Simple mock embedding
        }
        
        print("Inserting document directly into Supabase...")
        
        # Insert into Supabase
        response = supabase_client.table("knowledge_documents").insert(document_data).execute()
        
        print(f"Insert response: {response}")
        
        if hasattr(response, 'error') and response.error:
            print(f"❌ Error: {response.error}")
            return False
            
        if hasattr(response, 'data') and response.data:
            print(f"✅ Document inserted with ID: {response.data[0].get('id')}")
            return True
        
        print("❌ Unexpected response format")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_search_documents():
    """Test searching for documents."""
    # Get authentication token
    token = get_test_token()
    if not token:
        print("❌ Failed to get test token for authentication")
        return False
        
    print(f"Retrieved token: {token[:10]}...")
    
    query = "test document"
    print(f"Searching for: '{query}'")
    
    # Send search request with authentication
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/knowledge/search",
        params={"query": query},
        headers=headers
    )
    
    # Print response
    print(f"Status code: {response.status_code}")
    try:
        results = response.json()
        print(f"Found {len(results)} results:")
        for i, result in enumerate(results, 1):
            print(f"Result {i}:")
            print(f"  - Title: {result.get('title', 'Unknown')}")
            print(f"  - Text: {result.get('text', '')[:50]}...")
            print(f"  - Score: {result.get('relevance_score', 0):.2f}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Raw response: {response.text}")
    
    return response.status_code == 200

def main():
    """Run tests."""
    print("=" * 70)
    print("Knowledge API Test")
    print("=" * 70)
    
    print("\nTesting API document addition...")
    success_api = test_add_document_api()
    
    print("\nTesting direct Supabase document addition...")
    success_direct = test_direct_supabase_insert()
    
    print("\nTesting document search...")
    success_search = test_search_documents()
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary:")
    print(f"API document addition: {'✅ Success' if success_api else '❌ Failed'}")
    print(f"Direct Supabase addition: {'✅ Success' if success_direct else '❌ Failed'}")
    print(f"Search documents: {'✅ Success' if success_search else '❌ Failed'}")
    print("=" * 70)

if __name__ == "__main__":
    main() 