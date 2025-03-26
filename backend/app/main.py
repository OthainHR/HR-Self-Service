from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, auth, knowledge
from app.core.config import settings

app = FastAPI(
    title="HR Self Service API",
    description="API for HR Self Service Chatbot",
    version="1.0.0"
)

# List of allowed origins
origins = [
    "http://localhost:3000",          # React dev server
    "https://othain-hr-self-service.vercel.app",  # Production domain
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])

@app.get("/")
async def root():
    """Root endpoint to verify API is running"""
    return {
        "message": "HR Self Service API is running",
        "version": "1.0.0",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

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
