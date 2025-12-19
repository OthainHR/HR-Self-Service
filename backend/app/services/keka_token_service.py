"""
Keka Token Management Service
Handles user-specific OAuth tokens for Keka API access
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.utils.supabase_client import supabase_admin_client
from app.models.hr import UserKekaTokens, KekaAuthRequest, KekaAuthResponse
import httpx
import os

logger = logging.getLogger(__name__)

class KekaTokenService:
    """
    Service to manage Keka OAuth tokens per user
    """
    
    def __init__(self):
        self.client_id = os.getenv("KEKA_CLIENT_ID")
        self.client_secret = os.getenv("KEKA_CLIENT_SECRET")
        self.redirect_uri = os.getenv("KEKA_REDIRECT_URI")
        self.company_name = os.getenv("KEKA_COMPANY_NAME")
        self.environment = os.getenv("KEKA_ENVIRONMENT", "keka")
        
        # CORRECTED OAuth URLs based on keka_endpoints.md
        if self.environment == 'keka':
            self.token_endpoint = "https://login.keka.com/connect/token"
            self.auth_endpoint = "https://login.keka.com/connect/authorize"
        else:
            self.token_endpoint = "https://login.kekademo.com/connect/token"
            self.auth_endpoint = "https://login.kekademo.com/connect/authorize"
        
        # Corrected API base URL structure
        if self.company_name:
            self.api_base_url = f"https://{self.company_name}.{self.environment}.com/api/v1"
        else:
            self.api_base_url = os.getenv("KEKA_API_BASE_URL", "https://api.keka.com/v1")
        
    async def get_user_tokens(self, user_email: str) -> Optional[UserKekaTokens]:
        """
        Get stored tokens for a user
        """
        try:
            response = supabase_admin_client.table("user_keka_tokens").select("*").eq("user_email", user_email).single().execute()
            
            if response.data:
                return UserKekaTokens(
                    user_email=response.data["user_email"],
                    access_token=response.data["access_token"],
                    refresh_token=response.data["refresh_token"],
                    expires_at=datetime.fromisoformat(response.data["expires_at"]),
                    token_type=response.data.get("token_type", "Bearer"),
                    scope=response.data.get("scope"),
                    keka_employee_id=response.data.get("keka_employee_id")
                )
        except Exception as e:
            logger.error(f"Error retrieving tokens for {user_email}: {str(e)}")
        
        return None

    async def store_user_tokens(self, user_email: str, tokens: Dict[str, Any]) -> bool:
        """
        Store or update user tokens
        """
        try:
            expires_at = datetime.now() + timedelta(seconds=tokens.get("expires_in", 3600))
            
            token_data = {
                "user_email": user_email,
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "expires_at": expires_at.isoformat(),
                "token_type": tokens.get("token_type", "Bearer"),
                "scope": tokens.get("scope"),
                "keka_employee_id": tokens.get("keka_employee_id"),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert tokens
            response = supabase_admin_client.table("user_keka_tokens").upsert(
                token_data, 
                on_conflict="user_email"
            ).execute()
            
            if response.data:
                logger.info(f"Successfully stored tokens for {user_email}")
                return True
                
        except Exception as e:
            logger.error(f"Error storing tokens for {user_email}: {str(e)}")
        
        return False

    async def refresh_user_tokens(self, user_email: str) -> Optional[UserKekaTokens]:
        """
        Refresh tokens for a specific user
        """
        current_tokens = await self.get_user_tokens(user_email)
        if not current_tokens or not current_tokens.refresh_token:
            logger.error(f"No refresh token found for {user_email}")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url.replace('/v1', '')}/oauth/token",
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": current_tokens.refresh_token,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )

                if response.status_code == 200:
                    token_data = response.json()
                    
                    # Keep existing refresh token if not provided
                    if "refresh_token" not in token_data:
                        token_data["refresh_token"] = current_tokens.refresh_token
                    
                    success = await self.store_user_tokens(user_email, token_data)
                    if success:
                        logger.info(f"Successfully refreshed tokens for {user_email}")
                        return await self.get_user_tokens(user_email)
                else:
                    logger.error(f"Token refresh failed for {user_email}: {response.status_code} - {response.text}")
                    
        except Exception as e:
            logger.error(f"Exception during token refresh for {user_email}: {str(e)}")

        return None

    async def initialize_user_keka_auth(self, user_email: str, authorization_code: str) -> KekaAuthResponse:
        """
        Exchange authorization code for user tokens
        """
        try:
            if not all([self.client_id, self.client_secret, self.redirect_uri]):
                return KekaAuthResponse(
                    success=False,
                    message="Keka OAuth configuration is incomplete",
                    requires_setup=True
                )

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base_url.replace('/v1', '')}/oauth/token",
                    data={
                        "grant_type": "authorization_code",
                        "code": authorization_code,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "redirect_uri": self.redirect_uri
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )

                if response.status_code == 200:
                    tokens = response.json()
                    success = await self.store_user_tokens(user_email, tokens)
                    
                    if success:
                        return KekaAuthResponse(
                            success=True,
                            message="Successfully connected to Keka account"
                        )
                    else:
                        return KekaAuthResponse(
                            success=False,
                            message="Failed to store authentication tokens"
                        )
                else:
                    logger.error(f"OAuth token exchange failed: {response.status_code} - {response.text}")
                    return KekaAuthResponse(
                        success=False,
                        message="Failed to authenticate with Keka. Please check your authorization code."
                    )

        except Exception as e:
            logger.error(f"Exception during Keka auth initialization: {str(e)}")
            return KekaAuthResponse(
                success=False,
                message="Authentication service temporarily unavailable"
            )

    def get_authorization_url(self) -> Optional[str]:
        """
        Generate Keka OAuth authorization URL
        """
        if not all([self.client_id, self.redirect_uri]):
            return None

        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "kekaapi offline_access",
            "state": "hr_ess_integration"  # You might want to make this more secure
        }
        
        from urllib.parse import urlencode
        param_string = urlencode(params)
        return f"{self.auth_endpoint}?{param_string}"

    async def is_user_authenticated(self, user_email: str) -> bool:
        """
        Check if user has valid authentication
        """
        tokens = await self.get_user_tokens(user_email)
        if not tokens:
            return False

        # Check if token is expired
        if tokens.expires_at <= datetime.now():
            # Try to refresh
            refreshed_tokens = await self.refresh_user_tokens(user_email)
            return refreshed_tokens is not None

        return True

    async def ensure_valid_tokens(self, user_email: str) -> Optional[UserKekaTokens]:
        """
        Ensure user has valid tokens, refresh if necessary
        """
        tokens = await self.get_user_tokens(user_email)
        if not tokens:
            return None

        # Check if token expires soon (within 5 minutes)
        if tokens.expires_at <= datetime.now() + timedelta(minutes=5):
            logger.info(f"Refreshing tokens for {user_email} (expires soon)")
            tokens = await self.refresh_user_tokens(user_email)

        return tokens

    async def revoke_user_tokens(self, user_email: str) -> bool:
        """
        Revoke and remove user tokens
        """
        try:
            # First try to revoke with Keka API if they support it
            tokens = await self.get_user_tokens(user_email)
            if tokens:
                try:
                    async with httpx.AsyncClient() as client:
                        # Note: Revoke endpoint may not be available in Keka API
                        await client.post(
                            f"{self.token_endpoint.replace('/connect/token', '/connect/revoke')}",
                            data={
                                "token": tokens.access_token,
                                "client_id": self.client_id,
                                "client_secret": self.client_secret
                            },
                            headers={"Content-Type": "application/x-www-form-urlencoded"}
                        )
                except Exception as e:
                    logger.warning(f"Failed to revoke token with Keka API: {str(e)}")

            # Remove from database
            response = supabase_admin_client.table("user_keka_tokens").delete().eq("user_email", user_email).execute()
            
            if response.data:
                logger.info(f"Successfully revoked tokens for {user_email}")
                return True

        except Exception as e:
            logger.error(f"Error revoking tokens for {user_email}: {str(e)}")

        return False

    async def get_token_health_status(self, user_email: str) -> Dict[str, Any]:
        """
        Get health status of user's tokens
        """
        tokens = await self.get_user_tokens(user_email)
        if not tokens:
            return {
                "status": "not_authenticated",
                "message": "User is not connected to Keka",
                "requires_auth": True
            }

        now = datetime.now()
        expires_at = tokens.expires_at

        if expires_at <= now:
            return {
                "status": "expired",
                "message": "Keka authentication has expired",
                "requires_auth": True,
                "expires_at": expires_at.isoformat()
            }
        elif expires_at <= now + timedelta(days=1):
            return {
                "status": "expiring_soon",
                "message": "Keka authentication expires soon",
                "requires_auth": False,
                "expires_at": expires_at.isoformat()
            }
        else:
            return {
                "status": "healthy",
                "message": "Keka authentication is active",
                "requires_auth": False,
                "expires_at": expires_at.isoformat()
            }

# Global instance
keka_token_service = KekaTokenService()
