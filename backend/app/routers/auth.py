from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import Token, User, UserCreate
from app.services import auth_service
from app.utils.auth_utils import get_current_active_user

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

# Add a public test login endpoint for testing without authentication
@router.get("/test-token", response_model=Token)
async def get_test_token():
    """Get a test token for development purposes without requiring authentication."""
    # Generate a test token for a fake user
    test_token = auth_service.get_test_token()
    
    return {"access_token": test_token, "token_type": "bearer"}

@router.post("/register", response_model=User)
async def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user."""
    db_user = auth_service.create_user(db, user)
    return db_user

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
