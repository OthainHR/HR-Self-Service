from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import UserDB, User, UserCreate
from app.utils.auth_utils import verify_password, get_password_hash, create_access_token

def get_user_by_username(db: Session, username: str):
    """Get a user by username."""
    return db.query(UserDB).filter(UserDB.username == username).first()

def get_user_by_email(db: Session, email: str):
    """Get a user by email."""
    return db.query(UserDB).filter(UserDB.email == email).first()

def create_user(db: Session, user: UserCreate):
    """Create a new user."""
    # Check if username or email already exists
    if get_user_by_username(db, user.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = UserDB(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    """Authenticate a user."""
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_access_token(user: UserDB):
    """Get an access token for a user."""
    # Set different token expiration times based on role
    if user.role == "admin":
        access_token_expires = timedelta(days=7)  # Longer expiration for admins
    else:
        access_token_expires = timedelta(days=1)  # Shorter expiration for regular users
    
    # Create permissions claims based on user role
    permissions = []
    if user.role == "admin":
        permissions = ["chat:access", "knowledge:access", "knowledge:write", "admin:access"]
    else:
        permissions = ["chat:access"]  # Regular users only get chat access
    
    # Create access token with role-specific permissions
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": user.role,
            "permissions": permissions,
            "email": user.email
        },
        expires_delta=access_token_expires
    )
    return access_token

def get_test_token():
    """Generate a test token for development purposes."""
    # Create test user data
    test_user_data = {
        "sub": "test_user",
        "role": "admin"  # Give admin role for full access
    }
    
    # Set a long expiration time for development
    expires_delta = timedelta(days=30)
    
    # Create JWT token
    test_token = create_access_token(
        data=test_user_data, 
        expires_delta=expires_delta
    )
    
    return test_token
