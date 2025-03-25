/**
 * HR Chatbot CORS and Local Session Fix
 * 
 * This standalone script fixes CORS issues and enables local sessions to work with the backend API.
 * Include this script in your HTML file or copy and paste it into the browser console.
 */
(function() {
  console.log('⚙️ HR Chatbot Fix: Initializing...');
  
  // The URL for the backend API
  const API_URL = 'https://hr-self-service.onrender.com';
  
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
  
  // Define a function to send messages to the backend
  const sendMessageToBackend = async (sessionId, message) => {
    console.log(`Sending message to backend with session: ${sessionId}`);
    
    const userId = getUserId();
    const token = getAuthToken();
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Handle CORS mode - we'll try no-cors if regular requests fail
    let mode = undefined; // default mode
    
    try {
      // First try authenticated endpoint
      console.log(`Calling ${API_URL}/api/chat`);
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: headers,
        mode: mode,
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          user_id: userId
        })
      });
      
      // If authentication fails, try public endpoint
      if (response.status === 401) {
        console.log('Authentication failed, trying public endpoint');
        const publicResponse = await fetch(`${API_URL}/api/chat-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: mode,
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
            user_id: userId
          })
        });
        
        if (!publicResponse.ok) {
          throw new Error(`Public API failed with status: ${publicResponse.status}`);
        }
        
        const data = await publicResponse.json();
        return formatResponse(message, data.response || 'No response from API');
      }
      
      if (!response.ok) {
        throw new Error(`API failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return formatResponse(message, data.response || data.message || 'No response from API');
    } catch (error) {
      console.error('Error calling backend:', error);
      
      // If it's a CORS error, try again with no-cors mode
      if (error.message && error.message.includes('CORS')) {
        console.log('CORS error detected, trying with no-cors mode');
        try {
          // Try with no-cors mode - note this will return an opaque response
          const response = await fetch(`${API_URL}/api/chat-public`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            mode: 'no-cors',
            body: JSON.stringify({
              message: message,
              session_id: sessionId,
              user_id: userId
            })
          });
          
          // With no-cors, we can't read the response, so we'll provide a canned response
          return formatResponse(message, 'I received your message but I cannot provide a specific response due to CORS restrictions. Please contact the administrator to fix the CORS configuration.');
        } catch (noCorsError) {
          console.error('No-cors mode also failed:', noCorsError);
        }
      }
      
      return formatResponse(message, 'Sorry, I encountered an error connecting to the HR chatbot service. Please try again later.');
    }
  };
  
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
    console.log('⚙️ HR Chatbot Fix: Searching for API service...');
    
    // Find the API service
    const apiService = findApiService(window);
    
    if (!apiService) {
      console.error('⚙️ HR Chatbot Fix: Could not find sendMessage function to override');
      
      // If we couldn't find it immediately, set up a retry
      console.log('⚙️ HR Chatbot Fix: Will retry after the page fully loads');
      
      // Wait for page to load and try again
      window.addEventListener('load', () => {
        setTimeout(() => {
          console.log('⚙️ HR Chatbot Fix: Retrying after page load');
          const apiService = findApiService(window);
          
          if (apiService) {
            patchApi(apiService);
          } else {
            console.error('⚙️ HR Chatbot Fix: Failed to find API service on retry');
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
      console.log(`⚙️ HR Chatbot Fix: Intercepted sendMessage call for session: ${sessionId}`);
      
      // If it's a local session, use direct backend integration
      if (sessionId && sessionId.startsWith('local-')) {
        console.log('⚙️ HR Chatbot Fix: Using direct backend integration for local session');
        return sendMessageToBackend(sessionId, message);
      }
      
      // For other sessions, try the original function first
      try {
        console.log('⚙️ HR Chatbot Fix: Calling original sendMessage for non-local session');
        return await originalSendMessage.call(apiService.service, sessionId, message);
      } catch (error) {
        console.error('⚙️ HR Chatbot Fix: Original sendMessage failed:', error);
        
        // If Supabase error, fall back to direct backend
        if (error.message && (
          error.message.includes('Supabase') || 
          error.message.includes('Invalid session ID') ||
          error.message.includes('Row Level Security')
        )) {
          console.log('⚙️ HR Chatbot Fix: Supabase error, falling back to direct backend');
          return sendMessageToBackend(sessionId, message);
        }
        
        throw error;
      }
    };
    
    console.log(`⚙️ HR Chatbot Fix: Successfully patched sendMessage function at ${apiService.path}`);
  };
  
  // Add a test function to the window object
  window.testHRChatbotFix = async () => {
    console.log('⚙️ HR Chatbot Fix: Running test...');
    
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
        console.log('⚙️ HR Chatbot Fix: Supabase connection test successful:', data);
      } else {
        console.error('⚙️ HR Chatbot Fix: Supabase connection test failed:', supabaseTest.status);
      }
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix: Supabase test error:', error);
    }
    
    // Then test the backend API
    try {
      console.log('⚙️ HR Chatbot Fix: Testing backend API connection...');
      
      const response = await fetch(`${API_URL}/api/status`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('⚙️ HR Chatbot Fix: Backend API test successful:', data);
      } else {
        console.error('⚙️ HR Chatbot Fix: Backend API test failed:', response.status);
      }
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix: Backend API test error:', error);
    }
    
    // Finally, test sending a message
    try {
      console.log('⚙️ HR Chatbot Fix: Testing message sending...');
      
      const testResponse = await sendMessageToBackend(`test-${Date.now()}`, 'Hello, this is a test message');
      
      console.log('⚙️ HR Chatbot Fix: Message test result:', testResponse);
      
      return testResponse;
    } catch (error) {
      console.error('⚙️ HR Chatbot Fix: Message test error:', error);
      return null;
    }
  };
  
  // Apply the fix
  applyFix();
  
  // Log success message
  console.log('⚙️ HR Chatbot Fix: Initialization complete');
  console.log('⚙️ HR Chatbot Fix: To test, run window.testHRChatbotFix() in the console');
})(); 