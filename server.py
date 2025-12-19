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
from typing import Dict, List, Tuple
import time
from collections import defaultdict
from dotenv import load_dotenv

# Create a new FastAPI app
app = FastAPI(title="HR Chatbot API")

# Load environment variables
load_dotenv()

# Configure CORS (strict allowlist)
cors_origins = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://ess.othain.com"
).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Preflight handler returns 204
@app.options("/{full_path:path}")
async def _preflight_ok(full_path: str):
    return fastapi.Response(status_code=204)

# Security headers middleware
@app.middleware("http")
async def set_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Vary", "Origin")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    csp_report_only = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self' https://*.othain.com; "
        "frame-ancestors 'self'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    response.headers.setdefault("Content-Security-Policy-Report-Only", csp_report_only)
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto == "https" or str(request.url).startswith("https://"):
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

# Simple in-memory rate limiter for auth token route
RATE_LIMITS: Dict[str, Tuple[int, int]] = {
    "/api/auth/token": (30, 10 * 60),
}
rate_store: Dict[Tuple[str, str], List[float]] = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    client_ip = (request.client.host if request.client else "unknown") or "unknown"
    if path in RATE_LIMITS:
        max_requests, window_seconds = RATE_LIMITS[path]
        key = (client_ip, path)
        now = time.time()
        window_start = now - window_seconds
        recent = [ts for ts in rate_store[key] if ts >= window_start]
        rate_store[key] = recent
        if len(recent) >= max_requests:
            return fastapi.Response(status_code=429, content="Too Many Requests")
        rate_store[key].append(now)
    return await call_next(request)

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