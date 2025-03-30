// Local Session Handler
import { chatApi } from './api';
import axios from 'axios';

const PREFIX = '[LocalSessionHandler]';
const API_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || 'https://hr-self-service.onrender.com';

console.log(`${PREFIX} Initializing...`);

// Helper to get the current user ID
const getUserId = () => {
  const localUser = JSON.parse(localStorage.getItem('user') || 'null');
  if (localUser && localUser.email) {
    return `user-${localUser.email.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  const guestId = localStorage.getItem('guestId') || Date.now().toString();
  if (!localStorage.getItem('guestId')) {
    localStorage.setItem('guestId', guestId);
  }
  return `guest-${guestId}`;
};

// Function to send message to backend
const sendLocalMessage = async (sessionId, message) => {
  console.log(`${PREFIX} Sending message in local session:`, sessionId);
  
  try {
    const response = await axios({
      method: 'POST',
      url: `${API_URL}/api/chat/public`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        message: message,
        session_id: sessionId,
        user_id: getUserId()
      }
    });

    return {
      success: true,
      response: response.data.response || response.data.message
    };
  } catch (error) {
    console.error(`${PREFIX} Request error:`, error);
    return {
      success: false,
      response: "I apologize, but I'm having trouble connecting to the server. Please try again in a moment.",
      error: error.message
    };
  }
};

// Function to find and patch the API service
const findAndPatchApiService = () => {
  console.log(`${PREFIX} Searching for chat API...`);
  
  if (chatApi && typeof chatApi.sendMessage === 'function') {
    console.log(`${PREFIX} Found chat API, patching sendMessage...`);
    
    // Store original function
    const originalSendMessage = chatApi.sendMessage;
    
    // Replace with our patched version
    chatApi.sendMessage = async (sessionId, message) => {
      console.log(`${PREFIX} Intercepting local session message`);
      
      try {
        // For local sessions, use our local handler
        if (sessionId.startsWith('local-')) {
          const result = await sendLocalMessage(sessionId, message);
          
          if (result.success) {
            return {
              messages: [
                {
                  id: `msg-${Date.now()}`,
                  role: 'user',
                  content: message,
                  created_at: new Date().toISOString()
                },
                {
                  id: `msg-${Date.now() + 1}`,
                  role: 'assistant',
                  content: result.response,
                  created_at: new Date(Date.now() + 1000).toISOString()
                }
              ]
            };
          } else {
            return {
              messages: [
                {
                  id: `msg-${Date.now()}`,
                  role: 'user',
                  content: message,
                  created_at: new Date().toISOString()
                },
                {
                  id: `msg-${Date.now() + 1}`,
                  role: 'assistant',
                  content: result.response,
                  created_at: new Date(Date.now() + 1000).toISOString()
                }
              ],
              error: result.error
            };
          }
        }
        
        // For other sessions, use original function
        return await originalSendMessage(sessionId, message);
      } catch (error) {
        console.error(`${PREFIX} Error in patched sendMessage:`, error);
        
        // Return a fallback response
        return {
          messages: [
            {
              id: `msg-${Date.now()}`,
              role: 'user',
              content: message,
              created_at: new Date().toISOString()
            },
            {
              id: `msg-${Date.now() + 1}`,
              role: 'assistant',
              content: "I apologize, but I'm having trouble connecting to the server. Please try again in a moment.",
              created_at: new Date(Date.now() + 1000).toISOString()
            }
          ],
          error: error.message
        };
      }
    };
    
    console.log(`${PREFIX} Successfully patched sendMessage`);
    return true;
  }
  
  return false;
};

// Initialize the patch
findAndPatchApiService();

export default {
  sendLocalMessage,
  findAndPatchApiService
}; 