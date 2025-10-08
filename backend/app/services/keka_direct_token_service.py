"""
Keka Direct Token Service
Generates Keka API tokens using grant_type=kekaapi for each user
This is a simpler alternative to OAuth2 flow
"""

import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from app.utils.supabase_client import supabase_admin_client

logger = logging.getLogger(__name__)

class KekaDirectTokenService:
    """
    Service to generate and manage Keka API tokens using direct grant_type=kekaapi
    """
    
    def __init__(self):
        self.client_id = os.getenv("KEKA_CLIENT_ID")
        self.client_secret = os.getenv("KEKA_CLIENT_SECRET")
        self.company_name = os.getenv("KEKA_COMPANY_NAME")
        self.environment = os.getenv("KEKA_ENVIRONMENT", "keka")
        
        # Token endpoint based on environment
        if self.environment == 'keka':
            self.token_endpoint = "https://login.keka.com/connect/token"
        else:
            self.token_endpoint = "https://login.kekademo.com/connect/token"
        
        # API base URL
        if self.company_name:
            self.api_base_url = f"https://{self.company_name}.{self.environment}.com/api/v1"
        else:
            self.api_base_url = os.getenv("KEKA_API_BASE_URL", "https://api.keka.com/v1")
    
    async def generate_token(self) -> Optional[Dict[str, Any]]:
        """
        Generate a new Keka API token using grant_type=kekaapi
        
        Returns:
            Dict with access_token, expires_in, etc.
        """
        try:
            if not all([self.client_id, self.client_secret]):
                logger.error("Keka client_id or client_secret not configured")
                return None
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_endpoint,
                    data={
                        "grant_type": "kekaapi",
                        "scope": "kekaapi",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    headers={
                        "accept": "application/json",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    logger.info(f"Successfully generated Keka API token")
                    return token_data
                else:
                    logger.error(f"Failed to generate token: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception generating Keka token: {str(e)}")
            return None
    
    async def get_or_generate_token_for_user(self, user_email: str) -> Optional[str]:
        """
        Get cached token or generate new one for a user
        
        Args:
            user_email: User's email address
            
        Returns:
            Access token string or None
        """
        try:
            # Check if user has a cached valid token
            cached_token = await self._get_cached_token(user_email)
            if cached_token:
                return cached_token
            
            # Generate new token
            token_data = await self.generate_token()
            if not token_data or "access_token" not in token_data:
                return None
            
            # Cache the token
            await self._cache_token(user_email, token_data)
            
            return token_data["access_token"]
            
        except Exception as e:
            logger.error(f"Error getting token for user {user_email}: {str(e)}")
            return None
    
    async def _get_cached_token(self, user_email: str) -> Optional[str]:
        """
        Get cached token from database if it's still valid
        """
        try:
            response = supabase_admin_client.table("user_keka_direct_tokens")\
                .select("*")\
                .eq("user_email", user_email)\
                .single()\
                .execute()
            
            if response.data:
                expires_at = datetime.fromisoformat(response.data["expires_at"])
                
                # Check if token expires in more than 5 minutes
                if expires_at > datetime.now() + timedelta(minutes=5):
                    return response.data["access_token"]
                    
        except Exception as e:
            logger.debug(f"No cached token found for {user_email}: {str(e)}")
        
        return None
    
    async def _cache_token(self, user_email: str, token_data: Dict[str, Any]) -> bool:
        """
        Cache token in database
        """
        try:
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.now() + timedelta(seconds=expires_in)
            
            cache_data = {
                "user_email": user_email,
                "access_token": token_data["access_token"],
                "token_type": token_data.get("token_type", "Bearer"),
                "expires_at": expires_at.isoformat(),
                "scope": token_data.get("scope"),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert token
            response = supabase_admin_client.table("user_keka_direct_tokens")\
                .upsert(cache_data, on_conflict="user_email")\
                .execute()
            
            if response.data:
                logger.info(f"Cached token for {user_email}")
                return True
                
        except Exception as e:
            logger.error(f"Error caching token for {user_email}: {str(e)}")
        
        return False
    
    async def revoke_cached_token(self, user_email: str) -> bool:
        """
        Remove cached token for user
        """
        try:
            response = supabase_admin_client.table("user_keka_direct_tokens")\
                .delete()\
                .eq("user_email", user_email)\
                .execute()
            
            if response.data:
                logger.info(f"Revoked cached token for {user_email}")
                return True
                
        except Exception as e:
            logger.error(f"Error revoking token for {user_email}: {str(e)}")
        
        return False
    
    async def get_token_status(self, user_email: str) -> Dict[str, Any]:
        """
        Get status of user's token
        """
        try:
            response = supabase_admin_client.table("user_keka_direct_tokens")\
                .select("*")\
                .eq("user_email", user_email)\
                .single()\
                .execute()
            
            if response.data:
                expires_at = datetime.fromisoformat(response.data["expires_at"])
                now = datetime.now()
                
                if expires_at <= now:
                    return {
                        "status": "expired",
                        "message": "Token has expired",
                        "expires_at": expires_at.isoformat()
                    }
                elif expires_at <= now + timedelta(minutes=10):
                    return {
                        "status": "expiring_soon",
                        "message": "Token expires soon",
                        "expires_at": expires_at.isoformat()
                    }
                else:
                    return {
                        "status": "valid",
                        "message": "Token is valid",
                        "expires_at": expires_at.isoformat()
                    }
        except Exception as e:
            logger.debug(f"No token status for {user_email}: {str(e)}")
        
        return {
            "status": "not_found",
            "message": "No token found for user"
        }

# Global instance
keka_direct_token_service = KekaDirectTokenService()

