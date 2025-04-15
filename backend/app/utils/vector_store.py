import os
import json
import numpy as np
import logging
from typing import List, Dict, Any, Optional
import faiss
from .openai_utils import get_embeddings
from .supabase_config import supabase_client
import traceback

# Configure logging
logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self, table_name: str = "knowledge_documents"):
        """
        Initialize the vector store.
        
        Args:
            table_name: Name of the Supabase table for documents
        """
        self.table_name = table_name
        self.documents = []
        self.embeddings = None
        self.index = None
        
        # Check if Supabase is initialized
        if supabase_client is None:
            logger.warning("Supabase not initialized. Using local storage fallback.")
            print("Warning: Supabase not initialized. Using local storage fallback.")
            self.use_supabase = False
            self.data_path = "app/data"
            # Create data directory if it doesn't exist
            os.makedirs(self.data_path, exist_ok=True)
        else:
            logger.info(f"Using Supabase with table: {table_name}")
            self.use_supabase = True
        
        # Load existing documents and build index if available
        self.load_documents()
        if self.documents:
            self.build_index()
    
    def load_documents(self):
        """Load documents from Supabase or local storage."""
        if self.use_supabase:
            try:
                # Get all documents from the table
                response = supabase_client.table(self.table_name).select("*").execute()
                
                self.documents = []
                
                for doc in response.data:
                    # Process embedding - ensure it's a numeric list
                    embedding = doc["embedding"]
                    if isinstance(embedding, str):
                        # If it's a string representation, convert it to a list of floats
                        try:
                            # Try to parse it as JSON
                            embedding = json.loads(embedding)
                        except:
                            # If that fails, try to parse it as a Python literal
                            import ast
                            try:
                                embedding = ast.literal_eval(embedding)
                            except:
                                print(f"Warning: Could not parse embedding for document {doc['id']}")
                                # Use a dummy embedding
                                embedding = [0.0] * 1536
                    
                    # Add document to the local list
                    self.documents.append({
                        "id": doc["id"],
                        "text": doc["text"],
                        "metadata": doc["metadata"],
                        "embedding": embedding
                    })
                    
                print(f"Loaded {len(self.documents)} documents from Supabase")
            except Exception as e:
                print(f"Error loading documents from Supabase: {e}")
                print(traceback.format_exc())
                self.documents = []
                # Fall back to local storage
                self._load_documents_local()
        else:
            # Use local storage
            self._load_documents_local()
    
    def _load_documents_local(self):
        """Load documents from local storage as fallback."""
        documents_path = os.path.join(self.data_path, "documents.json")
        if os.path.exists(documents_path):
            try:
                with open(documents_path, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
                print(f"Loaded {len(self.documents)} documents from local storage")
            except Exception as e:
                print(f"Error loading documents from local storage: {e}")
                self.documents = []
    
    def save_documents(self):
        """Save documents to Supabase or local storage."""
        if self.use_supabase:
            # Documents are saved individually when added, no need to save all at once
            pass
        else:
            # Fall back to local storage
            self._save_documents_local()
    
    def _save_documents_local(self):
        """Save documents to local storage as fallback."""
        documents_path = os.path.join(self.data_path, "documents.json")
        try:
            with open(documents_path, "w", encoding="utf-8") as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
            print(f"Saved {len(self.documents)} documents to local storage")
        except Exception as e:
            print(f"Error saving documents to local storage: {e}")
            print(traceback.format_exc())
    
    async def add_document(self, text: str, metadata: Dict[str, Any]) -> bool:
        """
        Add a document to the vector store.
        
        Args:
            text: Document text
            metadata: Document metadata
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"Attempting to add document: {metadata.get('title', 'No Title')}")
        print(f"Attempting to add document: {metadata.get('title', 'No Title')}")

        try:
            # Basic validation
            if not text or not metadata:
                logger.warning("Missing text or metadata for adding document")
                print("Missing text or metadata")
                return False

            # Optional: Check document size
            if len(text) > 100000:  # Adjust this limit as needed
                logger.warning("Document too large")
                print("Document too large")
                return False

            # Get embeddings for the document asynchronously
            logger.info("Generating embeddings for document")
            print(f"Generating embeddings for document: {text[:50]}...")
            # Await the async get_embeddings function
            embedding = await get_embeddings(text)
            if embedding is None:
                # The get_embeddings function now raises an exception on failure,
                # so this check might be redundant if the exception isn't caught there.
                # However, it's good practice to keep it.
                logger.error("Failed to get embeddings for document (embedding is None)")
                print(f"Failed to get embeddings for document (embedding is None)")
                return False

            # print(f"Got embeddings of length {len(embedding) if embedding else 'None'}")

            if self.use_supabase:
                logger.info(f"Adding document to Supabase table: {self.table_name}")
                # print(f"Adding document to Supabase table: {self.table_name}")

                # Create document for Supabase
                document_data = {
                    "text": text,
                    "metadata": metadata,
                    # Embedding should already be a list from get_embeddings
                    "embedding": embedding
                }

                # logger.info(f"Document metadata: {metadata}")
                # print(f"Document data: Text length={len(text)}, Metadata={metadata}, Embedding length={len(embedding)}")

                # Save to Supabase
                try:
                    logger.info("Sending document to Supabase...")
                    # print("Sending document to Supabase...")

                    # Debug supabase client
                    if supabase_client is None:
                        logger.critical("CRITICAL ERROR: supabase_client is None before insert!")
                        print("CRITICAL ERROR: supabase_client is None!")
                        return False

                    # print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
                    # print(f"Document keys: {list(document_data.keys())}")
                    # print(f"Metadata type: {type(metadata)}")

                    # Insert document
                    # Note: Supabase Python client's insert might be blocking.
                    # If performance becomes an issue, consider libraries like 'supabase-py-async'
                    # or running this in a separate thread/process pool.
                    print("Executing Supabase insert...")
                    response = supabase_client.table(self.table_name).insert(document_data).execute()
                    # print("Insert executed.")
                    # print(f"Supabase response: {response.__dict__ if hasattr(response, '__dict__') else response}")

                    if hasattr(response, 'error') and response.error:
                        logger.error(f"Supabase error during insert: {response.error}")
                        print(f"Error from Supabase: {response.error}")
                        return False

                    if hasattr(response, 'data') and response.data and len(response.data) > 0:
                        document = document_data.copy()
                        document["id"] = response.data[0]["id"]
                        self.documents.append(document)

                        logger.info(f"Added document to Supabase with ID: {document['id']}")
                        print(f"Added document to Supabase with ID: {document['id']}")

                        # Rebuild index (synchronous for now)
                        self.build_index()
                        return True
                    else:
                        logger.error("Failed to insert document into Supabase - empty or error response data")
                        print("Error: Failed to insert document into Supabase")
                        if hasattr(response, 'error'):
                            print(f"Response error: {response.error}")
                        return False
                except Exception as e:
                    logger.exception(f"Supabase insert operation failed: {e}")
                    print(f"Supabase insert error: {e}")
                    print(traceback.format_exc())
                    return False
            else:
                # Handle local storage (remains synchronous)
                logger.info("Using local storage (Supabase not initialized)")
                print("Using local storage (Supabase not initialized)")
                document = {
                    "id": str(len(self.documents)),
                    "text": text,
                    "metadata": metadata,
                    "embedding": embedding
                }
                self.documents.append(document)
                self._save_documents_local()
                self.build_index()
                return True # Assuming local storage is successful

        except Exception as e:
            # Catch errors from get_embeddings or other issues before Supabase/local save
            logger.exception(f"Error in add_document method: {e}")
            print(f"Error in add_document: {e}")
            print(traceback.format_exc())
            return False
    
    def build_index(self):
        """Build a FAISS index from document embeddings."""
        try:
            if not self.documents:
                return
            
            # Extract embeddings
            embeddings_list = []
            for doc in self.documents:
                # Make sure each embedding is properly formatted as a list of floats
                embedding = doc["embedding"]
                if isinstance(embedding, str):
                    # Parse string to list if needed
                    try:
                        import json
                        embedding = json.loads(embedding)
                    except:
                        import ast
                        try:
                            embedding = ast.literal_eval(embedding)
                        except:
                            print(f"Warning: Skipping document with invalid embedding: {doc['id']}")
                            continue
                
                # Convert to float array
                embeddings_list.append(embedding)
            
            # Create numpy array
            if embeddings_list:
                self.embeddings = np.array(embeddings_list).astype('float32')
                
                # Build index
                dimension = len(embeddings_list[0])
                self.index = faiss.IndexFlatL2(dimension)
                self.index.add(self.embeddings)
                
                print(f"Built index with {len(self.documents)} documents")
            else:
                print("No valid embeddings found to build index")
        except Exception as e:
            print(f"Error building index: {e}")
            print(traceback.format_exc())
    
    def search(self, query: str, top_k: int = 3, is_chat_query: bool = False) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query.
        
        Args:
            query: The search query
            top_k: Number of results to return
            is_chat_query: If True, use keyword matching instead of embeddings for chat messages
            
        Returns:
            List of document objects
        """
        try:
            if not self.documents:
                return []
            
            if is_chat_query:
                # For chat queries, use simple keyword matching instead of embeddings
                print(f"Using keyword matching for chat query: {query}")
                results = []
                
                # Convert query to lowercase for case-insensitive matching
                query_lower = query.lower()
                # Split query into words
                query_words = set(query_lower.split())
                
                # Score documents based on keyword matching
                scored_docs = []
                for doc in self.documents:
                    text_lower = doc["text"].lower()
                    
                    # Simple scoring based on word presence
                    score = 0
                    for word in query_words:
                        if len(word) > 2 and word in text_lower:  # Only count words with at least 3 chars
                            score += 1
                    
                    # Normalize score
                    if len(query_words) > 0:
                        normalized_score = score / len(query_words)
                        if normalized_score > 0:  # Only include docs with some match
                            scored_docs.append((doc, normalized_score))
                
                # Sort by score (descending)
                scored_docs.sort(key=lambda x: x[1], reverse=True)
                
                # Take top_k results
                for doc, score in scored_docs[:top_k]:
                    results.append({
                        "id": doc["id"],
                        "text": doc["text"],
                        "metadata": doc["metadata"],
                        "distance": 1.0 - score  # Convert score to distance (0 is best)
                    })
                
                return results
            
            # For knowledge base queries, use embeddings as before
            if not self.index:
                return []
            
            # Get query embedding
            query_embedding = get_embeddings(query)
            if query_embedding is None:
                return []
            
            # Convert to numpy array
            query_embedding_np = np.array([query_embedding]).astype('float32')
            
            # Search index
            distances, indices = self.index.search(query_embedding_np, min(top_k, len(self.documents)))
            
            # Get results
            results = []
            for i, idx in enumerate(indices[0]):
                if idx < 0 or idx >= len(self.documents):
                    continue
                
                doc = self.documents[idx]
                results.append({
                    "id": doc["id"],
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "distance": float(distances[0][i])
                })
            
            return results
        except Exception as e:
            print(f"Error searching index: {e}")
            return []

# Create a global instance
vector_store = VectorStore()
