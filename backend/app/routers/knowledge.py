from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services import knowledge_service
from app.services.knowledge_service import Document
from app.utils.auth_utils import get_current_supabase_user
from typing import List, Dict, Any, Optional
import json
import logging
from app.utils.openai_utils import get_embeddings, USE_MOCK_EMBEDDINGS
import os

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Add a test endpoint that doesn't require authentication
@router.post("/test-upload", response_model=Dict[str, str])
async def test_upload_document(
    document: Document,
):
    """
    Test endpoint to upload a document to the knowledge base.
    
    No authentication needed for testing.
    """
    print(f"Test upload endpoint called")
    print(f"Adding document: title={document.title}, source={document.source}, category={document.category}")
    print(f"Document text (first 50 chars): {document.text[:50]}...")
    
    # Add document with no auth check
    success = knowledge_service.add_document(document)
    
    if not success:
        print("Failed to add document via test endpoint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add document"
        )
    
    print(f"Document added successfully via test endpoint")
    return {"message": "Document uploaded successfully"}

@router.post("/documents")
async def add_document(
    document: Document,
    current_user: dict = Depends(get_current_supabase_user)
):
    """
    Add a document to the knowledge base.
    
    The document is processed, embedded, and stored in the vector store.
    """
    # Get required info from the NEW user object (which is now a dict)
    user_email = current_user.get('email')
    print(f"Auth: User authenticated as: {user_email}")
    
    # TEMPORARY: Check permission based on email - REPLACE LATER WITH PROPER ROLE CHECK
    if user_email != "admin@example.com":
        print(f"Permission denied for user {user_email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin@example.com can add documents (temporary check)"
        )
    
    # Print document details
    print(f"Adding document: title={document.title}, source={document.source}, category={document.category}")
    print(f"Document text (first 50 chars): {document.text[:50]}...")
    
    # Add document
    success = knowledge_service.add_document(document)
    
    if not success:
        print("Failed to add document - knowledge_service.add_document returned False")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add document"
        )
    
    print(f"Document added successfully")
    return {"message": "Document added successfully"}

# Add an alias endpoint to match the frontend call
@router.post("/upload", response_model=Dict[str, str])
async def upload_document(
    document: Document,
    current_user: dict = Depends(get_current_supabase_user)
):
    """Alias for add_document to match frontend expectations"""
    result = await add_document(document, current_user)
    return {"message": "Document uploaded successfully"}

@router.post("/upload-file", response_model=Dict[str, str])
async def upload_file(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form("{}"),
    current_user: dict = Depends(get_current_supabase_user)
):
    """
    Upload a file to the knowledge base.
    
    The file contents are processed, embedded, and stored in the vector store.
    """
    # TEMPORARY: Check permission based on email - REPLACE LATER WITH PROPER ROLE CHECK
    user_email = current_user.get('email')
    if user_email != "admin@example.com":
        print(f"Permission denied for user {user_email} attempting file upload")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin@example.com can upload documents (temporary check)"
        )
    
    try:
        # Read file content
        content = await file.read()
        text = content.decode("utf-8")
        
        # Parse metadata or use defaults
        try:
            meta_dict = json.loads(metadata)
        except:
            meta_dict = {}
        
        # Create document
        document = Document(
            text=text,
            title=meta_dict.get("title", file.filename),
            source=meta_dict.get("source", "File Upload"),
            category=meta_dict.get("category", "general")
        )
        
        # Add document
        success = knowledge_service.add_document(document)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add file"
            )
        
        return {"message": f"File {file.filename} uploaded successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )

@router.get("/search", response_model=dict)
async def search_knowledge(
    query: str,
    current_user: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db)
):
    """
    Search for documents in the knowledge base.
    
    The query is processed, embedded, and used to find similar documents.
    """
    # The dependency handles auth check. Now perform the search.
    # Note: Permission checks might be needed here too depending on requirements
    role = current_user.get('role')
    print(f"Knowledge search initiated by user: {current_user.get('username')} role: {role}")
    # Example permission check (optional)
    # if role not in ["hr", "admin", "employee"]:
    #    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied for search")
        
    results = knowledge_service.search_documents(query, top_k=5)
    
    return results

@router.get("/check-openai-availability")
async def check_openai_availability():
    """
    Check if OpenAI API is available for embedding generation.
    """
    try:
        # If mock embeddings are enabled, return success
        if USE_MOCK_EMBEDDINGS:
            return {"available": True, "mode": "mock"}
            
        # Try a small test embedding
        text = "test"
        embedding = get_embeddings(text)
        
        if embedding is not None:
            return {"available": True, "mode": "real"}
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI embeddings unavailable"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OpenAI API unavailable: {str(e)}"
        )

@router.get("/api/config/mock-embeddings-status")
async def get_mock_embeddings_status():
    """
    Returns the current status of the USE_MOCK_EMBEDDINGS setting.
    This endpoint is used by the frontend to determine whether to use mock embeddings.
    """
    try:
        # Import the setting from the config
        from app.utils.openai_utils import USE_MOCK_EMBEDDINGS
        
        return {
            "useMockEmbeddings": USE_MOCK_EMBEDDINGS,
            "message": f"Mock embeddings are {'enabled' if USE_MOCK_EMBEDDINGS else 'disabled'}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting mock embeddings status: {str(e)}"
        )

# Add another route with the same functionality but at the root level for compatibility
@router.get("/config/mock-embeddings-status")
async def get_mock_embeddings_status_alt():
    """Alternative path for the same functionality."""
    return await get_mock_embeddings_status()

# Simple test endpoint that always returns mock embeddings status = true
@router.get("/test-mock-embeddings")
async def test_mock_embeddings_status():
    """
    Always returns that mock embeddings are enabled.
    This is for testing purposes when frontend can't reach the main endpoints.
    """
    return {
        "useMockEmbeddings": True,
        "message": "Mock embeddings are enabled (test endpoint)"
    }

@router.get("/test-supabase", response_model=Dict[str, Any])
async def test_supabase_connection():
    """Test the Supabase connection and table access."""
    from ..utils.supabase_config import supabase_client
    
    if supabase_client is None:
        return {
            "success": False,
            "message": "Supabase client not initialized",
            "url_config": os.getenv("SUPABASE_URL", "Not set")
        }
    
    try:
        # Try a simple query to check table access
        response = supabase_client.table("knowledge_documents").select("count(*)", count="exact").execute()
        
        # Check if there's an error
        if hasattr(response, 'error') and response.error:
            return {
                "success": False,
                "message": f"Error querying Supabase: {response.error}",
                "response": str(response)
            }
        
        # Try inserting a test document
        test_doc = {
            "text": "Test document from API test endpoint",
            "metadata": {
                "title": "Test Document",
                "source": "API Test",
                "category": "test"
            },
            "embedding": [0.1] * 1536  # Mock embedding
        }
        
        insert_response = supabase_client.table("knowledge_documents").insert(test_doc).execute()
        
        # Check if the insert worked
        insert_success = hasattr(insert_response, 'data') and insert_response.data and len(insert_response.data) > 0
        
        return {
            "success": True,
            "select_response": str(response),
            "insert_success": insert_success,
            "insert_response": str(insert_response),
            "document_count": getattr(response, 'count', 'Unknown'),
        }
    except Exception as e:
        import traceback
        return {
            "success": False,
            "message": f"Exception testing Supabase: {str(e)}",
            "traceback": traceback.format_exc()
        }
