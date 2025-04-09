import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Debug the environment variables


// Initialize Supabase client with hardcoded values for reliability
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://sethhceiojxrevvpzupf.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldGhoY2Vpb2p4cmV2dnB6dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NDcyMDAsImV4cCI6MjA1ODEyMzIwMH0.dYLDhmxgP9k-fOAGAddH8UNCETMF8fHKNhSPWpDNisM';



// Make sure these environment variables are correctly set

let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true
    }
  });
} catch (error) {
  
  throw new Error('Cannot initialize Supabase client. Backend services will be unavailable.');
}

// Export the supabase client for direct use
export { supabase };

// Get the current user ID, or generate a guest ID if not authenticated
const getUserId = async () => {
  // First check if we have a user in local storage from our auth system
  const localUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (localUser && localUser.email) {
    // Create a deterministic ID based on email to ensure consistent IDs
    // Use the email as a unique identifier
    return `user-${localUser.email.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  
  // Fallback to Supabase auth if local auth isn't available
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    return user.id;
  }
  
  // Final fallback to guest ID
  const guestId = localStorage.getItem('guestId') || Date.now().toString();
  if (!localStorage.getItem('guestId')) {
    localStorage.setItem('guestId', guestId);
  }
  return `guest-${guestId}`;
};

// Get the API URL from environment variables - support both prefixes
const apiUrl = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Generate UUIDs for message IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Helper function to safely convert a string to UUID
const toUUID = (id) => {
  // If it's already a valid UUID, return it
  if (isValidUUID(id)) {
    return id;
  }
  
  // If input is invalid, throw a detailed error
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid session ID: Must be a string');
  }
  
  // If it's a local ID (starts with 'local-'), it can't be converted to UUID
  if (id.startsWith('local-')) {
    throw new Error('Local session IDs cannot be converted to UUID format');
  }
  
  // If it's a user ID (starts with 'user-'), it can't be converted to UUID
  if (id.startsWith('user-')) {
    throw new Error('User session IDs cannot be converted to UUID format');
  }
  
  // Try to convert string to UUID format if possible
  try {
    // If it's all hex without dashes, try to format it as a UUID
    if (/^[0-9a-f]{32}$/i.test(id)) {
      return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
    }
    
    throw new Error(`Cannot convert to UUID: invalid format "${id}"`);
  } catch (error) {
    throw new Error('Invalid session ID format. Must be a valid UUID.');
  }
};

// Knowledge Base services using direct Supabase connection
const supabaseService = {
  // Utility methods
  getUrl: () => supabaseUrl,
  isInitialized: () => !!supabase,
  
  // Test the Supabase connection
  testConnection: async () => {
    try {
      const { count, error } = await supabase
        .from('knowledge_documents')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        return { success: false, error };
      }
      
      return { success: true, count };
    } catch (error) {
      return { success: false, error };
    }
  },
  
  // For diagnostic purposes - get direct documents data
  getDiagnosticData: async () => {
    try {
      
      // Get all documents directly
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .limit(10);
        
      if (error) {
        return { success: false, error };
      }
      
      const simplifiedData = data.map(doc => ({
        id: doc.id,
        text_preview: doc.text ? doc.text.substring(0, 50) + '...' : 'No text',
        metadata: doc.metadata,
        has_embedding: !!doc.embedding
      }));
      
      return { success: true, data: simplifiedData, rawData: data };
    } catch (error) {
      return { success: false, error };
    }
  },
  
  // Chat session management
  chat: {
    // Get all sessions for the current user
    getSessions: async () => {
      try {
        // Add logging to debug
        
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
          return []
        }
        
        return data
      } catch (error) {
        return []
      }
    },
    
    // Create a new chat session
    createSession: async () => {
      try {
        const userId = await getUserId();
        
        const newSession = {
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: 'New Chat', // Optional title
          message_count: 0
        };
        
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert(newSession)
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        return data;
      } catch (error) {
        throw error;
      }
    },
    
    // Delete a chat session
    deleteSession: async (sessionId) => {
      try {
        
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);
          
        if (error) {
          throw error;
        }
        
        return { success: true };
      } catch (error) {
        throw error;
      }
    },
    
    // Get messages for a specific session
    getSessionMessages: async (sessionId) => {
      try {
        
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        return { messages: data || [] };
      } catch (error) {
        throw error;
      }
    },
    
    // Send a message to a chat session
    sendMessage: async (sessionId, content) => {
      try {
        
        // For direct OpenAI API access, create a custom API endpoint
        // Prepare the message payload
        const payload = {
          message: content,
          session_id: sessionId,
          user_id: await getUserId()
        };
        
        // Use the direct backend API URL
        const backendUrl = 'https://hr-self-service.onrender.com/api/chat/public';
        
        // Send the request
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          throw new Error(`Backend API returned status: ${response.status}`);
        }
        
        const data = await response.json();
        
        
        // Format response in expected format
        return {
          messages: [
            {
              role: 'user',
              content: content,
              created_at: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: data.response || data.message,
              created_at: new Date(Date.now() + 1000).toISOString()
            }
          ]
        };
      } catch (error) {
        throw error;
      }
    }
  },
  
  // Add a document directly to Supabase
  addDocument: async (document) => {
    
    if (!document || !document.text) {
      throw new Error('Invalid document: Text is required');
    }
    
    try {
      throw new Error('Direct insertion not supported');
    } catch (error) {
      
      // Return a specific error object that indicates we should fall back to API
      return { 
        success: false, 
        error: error.message, 
        fallbackToApi: true 
      };
    }
  },
  
  // Search for documents - simplified to only use direct document search
  searchDocuments: async (query, topK = 5) => {

    try {
      throw new Error('Direct search not supported');
    } catch (error) {
      
      // Return a specific error object that indicates we should fall back to API
      return { 
        success: false, 
        error: error.message, 
        fallbackToApi: true 
      };
    }
  },
};

// Export the supabase service
export default supabaseService;

const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}