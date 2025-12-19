// CORS Fix for HR Chatbot
(() => {

  // Import axios if not available
  if (!window.axios) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
    script.onload = () => {
      initializeApi();
    };
    script.onerror = (error) => {
      
    };
    document.head.appendChild(script);
  } else {
    initializeApi();
  }

  function initializeApi() {
    // Configuration
    const API_URL = 'https://hr-self-service.onrender.com';

    // Create axios instance with CORS config
    const api = window.axios.create({
      baseURL: API_URL,
      withCredentials: false,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for debugging
    api.interceptors.request.use(config => {
      return config;
      });
      return config;
    });

    // Add response interceptor for debugging
    api.interceptors.response.use(
      response => {
        return response;
      },
      error => {
        return Promise.reject(error);
      }
    );

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
    const sendMessageToBackend = async (sessionId, message) => {
      try {
        const response = await api.post('/api/chat/public', {
          message: message,
          session_id: sessionId,
          user_id: getUserId()
        });
        
        
        return {
          success: true,
          response: response.data.response || response.data.message,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          response: null,
          error: error.message
        };
      }
    };

    // Function to find and patch the API service
    const findAndPatchApiService = () => {
      
      // Look for the API service in common locations
      const locations = [
        window,
        window.frames,
        window.frames.frames
      ];
      
      for (const location of locations) {
        if (!location) continue;
        
        // Check for chatApi or similar objects
        const candidates = [
          location.chatApi,
          location.chatApiPatched,
          location.apiService,
          location.api
        ];
        
        for (const candidate of candidates) {
          if (candidate && typeof candidate.sendMessage === 'function') {
            
            // Store original function
            const originalSendMessage = candidate.sendMessage;
            
            // Replace with our proxied version
            candidate.sendMessage = async (sessionId, message) => {
              
              
              // For local sessions, use direct backend integration
              if (sessionId.startsWith('local-')) {
                const result = await sendMessageToBackend(sessionId, message);
                
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
                  throw new Error(result.error || 'Failed to send message');
                }
              }
              
              // For other sessions, try original function first
              try {
                return await originalSendMessage(sessionId, message);
              } catch (error) {
                
                // If original fails, use our proxied version
                const result = await sendMessageToBackend(sessionId, message);
                
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
                  throw new Error(result.error || 'Failed to send message');
                }
              }
            };
            
            return true;
          }
        }
      }
      
      return false;
    };

    // Try to patch immediately
    if (!findAndPatchApiService()) {
      
      // If not found, wait for page load and try again
      window.addEventListener('load', () => {
        if (findAndPatchApiService()) {
        } else {
        }
      });
    }


    // Add test function to window
    window.testHRChatbotFix = async () => {
      try {
        const result = await sendMessageToBackend('test-session', 'Hello, this is a test message');
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    };
  }
})(); 