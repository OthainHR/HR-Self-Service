# This is the main FastAPI application module (main:app)
# For WSGI/Gunicorn deployments, this should be imported as "main:app"
import os
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import auth, chat, knowledge, feedback, hr
from app.db.init_db import init_db

# Load environment variables
load_dotenv()

# Initialize database
init_db()

app = FastAPI(title="HR Chatbot API")

# Get CORS origins from environment variable (strict allowlist by default)
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://ess.othain.com,https://admin.othain.com,https://staging-ess.othain.com"
)
cors_origins = cors_origins_str.split(",")
print(f"*** Allowed CORS Origins: {cors_origins} ***")

# 1. CORSMiddleware MUST be the first middleware added.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Optional: Add a catch-all for OPTIONS requests as a secondary safeguard.
# This runs after CORSMiddleware but before specific routes.
@app.options("/{full_path:path}")
async def _preflight_ok(full_path: str):
    return Response(status_code=204)

# Optional: Add a debug middleware to log authentication headers.
# This runs after the OPTIONS handler, so it won't log pre-flight requests.
@app.middleware("http")
async def log_auth_headers(request: Request, call_next):
    # Log the authentication header
    auth_header = request.headers.get("Authorization")
    print(f"Request to {request.url.path} with auth: {auth_header}")
    
    # Continue processing the request
    response = await call_next(request)
    return response

# All other middleware and routers are added AFTER CORSMiddleware.

# Security Headers Middleware (CSP report-only initially)
@app.middleware("http")
async def set_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Core security headers
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Vary", "Origin")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    # CSP in Report-Only mode first
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
    # Optional legacy XSS header
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    # HSTS only when behind HTTPS (respect proxies)
    enable_hsts = os.getenv("ENABLE_HSTS", "true").lower() == "true"
    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme_is_https = (forwarded_proto == "https") or (str(request.url).startswith("https://"))
    if enable_hsts and scheme_is_https:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

# Simple in-memory rate limiter for sensitive endpoints (per IP)
RATE_LIMITS: Dict[str, Tuple[int, int]] = {
    "/api/auth/token": (30, 10 * 60),  # max 30 requests per 10 minutes
}
rate_store: Dict[Tuple[str, str], List[float]] = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    client_ip = (request.client.host if request.client else "unknown") or "unknown"
    # Skip preflight requests
    if request.method == "OPTIONS":
        return await call_next(request)
    if path in RATE_LIMITS:
        max_requests, window_seconds = RATE_LIMITS[path]
        key = (client_ip, path)
        now = time.time()
        window_start = now - window_seconds
        # prune old timestamps
        recent = [ts for ts in rate_store[key] if ts >= window_start]
        rate_store[key] = recent
        if len(recent) >= max_requests:
            return Response(status_code=429, content="Too Many Requests")
        rate_store[key].append(now)
    return await call_next(request)

# Add a simple public test endpoint
@app.get("/api/test")
async def test_endpoint():
    return {"status": "ok", "message": "Server is running"}

# Add endpoints for getting mock embeddings status
@app.get("/api/knowledge/test-mock-embeddings")
async def test_mock_embeddings():
    """Test endpoint for mock embeddings status."""
    return {
        "useMockEmbeddings": True,
        "message": "Mock embeddings are enabled (test endpoint)"
    }

@app.get("/api/knowledge/config/mock-embeddings-status")
async def get_mock_embeddings_status():
    """Returns the current mock embeddings status."""
    from app.utils.openai_utils import USE_MOCK_EMBEDDINGS
    return {
        "useMockEmbeddings": USE_MOCK_EMBEDDINGS,
        "message": f"Mock embeddings are {'enabled' if USE_MOCK_EMBEDDINGS else 'disabled'}"
    }

# Add a public test endpoint for chat
@app.post("/api/chat/public")
async def public_chat_endpoint(request: Request):
    """A public chat endpoint that doesn't require authentication."""
    # Parse the request body
    try:
        from app.services import chat_service
        from app.models.chat import ChatRequest, ChatResponse
        
        # Parse request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("session_id", "")
        user_id = body.get("user_id", "anonymous")
        
        # Create a chat request
        chat_request = ChatRequest(
            message=message,
            session_id=session_id,
            user_id=user_id
        )
        
        # Process the request through the real chat service
        response = await chat_service.process_chat_request(chat_request)
        
        return {
            "response": response.message,
            "message": message,
            "authenticated": False,
            "processed_by": "OpenAI" 
        }
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Error in public chat endpoint: {e}\n{traceback_str}")
        return {
            "error": str(e),
            "message": "There was an error processing your request. Please try again.",
            "traceback": traceback_str if "DEBUG" in os.environ else None
        }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["Feedback"])
app.include_router(hr.router, prefix="/api/hr", tags=["HR"])
print("--- DEBUG: Included feedback router with prefix /api/v1/feedback ---")
print("--- DEBUG: Included HR router with prefix /api/hr (Direct API Key Method) ---")

@app.get("/")
async def root():
    return {"message": "Welcome to HR Chatbot API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
