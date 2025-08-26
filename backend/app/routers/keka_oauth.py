"""
Keka OAuth2 Router
API endpoints for handling Keka authentication flow
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from ..utils.auth_utils import get_current_supabase_user
from ..services.keka_oauth_service import keka_oauth_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/keka-auth", tags=["keka-oauth"])

@router.get("/authorization-url")
async def get_authorization_url(
    current_user: dict = Depends(get_current_supabase_user)
) -> Dict[str, str]:
    """
    Generate Keka OAuth2 authorization URL for the current user
    
    Returns:
        Dict containing authorization URL and state
    """
    try:
        user_email = current_user.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        logger.info(f"Generating Keka authorization URL for user: {user_email}")
        
        result = keka_oauth_service.generate_authorization_url(user_email)
        
        return {
            "authorization_url": result["authorization_url"],
            "state": result["state"],
            "message": "Open this URL in a new window to connect your Keka account"
        }
        
    except Exception as e:
        logger.error(f"Failed to generate authorization URL: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate authorization URL: {str(e)}"
        )

@router.get("/callback")
async def oauth_callback(
    code: str = Query(..., description="Authorization code from Keka"),
    state: str = Query(..., description="State parameter for security"),
    error: str = Query(None, description="Error from OAuth provider")
) -> HTMLResponse:
    """
    Handle OAuth2 callback from Keka
    
    Args:
        code: Authorization code from Keka
        state: State parameter to verify request
        error: Error parameter if authorization failed
        
    Returns:
        HTML response to close popup and notify parent window
    """
    try:
        # Check for OAuth errors
        if error:
            logger.error(f"OAuth callback received error: {error}")
            return _create_callback_response(success=False, message=f"Authorization failed: {error}")
        
        if not code or not state:
            logger.error("Missing code or state in OAuth callback")
            return _create_callback_response(success=False, message="Missing authorization code or state")
        
        logger.info(f"Processing OAuth callback with state: {state}")
        
        # Handle the callback
        result = keka_oauth_service.handle_oauth_callback(code, state)
        
        if result['success']:
            logger.info(f"Successfully connected Keka account for user: {result['user_email']}")
            return _create_callback_response(
                success=True, 
                message="Keka account connected successfully!",
                data={
                    'user_email': result['user_email'],
                    'keka_employee_code': result.get('keka_employee_code')
                }
            )
        else:
            return _create_callback_response(success=False, message="Failed to connect Keka account")
            
    except Exception as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        return _create_callback_response(success=False, message=f"Connection failed: {str(e)}")

@router.get("/status")
async def get_connection_status(
    current_user: dict = Depends(get_current_supabase_user)
) -> Dict[str, Any]:
    """
    Get user's Keka connection status
    
    Returns:
        Dict with connection status and details
    """
    try:
        user_email = current_user.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        logger.info(f"Checking Keka connection status for user: {user_email}")
        
        status = keka_oauth_service.get_connection_status(user_email)
        
        return {
            "status": "success",
            "data": status
        }
        
    except Exception as e:
        logger.error(f"Failed to get connection status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get connection status: {str(e)}"
        )

@router.post("/disconnect")
async def disconnect_account(
    current_user: dict = Depends(get_current_supabase_user)
) -> Dict[str, str]:
    """
    Disconnect user's Keka account (delete tokens)
    
    Returns:
        Success/failure message
    """
    try:
        user_email = current_user.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        logger.info(f"Disconnecting Keka account for user: {user_email}")
        
        success = keka_oauth_service.disconnect_user_account(user_email)
        
        if success:
            return {
                "status": "success",
                "message": "Keka account disconnected successfully"
            }
        else:
            return {
                "status": "error", 
                "message": "No Keka account found to disconnect"
            }
        
    except Exception as e:
        logger.error(f"Failed to disconnect account: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to disconnect account: {str(e)}"
        )

@router.post("/refresh")
async def refresh_tokens(
    current_user: dict = Depends(get_current_supabase_user)
) -> Dict[str, Any]:
    """
    Manually refresh user's Keka tokens
    
    Returns:
        Success/failure message with token status
    """
    try:
        user_email = current_user.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
        
        logger.info(f"Refreshing Keka tokens for user: {user_email}")
        
        success = keka_oauth_service.refresh_user_tokens(user_email)
        
        if success:
            # Get updated status
            status = keka_oauth_service.get_connection_status(user_email)
            return {
                "status": "success",
                "message": "Tokens refreshed successfully",
                "data": status
            }
        else:
            return {
                "status": "error",
                "message": "Failed to refresh tokens. You may need to reconnect your Keka account."
            }
        
    except Exception as e:
        logger.error(f"Failed to refresh tokens: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh tokens: {str(e)}"
        )

def _create_callback_response(success: bool, message: str, data: Dict[str, Any] = None) -> HTMLResponse:
    """
    Create HTML response for OAuth callback that communicates with parent window
    
    Args:
        success: Whether the operation was successful
        message: Message to display
        data: Additional data to pass to parent window
        
    Returns:
        HTMLResponse with JavaScript to close popup and notify parent
    """
    status = "success" if success else "error"
    data_json = f", data: {data}" if data else ""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Keka Connection</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: {'#f0f9f0' if success else '#f9f0f0'};
            }}
            .container {{
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
            }}
            .success {{
                color: #28a745;
            }}
            .error {{
                color: #dc3545;
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 20px;
            }}
            .message {{
                font-size: 16px;
                margin-bottom: 20px;
            }}
            .auto-close {{
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                {'✅' if success else '❌'}
            </div>
            <div class="message {'success' if success else 'error'}">
                {message}
            </div>
            <div class="auto-close">
                This window will close automatically...
            </div>
        </div>
        
        <script>
            // Send result to parent window
            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'keka-oauth-result',
                    status: '{status}',
                    message: '{message}'{data_json}
                }}, '*');
            }}
            
            // Close window after a short delay
            setTimeout(() => {{
                window.close();
            }}, 2000);
            
            // Fallback: try to close immediately if opener is available
            if (window.opener) {{
                setTimeout(() => {{
                    window.close();
                }}, 500);
            }}
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content, status_code=200)

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for Keka OAuth service"""
    return {
        "status": "healthy",
        "service": "keka-oauth",
        "message": "Keka OAuth2 service is running"
    }

