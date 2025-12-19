/**
 * Keka OAuth Service
 * Handles Keka authentication flow and token management
 */

import { supabase } from './supabase';

class KekaOAuthService {
  constructor() {
    this.baseURL = '/api/keka-auth';
    this.popupWindow = null;
    this.authCheckInterval = null;
    
    // Bind methods to preserve context
    this.handleAuthMessage = this.handleAuthMessage.bind(this);
    
    // Listen for OAuth popup messages
    window.addEventListener('message', this.handleAuthMessage, false);
  }

  /**
   * Get authorization URL from backend
   */
  async getAuthorizationUrl() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseURL}/authorization-url`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get authorization URL: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
      throw error;
    }
  }

  /**
   * Open Keka OAuth popup window
   */
  async connectKekaAccount() {
    try {
      console.log('Starting Keka OAuth flow...');
      
      const authData = await this.getAuthorizationUrl();
      const { authorization_url } = authData;

      // Calculate popup position (centered on screen)
      const width = 600;
      const height = 700;
      const left = Math.round((window.screen.width / 2) - (width / 2));
      const top = Math.round((window.screen.height / 2) - (height / 2));

      // Open popup window
      this.popupWindow = window.open(
        authorization_url,
        'keka-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!this.popupWindow) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Monitor popup window
      this.monitorPopup();

      // Return promise that resolves when auth completes
      return new Promise((resolve, reject) => {
        this.authResolve = resolve;
        this.authReject = reject;
      });

    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Monitor popup window for closure
   */
  monitorPopup() {
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
    }

    this.authCheckInterval = setInterval(() => {
      try {
        if (!this.popupWindow || this.popupWindow.closed) {
          clearInterval(this.authCheckInterval);
          this.authCheckInterval = null;
          
          // If we reach here without a result, user likely closed popup manually
          if (this.authReject) {
            this.authReject(new Error('Authentication cancelled by user'));
            this.authReject = null;
            this.authResolve = null;
          }
        }
      } catch (error) {
        console.error('Error monitoring popup:', error);
      }
    }, 1000);
  }

  /**
   * Handle messages from OAuth popup
   */
  handleAuthMessage(event) {
    // Verify message is from our OAuth popup
    if (!this.popupWindow || event.source !== this.popupWindow) {
      return;
    }

    // Verify message type
    if (!event.data || event.data.type !== 'keka-oauth-result') {
      return;
    }

    console.log('Received OAuth result:', event.data);

    // Clean up
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }

    if (this.popupWindow) {
      this.popupWindow.close();
      this.popupWindow = null;
    }

    // Resolve or reject based on result
    if (event.data.status === 'success') {
      if (this.authResolve) {
        this.authResolve({
          success: true,
          message: event.data.message,
          data: event.data.data
        });
      }
    } else {
      if (this.authReject) {
        this.authReject(new Error(event.data.message || 'Authentication failed'));
      }
    }

    // Clean up promises
    this.authResolve = null;
    this.authReject = null;
  }

  /**
   * Get Keka connection status
   */
  async getConnectionStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseURL}/status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get connection status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to get connection status:', error);
      throw error;
    }
  }

  /**
   * Disconnect Keka account
   */
  async disconnectAccount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseURL}/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect account: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      throw error;
    }
  }

  /**
   * Refresh Keka tokens
   */
  async refreshTokens() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh tokens: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      throw error;
    }
  }

  /**
   * Check if user has valid Keka connection
   */
  async hasValidConnection() {
    try {
      const status = await this.getConnectionStatus();
      return status.connected && !status.is_expired;
    } catch (error) {
      console.error('Failed to check connection validity:', error);
      return false;
    }
  }

  /**
   * Cleanup method to remove event listeners
   */
  cleanup() {
    window.removeEventListener('message', this.handleAuthMessage, false);
    
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }

    if (this.popupWindow) {
      this.popupWindow.close();
      this.popupWindow = null;
    }
  }
}

// Create singleton instance
const kekaOAuthService = new KekaOAuthService();

export default kekaOAuthService;

