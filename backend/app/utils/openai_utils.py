import os
import numpy as np
from openai import OpenAI
from typing import List, Dict, Any
from dotenv import load_dotenv
import hashlib

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Check if we should use mock embeddings (for testing without OpenAI credits)
USE_MOCK_EMBEDDINGS = os.getenv("USE_MOCK_EMBEDDINGS", "false").lower() == "true"

def get_chat_completion(messages: List[Dict[str, str]], model: str = "gpt-3.5-turbo"):
    """
    Get a chat completion from OpenAI API.
    
    Args:
        messages: List of message objects with role and content
        model: OpenAI model to use
        
    Returns:
        The assistant's response text
    """
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Log the error in a real application
        print(f"Error calling OpenAI API: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

def get_mock_embedding(text: str, dimension: int = 1536) -> List[float]:
    """
    Generate a mock embedding for testing purposes.
    
    This creates a deterministic embedding based on the text length,
    so the same text always produces the same embedding.
    
    Args:
        text: The text to generate a mock embedding for
        dimension: The dimension of the embedding vector
        
    Returns:
        A list of floats representing the mock embedding
    """
    # Use the hash of the text as a seed for reproducible randomness
    seed = hash(text) % 10000
    np.random.seed(seed)
    
    # Generate a random vector
    embedding = np.random.normal(0, 1, dimension).tolist()
    
    print(f"Generated mock embedding for text (length {len(text)})")
    return embedding

def get_embeddings(text: str, model: str = "text-embedding-3-small"):
    """
    Get embeddings for a given text using OpenAI's model.
    
    IMPORTANT: This function should ONLY be used for knowledge base items,
    not for chat messages. For chat messages, use keyword matching instead.
    
    Args:
        text: The text to generate embeddings for
        model: The embedding model to use
        
    Returns:
        A list of floats representing the embedding vector or None if an error occurred
    """
    try:
        # Check if using mock embeddings
        if USE_MOCK_EMBEDDINGS:
            print("Using mock embeddings (from .env)")
            # Use hash of text to generate deterministic embedding
            text_hash = hashlib.md5(text.encode()).hexdigest()
            # Use the hash to seed a random number generator
            np.random.seed(int(text_hash, 16) % (2**32 - 1))
            # Generate embedding
            mock_embedding = np.random.rand(1536).astype(np.float32) * 0.1
            print(f"Generated mock embedding of shape {mock_embedding.shape}")
            # Return as plain Python list
            return mock_embedding.tolist()
        
        # For real embeddings, use OpenAI
        print(f"Getting real embeddings for text: {text[:50]}...")
        
        # Ensure client is initialized
        global client
        if client is None:
            initialize_openai()
            if client is None:
                print("Failed to initialize OpenAI client")
                return None
        
        # Get the embedding from OpenAI
        response = client.embeddings.create(
            input=text,
            model=model
        )
        
        # Extract the embedding
        embedding = response.data[0].embedding
        print(f"Received embedding of length {len(embedding)}")
        
        # Ensure we return a list, not a numpy array
        if hasattr(embedding, 'tolist'):
            embedding = embedding.tolist()
        
        return embedding
    except Exception as e:
        print(f"Error getting embeddings: {e}")
        import traceback
        print(traceback.format_exc())
        return None
