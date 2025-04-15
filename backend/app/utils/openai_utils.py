import os
import numpy as np
# Use AsyncOpenAI for async FastAPI app
from openai import AsyncOpenAI
from typing import List, Dict, Any
from dotenv import load_dotenv
import hashlib

# Load environment variables
load_dotenv()

# Initialize AsyncOpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Check if we should use mock embeddings (for testing without OpenAI credits)
USE_MOCK_EMBEDDINGS = os.getenv("USE_MOCK_EMBEDDINGS", "false").lower() == "true"

async def get_chat_completion(messages: List[Dict[str, str]], model: str = "gpt-4.1-mini"):
    """
    Get a chat completion from OpenAI API.
    
    Args:
        messages: List of message objects with role and content
        model: OpenAI model to use
        
    Returns:
        The assistant's response text
    """
    try:
        # Use await with the async client
        response = await client.chat.completions.create(
            model=model,
            messages=messages
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Log the error in a real application
        print(f"Error calling OpenAI API: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

async def get_chat_completion_stream(messages: List[Dict[str, str]], model: str = "gpt-4.1-mini"):
    """
    Get a chat completion stream from OpenAI API (async).
    
    Args:
        messages: List of message objects with role and content
        model: OpenAI model to use
        
    Yields:
        Chunks of the assistant's response text as they arrive.
    """
    try:
        # Use await with the async client
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            stream=True,
        )
        # Use async for with the async stream
        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
    except Exception as e:
        print(f"Error calling OpenAI stream API: {e}")
        yield f"Sorry, I encountered an error during streaming: {str(e)}"

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

# Function to get embeddings for a given text using OpenAI API
# Use async def for compatibility with async OpenAI client
async def get_embeddings(text: str, model: str = "text-embedding-3-small") -> List[float]:
    """
    Generates embeddings for the given text using the specified OpenAI model.

    Args:
        text (str): The input text to embed.
        model (str): The OpenAI embedding model to use.

    Returns:
        List[float]: The generated embedding vector, or None if an error occurs.
    """
    print(f"Getting real embeddings for text: {text[:50]}...") # Keep this for debugging
    try:
        # Ensure client is initialized (consider moving initialization if not already done globally)
        # client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) # If using synchronous client
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) # Ensure using async client

        # Get the embedding from OpenAI asynchronously
        response = await client.embeddings.create(
            input=text,
            model=model
        )

        # Extract the embedding
        embedding = response.data[0].embedding
        # print(f"Received embedding of length {len(embedding)}") # Optional: keep if needed

        # Ensure we return a list, not a numpy array if applicable (unlikely with OpenAI client)
        # if hasattr(embedding, 'tolist'):
        #     embedding = embedding.tolist()

        return embedding
    except Exception as e:
        print(f"Error getting embeddings: {e}")
        import traceback
        print(traceback.format_exc())
        # Depending on desired behavior, either return None or re-raise
        # return None
        raise  # Re-raise the exception so the caller knows something went wrong
