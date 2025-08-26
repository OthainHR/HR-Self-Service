"""
Keka OAuth Authentication Router
Handles Keka OAuth setup and token management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.auth_utils import get_current_supabase_user
from app.models.hr import KekaAuthRequest, KekaAuthResponse
from app.services.keka_token_service import keka_token_service
from app.services.keka_mcp_service import keka_mcp_service
from datetime import datetime
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

@router.get("/authorization-url")
async def get_keka_authorization_url(user_email: str = Depends(get_user_email)):
    """
    Get the Keka OAuth authorization URL for the user
    """
    try:
        auth_url = keka_token_service.get_authorization_url()
        if not auth_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Keka OAuth configuration is incomplete"
            )
        
        return {
            "authorization_url": auth_url,
            "message": "Please visit this URL to authorize access to your Keka account"
        }
    except Exception as e:
        logger.error(f"Error generating auth URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate authorization URL"
        )

@router.post("/callback", response_model=KekaAuthResponse)
async def keka_oauth_callback(
    auth_request: KekaAuthRequest,
    user_email: str = Depends(get_user_email)
):
    """
    Handle Keka OAuth callback and exchange code for tokens
    """
    try:
        result = await keka_token_service.initialize_user_keka_auth(
            user_email, 
            auth_request.authorization_code
        )
        return result
    except Exception as e:
        logger.error(f"OAuth callback error for {user_email}: {str(e)}")
        return KekaAuthResponse(
            success=False,
            message="Failed to process authorization callback"
        )

@router.get("/status")
async def get_keka_auth_status(user_email: str = Depends(get_user_email)):
    """
    Get the current Keka authentication status for the user
    """
    try:
        token_health = await keka_token_service.get_token_health_status(user_email)
        is_authenticated = await keka_token_service.is_user_authenticated(user_email)
        
        response = {
            "is_authenticated": is_authenticated,
            "token_health": token_health
        }
        
        # Add auth URL if not authenticated
        if not is_authenticated:
            auth_url = keka_token_service.get_authorization_url()
            if auth_url:
                response["authorization_url"] = auth_url
        
        return response
    except Exception as e:
        logger.error(f"Error checking auth status for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check authentication status"
        )

@router.post("/refresh")
async def refresh_keka_tokens(user_email: str = Depends(get_user_email)):
    """
    Manually refresh Keka tokens for the user
    """
    try:
        refreshed_tokens = await keka_token_service.refresh_user_tokens(user_email)
        if refreshed_tokens:
            return {
                "success": True,
                "message": "Tokens refreshed successfully",
                "expires_at": refreshed_tokens.expires_at.isoformat()
            }
        else:
            return {
                "success": False,
                "message": "Failed to refresh tokens. Please re-authorize with Keka."
            }
    except Exception as e:
        logger.error(f"Token refresh error for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh tokens"
        )

@router.delete("/disconnect")
async def disconnect_keka_account(user_email: str = Depends(get_user_email)):
    """
    Disconnect user's Keka account by revoking tokens
    """
    try:
        success = await keka_token_service.revoke_user_tokens(user_email)
        
        if success:
            return {
                "success": True,
                "message": "Successfully disconnected from Keka account"
            }
        else:
            return {
                "success": False,
                "message": "Failed to disconnect Keka account"
            }
    except Exception as e:
        logger.error(f"Error disconnecting Keka for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Keka account"
        )

@router.get("/test-connection")
async def test_keka_connection(user_email: str = Depends(get_user_email)):
    """
    Test the Keka API connection by fetching user profile
    """
    try:
        # Set the authenticated user in the MCP service
        keka_mcp_service.set_authenticated_user(user_email)
        
        # Try to fetch the user's profile
        profile = await keka_mcp_service.get_my_profile()
        
        return {
            "success": True,
            "message": "Keka connection is working",
            "profile_name": profile.full_name,
            "employee_id": profile.employee_id
        }
    except HTTPException as e:
        if e.status_code == 401:
            auth_url = keka_token_service.get_authorization_url()
            return {
                "success": False,
                "message": "Not authenticated with Keka",
                "authorization_url": auth_url,
                "requires_auth": True
            }
        else:
            return {
                "success": False,
                "message": f"Keka API error: {e.detail}",
                "requires_auth": False
            }
    except Exception as e:
        logger.error(f"Keka connection test error for {user_email}: {str(e)}")
        return {
            "success": False,
            "message": "Failed to test Keka connection",
            "requires_auth": False
        }

# Administrative endpoints (you might want to restrict these to admin users)
@router.get("/admin/user-tokens")
async def list_user_tokens(user_email: str = Depends(get_user_email)):
    """
    List all users with Keka tokens (admin only)
    """
    # Add admin check here if needed
    try:
        from app.utils.supabase_client import supabase_admin_client
        
        response = supabase_admin_client.table("user_keka_tokens").select(
            "user_email, expires_at, created_at, updated_at"
        ).execute()
        
        return {
            "users": response.data or [],
            "total_count": len(response.data) if response.data else 0
        }
    except Exception as e:
        logger.error(f"Error listing user tokens: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list user tokens"
        )

@router.get("/admin/token-health")
async def get_token_health_overview():
    """
    Get overview of all token health statuses (admin only)
    """
    try:
        from app.utils.supabase_client import supabase_admin_client
        
        # Get token health data from the database view
        response = supabase_admin_client.rpc("get_keka_token_health").execute()
        
        return {
            "token_health": response.data or [],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting token health overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get token health overview"
        )
