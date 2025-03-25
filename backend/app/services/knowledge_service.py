from typing import List, Dict, Any
from fastapi import HTTPException, status
from pydantic import BaseModel
from app.utils.vector_store import vector_store

class Document(BaseModel):
    """Document model for API validation."""
    text: str
    title: str
    source: str
    category: str

def add_document(document: Document) -> bool:
    """
    Add a document to the knowledge base.
    
    Args:
        document: Document to add
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create metadata
        metadata = {
            "title": document.title,
            "source": document.source,
            "category": document.category
        }
        
        # Add to vector store
        return vector_store.add_document(document.text, metadata)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding document: {str(e)}"
        )

def search_documents(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Search for documents in the knowledge base.
    
    Args:
        query: Search query
        top_k: Number of results to return
        
    Returns:
        List of document objects
    """
    try:
        # Search vector store with embeddings for knowledge base search
        results = vector_store.search(query, top_k=top_k, is_chat_query=False)
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result["id"],
                "text": result["text"],
                "title": result["metadata"].get("title", "Unknown"),
                "source": result["metadata"].get("source", "Unknown"),
                "category": result["metadata"].get("category", "Unknown"),
                "relevance_score": 1.0 - (result["distance"] / 10.0)  # Normalize to 0-1
            })
        
        return formatted_results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching documents: {str(e)}"
        )
