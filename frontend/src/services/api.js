import axios from 'axios';
// Import the Supabase client
import { supabase } from './supabase'; // Assuming supabase.js exports the client

// Use process.env consistently
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com';
const API_URL = `${API_BASE_URL}/api`; // Ensure /api is included

console.log('API Service: Environment check', { API_URL, NODE_ENV: process.env.NODE_ENV, origin: window.location.origin });

// REMOVE Token management functions - Supabase handles this
// const getToken = () => localStorage.getItem('authToken');
// const setToken = (token) => localStorage.setItem('authToken', token);
// const removeToken = () => localStorage.removeItem('authToken');
// const getUserInfo = () => JSON.parse(localStorage.getItem('userInfo') || 'null');
// const setUserInfo = (userInfo) => localStorage.setItem('userInfo', JSON.stringify(userInfo));
// const removeUserInfo = () => localStorage.removeItem('userInfo');

// Create an axios instance
const axiosInstance = axios.create({
  baseURL: API_URL, // Use the corrected base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the Supabase token
axiosInstance.interceptors.request.use(
  async (config) => { // Make interceptor async
    // Get the current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Error getting Supabase session:", error);
    } else if (session?.access_token) {
        console.log("Attaching Supabase token to request header.");
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
        console.log("No active Supabase session found, sending request without token.");
        // Ensure any previous invalid token is removed from defaults if necessary
        delete config.headers['Authorization'];
    }

    console.log(`Making request to: ${config.url}`); // Keep logging request details without headers for brevity
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (keep generic error logging)
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API Response Status:', response.status); // Log successful response status
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      response: error.response ? { status: error.response.status, data: error.response.data } : 'No response',
      config: error.config,
    });

    if (error.response?.status === 401) {
        console.warn('API returned 401 Unauthorized. This might indicate the Supabase token was invalid or the backend API could not verify it.');
        // Note: Supabase client automatically handles token refresh.
        // We don't need to manually clear tokens here unless specifically required.
        // Consider notifying the user or attempting a silent refresh if appropriate.
    } else {
        console.error(`Unhandled error status: ${error.response?.status}`);
    }
    return Promise.reject(error);
  }
);

// Authentication service using Supabase Auth
export const auth = {
  // Login using Supabase email/password
  login: async (credentials) => {
    console.log("Attempting Supabase login...");
    const { email, password } = credentials; // Assuming credentials = {email, password}
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase Login error:', error.message);
      throw error; // Re-throw the error to be handled by the component
    }

    console.log("Supabase login successful:", data.session?.user?.email);
    // Return the user and session data provided by Supabase
    return { user: data.user, session: data.session };
  },

  // Logout using Supabase
  logout: async () => {
    console.log("Attempting Supabase logout...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase Logout error:', error.message);
      throw error;
    }
    console.log("Supabase logout successful.");
    // No need to manually clear tokens, Supabase client handles it.
  },

  // Get current Supabase session (includes user info)
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error fetching Supabase session:", error.message);
        return null;
    }
    return session; // Contains user object if authenticated
  },

  // Listen for auth state changes (useful for updating UI)
  onAuthStateChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase auth event: ${event}`, session);
      callback(event, session); // Pass event and session to the callback
    });
    return subscription; // Return the subscription object so it can be unsubscribed
  },

  // Convenience function to get current user directly
  getCurrentUser: async () => {
      const session = await auth.getSession();
      return session?.user ?? null;
  }

  // Remove getToken, getUserInfo etc. as Supabase manages the session
};

// Chat API service
export const chatApi = {
  getSessions: async () => {
    console.log('Getting chat sessions from backend API');
    try {
      // Correct path: /chat/sessions
      const response = await axiosInstance.get('/chat/sessions');
      return response.data.sessions || []; // Ensure consistent return type
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Don't clear auth state here, let the interceptor handle 401
      return []; // Return empty array on error
    }
  },

  getSessionMessages: async (sessionId) => {
    console.log(`Getting messages for session: ${sessionId}`);
    try {
      // Correct path: /chat/sessions/{sessionId}/messages
      const response = await axiosInstance.get(`/chat/sessions/${sessionId}/messages`);
      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  },

  createSession: async () => {
    console.log('Creating new chat session via backend API');
    try {
       // Correct path: /chat/sessions
      const response = await axiosInstance.post('/chat/sessions');
      return response.data; // The created session object
    } catch (error) {
      console.error('Error creating session:', error);
      // Optionally create a local session as fallback? Be careful with this.
      // For now, just throw the error
      throw error;
    }
  },

  sendMessage: async (sessionId, message) => {
    console.log(`Sending message for session: ${sessionId}`);
    const payload = { content: message };
    let endpoint = ''; // Will be determined by interceptor implicitly
    let useAuthenticated = false;

    // Logic to determine endpoint based on token is now handled by interceptor
    // Simplified logic: assume if session exists, interceptor adds token for authenticated endpoint
    // If not, it defaults to public (though backend might still require auth for some endpoints)
    
    // We can't reliably check token here easily without duplicating interceptor logic.
    // Assume interceptor handles adding token if session exists.
    // The primary path determination should ideally be based on context (are we logged in?)
    // For now, we'll simplify and rely on the interceptor and backend rules.
    // Let's try the authenticated endpoint first, backend will reject if no valid token
    endpoint = `/chat/sessions/${sessionId}/messages`;
    useAuthenticated = true; // Assume we try authenticated first
    
    try {
      // Use the authenticated endpoint by default
      const response = await axiosInstance.post(endpoint, payload);
      console.log('Message sent successfully:', response.data);
      
      // Response handling might need adjustment based on backend's actual response
      // Assuming authenticated response returns the assistant message object:
      return {
          messages: [
              { role: 'user', content: message, created_at: new Date().toISOString() }, // Simulate user message
              response.data.message // Assuming response.data.message contains the assistant's reply object
          ]
      };
      
    } catch (error) {
      console.error('Error sending message:', error);
      // If 401/403, maybe try public endpoint as fallback if applicable?
      // Or just let the error propagate
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    console.log(`Deleting session: ${sessionId}`);
    try {
      // Correct path: /chat/sessions/{sessionId}
      await axiosInstance.delete(`/chat/sessions/${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting session:', error);
      return { success: false, error };
    }
  },
};

// Knowledge Base API service
export const knowledgeApi = {
  addDocument: async (documentData) => {
    console.log('Adding document via API:', documentData);
    try {
      // Correct path: /knowledge/documents or /knowledge/upload
      // Interceptor will add Authorization header if Supabase session exists
      const response = await axiosInstance.post('/knowledge/upload', documentData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error adding document:', error);
      return { success: false, error };
    }
  },

  uploadFile: async (file, metadata = {}) => {
      console.log(`Uploading file via API: ${file.name}`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify(metadata));
      try {
          // Correct path: /knowledge/upload-file
          const response = await axiosInstance.post('/knowledge/upload-file', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          return { success: true, data: response.data };
      } catch (error) {
          console.error('Error uploading file:', error);
          return { success: false, error };
      }
  },

  searchDocuments: async (query) => {
    console.log(`Searching knowledge base via API with query: ${query}`);
    try {
        // Correct path: /knowledge/search
      const response = await axiosInstance.get('/knowledge/search', { params: { query } });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error searching documents:', error);
      return { success: false, error };
    }
  },

  // Add other knowledge base endpoints as needed
};

// Combine services (optional, based on usage)
const apiService = {
  auth,
  chat: chatApi,
  knowledge: knowledgeApi,
  // Add other services if needed
};

// Remove the cors-fix script if it exists, as it might conflict
const corsFixScript = document.getElementById('hr-chatbot-cors-fix-script');
if (corsFixScript) {
    corsFixScript.remove();
    console.log("Removed conflicting cors-fix.js script.");
}


export default apiService; // Export combined or individual services as needed