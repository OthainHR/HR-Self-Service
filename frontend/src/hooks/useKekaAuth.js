/**
 * useKekaAuth Hook
 * Manages Keka authentication state and provides utilities for HR features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import kekaOAuthService from '../services/kekaOAuthService';
import { KekaAuthRequiredError } from '../services/hrServiceEnhanced';

export const useKekaAuth = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const mounted = useRef(true);

  // Check if component is still mounted before state updates
  const safeSetState = useCallback((setter, value) => {
    if (mounted.current) {
      setter(value);
    }
  }, []);

  /**
   * Load connection status from service
   */
  const loadConnectionStatus = useCallback(async (suppressLoading = false) => {
    try {
      if (!suppressLoading) {
        safeSetState(setLoading, true);
      }
      safeSetState(setError, null);
      
      const status = await kekaOAuthService.getConnectionStatus();
      safeSetState(setConnectionStatus, status);
      
      return status;
    } catch (error) {
      console.error('Failed to load Keka connection status:', error);
      safeSetState(setError, error.message);
      safeSetState(setConnectionStatus, null);
      return null;
    } finally {
      if (!suppressLoading) {
        safeSetState(setLoading, false);
      }
    }
  }, [safeSetState]);

  /**
   * Connect to Keka account
   */
  const connect = useCallback(async () => {
    try {
      safeSetState(setConnecting, true);
      safeSetState(setError, null);
      
      const result = await kekaOAuthService.connectKekaAccount();
      
      if (result.success) {
        // Reload status after successful connection
        await loadConnectionStatus(true);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Failed to connect to Keka:', error);
      const errorMessage = error.message || 'Failed to connect to Keka account';
      safeSetState(setError, errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      safeSetState(setConnecting, false);
    }
  }, [safeSetState, loadConnectionStatus]);

  /**
   * Disconnect from Keka account
   */
  const disconnect = useCallback(async () => {
    try {
      safeSetState(setError, null);
      
      await kekaOAuthService.disconnectAccount();
      await loadConnectionStatus(true);
      
      return { success: true, message: 'Keka account disconnected successfully' };
    } catch (error) {
      console.error('Failed to disconnect from Keka:', error);
      const errorMessage = error.message || 'Failed to disconnect from Keka account';
      safeSetState(setError, errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [safeSetState, loadConnectionStatus]);

  /**
   * Refresh authentication tokens
   */
  const refreshTokens = useCallback(async () => {
    try {
      safeSetState(setError, null);
      
      const result = await kekaOAuthService.refreshTokens();
      
      if (result.status === 'success') {
        await loadConnectionStatus(true);
        return { success: true, message: 'Tokens refreshed successfully' };
      } else {
        throw new Error(result.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Failed to refresh Keka tokens:', error);
      const errorMessage = error.message || 'Failed to refresh authentication tokens';
      safeSetState(setError, errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [safeSetState, loadConnectionStatus]);

  /**
   * Check if user has valid connection
   */
  const hasValidConnection = useCallback(() => {
    return connectionStatus?.connected && !connectionStatus?.is_expired;
  }, [connectionStatus]);

  /**
   * Check if connection is expired
   */
  const isExpired = useCallback(() => {
    return connectionStatus?.connected && connectionStatus?.is_expired;
  }, [connectionStatus]);

  /**
   * Handle HR API calls with automatic auth checking
   */
  const withKekaAuth = useCallback(async (apiCall, options = {}) => {
    const { showConnectPrompt = true, autoRefresh = true } = options;
    
    try {
      // Check if we have a valid connection
      if (!hasValidConnection()) {
        if (isExpired() && autoRefresh) {
          // Try to refresh expired tokens
          const refreshResult = await refreshTokens();
          if (!refreshResult.success) {
            throw new KekaAuthRequiredError('Your Keka session has expired. Please reconnect your account.');
          }
        } else {
          throw new KekaAuthRequiredError('Connect your Keka account to access HR features.');
        }
      }
      
      // Make the API call
      return await apiCall();
    } catch (error) {
      if (error instanceof KekaAuthRequiredError) {
        // Re-throw Keka auth errors for UI handling
        throw error;
      }
      
      // For other errors, check if it's an auth issue
      if (error.message && error.message.includes('authentication')) {
        throw new KekaAuthRequiredError('Your Keka session is invalid. Please reconnect your account.');
      }
      
      // Re-throw other errors as-is
      throw error;
    }
  }, [hasValidConnection, isExpired, refreshTokens]);

  /**
   * Get connection summary for display
   */
  const getConnectionSummary = useCallback(() => {
    if (loading) {
      return { status: 'loading', message: 'Checking connection...' };
    }
    
    if (error) {
      return { status: 'error', message: error };
    }
    
    if (!connectionStatus?.connected) {
      return { 
        status: 'not_connected', 
        message: 'Keka account not connected',
        action: 'Connect your Keka account to access HR features'
      };
    }
    
    if (connectionStatus.is_expired) {
      return { 
        status: 'expired', 
        message: 'Connection expired',
        action: 'Refresh your connection to continue using HR features'
      };
    }
    
    return { 
      status: 'connected', 
      message: 'Connected to Keka',
      action: null
    };
  }, [loading, error, connectionStatus]);

  // Load initial connection status
  useEffect(() => {
    loadConnectionStatus();
    
    // Cleanup function
    return () => {
      mounted.current = false;
    };
  }, [loadConnectionStatus]);

  // Periodic status refresh (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (mounted.current && connectionStatus?.connected) {
        loadConnectionStatus(true); // Suppress loading indicator for background refresh
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [connectionStatus, loadConnectionStatus]);

  return {
    // Status
    connectionStatus,
    loading,
    error,
    connecting,
    
    // Actions
    connect,
    disconnect,
    refreshTokens,
    loadConnectionStatus,
    
    // Utilities
    hasValidConnection,
    isExpired,
    withKekaAuth,
    getConnectionSummary,
    
    // Computed properties
    isConnected: connectionStatus?.connected || false,
    needsRefresh: isExpired(),
    employeeCode: connectionStatus?.keka_employee_code || null,
    scopes: connectionStatus?.scopes || []
  };
};
