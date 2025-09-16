import axios from 'axios';
import { supabase } from './supabase';

/**
 * Direct HR Service - No OAuth Required
 * 
 * This service directly calls the backend HR API which uses stored Keka data
 * instead of requiring individual OAuth authentication.
 * 
 * Required Environment Variables:
 * - REACT_APP_API_URL: Your backend API URL (e.g., http://localhost:8000)
 */

// Create axios instance for HR API calls
const hrApiClient = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com'}/api/hr`,
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

// Enhanced error handling function
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Authentication error - redirect to login
    window.location.href = '/login';
    return { success: false, error: 'Session expired. Please log in again.' };
  } else if (error.response?.status === 403) {
    return { success: false, error: 'Access denied. You may not have permission to access this data.' };
  } else if (error.response?.status === 404) {
    return { success: false, error: 'Employee data not found. Please contact HR if this persists.' };
  } else if (error.response?.status === 429) {
    return { success: false, error: 'Too many requests. Please try again in a moment.' };
  } else if (error.response?.status === 500) {
    return { success: false, error: 'HR service is temporarily unavailable. Please try again later.' };
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
    return Promise.reject(error);
  }
);

// Direct HR Service class
class DirectHRService {
  
  // Employee Profile - Get current user's profile
  async getMyProfile() {
    try {
      const response = await hrApiClient.get('/profile');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // Get raw employee data for comprehensive information
  async getRawEmployeeData() {
    try {
      const response = await hrApiClient.get('/profile/raw');
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
      const params = leaveType ? { leave_type: leaveType } : {};
      const response = await hrApiClient.get('/leave/balances', { params });
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
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      
      const response = await hrApiClient.get('/leave/history', { params });
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
      const response = await hrApiClient.post('/leave/apply', leaveData);
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
      // Validate date range (limit to 6 months)
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
        if (diffDays > 180) {
          return {
            success: false,
            error: 'Date range cannot exceed 6 months'
          };
        }
      }
      
      const params = {
        from_date: fromDate,
        to_date: toDate
      };
      
      const response = await hrApiClient.get('/attendance', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getCurrentMonthAttendance() {
    try {
      const response = await hrApiClient.get('/attendance/current-month');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // Payslips
  async getMyPayslip(month, year) {
    try {
      const response = await hrApiClient.get('/payslip', {
        params: { month, year }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
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
      return handleApiError(error);
    }
  }

  // General Information
  async getLeaveTypes() {
    try {
      const response = await hrApiClient.get('/leave-types');
      return {
        success: true,
        data: response.data.leave_types || response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getCompanyHolidays(year = null) {
    try {
      const params = year ? { year } : {};
      const response = await hrApiClient.get('/holidays', { params });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  async getUpcomingHolidays() {
    try {
      const response = await hrApiClient.get('/holidays/upcoming');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // HR Chat Integration
  async getHRContextForChat(query) {
    try {
      const response = await hrApiClient.post('/chat/context', { query });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  }

  // Health Check
  async checkHRServiceHealth() {
    try {
      const response = await hrApiClient.get('/health');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
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
export const hrService = new DirectHRService();
export default hrService;
