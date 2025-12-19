import logging
from typing import List, Dict, Any
from fastapi import HTTPException, status
from pydantic import BaseModel
from app.utils.vector_store import vector_store

logger = logging.getLogger(__name__)

class Document(BaseModel):
    """Document model for API validation."""
    text: str
    title: str
    source: str
    category: str

# Make add_document async to await vector_store.add_document
async def add_document(document: Document) -> bool:
    """
    Add a document to the knowledge base.
    
    Args:
        document: Document to add
        
    Returns:
        True if successful, False otherwise (or raises HTTPException on error).
    """
    logger.info(f"Entered knowledge_service.add_document for title: {document.title}")
    try:
        metadata = {
            "title": document.title,
            "source": document.source,
            "category": document.category
        }
        # logger.info(f"Prepared metadata: {metadata}")

        logger.info("Calling vector_store.add_document...")
        # Await the async vector_store method
        success = await vector_store.add_document(document.text, metadata)
        logger.info(f"vector_store.add_document returned: {success}")

        # If vector_store.add_document returns False, treat it as an error
        if not success:
             logger.error("vector_store.add_document returned False, raising internal error.")
             raise Exception("Vector store failed to add the document.") # Generic exception to be caught below

        return success # Should be True if we reach here

    except Exception as e:
        # Log the specific exception from vector_store or get_embeddings
        logger.exception(f"Exception caught in knowledge_service.add_document: {e}")
        # Re-raise as HTTPException for FastAPI to handle
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            # Provide a more specific detail if possible, but keep it general for the client
            detail=f"Failed to add document in service"
            # detail=f"Error adding document in service: {str(e)}" # Avoid exposing internal error details
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
