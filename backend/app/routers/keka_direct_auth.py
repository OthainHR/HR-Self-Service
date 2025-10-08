"""
Keka Direct Authentication Router
Handles Keka API token generation using grant_type=kekaapi
This is a simpler alternative to OAuth2 flow
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.auth_utils import get_current_supabase_user
from app.models.hr import KekaDirectTokenRequest, KekaDirectTokenResponse
from app.services.keka_direct_token_service import keka_direct_token_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_user_email(current_user: dict = Depends(get_current_supabase_user)) -> str:
    """Extract and validate user email from authentication"""
    email = current_user.get('email')
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User email not found in authentication token"
        )
    return email

@router.post("/generate-token", response_model=KekaDirectTokenResponse)
async def generate_keka_token(
    user_email: str = Depends(get_user_email)
):
    """
    Generate a new Keka API token for the current user
    
    This endpoint generates a token using grant_type=kekaapi and caches it
    for the user. The token will be automatically reused until it expires.
    """
    try:
        logger.info(f"Generating Keka token for user: {user_email}")
        
        # Get or generate token for user
        access_token = await keka_direct_token_service.get_or_generate_token_for_user(user_email)
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate Keka API token. Please check your configuration."
            )
        
        return KekaDirectTokenResponse(
            success=True,
            message="Successfully generated Keka API token",
            access_token=access_token,
            expires_in=3600,  # Typically 1 hour
            token_type="Bearer"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating token for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token generation failed: {str(e)}"
        )

@router.get("/token-status")
async def get_token_status(
    user_email: str = Depends(get_user_email)
):
    """
    Get the status of the user's cached Keka API token
    """
    try:
        status_info = await keka_direct_token_service.get_token_status(user_email)
        return {
            "success": True,
            **status_info
        }
    except Exception as e:
        logger.error(f"Error getting token status for {user_email}: {str(e)}")
        return {
            "success": False,
            "status": "error",
            "message": str(e)
        }

@router.delete("/revoke-token")
async def revoke_token(
    user_email: str = Depends(get_user_email)
):
    """
    Revoke the user's cached Keka API token
    """
    try:
        success = await keka_direct_token_service.revoke_cached_token(user_email)
        
        if success:
            return {
                "success": True,
                "message": "Token revoked successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to revoke token or no token found"
            }
            
    except Exception as e:
        logger.error(f"Error revoking token for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token revocation failed: {str(e)}"
        )

@router.post("/refresh-token", response_model=KekaDirectTokenResponse)
async def refresh_token(
    user_email: str = Depends(get_user_email)
):
    """
    Force refresh the user's Keka API token
    
    This will generate a new token even if the current one is still valid
    """
    try:
        # Revoke existing token
        await keka_direct_token_service.revoke_cached_token(user_email)
        
        # Generate new token
        access_token = await keka_direct_token_service.get_or_generate_token_for_user(user_email)
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to refresh Keka API token"
            )
        
        return KekaDirectTokenResponse(
            success=True,
            message="Successfully refreshed Keka API token",
            access_token=access_token,
            expires_in=3600,
            token_type="Bearer"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

