/**
 * Enhanced HR Service with Keka OAuth Integration
 * Handles HR API calls with proper authentication and error handling
 */

import { supabase } from './supabase';
import kekaOAuthService from './kekaOAuthService';

class HRServiceEnhanced {
  constructor() {
    this.baseURL = '/api/hr';
  }

  /**
   * Make authenticated request to HR API
   */
  async makeRequest(endpoint, options = {}) {
    try {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Make API request
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Handle Keka authentication required error
      if (response.status === 424) { // HTTP_424_FAILED_DEPENDENCY
        const errorData = await response.json();
        if (errorData.detail?.error === 'keka_auth_required') {
          throw new KekaAuthRequiredError(errorData.detail.message);
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`HR API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get user's employee profile
   */
  async getProfile() {
    return this.makeRequest('/profile');
  }

  /**
   * Get leave balances
   */
  async getLeaveBalances(leaveType = null) {
    const params = leaveType ? `?leave_type=${encodeURIComponent(leaveType)}` : '';
    return this.makeRequest(`/leave/balances${params}`);
  }

  /**
   * Get leave history
   */
  async getLeaveHistory(fromDate = null, toDate = null) {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    return this.makeRequest(`/leave/history${queryString}`);
  }

  /**
   * Apply for leave
   */
  async applyForLeave(leaveRequest) {
    return this.makeRequest('/leave/apply', {
      method: 'POST',
      body: JSON.stringify(leaveRequest)
    });
  }

  /**
   * Get attendance records
   */
  async getAttendance(fromDate = null, toDate = null) {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    return this.makeRequest(`/attendance${queryString}`);
  }

  /**
   * Get payslips
   */
  async getPayslips(year = null, month = null) {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    return this.makeRequest(`/payslips${queryString}`);
  }

  /**
   * Get holidays
   */
  async getHolidays(year = null) {
    const params = year ? `?year=${year}` : '';
    return this.makeRequest(`/holidays${params}`);
  }

  /**
   * Get HR dashboard data
   */
  async getDashboard() {
    return this.makeRequest('/dashboard');
  }

  /**
   * Get Keka authentication status
   */
  async getAuthStatus() {
    return this.makeRequest('/auth/status');
  }

  /**
   * Refresh Keka authentication tokens
   */
  async refreshAuthTokens() {
    return this.makeRequest('/auth/refresh', {
      method: 'POST'
    });
  }

  /**
   * Check if user has valid Keka connection and handle accordingly
   */
  async ensureKekaConnection() {
    try {
      const hasConnection = await kekaOAuthService.hasValidConnection();
      if (!hasConnection) {
        throw new KekaAuthRequiredError('Keka account connection required');
      }
      return true;
    } catch (error) {
      if (error instanceof KekaAuthRequiredError) {
        throw error;
      }
      console.error('Failed to check Keka connection:', error);
      return false;
    }
  }

  /**
   * Wrapper for HR requests with automatic Keka connection checking
   */
  async makeHRRequest(requestFunction) {
    try {
      // First, ensure we have a valid Keka connection
      await this.ensureKekaConnection();
      
      // Make the actual request
      return await requestFunction();
    } catch (error) {
      if (error instanceof KekaAuthRequiredError) {
        // Re-throw Keka auth errors for UI to handle
        throw error;
      }
      
      // For other errors, try to refresh tokens once and retry
      try {
        await this.refreshAuthTokens();
        return await requestFunction();
      } catch (retryError) {
        // If retry also fails, throw the original error
        throw error;
      }
    }
  }

  /**
   * Get profile with automatic connection handling
   */
  async getProfileSafe() {
    return this.makeHRRequest(() => this.getProfile());
  }

  /**
   * Get leave balances with automatic connection handling
   */
  async getLeaveBalancesSafe(leaveType = null) {
    return this.makeHRRequest(() => this.getLeaveBalances(leaveType));
  }

  /**
   * Get leave history with automatic connection handling
   */
  async getLeaveHistorySafe(fromDate = null, toDate = null) {
    return this.makeHRRequest(() => this.getLeaveHistory(fromDate, toDate));
  }

  /**
   * Get attendance with automatic connection handling
   */
  async getAttendanceSafe(fromDate = null, toDate = null) {
    return this.makeHRRequest(() => this.getAttendance(fromDate, toDate));
  }

  /**
   * Get payslips with automatic connection handling
   */
  async getPayslipsSafe(year = null, month = null) {
    return this.makeHRRequest(() => this.getPayslips(year, month));
  }

  /**
   * Get holidays with automatic connection handling
   */
  async getHolidaysSafe(year = null) {
    return this.makeHRRequest(() => this.getHolidays(year));
  }

  /**
   * Get dashboard with automatic connection handling
   */
  async getDashboardSafe() {
    return this.makeHRRequest(() => this.getDashboard());
  }

  /**
   * Apply for leave with automatic connection handling
   */
  async applyForLeaveSafe(leaveRequest) {
    return this.makeHRRequest(() => this.applyForLeave(leaveRequest));
  }
}

/**
 * Custom error class for Keka authentication requirements
 */
class KekaAuthRequiredError extends Error {
  constructor(message = 'Keka account connection required') {
    super(message);
    this.name = 'KekaAuthRequiredError';
    this.isKekaAuthRequired = true;
  }
}

// Export the error class for use in components
export { KekaAuthRequiredError };

// Create and export singleton instance
const hrServiceEnhanced = new HRServiceEnhanced();
export default hrServiceEnhanced;
