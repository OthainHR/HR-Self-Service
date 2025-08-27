import axios from 'axios';
import { supabase } from './supabase';

/**
 * HR Service - Keka API Integration
 * 
 * Required Environment Variables:
 * - REACT_APP_API_URL: Your backend API URL (e.g., http://localhost:8000)
 * - REACT_APP_KEKA_API_URL: Your Keka company API URL (e.g., https://yourcompany.keka.com/api/v1)
 * - REACT_APP_KEKA_CALENDAR_ID: Keka holidays calendar ID (optional, defaults to 'default')
 * 
 * Note: This service now directly calls Keka API endpoints according to their documentation
 * at https://developers.keka.com/
 */

// Keka API configuration
const KEKA_API_URL = process.env.REACT_APP_KEKA_API_URL || 'https://yourcompany.keka.com/api/v1';
const KEKA_AUTH_API_URL = `${process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com'}/api/keka-auth`;

// Create axios instance for Keka API calls
const kekaApiClient = axios.create({
  baseURL: KEKA_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for Keka API to include access token
kekaApiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get Keka access token from your backend (stored after OAuth)
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.access_token) {
        // Call your backend to get the Keka access token for this user
        const kekaTokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/keka-auth/token`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (kekaTokenResponse.ok) {
          const { access_token } = await kekaTokenResponse.json();
          config.headers['Authorization'] = `Bearer ${access_token}`;
        }
      }
    } catch (error) {
      console.error('Error getting Keka access token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Create axios instance for HR API calls (for backend-specific endpoints)
// This is used for custom backend features like health checks, chat context, etc.
const hrApiClient = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com'}/api/hr`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for Keka Auth API calls (different router prefix)
const kekaAuthApiClient = axios.create({
  baseURL: KEKA_AUTH_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include Supabase auth token
hrApiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session for HR API:', error);
      } else if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error in HR API request interceptor:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Include Supabase auth token for Keka Auth API too
kekaAuthApiClient.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error in Keka Auth API request interceptor:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced error handling function
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Check if it's a Keka authentication issue
    if (error.response?.data?.detail?.includes('Keka')) {
      return { 
        success: false, 
        error: 'Please connect your Keka account to access HR data',
        requiresKekaAuth: true,
        authUrl: error.response?.data?.auth_url
      };
    }
    // General authentication error - redirect to login
    window.location.href = '/login';
    return { success: false, error: 'Session expired. Please log in again.' };
  } else if (error.response?.status === 403) {
    return { success: false, error: 'Access denied. You may not have permission to access this data.' };
  } else if (error.response?.status === 429) {
    return { success: false, error: 'Too many requests. Please try again in a moment.' };
  } else if (error.response?.status === 500) {
    return { success: false, error: 'HR service is temporarily unavailable. Please try again later.' };
  } else if (error.response?.status === 503) {
    return { success: false, error: 'Keka service is temporarily unavailable.' };
  } else if (error.code === 'NETWORK_ERROR' || !error.response) {
    return { success: false, error: 'Network connection issue. Please check your internet connection.' };
  } else {
    // Generic error with user-friendly message
    const userMessage = error.response?.data?.detail || 'An unexpected error occurred. Please try again.';
    return { success: false, error: userMessage };
  }
};

// Add response interceptor for error handling
hrApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('HR API Error:', error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.error('HR API authentication failed');
    }
    
    return Promise.reject(error);
  }
);

// HR Service class
class HRService {
  
  // Keka OAuth Methods
  async getKekaAuthUrl() {
    try {
      const response = await kekaAuthApiClient.get('/authorization-url');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to get Keka auth URL:', error);
      return handleApiError(error);
    }
  }

  async checkKekaAuthStatus() {
    try {
      const response = await kekaAuthApiClient.get('/status');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to check Keka auth status:', error);
      return handleApiError(error);
    }
  }

  async disconnectKekaAccount() {
    try {
      const response = await kekaAuthApiClient.post('/disconnect');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to disconnect Keka account:', error);
      return handleApiError(error);
    }
  }

  // Employee Profile - Get current user's profile
  async getMyProfile() {
    try {
      // First get the current user's employee ID from Keka auth status
      const authStatus = await this.checkKekaAuthStatus();
      if (!authStatus.success || !authStatus.data?.keka_user_id) {
        return {
          success: false,
          error: 'Keka account not connected or user ID not found'
        };
      }
      
      const response = await kekaApiClient.get(`/hris/employees/${authStatus.data.keka_user_id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // Leave Management
  async getMyLeaveBalances(leaveType = null) {
    try {
      // Get current user's employee ID
      const authStatus = await this.checkKekaAuthStatus();
      if (!authStatus.success || !authStatus.data?.keka_user_id) {
        return {
          success: false,
          error: 'Keka account not connected or user ID not found'
        };
      }
      
      const params = {
        employeeId: authStatus.data.keka_user_id
      };
      if (leaveType) params.leaveTypeId = leaveType;
      
      const response = await kekaApiClient.get('/time/leavebalance', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getMyLeaveHistory(fromDate = null, toDate = null) {
    try {
      // Get current user's employee ID
      const authStatus = await this.checkKekaAuthStatus();
      if (!authStatus.success || !authStatus.data?.keka_user_id) {
        return {
          success: false,
          error: 'Keka account not connected or user ID not found'
        };
      }
      
      const params = {
        employeeId: authStatus.data.keka_user_id
      };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      
      const response = await kekaApiClient.get('/time/leaverequests', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async applyForLeave(leaveData) {
    try {
      // Get current user's employee ID
      const authStatus = await this.checkKekaAuthStatus();
      if (!authStatus.success || !authStatus.data?.keka_user_id) {
        return {
          success: false,
          error: 'Keka account not connected or user ID not found'
        };
      }
      
      // Add employee ID to leave data
      const leaveRequestData = {
        ...leaveData,
        employeeId: authStatus.data.keka_user_id
      };
      
      const response = await kekaApiClient.post('/time/leaverequests', leaveRequestData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // Attendance
  async getMyAttendance(fromDate, toDate) {
    try {
      // Get current user's employee ID
      const authStatus = await this.checkKekaAuthStatus();
      if (!authStatus.success || !authStatus.data?.keka_user_id) {
        return {
          success: false,
          error: 'Keka account not connected or user ID not found'
        };
      }
      
      // Validate date range (Keka limits to 90 days)
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
          return {
            success: false,
            error: 'Date range cannot exceed 90 days (Keka API limitation)'
          };
        }
      }
      
      const params = {
        employeeId: authStatus.data.keka_user_id
      };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      
      const response = await kekaApiClient.get('/time/attendance', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch attendance',
        status: error.response?.status
      };
    }
  }

  async getCurrentMonthAttendance() {
    try {
      // Get current month date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Use the main attendance method with current month dates
      return await this.getMyAttendance(firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]);
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch current month attendance',
        status: error.response?.status
      };
    }
  }

  // Payslips - Note: Keka doesn't have a direct payslip endpoint
  // You may need to implement this through your backend or use alternative methods
  async getMyPayslip(month, year) {
    try {
      // Since Keka doesn't have a direct payslip endpoint, 
      // we'll need to implement this through your backend service
      const response = await hrApiClient.get('/payslip', {
        params: { month, year }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Payslip endpoint not available in Keka API. Implement through backend service.',
        status: error.response?.status
      };
    }
  }

  async getLatestPayslip() {
    try {
      const response = await hrApiClient.get('/payslip/latest');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch latest payslip',
        status: error.response?.status
      };
    }
  }

  // General Information
  async getLeaveTypes() {
    try {
      const response = await kekaApiClient.get('/time/leavetypes');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch leave types',
        status: error.response?.status
      };
    }
  }

  async getCompanyHolidays(year = null) {
    try {
      // Note: Keka holidays endpoint requires a calendar ID
      // This is a limitation - you'll need to get the calendar ID from Keka admin
      const calendarId = process.env.REACT_APP_KEKA_CALENDAR_ID || 'default';
      const params = year ? { year } : {};
      
      const response = await kekaApiClient.get(`/time/holidayscalendar/${calendarId}/holidays`, { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch holidays. Note: Requires calendar ID configuration.',
        status: error.response?.status
      };
    }
  }

  async getUpcomingHolidays() {
    try {
      // Get upcoming holidays using the company holidays method
      // This will return all holidays, you can filter for upcoming ones in the frontend
      const response = await this.getCompanyHolidays();
      if (response.success && response.data) {
        const now = new Date();
        const upcomingHolidays = response.data.filter(holiday => {
          const holidayDate = new Date(holiday.date);
          return holidayDate >= now;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return {
          success: true,
          data: upcomingHolidays
        };
      }
      return response;
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch upcoming holidays',
        status: error.response?.status
      };
    }
  }

  // HR Chat Integration - Uses backend API for custom chat context
  async getHRContextForChat(query) {
    try {
      const response = await hrApiClient.post('/chat/context', { query });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to get HR context',
        status: error.response?.status
      };
    }
  }

  // Health Check - Uses backend API for service health
  async checkHRServiceHealth() {
    try {
      const response = await hrApiClient.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'HR service health check failed',
        status: error.response?.status
      };
    }
  }

  // Utility Methods
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(datetime) {
    if (!datetime) return '';
    return new Date(datetime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateWorkingDays(startDate, endDate, excludeWeekends = true) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    const current = new Date(start);
    while (current <= end) {
      if (!excludeWeekends || (current.getDay() !== 0 && current.getDay() !== 6)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  getLeaveStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#4caf50'; // Green
      case 'pending':
        return '#ff9800'; // Orange
      case 'rejected':
        return '#f44336'; // Red
      case 'cancelled':
        return '#9e9e9e'; // Grey
      default:
        return '#2196f3'; // Blue
    }
  }

  getAttendanceStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'present':
        return '#4caf50'; // Green
      case 'absent':
        return '#f44336'; // Red
      case 'half_day':
        return '#ff9800'; // Orange
      case 'late':
        return '#ff5722'; // Deep Orange
      case 'work_from_home':
        return '#2196f3'; // Blue
      default:
        return '#9e9e9e'; // Grey
    }
  }
}

// Export singleton instance
export const hrService = new HRService();
export default hrService;
