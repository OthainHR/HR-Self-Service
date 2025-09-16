import os
import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, auth, knowledge, feedback, hr, sync
# Configuration is handled in utils/supabase_config.py

app = FastAPI(
    title="HR Self Service API",
    description="API for HR Self Service Chatbot",
    version="1.0.0"
)

# List of allowed origins (strict allowlist by default, override via CORS_ORIGINS)
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://ess.othain.com,https://admin.othain.com,https://staging-ess.othain.com"
)
origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Preflight handler returns 204
@app.options("/{full_path:path}")
async def _preflight_ok(full_path: str):
    return Response(status_code=204)

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
    enable_hsts = os.getenv("ENABLE_HSTS", "true").lower() == "true"
    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme_is_https = (forwarded_proto == "https") or (str(request.url).startswith("https://"))
    if enable_hsts and scheme_is_https:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

# Simple in-memory rate limiter for sensitive endpoints
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
            return Response(status_code=429, content="Too Many Requests")
        rate_store[key].append(now)
    return await call_next(request)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(feedback.router, prefix="/api/v1", tags=["feedback"])
app.include_router(hr.router, prefix="/api/hr", tags=["hr"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])

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
    use_mock_embeddings = os.getenv("USE_MOCK_EMBEDDINGS", "false").lower() == "true"
    return {
        "useMockEmbeddings": use_mock_embeddings,
        "message": f"Mock embeddings are {'enabled' if use_mock_embeddings else 'disabled'}"
    }
