import os
import sys

# Add backend directory to Python path
backend_path = os.path.abspath("backend")
sys.path.insert(0, backend_path)

# Add backend app to Python path
app_path = os.path.join(backend_path, "app")
sys.path.insert(0, app_path)

# Rename the app module to avoid conflicts
if "app" in sys.modules:
    del sys.modules["app"]

# Debug information
print(f"Server.py - Python path: {sys.path}")
print(f"Server.py - Current directory: {os.getcwd()}")
print(f"Server.py - Files in backend: {os.listdir(backend_path)}")
print(f"Server.py - Files in app: {os.listdir(app_path)}")

# Import required modules directly 
import fastapi
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Create a new FastAPI app
app = FastAPI(title="HR Chatbot API")

# Load environment variables
load_dotenv()

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import our backend modules
# We need to import these modules after setting up the path
from backend.app.routers import auth, chat, knowledge
from backend.app.db.init_db import init_db

# Initialize database
init_db()

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])

@app.get("/")
async def root():
    return {"message": "Welcome to HR Chatbot API"}

@app.get("/api/test")
async def test_endpoint():
    return {"status": "ok", "message": "Server is running"}

# For WSGI compatibility
application = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True) 