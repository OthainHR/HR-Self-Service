from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, chat, knowledge
from app.utils.openai_utils import USE_MOCK_EMBEDDINGS
import os

app = FastAPI()

# Get allowed origins from environment variable or use default
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://othain-hr-self-service.vercel.app/,https://hr-self-service-git-main-othainhrs-projects.vercel.app/,https://hr-self-service-cpra97jbe-othainhrs-projects.vercel.app/")
origins = cors_origins_str.split(",")

# Add CORS middleware with proper origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use the configured origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge"])

# Add API prefix router for frontend compatibility
app.include_router(chat.router, prefix="/api/chat", tags=["API"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the HR Chatbot API"}

# API status endpoint
@app.get("/api/status")
async def api_status():
    """Return API status for health checks."""
    return {
        "status": "ok",
        "message": "API is running"
    }

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
