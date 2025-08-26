"""
Keka OAuth2 Service
Handles Keka authentication, token management, and API access for HR data
"""

import os
import secrets
import hashlib
import base64
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlencode, parse_qs
import httpx
from sqlalchemy import text
from ..db.database import get_db_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KekaOAuthService:
    def __init__(self):
        # Keka OAuth2 configuration from environment
        self.client_id = os.getenv('KEKA_CLIENT_ID')
        self.client_secret = os.getenv('KEKA_CLIENT_SECRET')
        self.redirect_uri = os.getenv('KEKA_REDIRECT_URI')
        self.company_name = os.getenv('KEKA_COMPANY_NAME')
        self.environment = os.getenv('KEKA_ENVIRONMENT', 'keka')  # "keka" for production, "kekademo" for sandbox
        
        # CORRECTED OAuth2 endpoints based on keka_endpoints.md
        if self.environment == 'keka':
            # Production
            self.auth_endpoint = "https://login.keka.com/connect/authorize"
            self.token_endpoint = "https://login.keka.com/connect/token"
        else:
            # Sandbox
            self.auth_endpoint = "https://login.kekademo.com/connect/authorize"
            self.token_endpoint = "https://login.kekademo.com/connect/token"
        
        # Corrected API base URL structure
        if self.company_name:
            self.api_base_url = f"https://{self.company_name}.{self.environment}.com/api/v1"
        else:
            self.api_base_url = os.getenv('KEKA_API_BASE_URL', 'https://api.keka.com/v1')
            
        # OAuth2 scopes for HR data access (based on official Keka documentation)
        # CRITICAL: offline_access is required for refresh tokens
        self.default_scopes = ["kekaapi", "offline_access"]
        
        # Validate configuration
        self._validate_config()
        
        # In-memory storage for OAuth state (in production, use Redis)
        self._oauth_states = {}

    def _validate_config(self):
        """Validate that all required configuration is present"""
        required_config = {
            'KEKA_CLIENT_ID': self.client_id,
            'KEKA_CLIENT_SECRET': self.client_secret,
            'KEKA_REDIRECT_URI': self.redirect_uri
        }
        
        missing = [key for key, value in required_config.items() if not value]
        if missing:
            raise ValueError(f"Missing required Keka OAuth2 configuration: {', '.join(missing)}")
    
    def generate_authorization_url(self, user_email: str, scopes: Optional[list] = None) -> Dict[str, str]:
        """
        Generate Keka OAuth2 authorization URL for user
        
        Args:
            user_email: User's email (from Microsoft SSO)
            scopes: List of OAuth2 scopes to request
            
        Returns:
            Dict containing authorization_url and state
        """
        try:
            # Use default scopes if none provided
            if scopes is None:
                scopes = self.default_scopes
            
            # Generate secure random state
            state = secrets.token_urlsafe(32)
            
            # Store state with user context (expire after 10 minutes)
            self._oauth_states[state] = {
                'user_email': user_email,
                'created_at': datetime.now(),
                'expires_at': datetime.now() + timedelta(minutes=10)
            }
            
            # Build authorization URL
            auth_params = {
                'response_type': 'code',
                'client_id': self.client_id,
                'redirect_uri': self.redirect_uri,
                'scope': ' '.join(scopes),
                'state': state,
                'access_type': 'offline',  # Request refresh token
                'prompt': 'consent'  # Ensure we get a refresh token
            }
            
            authorization_url = f"{self.auth_endpoint}?{urlencode(auth_params)}"
            
            logger.info(f"Generated Keka authorization URL for user: {user_email}")
            
            return {
                'authorization_url': authorization_url,
                'state': state
            }
            
        except Exception as e:
            logger.error(f"Failed to generate authorization URL: {str(e)}")
            raise Exception(f"Failed to generate Keka authorization URL: {str(e)}")

    def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """
        Handle OAuth2 callback and exchange code for tokens
        
        Args:
            code: Authorization code from Keka
            state: State parameter to verify request
            
        Returns:
            Dict containing user info and token status
        """
        try:
            # Validate state
            state_data = self._validate_state(state)
            user_email = state_data['user_email']
            
            # Exchange code for tokens
            tokens = self._exchange_code_for_tokens(code)
            
            # Get user info from Keka by searching with email
            user_info = self._get_keka_user_info(tokens['access_token'], user_email)
            
            # Store tokens in database
            self._store_user_tokens(user_email, tokens, user_info)
            
            # Clean up used state
            self._oauth_states.pop(state, None)
            
            logger.info(f"Successfully handled OAuth callback for user: {user_email}")
            
            return {
                'success': True,
                'user_email': user_email,
                'keka_user_id': user_info.get('id'),
                'keka_employee_id': user_info.get('employeeId') or user_info.get('id'),
                'keka_employee_code': user_info.get('employeeCode') or user_info.get('employee_code'),
                'message': 'Keka account connected successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to handle OAuth callback: {str(e)}")
            raise Exception(f"Failed to connect Keka account: {str(e)}")

    def _validate_state(self, state: str) -> Dict[str, Any]:
        """Validate OAuth state parameter"""
        if state not in self._oauth_states:
            raise ValueError("Invalid or expired OAuth state")
        
        state_data = self._oauth_states[state]
        
        # Check if state has expired
        if datetime.now() > state_data['expires_at']:
            self._oauth_states.pop(state, None)
            raise ValueError("OAuth state has expired")
        
        return state_data

    def _exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'code': code
        }
        
        with httpx.Client() as client:
            response = client.post(
                self.token_endpoint,
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                raise Exception(f"Failed to exchange code for tokens: {response.text}")
            
            tokens = response.json()
            
            # Calculate expiration time
            expires_in = tokens.get('expires_in', 3600)  # Default 1 hour
            tokens['expires_at'] = datetime.now() + timedelta(seconds=expires_in)
            
            return tokens

    def _get_keka_user_info(self, access_token: str, user_email: str) -> Dict[str, Any]:
        """Get user information from Keka API by searching employees by email"""
        headers = {'Authorization': f'Bearer {access_token}'}
        
        with httpx.Client() as client:
            try:
                # Search employees by email (no /hris/me endpoint exists)
                api_base = f"https://{self.company_name}.{self.environment}.com/api/v1"
                search_url = f"{api_base}/hris/employees"
                
                response = client.get(
                    search_url,
                    headers=headers,
                    params={'email': user_email}
                )
                
                if response.status_code == 200:
                    employees = response.json()
                    # Handle both direct array and data wrapper
                    employee_list = employees if isinstance(employees, list) else employees.get('data', [])
                    
                    if employee_list and len(employee_list) > 0:
                        employee = employee_list[0]
                        logger.info(f"Found employee info for {user_email}: ID {employee.get('id')}")
                        return {
                            "id": employee.get('id'),
                            "employeeId": employee.get('id'),  # Use ID as employee ID
                            "employeeCode": employee.get('employeeCode') or employee.get('code'),
                            "fullName": employee.get('fullName'),
                            "email": employee.get('email')
                        }
                    else:
                        logger.warning(f"No employee found with email: {user_email}")
                else:
                    logger.error(f"Employee search failed: {response.status_code} - {response.text}")
                
            except Exception as e:
                logger.error(f"Error searching for employee: {str(e)}")
            
            # Return minimal info if search fails
            logger.warning(f"Could not get employee info for {user_email}, using minimal data")
            return {"id": None, "employeeId": None, "employeeCode": None}

    def _store_user_tokens(self, user_email: str, tokens: Dict[str, Any], user_info: Dict[str, Any]):
        """Store or update user's Keka tokens in database with employee ID mapping"""
        try:
            with get_db_connection() as conn:
                # Prepare token data with employee ID mapping
                token_data = {
                    'user_email': user_email,
                    'access_token': tokens['access_token'],
                    'refresh_token': tokens.get('refresh_token'),
                    'expires_at': tokens['expires_at'],
                    'keka_user_id': user_info.get('id'),
                    'keka_employee_id': user_info.get('employeeId') or user_info.get('id'),  # Store employee ID
                    'keka_employee_code': user_info.get('employeeCode') or user_info.get('employee_code'),
                    'scope': tokens.get('scope', ' '.join(self.default_scopes))
                }
                
                # Use UPSERT to handle existing records with new keka_employee_id column
                upsert_query = text("""
                    INSERT INTO user_keka_tokens 
                    (user_email, access_token, refresh_token, expires_at, keka_user_id, keka_employee_id, keka_employee_code, scope)
                    VALUES (:user_email, :access_token, :refresh_token, :expires_at, :keka_user_id, :keka_employee_id, :keka_employee_code, :scope)
                    ON CONFLICT (user_email) 
                    DO UPDATE SET
                        access_token = EXCLUDED.access_token,
                        refresh_token = EXCLUDED.refresh_token,
                        expires_at = EXCLUDED.expires_at,
                        keka_user_id = EXCLUDED.keka_user_id,
                        keka_employee_id = EXCLUDED.keka_employee_id,
                        keka_employee_code = EXCLUDED.keka_employee_code,
                        scope = EXCLUDED.scope,
                        updated_at = NOW()
                """)
                
                conn.execute(upsert_query, token_data)
                conn.commit()
                
                logger.info(f"Stored Keka tokens and employee ID for user: {user_email}")
                
        except Exception as e:
            logger.error(f"Failed to store tokens for {user_email}: {str(e)}")
            raise Exception(f"Failed to store Keka tokens: {str(e)}")

    def get_user_tokens(self, user_email: str) -> Optional[Dict[str, Any]]:
        """
        Get user's Keka tokens from database
        
        Args:
            user_email: User's email
            
        Returns:
            Dict with token info or None if not found
        """
        try:
            with get_db_connection() as conn:
                query = text("""
                    SELECT access_token, refresh_token, expires_at, keka_user_id, 
                           keka_employee_id, keka_employee_code, scope, 
                           (expires_at < NOW()) as is_expired
                    FROM user_keka_tokens 
                    WHERE user_email = :user_email
                """)
                
                result = conn.execute(query, {'user_email': user_email}).fetchone()
                
                if not result:
                    return None
                
                return {
                    'access_token': result.access_token,
                    'refresh_token': result.refresh_token,
                    'expires_at': result.expires_at,
                    'keka_user_id': result.keka_user_id,
                    'keka_employee_id': result.keka_employee_id,
                    'keka_employee_code': result.keka_employee_code,
                    'token_scope': result.scope,  # Map existing 'scope' column to 'token_scope'
                    'is_expired': result.is_expired
                }
                
        except Exception as e:
            logger.error(f"Failed to get tokens for {user_email}: {str(e)}")
            return None

    def refresh_user_tokens(self, user_email: str) -> bool:
        """
        Refresh user's expired Keka tokens
        
        Args:
            user_email: User's email
            
        Returns:
            True if refresh successful, False otherwise
        """
        try:
            # Get current tokens
            current_tokens = self.get_user_tokens(user_email)
            if not current_tokens or not current_tokens.get('refresh_token'):
                logger.warning(f"No refresh token available for {user_email}")
                return False
            
            # Use refresh token to get new access token
            refresh_data = {
                'grant_type': 'refresh_token',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': current_tokens['refresh_token']
            }
            
            with httpx.Client() as client:
                response = client.post(
                    self.token_endpoint,
                    data=refresh_data,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                
                if response.status_code != 200:
                    logger.error(f"Token refresh failed for {user_email}: {response.text}")
                    return False
                
                new_tokens = response.json()
                
                # Calculate new expiration
                expires_in = new_tokens.get('expires_in', 3600)
                new_expires_at = datetime.now() + timedelta(seconds=expires_in)
                
                # Update tokens in database
                with get_db_connection() as conn:
                    update_query = text("""
                        UPDATE user_keka_tokens 
                        SET access_token = :access_token,
                            refresh_token = COALESCE(:refresh_token, refresh_token),
                            expires_at = :expires_at,
                            updated_at = NOW()
                        WHERE user_email = :user_email
                    """)
                    
                    conn.execute(update_query, {
                        'access_token': new_tokens['access_token'],
                        'refresh_token': new_tokens.get('refresh_token'),
                        'expires_at': new_expires_at,
                        'user_email': user_email
                    })
                    conn.commit()
                    
                    logger.info(f"Refreshed tokens for user: {user_email}")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to refresh tokens for {user_email}: {str(e)}")
            return False

    def get_valid_access_token(self, user_email: str) -> Optional[str]:
        """
        Get valid access token for user, refreshing if necessary
        
        Args:
            user_email: User's email
            
        Returns:
            Valid access token or None if unavailable
        """
        tokens = self.get_user_tokens(user_email)
        if not tokens:
            return None
        
        # If token is expired, try to refresh
        if tokens['is_expired']:
            if self.refresh_user_tokens(user_email):
                # Get refreshed tokens
                tokens = self.get_user_tokens(user_email)
                if not tokens or tokens['is_expired']:
                    return None
            else:
                return None
        
        # Update last used timestamp
        self._update_last_used(user_email)
        
        return tokens['access_token']

    def _update_last_used(self, user_email: str):
        """Update last_used_at timestamp for user's tokens"""
        try:
            with get_db_connection() as conn:
                update_query = text("""
                    UPDATE user_keka_tokens 
                    SET last_used_at = NOW() 
                    WHERE user_email = :user_email
                """)
                conn.execute(update_query, {'user_email': user_email})
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update last_used for {user_email}: {str(e)}")

    def disconnect_user_account(self, user_email: str) -> bool:
        """
        Disconnect user's Keka account (delete tokens)
        
        Args:
            user_email: User's email
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with get_db_connection() as conn:
                query = text("""
                    DELETE FROM user_keka_tokens 
                    WHERE user_email = :user_email
                """)
                
                result = conn.execute(query, {'user_email': user_email})
                conn.commit()
                
                success = result.rowcount > 0
                if success:
                    logger.info(f"Disconnected Keka account for user: {user_email}")
                
                return success
                
        except Exception as e:
            logger.error(f"Failed to disconnect account for {user_email}: {str(e)}")
            return False

    def get_connection_status(self, user_email: str) -> Dict[str, Any]:
        """
        Get user's Keka connection status
        
        Args:
            user_email: User's email
            
        Returns:
            Dict with connection status and details
        """
        tokens = self.get_user_tokens(user_email)
        
        if not tokens:
            return {
                'connected': False,
                'message': 'Keka account not connected'
            }
        
        return {
            'connected': True,
            'expires_at': tokens['expires_at'].isoformat() if tokens['expires_at'] else None,
            'is_expired': tokens['is_expired'],
            'keka_user_id': tokens.get('keka_user_id'),
            'keka_employee_code': tokens.get('keka_employee_code'),
            'scopes': tokens.get('token_scope', '').split(' ') if tokens.get('token_scope') else [],
            'message': 'Keka account connected and active' if not tokens['is_expired'] else 'Keka account connected but token expired'
        }

# Create singleton instance
keka_oauth_service = KekaOAuthService()
