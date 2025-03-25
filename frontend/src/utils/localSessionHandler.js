/**
 * Local Session Handler
 * 
 * This utility patches the API methods to properly handle local sessions
 * and connect them to the backend API without Supabase.
 */

import { chatApi } from '../services/api';

// API URL from environment variables or default to Render deployment
const API_URL = process.env.REACT_APP_API_URL || 
                process.env.NEXT_PUBLIC_BACKEND_URL || 
                process.env.REACT_APP_BACKEND_URL || 
                'https://hr-self-service.onrender.com';

/**
 * Helper to extract token from localStorage
 * @returns {string|null} The authentication token or null
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Helper to extract user ID from localStorage
 * @returns {string} The user ID or a guest ID
 */
const getUserId = () => {
  // First check if we have a user in local storage from our auth system
  const localUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (localUser && localUser.email) {
    // Create a deterministic ID based on email to ensure consistent IDs
    return `user-${localUser.email.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  
  // Final fallback to guest ID
  const guestId = localStorage.getItem('guestId') || Date.now().toString();
  if (!localStorage.getItem('guestId')) {
    localStorage.setItem('guestId', guestId);
  }
  return `guest-${guestId}`;
};

/**
 * Send a message to the backend API directly for local sessions
 * @param {string} sessionId - The local session ID
 * @param {string} message - The message content
 * @returns {Promise<Object>} - The API response
 */
export const sendLocalMessage = async (sessionId, message) => {
  console.log(`[LocalSessionHandler] Sending message in local session: ${sessionId}`);
  
  if (!sessionId.startsWith('local-')) {
    console.error('This handler is only for local sessions');
    throw new Error('Invalid session type. Expected local session.');
  }
  
  const userId = getUserId();
  const token = getAuthToken();
  
  // Define headers based on token availability
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    // First try the authenticated endpoint
    console.log(`[LocalSessionHandler] Calling backend API at ${API_URL}/api/chat`);
    
    // Set up a timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          user_id: userId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If authenticated endpoint fails with 401, try public endpoint
      if (response.status === 401) {
        console.log('[LocalSessionHandler] Auth failed, trying public endpoint');
        
        const publicResponse = await fetch(`${API_URL}/api/chat-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
            user_id: userId
          })
        });
        
        if (publicResponse.ok) {
          const data = await publicResponse.json();
          console.log('[LocalSessionHandler] Public endpoint success:', data);
          return formatResponse(message, data.response || 'No content returned');
        } else {
          console.error('[LocalSessionHandler] Public endpoint failed:', publicResponse.status);
          throw new Error(`Public endpoint failed with status: ${publicResponse.status}`);
        }
      }
      
      // Process response from authenticated endpoint
      if (response.ok) {
        const data = await response.json();
        console.log('[LocalSessionHandler] API response:', data);
        return formatResponse(message, data.response || data.message || 'No content returned');
      } else {
        console.error('[LocalSessionHandler] API failed:', response.status);
        throw new Error(`API responded with status: ${response.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[LocalSessionHandler] Fetch error:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('[LocalSessionHandler] Error calling backend:', error);
    // Generate a fallback response
    return formatResponse(message, 'Sorry, I encountered an error connecting to the backend. Please try again later.');
  }
};

/**
 * Format the response in the expected structure
 * @param {string} userMessage - The original user message
 * @param {string} aiResponse - The AI response content
 * @returns {Object} - The formatted messages object
 */
function formatResponse(userMessage, aiResponse) {
  // Generate timestamps
  const now = new Date().toISOString();
  
  // Create user message object
  const userMessageObj = {
    role: 'user',
    content: userMessage,
    created_at: now
  };
  
  // Create assistant message object
  const assistantMessageObj = {
    role: 'assistant',
    content: aiResponse,
    created_at: new Date(Date.now() + 1000).toISOString() // 1 second later
  };
  
  // Return in the expected format
  return {
    messages: [userMessageObj, assistantMessageObj]
  };
}

/**
 * Initialize the local session handler by patching the API
 */
export const initLocalSessionHandler = () => {
  console.log('[LocalSessionHandler] Initializing...');
  
  // Wait for the window to fully load
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Try to find the API module
      try {
        // If chatApi is imported directly, patch it
        if (chatApi && typeof chatApi.sendMessage === 'function') {
          console.log('[LocalSessionHandler] Found chat API, patching sendMessage');
          const originalSendMessage = chatApi.sendMessage;
          
          chatApi.sendMessage = async (sessionId, message) => {
            // If it's a local session, use our handler
            if (sessionId && sessionId.startsWith('local-')) {
              console.log('[LocalSessionHandler] Intercepting local session message');
              return sendLocalMessage(sessionId, message);
            }
            
            // Otherwise, use the original handler
            return originalSendMessage(sessionId, message);
          };
          
          // Make patched API available globally for easy testing
          window.patchedChatApi = chatApi;
          console.log('[LocalSessionHandler] Successfully patched sendMessage');
        } else {
          console.warn('[LocalSessionHandler] Could not find API module to patch');
        }
      } catch (error) {
        console.error('[LocalSessionHandler] Error patching API:', error);
      }
    }, 1000); // Give the app a second to initialize
  });
};

// Export a function to patch the API at runtime from console
export const patchApiFromConsole = () => {
  console.log('[LocalSessionHandler] Attempting to patch API from console...');
  
  // Try to find all API services that might contain sendMessage
  const potentialApis = [];
  
  // Look in common locations
  const searchPaths = [
    window,
    window.chatApi,
    window.api,
    window.services,
    window.supabaseService
  ];
  
  // Check each potential location
  searchPaths.forEach(obj => {
    if (obj && typeof obj === 'object') {
      // Look for sendMessage or chat.sendMessage
      if (typeof obj.sendMessage === 'function') {
        potentialApis.push({
          name: 'direct',
          obj: obj,
          method: 'sendMessage'
        });
      }
      
      // Look for nested chat object
      if (obj.chat && typeof obj.chat.sendMessage === 'function') {
        potentialApis.push({
          name: 'chat',
          obj: obj.chat,
          method: 'sendMessage'
        });
      }
    }
  });
  
  // If we found potential APIs, patch them
  if (potentialApis.length > 0) {
    potentialApis.forEach(api => {
      console.log(`[LocalSessionHandler] Found API to patch: ${api.name}.${api.method}`);
      
      // Save the original method
      const original = api.obj[api.method];
      
      // Replace with our patched version
      api.obj[api.method] = async (sessionId, message) => {
        // If it's a local session, use our handler
        if (sessionId && sessionId.startsWith('local-')) {
          console.log(`[LocalSessionHandler] Intercepting local session message via ${api.name}.${api.method}`);
          return sendLocalMessage(sessionId, message);
        }
        
        // Otherwise, use the original handler
        return original(sessionId, message);
      };
    });
    
    console.log(`[LocalSessionHandler] Successfully patched ${potentialApis.length} API(s)`);
    return `Successfully patched ${potentialApis.length} API(s)`;
  } else {
    console.error('[LocalSessionHandler] No suitable APIs found to patch');
    return 'No suitable APIs found to patch';
  }
};

// Auto-initialize if not in testing environment
if (process.env.NODE_ENV !== 'test') {
  initLocalSessionHandler();
} 