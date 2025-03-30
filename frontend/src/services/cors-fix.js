// CORS Fix for HR Chatbot
(() => {
  console.log('⚙️ HR Chatbot Fix: Initializing...');

  // Import axios if not available
  if (!window.axios) {
    console.log('⚙️ HR Chatbot Fix: Loading axios from CDN...');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js';
    script.onload = () => {
      console.log('⚙️ HR Chatbot Fix: axios loaded successfully');
      initializeApi();
    };
    script.onerror = (error) => {
      console.error('⚙️ HR Chatbot Fix: Failed to load axios:', error);
    };
    document.head.appendChild(script);
  } else {
    console.log('⚙️ HR Chatbot Fix: axios already available');
    initializeApi();
  }

  function initializeApi() {
    // Configuration
    const API_URL = 'https://hr-self-service.onrender.com';
    console.log('⚙️ HR Chatbot Fix: Using API URL:', API_URL);

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
      console.log('⚙️ HR Chatbot Fix: Outgoing request:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data
      });
      return config;
    });

    // Add response interceptor for debugging
    api.interceptors.response.use(
      response => {
        console.log('⚙️ HR Chatbot Fix: Response received:', {
          status: response.status,
          headers: response.headers,
          data: response.data
        });
        return response;
      },
      error => {
        console.error('⚙️ HR Chatbot Fix: Request failed:', {
          message: error.message,
          response: error.response,
          config: error.config
        });
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
      console.log('⚙️ HR Chatbot Fix: Sending message:', {
        sessionId,
        message,
        userId: getUserId()
      });
      
      try {
        const response = await api.post('/api/chat/public', {
          message: message,
          session_id: sessionId,
          user_id: getUserId()
        });
        
        console.log('⚙️ HR Chatbot Fix: Message sent successfully:', response.data);
        
        return {
          success: true,
          response: response.data.response || response.data.message,
          error: null
        };
      } catch (error) {
        console.error('⚙️ HR Chatbot Fix: Failed to send message:', error);
        return {
          success: false,
          response: null,
          error: error.message
        };
      }
    };

    // Function to find and patch the API service
    const findAndPatchApiService = () => {
      console.log('⚙️ HR Chatbot Fix: Searching for API service...');
      
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
            console.log('⚙️ HR Chatbot Fix: Found API service, patching sendMessage...');
            
            // Store original function
            const originalSendMessage = candidate.sendMessage;
            
            // Replace with our proxied version
            candidate.sendMessage = async (sessionId, message) => {
              console.log('⚙️ HR Chatbot Fix: Intercepted sendMessage call:', {
                sessionId,
                message
              });
              
              // For local sessions, use direct backend integration
              if (sessionId.startsWith('local-')) {
                console.log('⚙️ HR Chatbot Fix: Using direct backend integration for local session');
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
                console.log('⚙️ HR Chatbot Fix: Trying original sendMessage function');
                return await originalSendMessage(sessionId, message);
              } catch (error) {
                console.log('⚙️ HR Chatbot Fix: Original sendMessage failed, using fallback');
                
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
            
            console.log('⚙️ HR Chatbot Fix: Successfully patched sendMessage');
            return true;
          }
        }
      }
      
      return false;
    };

    // Try to patch immediately
    if (!findAndPatchApiService()) {
      console.log('⚙️ HR Chatbot Fix: Will retry after the page fully loads');
      
      // If not found, wait for page load and try again
      window.addEventListener('load', () => {
        console.log('⚙️ HR Chatbot Fix: Retrying after page load');
        if (findAndPatchApiService()) {
          console.log('⚙️ HR Chatbot Fix: Successfully patched sendMessage function');
        } else {
          console.log('⚙️ HR Chatbot Fix: Could not find sendMessage function to patch');
        }
      });
    }

    console.log('⚙️ HR Chatbot Fix: Initialization complete');
    console.log('⚙️ HR Chatbot Fix: To test, run window.testHRChatbotFix() in the console');

    // Add test function to window
    window.testHRChatbotFix = async () => {
      try {
        const result = await sendMessageToBackend('test-session', 'Hello, this is a test message');
        console.log('⚙️ HR Chatbot Fix: Test result:', result);
        return result;
      } catch (error) {
        console.error('⚙️ HR Chatbot Fix: Test failed:', error);
        return { success: false, error: error.message };
      }
    };
  }
})(); 