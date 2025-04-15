import axios from 'axios';
// Import the Supabase client
import { supabase } from './supabase'; // Assuming supabase.js exports the client

// Use process.env consistently
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com';
const API_URL = `${API_BASE_URL}/api`; // Ensure /api is included



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
        
    } else if (session?.access_token) {
        
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
        
        // Ensure any previous invalid token is removed from defaults if necessary
        delete config.headers['Authorization'];
    }

     // Keep logging request details without headers for brevity
    return config;
  },
  (error) => {
    
    return Promise.reject(error);
  }
);

// Response interceptor for error handling (keep generic error logging)
axiosInstance.interceptors.response.use(
  (response) => {
     // Log successful response status
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      response: error.response ? { status: error.response.status, data: error.response.data } : 'No response',
      config: error.config,
    });

    if (error.response?.status === 401) {
        
        // Note: Supabase client automatically handles token refresh.
        // We don't need to manually clear tokens here unless specifically required.
        // Consider notifying the user or attempting a silent refresh if appropriate.
    } else {
        
    }
    return Promise.reject(error);
  }
);

// Authentication service using Supabase Auth
export const auth = {
  // Login using Supabase email/password
  login: async (credentials) => {
    
    const { email, password } = credentials; // Assuming credentials = {email, password}
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      
      throw error; // Re-throw the error to be handled by the component
    }

    
    // Return the user and session data provided by Supabase
    return { user: data.user, session: data.session };
  },

  // Logout using Supabase
  logout: async () => {
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      
      throw error;
    }
    
    // No need to manually clear tokens, Supabase client handles it.
  },

  // Get current Supabase session (includes user info)
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        
        return null;
    }
    return session; // Contains user object if authenticated
  },

  // Listen for auth state changes (useful for updating UI)
  onAuthStateChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session); // Pass event and session to the callback
    });
    return subscription; // Return the subscription object so it can be unsubscribed
  },

  // Signup using Supabase
  signup: async (credentials) => {
    const { email, password } = credentials;
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // You can add options here, like redirect URLs or metadata
      // options: {
      //   emailRedirectTo: 'http://localhost:3000/chat',
      //   data: { full_name: 'Optional Name' } // Example metadata
      // }
    });

    if (error) {
      throw error; // Let the calling function (AuthContext) handle the error
    }

    // Signup successful. Data might contain user and session if auto-confirmed,
    // or just user if email confirmation is required.
    // The onAuthStateChange listener will typically handle the session update.
    return { user: data.user, session: data.session };
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
    
    try {
      // Correct path: /chat/sessions
      const response = await axiosInstance.get('/chat/sessions');
      return response.data.sessions || []; // Ensure consistent return type
    } catch (error) {
      
      // Don't clear auth state here, let the interceptor handle 401
      return []; // Return empty array on error
    }
  },

  getSessionMessages: async (sessionId) => {
    
    try {
      // Correct path: /chat/sessions/{sessionId}/messages
      const response = await axiosInstance.get(`/chat/sessions/${sessionId}/messages`);
      // The backend returns {"messages": [...]}, which is what ChatWindow expects.
      // Just return the whole data object.
      return response.data || { messages: [] }; // Return the data or a default structure
    } catch (error) {
      
      return { messages: [] }; // Return default structure on error
    }
  },

  createSession: async () => {
    
    try {
       // Correct path: /chat/sessions
      const response = await axiosInstance.post('/chat/sessions');
      return response.data; // The created session object
    } catch (error) {
      
      // Optionally create a local session as fallback? Be careful with this.
      // For now, just throw the error
        throw error;
    }
  },

  // Modified sendMessage to handle streaming responses
  sendMessage: async (sessionId, message, onChunkReceived) => {
    const payload = { content: message };
    const endpoint = `/chat/sessions/${sessionId}/messages`;
    
    try {
      // Get the token directly before making the fetch call
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting session for streaming:", sessionError);
        throw new Error("Authentication error");
      }
      if (!session?.access_token) {
        console.error("No session token found for streaming.");
        throw new Error("User not authenticated");
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, { // Use fetch API
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Add auth token
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Handle HTTP errors (like 404, 500 from the backend)
        const errorText = await response.text();
        console.error(`Streaming API Error ${response.status}:`, errorText);
        throw new Error(`Request failed with status code ${response.status}: ${errorText}`);
      }
      
      // Check if the response body exists and is readable
      if (!response.body) {
        throw new Error("Response body is missing or not readable.");
      }

      // Process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          onChunkReceived(chunk); // Call the callback with the new chunk
        }
      }
      
      // Indicate stream completion (optional)
      onChunkReceived(null); // Pass null or a specific signal
      
    } catch (error) {
      console.error('sendMessage stream error:', error);
      // Propagate the error so the UI can handle it
      throw error;
    }
  },

  deleteSession: async (sessionId) => {
    
    try {
      // Correct path: /chat/sessions/{sessionId}
      await axiosInstance.delete(`/chat/sessions/${sessionId}`);
      return { success: true };
    } catch (error) {
      
      return { success: false, error };
    }
  },
};

// Knowledge Base API service
export const knowledgeApi = {
  addDocument: async (documentData) => {
    
    try {
      // Correct path: /knowledge/documents or /knowledge/upload
      // Interceptor will add Authorization header if Supabase session exists
      const response = await axiosInstance.post('/knowledge/upload', documentData);
      return { success: true, data: response.data };
    } catch (error) {
      
      return { success: false, error };
    }
  },

  uploadFile: async (file, metadata = {}) => {
      
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
          
          return { success: false, error };
      }
  },

  searchDocuments: async (query) => {
    
    try {
        // Correct path: /knowledge/search
      const response = await axiosInstance.get('/knowledge/search', { params: { query } });
      return { success: true, data: response.data };
    } catch (error) {
      
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

export default apiService; // Export combined or individual services as needed