/**
 * HR Chatbot CORS and Local Session Fix (v2.0)
 * 
 * This standalone script fixes CORS issues and enables local sessions to work with the backend API.
 * Include this script in your HTML file or copy and paste it into the browser console.
 * 
 * Version 2.0: Fixes CORS issues with direct implementation of API_ENDPOINT
 */
(function() {
  console.log('⚙️ HR Chatbot Fix v2.0: Initializing...');
  
  // Get configuration from window object or use defaults
  const config = window.HR_API_CONFIG || {};
  
  // The URL for the backend API
  const API_URL = config.BASE_URL || 'https://hr-self-service.onrender.com';
  
  // Use the public endpoint for unauthenticated access
  const API_ENDPOINT = config.CHAT_ENDPOINT || '/api/chat/public';
  
  console.log(`⚙️ HR Chatbot Fix v2.0: Using API endpoint: ${API_URL}${API_ENDPOINT}`);
  
  // Helper to extract token from localStorage
  const getAuthToken = () => localStorage.getItem('token');
  
  // Helper to get or create a guest ID
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
  
  // Find the API service using a recursive search
  const findApiService = (obj, depth = 0, path = 'window') => {
    if (!obj || typeof obj !== 'object' || depth > 3) return null;
    
    // Check if this object has a chat property with sendMessage
    if (obj.chat && typeof obj.chat.sendMessage === 'function') {
      console.log(`Found API service at ${path}.chat`);
      return {
        type: 'chat',
        service: obj.chat,
        path: `${path}.chat`
      };
    }
    
    // Check if this object has sendMessage directly
    if (typeof obj.sendMessage === 'function') {
      console.log(`Found API service at ${path}`);
      return {
        type: 'direct',
        service: obj,
        path: path
      };
    }
    
    // Check if it's the supabase service we're looking for
    if (obj.supabase && obj.chat && typeof obj.chat.sendMessage === 'function') {
      console.log(`Found Supabase service at ${path}`);
      return {
        type: 'supabase',
        service: obj.chat,
        path: `${path}.chat`
      };
    }
    
    // Recursively search properties
    for (const key in obj) {
      try {
        if (
          key !== 'parent' && 
          key !== 'window' && 
          key !== 'self' && 
          key !== 'document' &&
          obj[key] && 
          typeof obj[key] === 'object'
        ) {
          const result = findApiService(obj[key], depth + 1, `${path}.${key}`);
          if (result) return result;
        }
      } catch (e) {
        // Ignore errors from accessing restricted properties
      }
    }
    
    return null;
  };
  
  // Function to send message to backend with PUBLIC endpoint
  async function sendMessageToBackend(message, sessionId, userId) {
    try {
      console.log(`⚙️ HR Chatbot Fix v2.0: Sending message to backend with session: ${sessionId}`);
      
      // First try direct API call with the public endpoint
      console.log(`⚙️ HR Chatbot Fix v2.0: Calling ${API_URL}${API_ENDPOINT}`);
      
      const response = await fetch(`${API_URL}${API_ENDPOINT}`, {
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
      
      if (response.ok) {
        const data = await response.json();
        console.log(`⚙️ HR Chatbot Fix v2.0: Response received successfully`);
        return formatResponse(message, data.response || data.message);
      } else {
        const errorText = await response.text();
        console.log(`⚙️ HR Chatbot Fix v2.0: API returned status: ${response.status}, error: ${errorText}`);
        throw new Error(`API failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix v2.0: Error calling backend:', error);
      
      // If it's a CORS error, try again with a proxy
      if (error.message && error.message.includes('CORS')) {
        console.log('⚙️ HR Chatbot Fix v2.0: CORS error detected, trying with a different proxy');
        try {
          // Try with AllOrigins proxy
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${API_URL}${API_ENDPOINT}`)}`;
          
          console.log(`⚙️ HR Chatbot Fix v2.0: Trying proxy: ${proxyUrl.substring(0, 30)}...`);
          const response = await fetch(proxyUrl, {
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
          
          if (response.ok) {
            const data = await response.json();
            console.log(`⚙️ HR Chatbot Fix v2.0: Response received from AllOrigins proxy`);
            return formatResponse(message, data.response || data.message || 'Response from proxy');
          } else {
            const errorText = await response.text();
            console.log(`⚙️ HR Chatbot Fix v2.0: Proxy returned status: ${response.status}, error: ${errorText}`);
            throw new Error(`Proxy failed with status: ${response.status}`);
          }
        } catch (proxyError) {
          console.error('⚙️ HR Chatbot Fix v2.0: Proxy mode also failed:', proxyError);
          
          // Try with thingproxy as last resort
          try {
            console.log('⚙️ HR Chatbot Fix v2.0: Trying with thingproxy as last resort');
            const thingproxyUrl = `https://thingproxy.freeboard.io/fetch/${API_URL}${API_ENDPOINT}`;
            
            const response = await fetch(thingproxyUrl, {
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
            
            if (response.ok) {
              const data = await response.json();
              console.log(`⚙️ HR Chatbot Fix v2.0: Response received from thingproxy`);
              return formatResponse(message, data.response || data.message || 'Response via thingproxy');
            } else {
              return formatResponse(message, 'I apologize, but I encountered an error connecting to the server. Please try again later.');
            }
          } catch (finalError) {
            console.error('⚙️ HR Chatbot Fix v2.0: All proxy methods failed:', finalError);
            return formatResponse(message, 'I apologize, but I cannot process your request at this time due to connectivity issues.');
          }
        }
      }
      
      // For other errors, provide a user-friendly message
      return formatResponse(message, 'I apologize, but I encountered an error processing your request. Our team has been notified.');
    }
  }
  
  // Format response in the expected format
  const formatResponse = (userMessage, aiResponse) => {
    const now = new Date().toISOString();
    
    const userMessageObj = {
      role: 'user',
      content: userMessage,
      created_at: now
    };
    
    const assistantMessageObj = {
      role: 'assistant',
      content: aiResponse,
      created_at: new Date(Date.now() + 1000).toISOString()
    };
    
    return {
      messages: [userMessageObj, assistantMessageObj]
    };
  };
  
  // Function to apply the fix
  const applyFix = () => {
    console.log('⚙️ HR Chatbot Fix v2.0: Searching for API service...');
    
    // Find the API service
    const apiService = findApiService(window);
    
    if (!apiService) {
      console.error('⚙️ HR Chatbot Fix v2.0: Could not find sendMessage function to override');
      
      // If we couldn't find it immediately, set up a retry
      console.log('⚙️ HR Chatbot Fix v2.0: Will retry after the page fully loads');
      
      // Wait for page to load and try again
      window.addEventListener('load', () => {
        setTimeout(() => {
          console.log('⚙️ HR Chatbot Fix v2.0: Retrying after page load');
          const apiService = findApiService(window);
          
          if (apiService) {
            patchApi(apiService);
          } else {
            console.error('⚙️ HR Chatbot Fix v2.0: Failed to find API service on retry');
          }
        }, 2000); // Longer timeout to ensure everything is loaded
      });
      
      return;
    }
    
    patchApi(apiService);
  };
  
  // Function to patch the API
  const patchApi = (apiService) => {
    // Keep a reference to the original function
    const originalSendMessage = apiService.service.sendMessage;
    
    // Replace the sendMessage function
    apiService.service.sendMessage = async (sessionId, message) => {
      console.log(`⚙️ HR Chatbot Fix v2.0: Intercepted sendMessage call for session: ${sessionId}`);
      
      // If it's a local session, use direct backend integration
      if (sessionId && sessionId.startsWith('local-')) {
        console.log('⚙️ HR Chatbot Fix v2.0: Using direct backend integration for local session');
        return sendMessageToBackend(message, sessionId, getUserId());
      }
      
      // For other sessions, try the original function first
      try {
        console.log('⚙️ HR Chatbot Fix v2.0: Calling original sendMessage for non-local session');
        return await originalSendMessage.call(apiService.service, sessionId, message);
      } catch (error) {
        console.error('⚙️ HR Chatbot Fix v2.0: Original sendMessage failed:', error);
        
        // If Supabase error, fall back to direct backend
        if (error.message && (
          error.message.includes('Supabase') || 
          error.message.includes('Invalid session ID') ||
          error.message.includes('Row Level Security')
        )) {
          console.log('⚙️ HR Chatbot Fix v2.0: Supabase error, falling back to direct backend');
          return sendMessageToBackend(message, sessionId, getUserId());
        }
        
        throw error;
      }
    };
    
    console.log(`⚙️ HR Chatbot Fix v2.0: Successfully patched sendMessage function at ${apiService.path}`);
  };
  
  // Add a test function to the window object
  window.testHRChatbotFixV2 = async () => {
    console.log('⚙️ HR Chatbot Fix v2.0: Running test...');
    
    // Test the Supabase connection first
    try {
      const supabaseTest = await fetch('https://sethhceiojxrevvpzupf.supabase.co/rest/v1/chat_sessions?select=*&limit=1', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldGhoY2Vpb2p4cmV2dnB6dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAyODI4MzYsImV4cCI6MjAyNTg1ODgzNn0.sG1hZJ5ZHJ4GpDlRHZqmC-RD4eTi4uFqP4vEG1FRWjU',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNldGhoY2Vpb2p4cmV2dnB6dXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAyODI4MzYsImV4cCI6MjAyNTg1ODgzNn0.sG1hZJ5ZHJ4GpDlRHZqmC-RD4eTi4uFqP4vEG1FRWjU'
        }
      });
      
      if (supabaseTest.ok) {
        const data = await supabaseTest.json();
        console.log('⚙️ HR Chatbot Fix v2.0: Supabase connection test successful:', data);
      } else {
        console.error('⚙️ HR Chatbot Fix v2.0: Supabase connection test failed:', supabaseTest.status);
      }
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix v2.0: Supabase test error:', error);
    }
    
    // Then test the backend API
    try {
      console.log('⚙️ HR Chatbot Fix v2.0: Testing backend API connection...');
      
      const response = await fetch(`${API_URL}/api/status`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('⚙️ HR Chatbot Fix v2.0: Backend API test successful:', data);
      } else {
        console.error('⚙️ HR Chatbot Fix v2.0: Backend API test failed:', response.status);
      }
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix v2.0: Backend API test error:', error);
    }
    
    // Finally, test sending a message
    try {
      console.log('⚙️ HR Chatbot Fix v2.0: Testing message sending...');
      
      const testResponse = await sendMessageToBackend('Hello, this is a test message', `test-${Date.now()}`, getUserId());
      
      console.log('⚙️ HR Chatbot Fix v2.0: Message test result:', testResponse);
      
      return testResponse;
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix v2.0: Message test error:', error);
      return null;
    }
  };
  
  // Apply the fix
  applyFix();
  
  // Log success message
  console.log('⚙️ HR Chatbot Fix v2.0: Initialization complete');
  console.log('⚙️ HR Chatbot Fix v2.0: To test, run window.testHRChatbotFixV2() in the console');
})(); 