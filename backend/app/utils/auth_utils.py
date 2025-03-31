import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.models.user import TokenData, User as UserModel
from dotenv import load_dotenv
from .supabase_client import supabase_admin_client
import logging

# Load environment variables
load_dotenv()

# Get authentication settings from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key_for_jwt")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Add logger
logger = logging.getLogger(__name__)

# Password context for hashing and verifying passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 password bearer for JWT token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password, hashed_password):
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a hash for a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token with an expiration time."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get the current user from a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Handle mock tokens with simple string format
    if token and token.startswith("MOCK_ADMIN_TOKEN_"):
        print("Using mock admin token")
        # This is a special case for admin mock tokens
        return TokenData(
            username="admin", 
            role="admin", 
            permissions=["chat:access", "knowledge:access", "knowledge:write", "admin:access"],
            email="admin@example.com"
        )
    
    # Handle user mock tokens
    if token and token.startswith("MOCK_USER_TOKEN_"):
        print("Using mock user token")
        # Create a generic user with chat access
        return TokenData(
            username="user",
            role="employee",
            permissions=["chat:access"],
            email="user@example.com"
        )
        
    # Special handling for mock admin tokens used in testing (legacy format)
    if token and token.startswith("mock_admin_token_with_all_permissions_"):
        print("Using special mock admin token (legacy format)")
        # This is a special case for the mock admin token
        return TokenData(
            username="admin", 
            role="admin", 
            permissions=["chat:access", "knowledge:access", "knowledge:write", "admin:access"],
            email="admin@example.com"
        )
    
    # Special handling for mock user tokens (legacy format)
    if token and token.startswith("mock_user_token_with_chat_access_"):
        print("Using special regular user token (legacy format)")
        # Extract username from token if available
        username = "user"
        if '_' in token:
            parts = token.split('_')
            if len(parts) > 4:
                username = f"user-{parts[-1]}"
        
        return TokenData(
            username=username,
            role="employee",
            permissions=["chat:access"],
            email=f"{username}@example.com"
        )
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "employee")
        permissions: list = payload.get("permissions", [])
        email: str = payload.get("email")
        
        if username is None:
            raise credentials_exception
            
        token_data = TokenData(
            username=username, 
            role=role, 
            permissions=permissions,
            email=email
        )
    except JWTError:
        # Print debugging info when JWT decoding fails
        print(f"JWT decode failed for token: {token[:20]}...")
        raise credentials_exception
    
    # In a real application, you would query the database for the user
    # For this example, we'll just return the token data
    return token_data

async def get_current_active_user(current_user = Depends(get_current_user)):
    """Get the current active user."""
    # In a real application, you would check if the user is active
    return current_user

async def get_current_supabase_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Dependency to validate Supabase JWT and get user data."""
    logger.debug(f"Attempting to validate Supabase token: {token[:15]}...{token[-15:]}")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials - Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if supabase_admin_client is None:
        logger.error("Supabase admin client not available for token validation.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is unavailable",
        )

    try:
        logger.debug("Calling supabase_admin_client.auth.get_user(token)...")
        # Use the Supabase admin client to validate the token
        user_response = supabase_admin_client.auth.get_user(token)
        logger.debug(f"Supabase get_user response received.")
        
        supabase_user = user_response.user
        
        if supabase_user is None:
            logger.warning("Supabase token deemed valid by library, but no user object returned.")
            raise credentials_exception
        
        logger.info(f"Supabase token validated successfully for user: {supabase_user.email}")
        
        # Map Supabase user data to a dictionary format expected by endpoints
        user_data_for_endpoints = {
            "username": supabase_user.email,
            "email": supabase_user.email,
            "role": supabase_user.user_metadata.get('role', 'authenticated'),
            "permissions": supabase_user.user_metadata.get('permissions', []),
            "id": supabase_user.id
        }
        logger.debug(f"Returning user data: {user_data_for_endpoints}")
        return user_data_for_endpoints
        
    except Exception as e:
        logger.error(f"Supabase token validation failed! Error type: {type(e).__name__}, Error: {e}", exc_info=True)
        # Log details about the exception
        # Check for specific Supabase/GoTrue errors if possible, e.g., invalid JWT
        if "invalid" in str(e).lower() or "expired" in str(e).lower() or "401" in str(e):
             logger.warning(f"Potential invalid/expired token based on error string: {e}")
             raise credentials_exception
        else:
            # For unexpected errors, raise a 500 or the original credentials exception
            logger.error("Unexpected error during Supabase token validation.")
            raise credentials_exception
