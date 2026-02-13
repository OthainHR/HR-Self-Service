import { createClient } from '@supabase/supabase-js';

// Debug the environment variables


// Initialize Supabase client strictly from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
}



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

export const recordDisclaimerAcknowledgement = async (userEmail) => {
  if (!userEmail) {
    return { error: { message: 'User email is required.' } };
  }
  try {
    const { data, error } = await supabase
      .rpc('handle_disclaimer_acknowledgement', { 
        user_email_to_log: userEmail 
      });

    if (error) {
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { data: null, error: { message: errorMessage } };
  }
};

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