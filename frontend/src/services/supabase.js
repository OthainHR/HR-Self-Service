import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client - support both REACT_APP and NEXT_PUBLIC prefixes
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase;
try {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or key not found in environment variables.');
    throw new Error('Missing Supabase configuration. Please check your environment variables.');
  }

  console.log(`Initializing Supabase with URL: ${supabaseUrl.substring(0, 30)}...`);
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a dummy client for fallback behavior
  supabase = {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signIn: async () => { throw new Error('Supabase not initialized') },
      signOut: async () => { throw new Error('Supabase not initialized') }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ data: null, error: new Error('Supabase not initialized') })
        }),
        textSearch: () => ({ data: null, error: new Error('Supabase not initialized') }),
        ilike: () => ({ data: null, error: new Error('Supabase not initialized') })
      }),
      insert: () => ({
        select: () => ({
          single: () => ({ data: null, error: new Error('Supabase not initialized') })
        })
      }),
      delete: () => ({
        eq: () => ({ error: new Error('Supabase not initialized') })
      }),
      update: () => ({
        eq: () => ({ error: new Error('Supabase not initialized') })
      })
    })
  };
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
    console.error('Invalid session ID type:', typeof id, id);
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
    
    console.error('Cannot convert to UUID:', id);
    throw new Error(`Cannot convert to UUID: invalid format "${id}"`);
  } catch (error) {
    console.error('UUID conversion error:', error, 'for ID:', id);
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
        console.error('Supabase connection test failed:', error);
        return { success: false, error };
      }
      
      return { success: true, count };
    } catch (error) {
      console.error('Supabase connection test error:', error);
      return { success: false, error };
    }
  },
  
  // For diagnostic purposes - get direct documents data
  getDiagnosticData: async () => {
    try {
      console.log('Getting diagnostic data from knowledge_documents table...');
      
      // Get all documents directly
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .limit(10);
        
      if (error) {
        console.error('Error fetching diagnostic data:', error);
        return { success: false, error };
      }
      
      const simplifiedData = data.map(doc => ({
        id: doc.id,
        text_preview: doc.text ? doc.text.substring(0, 50) + '...' : 'No text',
        metadata: doc.metadata,
        has_embedding: !!doc.embedding
      }));
      
      console.log('Diagnostic data retrieved:', simplifiedData);
      return { success: true, data: simplifiedData, rawData: data };
    } catch (error) {
      console.error('Error getting diagnostic data:', error);
      return { success: false, error };
    }
  },
  
  // Chat session management
  chat: {
    // Get all sessions for the current user
    getSessions: async () => {
      try {
        const userId = await getUserId();
        console.log('Getting chat sessions for user:', userId);
        
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching chat sessions:', error);
          throw error;
        }
        
        return { sessions: data || [] };
      } catch (error) {
        console.error('Supabase getSessions error:', error);
        throw error;
      }
    },
    
    // Create a new chat session
    createSession: async () => {
      try {
        const userId = await getUserId();
        console.log('Creating new chat session for user:', userId);
        
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
          console.error('Error creating chat session:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Supabase createSession error:', error);
        throw error;
      }
    },
    
    // Delete a chat session
    deleteSession: async (sessionId) => {
      try {
        console.log('Deleting chat session:', sessionId);
        
        // Ensure sessionId is a valid UUID
        if (!sessionId || typeof sessionId !== 'string') {
          console.error('Invalid session ID:', sessionId);
          throw new Error('Invalid session ID');
        }
        
        // If it's a local session, it can't be deleted via Supabase
        if (sessionId.startsWith('local-')) {
          throw new Error('Local session IDs cannot be deleted via Supabase');
        }
        
        // Convert to UUID format if necessary
        try {
          const uuidSessionId = toUUID(sessionId);
          
          // First delete all messages in this session
          const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('session_id', uuidSessionId);
            
          if (messagesError) {
            console.error('Error deleting chat messages:', messagesError);
            throw messagesError;
          }
          
          // Then delete the session
          const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', uuidSessionId);
            
          if (error) {
            console.error('Error deleting chat session:', error);
            throw error;
          }
          
          return { success: true };
        } catch (uuidError) {
          console.error('UUID conversion error:', uuidError);
          throw new Error('Invalid session ID format. Must be a valid UUID.');
        }
      } catch (error) {
        console.error('Supabase deleteSession error:', error);
        throw error;
      }
    },
    
    // Get messages for a session
    getSessionMessages: async (sessionId) => {
      try {
        console.log('Getting messages for session:', sessionId);
        
        // Ensure sessionId is valid
        if (!sessionId || typeof sessionId !== 'string') {
          console.error('Invalid session ID:', sessionId);
          throw new Error('Invalid session ID');
        }
        
        // If it's a local session, it can't be queried via Supabase
        if (sessionId.startsWith('local-')) {
          throw new Error('Local session IDs cannot be queried via Supabase');
        }
        
        // Convert to UUID format if necessary
        try {
          const uuidSessionId = toUUID(sessionId);
          
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', uuidSessionId)
            .order('created_at', { ascending: true });
            
          if (error) {
            console.error('Error fetching session messages:', error);
            throw error;
          }
          
          return { messages: data || [] };
        } catch (uuidError) {
          console.error('UUID conversion error:', uuidError);
          throw new Error('Invalid session ID format. Must be a valid UUID.');
        }
      } catch (error) {
        console.error('Supabase getSessionMessages error:', error);
        throw error;
      }
    },
    
    // Send a message in a session
    sendMessage: async (sessionId, content) => {
      try {
        console.log('Sending message in session:', sessionId);
        
        // Ensure sessionId is valid
        if (!sessionId || typeof sessionId !== 'string') {
          console.error('Invalid session ID:', sessionId);
          throw new Error('Invalid session ID');
        }
        
        // If it's a local session, it can't be used via Supabase
        if (sessionId.startsWith('local-')) {
          throw new Error('Local session IDs cannot be used via Supabase');
        }
        
        // Convert to UUID format if necessary
        try {
          const uuidSessionId = toUUID(sessionId);
          const userId = await getUserId();
          
          // Get the current user info from localStorage
          const userInfo = JSON.parse(localStorage.getItem('user') || 'null');
          const username = userInfo?.username || 'anonymous';
          const isAdmin = userInfo.role === 'admin';
          
          // First add the user message
          const userMessage = {
            session_id: uuidSessionId,
            role: 'user',
            content: content,
            username: username, // Add username to message record
            created_at: new Date().toISOString()
          };
          
          let userData;
          const { data: initialUserData, error: userError } = await supabase
            .from('chat_messages')
            .insert(userMessage)
            .select()
            .single();
            
          if (userError) {
            console.error('Error saving user message:', userError);
            
            // Check if error is related to missing username column
            if (userError.message && userError.message.includes('username')) {
              console.warn('Username column may not exist in chat_messages table. Retrying without username.');
              
              // Retry without the username field
              const userMessageWithoutUsername = {
                session_id: uuidSessionId,
                role: 'user',
                content: content,
                created_at: new Date().toISOString()
              };
              
              const { data: retryData, error: retryError } = await supabase
                .from('chat_messages')
                .insert(userMessageWithoutUsername)
                .select()
                .single();
                
              if (retryError) {
                console.error('Error on retry without username:', retryError);
                throw retryError;
              }
              
              userData = retryData;
            } else {
              throw userError;
            }
          } else {
            userData = initialUserData;
          }
          
          // Update session with new message count and timestamp
          // First get the current message count
          const { data: sessionData, error: fetchError } = await supabase
            .from('chat_sessions')
            .select('message_count')
            .eq('id', uuidSessionId)
            .single();
            
          if (fetchError) {
            console.error('Error fetching session data:', fetchError);
          }
          
          const newCount = (sessionData?.message_count || 0) + 1;
          
          // Now update the session with new count
          const { error: sessionUpdateError } = await supabase
            .from('chat_sessions')
            .update({ 
              updated_at: new Date().toISOString(),
              message_count: newCount
            })
            .eq('id', uuidSessionId);
            
          if (sessionUpdateError) {
            console.error('Error updating session:', sessionUpdateError);
          }
          
          // Generate AI response here or call backend API
          let aiResponse;
          try {
            // Try to get a response from the backend API
            console.log('Requesting AI response from backend API');
            
            // Get token from localStorage - fix token retrieval
            const token = localStorage.getItem('token');
            
            // Get user info to check if admin
            const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
            const isAdmin = userInfo.role === 'admin';
            
            if (!token) {
              console.log('No authentication token available');
              throw new Error('No authentication token available');
            }
            
            console.log('Using authentication token');
            
            const headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            };
            
            // Set up a timeout for the fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            try {
              // Use the API chat endpoint 
              const endpoint = `${apiUrl}/api/chat`;
              
              // For non-admin users, we'll try the authenticated endpoint first,
              // but will have a fallback to the public endpoint if that fails
              
              const apiResponse = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                  message: content,
                  session_id: uuidSessionId,
                  user_id: userId
                }),
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              if (apiResponse.ok) {
                const responseData = await apiResponse.json();
                console.log('Received AI response from API:', responseData);
                
                // Format the response
                aiResponse = {
                  role: 'assistant',
                  content: responseData.response || responseData.message || responseData.content || 'Response from API.',
                  id: generateUUID(),
                  timestamp: new Date().toISOString()
                };
              } else {
                if (apiResponse.status === 401) {
                  console.log('Authentication error (401): User not authorized');
                  console.log('User details:', localStorage.getItem('user'));
                  console.log('Token exists:', !!localStorage.getItem('token'));
                  console.log('Token value (first 20 chars):', localStorage.getItem('token')?.substring(0, 20));
                  
                  // For non-admin users, try the public endpoint
                  if (!isAdmin) {
                    console.log('Authentication error for non-admin user, trying public endpoint');
                    
                    // Try the public endpoint
                    const publicEndpoint = `${apiUrl}/api/chat-public`;
                    const publicResponse = await fetch(publicEndpoint, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        message: content,
                        session_id: uuidSessionId,
                        user_id: userId
                      })
                    });
                    
                    if (publicResponse.ok) {
                      const publicData = await publicResponse.json();
                      console.log('Received response from public endpoint:', publicData);
                      
                      // Format the response from public endpoint
                      aiResponse = {
                        role: 'assistant',
                        content: publicData.response || 'No response content.',
                        id: generateUUID(),
                        timestamp: new Date().toISOString()
                      };
                      
                      // Create a Supabase message
                      const assistantMessage = {
                        session_id: uuidSessionId,
                        role: 'assistant',
                        content: aiResponse.content,
                        username: 'AI Assistant (Public)',
                        created_at: new Date().toISOString()
                      };
                      
                      // Save message to Supabase
                      const { data: assistantData } = await supabase
                        .from('chat_messages')
                        .insert(assistantMessage)
                        .select()
                        .single();
                      
                      // Return both the user message and assistant response
                      return {
                        messages: [userData, assistantData]
                      };
                    } else {
                      // Both endpoints failed, throw a non-admin specific error
                      console.log('Both authenticated and public endpoints failed');
                      throw new Error('Authentication failed: Non-admin accounts may need additional permissions. Please contact an administrator.');
                    }
                  }
                  
                  // If we get here, it's an admin user with an authentication problem
                  // If the token starts with our special mock tokens, suggest relogging
                  const token = localStorage.getItem('token');
                  if (token && (token.startsWith('mock_admin_token') || token.startsWith('mock_user_token'))) {
                    console.log('Using a mock token - this should work. Server might need restart.');
                    // Try to use public endpoint for admin users too as a fallback
                    try {
                      const publicEndpoint = `${apiUrl}/api/chat-public`;
                      const publicResponse = await fetch(publicEndpoint, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          message: content,
                          session_id: uuidSessionId,
                          user_id: userId
                        })
                      });
                      
                      if (publicResponse.ok) {
                        const publicData = await publicResponse.json();
                        console.log('Admin fallback: Received response from public endpoint:', publicData);
                        
                        // Format the response from public endpoint
                        aiResponse = {
                          role: 'assistant',
                          content: publicData.response || 'No response content.',
                          id: generateUUID(),
                          timestamp: new Date().toISOString()
                        };
                        
                        // Create a Supabase message
                        const assistantMessage = {
                          session_id: uuidSessionId,
                          role: 'assistant',
                          content: aiResponse.content,
                          username: 'AI Assistant (Public Fallback)',
                          created_at: new Date().toISOString()
                        };
                        
                        // Save message to Supabase
                        const { data: assistantData } = await supabase
                          .from('chat_messages')
                          .insert(assistantMessage)
                          .select()
                          .single();
                        
                        // Return both the user message and assistant response
                        return {
                          messages: [userData, assistantData]
                        };
                      }
                    } catch (fallbackError) {
                      console.error('Admin fallback to public endpoint failed:', fallbackError);
                    }
                  }
                  
                  throw new Error('Authentication failed: Please log out and log back in');
                }
                throw new Error(`API responded with status: ${apiResponse.status}`);
              }
            } catch (apiError) {
              clearTimeout(timeoutId);
              console.error('Error calling backend API:', apiError);
              throw apiError;
            }
          } catch (apiError) {
            console.error('Error calling AI backend:', apiError);
            
            // Check if this is an authentication error
            if (apiError.message && apiError.message.includes('No authentication token available')) {
              // Ultimate fallback if authentication fails
              aiResponse = {
                role: 'assistant',
                content: 'I\'m unable to process your message because you aren\'t properly authenticated. Please try logging out and logging back in to resolve this issue.',
                id: generateUUID(),
                timestamp: new Date().toISOString()
              };
              
              // Save the error response message
              const errorMessage = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                username: 'AI Assistant (Auth Error)',
                created_at: new Date().toISOString()
              };
              
              // Save message and return
              const { data: errorData } = await supabase
                .from('chat_messages')
                .insert(errorMessage)
                .select()
                .single();
                
              return {
                messages: [userData, errorData]
              };
            } else if (apiError.message && apiError.message.includes('Authentication failed: Non-admin accounts')) {
              // Special handling for non-admin users
              aiResponse = {
                role: 'assistant',
                content: 'Currently, only admin users have full access to the AI assistant features. Regular accounts may have limited functionality. If you need assistance, please contact an administrator.',
                id: generateUUID(),
                timestamp: new Date().toISOString()
              };
              
              // Save the error response message
              const errorMessage = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                username: 'AI Assistant (Limited Access)',
                created_at: new Date().toISOString()
              };
              
              // Save message and return
              const { data: errorData } = await supabase
                .from('chat_messages')
                .insert(errorMessage)
                .select()
                .single();
                
              return {
                messages: [userData, errorData]
              };
            } else if (apiError.message && apiError.message.includes('Authentication failed')) {
              // Specific message for 401 authentication errors
              aiResponse = {
                role: 'assistant',
                content: 'Your login session has expired or is invalid. Please log out and log back in to continue using the chat feature.',
                id: generateUUID(),
                timestamp: new Date().toISOString()
              };
              
              // Save the error response message
              const errorMessage = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                username: 'AI Assistant (Auth Error)',
                created_at: new Date().toISOString()
              };
              
              // Save message and return
              const { data: errorData } = await supabase
                .from('chat_messages')
                .insert(errorMessage)
                .select()
                .single();
                
              return {
                messages: [userData, errorData]
              };
            } else if (apiError.message && apiError.message.includes('API endpoint not found')) {
              // Specific message for 404 errors
              aiResponse = {
                role: 'assistant',
                content: 'The AI service is currently unavailable. I\'ll provide a simulated response instead. Please try again later or contact support if this persists.',
                id: generateUUID(),
                timestamp: new Date().toISOString()
              };
              
              // Save the offline response message
              const offlineMessage = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                username: 'AI Assistant (Offline)',
                created_at: new Date().toISOString()
              };
              
              // Save message and return
              const { data: offlineData } = await supabase
                .from('chat_messages')
                .insert(offlineMessage)
                .select()
                .single();
                
              return {
                messages: [userData, offlineData]
              };
            } else {
              // Default fallback
              aiResponse = {
                role: 'assistant',
                content: 'I encountered an error processing your request. Please try again or contact support if the issue persists.',
                id: generateUUID(),
                timestamp: new Date().toISOString()
              };
              
              // Save the error response message
              const errorMessage = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                username: 'AI Assistant (Error)',
                created_at: new Date().toISOString()
              };
              
              // Save message and return
              const { data: errorData } = await supabase
                .from('chat_messages')
                .insert(errorMessage)
                .select()
                .single();
                
              return {
                messages: [userData, errorData]
              };
            }
          }
          
          // Save the AI response
          const assistantMessage = {
            session_id: uuidSessionId,
            role: 'assistant',
            content: aiResponse.content,
            username: 'AI Assistant', // Add consistent username for the AI
            created_at: new Date().toISOString()
          };
          
          let assistantData;
          const { data: initialAssistantData, error: assistantError } = await supabase
            .from('chat_messages')
            .insert(assistantMessage)
            .select()
            .single();
            
          if (assistantError) {
            console.error('Error saving assistant message:', assistantError);
            
            // Check if error is related to missing username column
            if (assistantError.message && assistantError.message.includes('username')) {
              console.warn('Username column may not exist in chat_messages table. Retrying without username.');
              
              // Retry without the username field
              const assistantMessageWithoutUsername = {
                session_id: uuidSessionId,
                role: 'assistant',
                content: aiResponse.content,
                created_at: new Date().toISOString()
              };
              
              const { data: retryData, error: retryError } = await supabase
                .from('chat_messages')
                .insert(assistantMessageWithoutUsername)
                .select()
                .single();
                
              if (retryError) {
                console.error('Error on retry without username:', retryError);
                throw retryError;
              }
              
              assistantData = retryData;
            } else {
              throw assistantError;
            }
          } else {
            assistantData = initialAssistantData;
          }
          
          // Return both messages
          return {
            messages: [userData, assistantData]
          };
        } catch (uuidError) {
          console.error('UUID conversion error:', uuidError);
          throw new Error('Invalid session ID format. Must be a valid UUID.');
        }
      } catch (error) {
        console.error('Supabase sendMessage error:', error);
        throw error;
      }
    }
  },
  
  // Add a document directly to Supabase
  addDocument: async (document) => {
    console.log('Supabase addDocument called with:', document);
    
    if (!document || !document.text) {
      console.error('Invalid document: Missing required fields');
      throw new Error('Invalid document: Text is required');
    }
    
    try {
      console.log('Direct insertion not supported, use backend API');
      throw new Error('Direct insertion not supported');
    } catch (error) {
      console.error('Error in Supabase addDocument:', error);
      
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
    console.log(`Searching documents with query: ${query}, topK: ${topK}`);
    
    try {
      console.log('Direct search not supported, use backend API');
      throw new Error('Direct search not supported');
    } catch (error) {
      console.error('Error in Supabase searchDocuments:', error);
      
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