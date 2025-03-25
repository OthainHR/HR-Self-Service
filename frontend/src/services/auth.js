import api from './api';

const authService = {
  // Login user and store token
  login: async (email, password) => {
    try {
      // Use FormData format for OAuth2 compatibility
      const formData = new URLSearchParams();
      // Special case for admin@example.com - use "admin" as username
      const username = email === "admin@example.com" ? "admin" : email;
      formData.append('username', username);  // Backend expects 'username' field
      formData.append('password', password);
      
      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      if (response.data.access_token) {
        // Store token in both locations to ensure compatibility
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('auth_token', response.data.access_token);
        console.log('Auth token stored successfully');
        
        // Extract user info from JWT payload or make a separate API call for user info
        // For now, just store basic user info
        const userInfo = {
          username: username,
          email: email,
          role: email === "admin@example.com" ? "admin" : "employee"
        };
        localStorage.setItem('user', JSON.stringify(userInfo));
        console.log('User info stored:', userInfo);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Mock login for testing - use this when real API is not available
  mockLogin: (email, password) => {
    console.log('Using mock login with email:', email);
    
    // Determine role and permissions
    const isAdmin = email === "admin@example.com";
    const role = isAdmin ? "admin" : "employee";
    const permissions = isAdmin 
      ? ["chat:access", "knowledge:access", "knowledge:write", "admin:access"]
      : ["chat:access"];
    
    // Create a simple string token instead of trying to mimic JWT structure
    const mockToken = isAdmin 
      ? "MOCK_ADMIN_TOKEN_" + Date.now()
      : "MOCK_USER_TOKEN_" + Date.now();
    
    console.log('Generated mock token for role:', role);
    
    // Store token in both locations to ensure compatibility
    localStorage.setItem('token', mockToken);
    localStorage.setItem('auth_token', mockToken);
    console.log('Mock auth token stored successfully');
    
    // Set user info with permissions
    const userInfo = {
      username: isAdmin ? "admin" : email.split('@')[0],
      email: email,
      role: role,
      permissions: permissions
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    console.log('Mock user info stored:', userInfo);
    
    return {
      access_token: mockToken,
      token_type: 'bearer'
    };
  },

  // Auto-login for testing (creates a mock admin session)
  autoLogin: () => {
    console.log('Auto-logging in for testing');
    
    // Admin has all permissions
    const permissions = ["chat:access", "knowledge:access", "knowledge:write", "admin:access"];
    
    // Create a simple string token
    const mockToken = "MOCK_ADMIN_TOKEN_" + Date.now();
    
    // Store token in both locations to ensure compatibility
    localStorage.setItem('token', mockToken);
    localStorage.setItem('auth_token', mockToken);
    console.log('Auto-login auth token stored successfully');
    
    // Set admin user info with permissions
    const userInfo = {
      username: "admin",
      email: "admin@example.com",
      role: "admin",
      permissions: permissions
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    console.log('Auto-login user info stored:', userInfo);
    
    return true;
  },

  // Logout user and remove token
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    console.log('User logged out, all credentials removed');
  },

  // Register new user account
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Get current authenticated user from local storage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Check if user has admin role
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user && user.role === 'admin';
  },

  // Check if user has a specific permission
  hasPermission: (permission) => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    // Admin role has all permissions
    if (user.role === 'admin') return true;
    
    // Check user's permissions array
    return user.permissions && user.permissions.includes(permission);
  },
  
  // Check if user has all of the specified permissions
  hasPermissions: (requiredPermissions) => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    // Admin role has all permissions
    if (user.role === 'admin') return true;
    
    // Return false if user has no permissions
    if (!user.permissions) return false;
    
    // Check if user has all specified permissions
    return requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );
  },
  
  // Check if user has access to knowledge base
  hasKnowledgeAccess: () => {
    return authService.hasPermission('knowledge:access');
  },
  
  // Check if user has access to chat
  hasChatAccess: () => {
    return authService.hasPermission('chat:access');
  },
};

export default authService;
