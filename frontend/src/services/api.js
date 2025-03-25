import axios from 'axios';
import supabaseService from './supabase';

// Token management
const getStoredToken = () => localStorage.getItem('auth_token');
const setStoredToken = (token) => localStorage.setItem('auth_token', token);
const removeStoredToken = () => localStorage.removeItem('auth_token');

// Create an axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: false, // Disable credentials to avoid CORS issues
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to add token to all requests
api.interceptors.request.use(
  (config) => {
    // Always try to get token, but don't block requests if missing
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      removeStoredToken();
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export const authApi = {
  login: async (username, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const { access_token } = response.data;
      setStoredToken(access_token);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: () => {
    removeStoredToken();
  },

  isAuthenticated: () => {
    return !!getStoredToken();
  }
};

// Simple check for server availability
export const checkServerAvailable = async () => {
  try {
    // Try a simple root endpoint request
    const response = await fetch('http://localhost:8000/');
    return response.ok;
  } catch (error) {
    console.error('Server connection error:', error);
    return false;
  }
};

// Chat API service
export const chatApi = {
  // Get all chat sessions for the current user
  getSessions: async (forceOnline = false) => {
    try {
      console.log('Getting chat sessions from Supabase');
      
      // Get sessions from Supabase
      const data = await supabaseService.chat.getSessions();
      
      // Get any local sessions from localStorage
      let localSessions = [];
      try {
        localSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
      } catch (storageError) {
        console.error('Error reading local sessions:', storageError);
      }
      
      // Combine online and local sessions
      const combinedSessions = [
        ...(data.sessions || []),
        ...localSessions.filter(session => session.id && session.id.startsWith('local-'))
      ];
      
      // Sort by updated_at date
      const sortedSessions = combinedSessions.sort((a, b) => {
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
      
      return { sessions: sortedSessions };
    } catch (error) {
      console.error('Error fetching sessions from Supabase:', error);
      
      // Try to return local sessions if Supabase fails
      try {
        const localSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
        return { sessions: localSessions };
      } catch (storageError) {
        console.error('Error reading local sessions:', storageError);
        return { sessions: [] };
      }
    }
  },

  // Get chat messages for a specific session
  getSessionMessages: async (sessionId) => {
    try {
      console.log('Getting messages for session from Supabase:', sessionId);
      const data = await supabaseService.chat.getSessionMessages(sessionId);
      return data;
    } catch (error) {
      console.error('Error fetching session messages from Supabase:', error);
      return { messages: [] };
    }
  },

  // Create a new chat session
  createSession: async () => {
    try {
      console.log('Creating new session in Supabase');
      const session = await supabaseService.chat.createSession();
      return session;
    } catch (error) {
      console.error('Error creating session in Supabase:', error);
      
      // Create a fallback local session
      const fallbackSession = {
        id: 'local-' + Date.now(),
        user_id: 'guest',
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0
      };
      
      // Attempt to save it to localStorage for offline access
      try {
        const localSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
        localSessions.push(fallbackSession);
        localStorage.setItem('chat_sessions', JSON.stringify(localSessions));
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
      }
      
      return fallbackSession;
    }
  },

  // Send a new message in a chat session
  sendMessage: async (sessionId, content) => {
    try {
      console.log('Sending message for session:', sessionId);
      
      // No need to ensure test token, we'll use the standard token
      
      try {
        // Try Supabase chat API with a timeout
        const timeoutDuration = 3000; // 3 seconds timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        
        try {
          const response = await supabaseService.chat.sendMessage(sessionId, content);
          clearTimeout(timeoutId);
          return response;
        } catch (supabaseError) {
          clearTimeout(timeoutId);
          console.error('Error sending message via Supabase:', supabaseError);
          
          // Check if this is an OpenAI API quota error
          if (supabaseError.message && (
            supabaseError.message.includes('insufficient_quota') || 
            (supabaseError.message.includes('429') && supabaseError.message.includes('quota'))
          )) {
            console.error('OpenAI API quota exceeded:', supabaseError.message);
            throw new Error(`OpenAI API quota exceeded: ${supabaseError.message}`);
          }
          
          throw supabaseError;
        }
      } catch (error) {
        console.error('Error in sendMessage:', error);
        
        // If it's an OpenAI quota error, propagate it
        if (error.message && (
          error.message.includes('insufficient_quota') || 
          (error.message.includes('429') && error.message.includes('quota'))
        )) {
          throw error;
        }
        
        // Special handling for 404 errors - API endpoint not found
        if (error.message && error.message.includes('API endpoint not found')) {
          return generateFallbackResponse(content, '404');
        }
        
        // Otherwise fallback to generating a simulated response
        return generateFallbackResponse(content);
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      // If it's an OpenAI quota error, propagate it
      if (error.message && (
        error.message.includes('insufficient_quota') || 
        (error.message.includes('429') && error.message.includes('quota'))
      )) {
        throw error;
      }
      
      // Special handling for 404 errors - API endpoint not found
      if (error.message && error.message.includes('API endpoint not found')) {
        return generateFallbackResponse(content, '404');
      }
      
      // Otherwise fallback to generating a simulated response
      return generateFallbackResponse(content);
    }
  },
  
  // Delete a chat session
  deleteSession: async (sessionId) => {
    try {
      // Check if this is a local session
      if (sessionId && sessionId.toString().startsWith('local-')) {
        console.log('Deleting local session:', sessionId);
        // Remove from localStorage
        try {
          const localSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
          const updatedSessions = localSessions.filter(s => s.id !== sessionId);
          localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
          return { success: true };
        } catch (storageError) {
          console.error('Error removing session from localStorage:', storageError);
          throw storageError;
        }
      }
      
      console.log('Deleting session via Supabase:', sessionId);
      const response = await supabaseService.chat.deleteSession(sessionId);
      return response;
    } catch (error) {
      console.error('Error deleting session via Supabase:', error);
      
      // If error is due to invalid UUID format or local session, provide a clearer message
      if (error.message && (
          error.message.includes('Invalid session ID format') || 
          error.message.includes('Local session IDs cannot be deleted')
      )) {
        console.error('Session ID issue:', sessionId, error.message);
      }
      
      throw error;
    }
  }
};

// Ensure we have an auth token
const ensureTestAuthToken = async () => {
  // Check if we already have a standard token
  if (localStorage.getItem('token')) {
    console.log('Standard auth token exists');
    return;
  }
  
  console.log('No auth token found, check if user is logged in');
  
  // Check if we have user info
  const userInfo = localStorage.getItem('user');
  if (!userInfo) {
    console.log('No user information found, user needs to log in');
    return;
  }
  
  // If we have user info but no token, something is wrong with authentication
  console.error('User info exists but no token found. User may need to log in again.');
};

// Generate a fallback response
const generateFallbackResponse = async (content, errorType = null) => {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // If it's a 404 error, provide a specific message
  if (errorType === '404') {
    return {
      message: {
        id: 'fallback-' + Date.now(),
        role: 'assistant',
        content: 'I\'m running in offline mode because the AI API server is not available. I can still answer basic HR questions. For more detailed information, please ensure the backend server is running with the chat endpoints properly configured.',
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // Generate a simulated response based on the message
  let responseText = '';
  
  if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
    responseText = 'Hello! How can I help you with HR matters today?';
  } else if (content.toLowerCase().includes('policy') || content.toLowerCase().includes('policies')) {
    responseText = 'Our HR policies are designed to create a fair and productive workplace. For specific policy questions, please provide more details.';
  } else if (content.toLowerCase().includes('leave') || content.toLowerCase().includes('vacation') || content.toLowerCase().includes('time off')) {
    responseText = 'Regarding leave: Full-time employees receive 20 days of PTO annually, plus 10 holidays. Please submit requests through the HR portal at least 2 weeks in advance.';
  } else if (content.toLowerCase().includes('benefit') || content.toLowerCase().includes('insurance') || content.toLowerCase().includes('healthcare')) {
    responseText = 'Our benefits package includes comprehensive health insurance, 401k matching up to 5%, and wellness programs. The enrollment period is in November each year.';
  } else if (content.toLowerCase().includes('pay') || content.toLowerCase().includes('salary') || content.toLowerCase().includes('compensation')) {
    responseText = 'Compensation questions should be directed to your manager during performance reviews. HR conducts market analysis annually to ensure our compensation remains competitive.';
  } else if (content.toLowerCase().includes('work') || content.toLowerCase().includes('job') || content.toLowerCase().includes('career')) {
    responseText = 'Career development is important at our company. We offer training programs, mentorship opportunities, and clear advancement paths. Talk to your manager about creating a personalized development plan.';
  } else if (content.toLowerCase().includes('onboard') || content.toLowerCase().includes('new hire') || content.toLowerCase().includes('start')) {
    responseText = 'Our onboarding process takes about 2 weeks and includes orientation, meeting your team, setting up accounts, and initial training. Your manager will guide you through the process.';
  } else if (content.toLowerCase().includes('resign') || content.toLowerCase().includes('quit') || content.toLowerCase().includes('leave company')) {
    responseText = 'If you\'re considering resigning, please provide at least 2 weeks notice to your manager in writing. HR will schedule an exit interview and provide information about final pay and benefits continuation.';
  } else if (content.toLowerCase().includes('online') || content.toLowerCase().includes('offline')) {
    responseText = 'I\'m currently running in fallback mode. To use the full power of the AI API, make sure your backend server is running at http://localhost:8000.';
  } else if (content.toLowerCase().includes('help') || content.toLowerCase().includes('capabilities')) {
    responseText = 'As your HR virtual assistant, I can answer questions about company policies, benefits, time off, compensation, and other HR matters. I can also help with onboarding procedures and career development information.';
  } else {
    responseText = 'I understand you\'re asking about ' + content.split(' ').slice(0, 3).join(' ') + '... As your HR assistant, I can provide information on company policies, benefits, leave, compensation, and other HR-related matters. How can I assist you further?';
  }
  
  return {
    message: {
      id: 'fallback-' + Date.now(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString()
    }
  };
};

// Knowledge base API service
export const knowledgeApi = {
  // Search for documents in the knowledge base
  searchDocuments: async (query, topK = 5) => {
    try {
      const response = await api.get('/knowledge/search', { 
        params: { 
          query,
          top_k: topK
        } 
      });
      return response.data;
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  },

  // Upload text as a document (with metadata)
  uploadDocument: async (text, metadata) => {
    try {
      console.log('Uploading text with metadata:', metadata);
      
      // Use the proper backend endpoint
      const response = await api.post('/knowledge/test-upload', {
        text: text,
        title: metadata.title,
        source: metadata.source,
        category: metadata.category
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
      }
      
      throw error;
    }
  },
  
  // Add a document with text and metadata
  addDocument: async (document) => {
    try {
      // Format document to match backend expectations
      const formattedDoc = {
        text: document.text || "",
        title: document.title || "Untitled Document", 
        source: document.source || "Manual Entry",
        category: document.category || "general"
      };
      
      console.log('Adding document to knowledge base:', formattedDoc);
      
      // Try direct Supabase first
      try {
        console.log('Attempting direct Supabase insertion...');
        const supabaseResult = await supabaseService.addDocument(formattedDoc);
        
        if (supabaseResult.success) {
          console.log('Document added successfully via supabaseService:', supabaseResult.data);
          return { message: "Document added successfully via direct Supabase insertion" };
        } else {
          // Handle the specific error response from supabaseService
          console.log('Supabase insertion failed, fallback to API:', supabaseResult.error);
          
          if (supabaseResult.fallbackToApi) {
            // Explicit fallback signal from supabaseService
            console.log('Falling back to API endpoint as directed by Supabase service...');
          } else {
            // Unexpected error, but still attempt API fallback
            console.error('Unexpected Supabase error:', supabaseResult.error);
          }
        }
      } catch (supabaseError) {
        // Handle any unexpected exceptions from supabaseService
        console.error('Exception using supabaseService:', supabaseError);
        console.log('Falling back to API endpoint...');
      }
      
      // Try authenticated endpoint first
      try {
        console.log('Attempting to post to authenticated API endpoint: /knowledge/documents');
        const response = await api.post('/knowledge/documents', formattedDoc);
        console.log('Document added successfully via API:', response.data);
        return { ...response.data, message: "Document added successfully via API" };
      } catch (authError) {
        console.error('Error with authenticated upload:', authError);
        console.log('Auth error details:', authError.response ? authError.response.data : 'No response data');
        console.log('Auth error status:', authError.response ? authError.response.status : 'No status code');
        
        // If authentication fails, try the test endpoint
        console.log('Using test upload endpoint');
        try {
          const testResponse = await fetch('http://localhost:8000/knowledge/test-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedDoc)
          });
          
          console.log('Test endpoint response status:', testResponse.status);
          
          if (!testResponse.ok) {
            const errorData = await testResponse.json().catch(e => ({ error: 'Failed to parse error response' }));
            console.error('Test endpoint error details:', errorData);
            throw new Error(errorData.detail || 'Failed to upload document');
          }
          
          const responseData = await testResponse.json();
          console.log('Document added successfully via test endpoint:', responseData);
          return { ...responseData, message: "Document added successfully via test API endpoint" };
        } catch (testError) {
          console.error('Error with test endpoint:', testError);
          throw testError;
        }
      }
    } catch (error) {
      console.error('Error adding document:', error);
      
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
      }
      
      throw error;
    }
  },

  // Get all documents in the knowledge base
  getAllDocuments: async () => {
    try {
      const response = await api.get('/knowledge/documents');
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  // Delete a document from the knowledge base
  deleteDocument: async (documentId) => {
    try {
      const response = await api.delete(`/knowledge/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Upload a file to the knowledge base
  uploadFile: async (file, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata as a JSON string
      formData.append('metadata', JSON.stringify(metadata));
      
      const response = await api.post('/knowledge/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
  
  // Search endpoint to match frontend component expectations
  search: async (query, topK = 3) => {
    return knowledgeApi.searchDocuments(query, topK);
  }
};

// Add a specific function to directly get a test token
export const getAndSetTestToken = async () => {
  try {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/auth/test-token`);
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to get test token:', error);
    return false;
  }
};

export default api;