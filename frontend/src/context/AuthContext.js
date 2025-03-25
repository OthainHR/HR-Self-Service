import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/auth';

// Create the authentication context
const AuthContext = createContext(null);

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated on initial load
    const initAuth = () => {
      const user = authService.getCurrentUser();
      
      // If no user is logged in, auto-login for testing purposes
      if (!user) {
        // Auto-login for testing API connection
        authService.autoLogin();
        const autoUser = authService.getCurrentUser();
        setCurrentUser(autoUser);
      } else {
        setCurrentUser(user);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const data = await authService.login(email, password);
      // Update currentUser from localStorage after login
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      return data;
    } catch (err) {
      console.log('Login failed, using mock login');
      // If API login fails, use mock login
      try {
        const mockData = authService.mockLogin(email, password);
        const user = authService.getCurrentUser();
        setCurrentUser(user);
        return mockData;
      } catch (mockErr) {
        setError(err.response?.data?.message || 'An error occurred during login');
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const data = await authService.register(userData);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return authService.isAuthenticated();
  };

  // Check if user is admin
  const isAdmin = () => {
    return currentUser && currentUser.role === 'admin';
  };

  // Value object that will be passed to consumers
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
