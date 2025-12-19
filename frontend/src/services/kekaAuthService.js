import axios from 'axios';
import { supabase } from './supabase';

// Use the same API base URL as other services
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com';
const KEKA_AUTH_API_URL = `${API_BASE_URL}/api/keka-auth`;

// Create axios instance for Keka Auth API calls
const kekaAuthApiClient = axios.create({
  baseURL: KEKA_AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include Supabase auth token
kekaAuthApiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session for Keka Auth API:', error);
      } else if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error in Keka Auth API request interceptor:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced error handling function for Keka Auth
const handleKekaAuthError = (error) => {
  if (error.response?.status === 401) {
    return { 
      success: false, 
      error: 'Authentication required. Please log in.',
      requiresLogin: true
    };
  } else if (error.response?.status === 403) {
    return { success: false, error: 'Access denied.' };
  } else if (error.response?.status === 500) {
    return { success: false, error: 'Keka authentication service is temporarily unavailable.' };
  } else if (error.code === 'NETWORK_ERROR' || !error.response) {
    return { success: false, error: 'Network connection issue. Please check your internet connection.' };
  } else {
    const userMessage = error.response?.data?.detail || error.response?.data?.message || 'An unexpected error occurred.';
    return { success: false, error: userMessage };
  }
};

// Add response interceptor for error handling
kekaAuthApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Keka Auth API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Keka Authentication Service class
class KekaAuthService {
  
  // Get Keka authorization URL
  async getAuthorizationUrl() {
    try {
      const response = await kekaAuthApiClient.get('/authorization-url');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Handle OAuth callback with authorization code
  async handleOAuthCallback(authorizationCode, redirectUri = null) {
    try {
      const response = await kekaAuthApiClient.post('/callback', {
        authorization_code: authorizationCode,
        redirect_uri: redirectUri
      });
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Get current Keka authentication status
  async getAuthStatus() {
    try {
      const response = await kekaAuthApiClient.get('/status');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Refresh Keka tokens
  async refreshTokens() {
    try {
      const response = await kekaAuthApiClient.post('/refresh');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Disconnect Keka account
  async disconnectAccount() {
    try {
      const response = await kekaAuthApiClient.delete('/disconnect');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Test Keka connection
  async testConnection() {
    try {
      const response = await kekaAuthApiClient.get('/test-connection');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleKekaAuthError(error);
    }
  }

  // Utility methods
  isTokenExpiring(expiresAt) {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate - now) / (1000 * 60 * 60);
    return hoursUntilExpiration <= 24; // Consider expiring if less than 24 hours
  }

  formatTokenStatus(status) {
    const statusMap = {
      'healthy': { color: 'success', label: 'Connected', icon: '✓' },
      'expiring_soon': { color: 'warning', label: 'Expires Soon', icon: '⚠' },
      'expired': { color: 'error', label: 'Expired', icon: '✗' },
      'not_authenticated': { color: 'error', label: 'Not Connected', icon: '✗' }
    };
    return statusMap[status] || { color: 'default', label: 'Unknown', icon: '?' };
  }

  // Handle the OAuth flow
  async initiateOAuthFlow() {
    try {
      const urlResult = await this.getAuthorizationUrl();
      if (urlResult.success && urlResult.data.authorization_url) {
        // Open authorization URL in a new window
        const authWindow = window.open(
          urlResult.data.authorization_url,
          'keka_auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        return new Promise((resolve, reject) => {
          // Listen for the callback
          const checkClosed = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkClosed);
              // Check if authentication was successful
              this.getAuthStatus().then(statusResult => {
                if (statusResult.success && statusResult.data.is_authenticated) {
                  resolve({ success: true, message: 'Successfully connected to Keka' });
                } else {
                  resolve({ success: false, message: 'Authentication was cancelled or failed' });
                }
              }).catch(error => {
                reject({ success: false, message: 'Failed to verify authentication status' });
              });
            }
          }, 1000);

          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkClosed);
            if (!authWindow.closed) {
              authWindow.close();
            }
            reject({ success: false, message: 'Authentication timed out' });
          }, 300000);
        });
      } else {
        return { success: false, message: urlResult.error || 'Failed to get authorization URL' };
      }
    } catch (error) {
      return { success: false, message: 'Failed to initiate OAuth flow' };
    }
  }

  // Handle URL parameter-based callback (for redirect-based flow)
  async handleUrlCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      return { success: false, message: `OAuth error: ${error}` };
    }

    if (code && state === 'hr_ess_integration') {
      const result = await this.handleOAuthCallback(code);
      
      // Clean up URL parameters
      const url = new URL(window.location);
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, document.title, url.toString());
      
      return result;
    }

    return null; // No callback to handle
  }

  // Check if user needs to authenticate with Keka
  async checkKekaAuthRequired() {
    const statusResult = await this.getAuthStatus();
    
    if (!statusResult.success) {
      return { required: true, reason: 'Cannot check authentication status' };
    }

    const { is_authenticated, token_health } = statusResult.data;
    
    if (!is_authenticated) {
      return { 
        required: true, 
        reason: 'Not authenticated with Keka',
        authUrl: statusResult.data.authorization_url
      };
    }

    if (token_health?.status === 'expired') {
      return { 
        required: true, 
        reason: 'Keka authentication has expired',
        authUrl: statusResult.data.authorization_url
      };
    }

    return { required: false, status: token_health };
  }
}

// Export singleton instance
export const kekaAuthService = new KekaAuthService();
export default kekaAuthService;
