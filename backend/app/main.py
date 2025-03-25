from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, chat, knowledge
from app.utils.openai_utils import USE_MOCK_EMBEDDINGS

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the HR Chatbot API"}

# Utility endpoints that can be accessed directly
@app.get("/knowledge/test-mock-embeddings")
async def test_mock_embeddings():
    """Test endpoint for mock embeddings status."""
    return {
        "useMockEmbeddings": True,
        "message": "Mock embeddings are enabled (test endpoint)"
    }

@app.get("/knowledge/config/mock-embeddings-status")
async def get_mock_embeddings_status():
    """Returns the current status of USE_MOCK_EMBEDDINGS."""
    return {
        "useMockEmbeddings": USE_MOCK_EMBEDDINGS,
        "message": f"Mock embeddings are {'enabled' if USE_MOCK_EMBEDDINGS else 'disabled'}"
    }
