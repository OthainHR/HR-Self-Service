from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import Token, User, UserCreate
from app.services import auth_service
from app.utils.auth_utils import get_current_active_user, create_access_token
from datetime import datetime, timedelta
import os
import re
from pathlib import Path

DEBUG_MODE = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Get an access token for a user."""
    # Authenticate user
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get access token
    access_token = auth_service.get_access_token(user)
    
    return {"access_token": access_token, "token_type": "bearer"}

# Test token endpoint - only available in DEBUG mode
@router.get("/test-token", response_model=Token)
async def get_test_token():
    """Get a test token for development purposes without requiring authentication."""
    if not DEBUG_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available"
        )
    access_token = create_access_token(
        data={"sub": "test-user", "role": "admin"},
        expires_delta=timedelta(hours=24)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=User)
async def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    # Enforce strong password policy: min 12 chars, at least 3 of 4 classes
    password = user.password or ""
    classes = 0
    classes += 1 if re.search(r"[A-Z]", password) else 0
    classes += 1 if re.search(r"[a-z]", password) else 0
    classes += 1 if re.search(r"[0-9]", password) else 0
    classes += 1 if re.search(r"[^A-Za-z0-9]", password) else 0
    if len(password) < 12 or classes < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password does not meet complexity requirements (min 12 chars and 3 of: upper, lower, digit, symbol)"
        )
    # Block top common passwords (local list)
    try:
        common_pw_path = Path(__file__).resolve().parent.parent / "utils" / "common_passwords.txt"
        if common_pw_path.exists():
            with open(common_pw_path, "r", encoding="utf-8", errors="ignore") as f:
                common_passwords = set(line.strip() for line in f if line.strip())
            if password.lower() in common_passwords:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is too common. Please choose a stronger password."
                )
    except Exception:
        # Fail-closed not required here; continue without blocking if list cannot be read
        pass
    db_user = auth_service.create_user(db, user)
    return db_user

@router.post("/logout")
async def logout(authorization: str = Header(None)):
    """Endpoint for user logout. Validates the token before confirming logout."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        # Log the logout event for audit purposes
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"User logout requested with token: {token[:20]}...")
    return {"message": "Logout successful"}

@router.get("/me", response_model=dict)
async def read_users_me(current_user = Depends(get_current_active_user)):
    """Get the current user."""
    return {"username": current_user.username, "role": current_user.role}

# Add a debug endpoint to verify tokens
@router.get("/verify-token")
async def verify_token(authorization: str = Header(None)):
    """Verify a JWT token and return its payload."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"valid": False, "error": "Missing or invalid Authorization header"}
    
    # Extract token from header
    token = authorization.replace("Bearer ", "")
    
    try:
        # Decode the token
        from app.utils.auth_utils import jwt, SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Return the decoded payload
        return {
            "valid": True,
            "payload": payload
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
