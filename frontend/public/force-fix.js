/**
 * HR Chatbot EMERGENCY CORS FIX FOR VERCEL
 * This script will directly monkey-patch the problematic function
 */
(function() {
  console.log('🚨 EMERGENCY CORS FIX v3: Initializing...');
  
  // CRITICAL CONFIG OVERRIDE - Force correct endpoint before any other scripts load
  if (!window.HR_API_CONFIG) {
    window.HR_API_CONFIG = {};
  }
  
  // Force override the API config to use the correct endpoint
  // Check if we're on Vercel or other hosting
  const isVercel = window.location.hostname.includes('vercel.app');
  
  if (isVercel) {
    // Use the local API proxy when on Vercel
    window.HR_API_CONFIG.BASE_URL = window.location.origin;
    window.HR_API_CONFIG.CHAT_ENDPOINT = '/api/proxy';
    window.HR_API_CONFIG.USE_PROXY = false;
    console.log('🚨 EMERGENCY CORS FIX v3: Using Vercel proxy endpoints');
  } else {
    // Use direct backend endpoint for other environments
    window.HR_API_CONFIG.BASE_URL = 'https://hr-self-service.onrender.com';
    window.HR_API_CONFIG.CHAT_ENDPOINT = '/api/chat/public';
    window.HR_API_CONFIG.USE_PROXY = false;
    console.log('🚨 EMERGENCY CORS FIX v3: Using direct backend endpoints');
  }
  
  console.log('🚨 EMERGENCY CORS FIX v3: Forced API config:', window.HR_API_CONFIG);
  
  // Add our direct replacement immediately
  window.directCorsFixFn = async function(message, sessionId, userId) {
    console.log('🚨 EMERGENCY CORS FIX v3: Using patched sendMessageToBackend');
    
    try {
      console.log(`🚨 EMERGENCY CORS FIX v3: Sending message to backend with session: ${sessionId}`);
      
      // The correct URL - HARDCODED to fix the issue
      const correctEndpoint = 'https://hr-self-service.onrender.com/api/chat/public';
      console.log(`🚨 EMERGENCY CORS FIX v3: Calling ${correctEndpoint}`);
      
      try {
        const response = await fetch(correctEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
            user_id: userId || 'guest-user'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🚨 EMERGENCY CORS FIX v3: Direct API call successful!', data);
          return formatResponse(message, data.response || data.message);
        } else {
          throw new Error(`API failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('🚨 EMERGENCY CORS FIX v3: Direct API call failed:', error.message);
        
        // Try with proxy
        console.log('🚨 EMERGENCY CORS FIX v3: Trying with AllOrigins proxy...');
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(correctEndpoint)}`;
        
        const proxyResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
            user_id: userId || 'guest-user'
          })
        });
        
        if (proxyResponse.ok) {
          const proxyData = await proxyResponse.json();
          console.log('🚨 EMERGENCY CORS FIX v3: Proxy call successful!');
          return formatResponse(message, proxyData.response || proxyData.message || 'Response from proxy');
        } else {
          console.error('🚨 EMERGENCY CORS FIX v3: Proxy call failed too');
          return formatResponse(message, 'Sorry, I encountered an error connecting to the server. Please try again later.');
        }
      }
    } catch (finalError) {
      console.error('🚨 EMERGENCY CORS FIX v3: All attempts failed:', finalError);
      return formatResponse(message, 'I apologize, but I cannot process your request at this time.');
    }
  };
  
  // Helper function to format the response properly
  function formatResponse(userMessage, aiResponse) {
    const now = new Date().toISOString();
    
    return {
      messages: [
        {
          role: 'user',
          content: userMessage,
          created_at: now
        },
        {
          role: 'assistant',
          content: aiResponse,
          created_at: new Date(Date.now() + 1000).toISOString()
        }
      ]
    };
  }
  
  // Forcefully replace window.sendMessageToBackend immediately
  window.originalSendMessageToBackend = window.sendMessageToBackend;
  window.sendMessageToBackend = window.directCorsFixFn;
  
  // Create a forced override to apply after other scripts load
  function forceOverrideAllMethods() {
    console.log('🚨 EMERGENCY CORS FIX v3: Applying forced override to all methods');
    
    // Override sendMessageToBackend globally
    if (window.sendMessageToBackend !== window.directCorsFixFn) {
      window.originalSendMessageToBackend = window.sendMessageToBackend;
      window.sendMessageToBackend = window.directCorsFixFn;
      console.log('🚨 EMERGENCY CORS FIX v3: Forcefully overrode global sendMessageToBackend');
    }
    
    // Also override cors-fix.js's sendMessageToBackend function
    if (window.sendMessageToBackendFromCors && window.sendMessageToBackendFromCors !== window.directCorsFixFn) {
      window.sendMessageToBackendFromCors = window.directCorsFixFn;
      console.log('🚨 EMERGENCY CORS FIX v3: Forcefully overrode sendMessageToBackendFromCors');
    }
    
    // Find any window.sendMessage function in any object
    const findAndOverrideInObject = function(obj, path = 'window') {
      if (!obj || typeof obj !== 'object') return;
      
      // Override sendMessageToBackend if found
      if (typeof obj.sendMessageToBackend === 'function' && obj.sendMessageToBackend !== window.directCorsFixFn) {
        obj._originalSendMessageToBackend = obj.sendMessageToBackend;
        obj.sendMessageToBackend = window.directCorsFixFn;
        console.log(`🚨 EMERGENCY CORS FIX v3: Overrode sendMessageToBackend at ${path}`);
      }
      
      // Search for chat API
      if (obj.chatApi && typeof obj.chatApi === 'object') {
        if (typeof obj.chatApi.sendMessage === 'function') {
          obj.chatApi._originalSendMessage = obj.chatApi.sendMessage;
          obj.chatApi.sendMessage = function(sessionId, message) {
            console.log(`🚨 EMERGENCY CORS FIX v3: Intercepted chatApi.sendMessage for session: ${sessionId}`);
            return window.directCorsFixFn(message, sessionId, 'guest-user');
          };
          console.log(`🚨 EMERGENCY CORS FIX v3: Patched chatApi.sendMessage at ${path}.chatApi`);
        }
        
        // Also check for apiService in chatApi
        if (obj.chatApi.apiService && typeof obj.chatApi.apiService === 'object' && 
            typeof obj.chatApi.apiService.sendMessage === 'function') {
          obj.chatApi.apiService._originalSendMessage = obj.chatApi.apiService.sendMessage;
          obj.chatApi.apiService.sendMessage = function(sessionId, message) {
            console.log(`🚨 EMERGENCY CORS FIX v3: Intercepted apiService.sendMessage for session: ${sessionId}`);
            return window.directCorsFixFn(message, sessionId, 'guest-user');
          };
          console.log(`🚨 EMERGENCY CORS FIX v3: Patched apiService.sendMessage at ${path}.chatApi.apiService`);
        }
      }
      
      // Check frames
      if (obj.frames) {
        for (let i = 0; i < obj.frames.length; i++) {
          try {
            findAndOverrideInObject(obj.frames[i], `${path}.frames[${i}]`);
          } catch (e) {
            // Skip inaccessible frames
          }
        }
      }
      
      // Recursively check other properties
      for (const key in obj) {
        if (
          key !== 'parent' && 
          key !== 'top' && 
          key !== 'self' && 
          key !== 'window' &&
          key !== 'document' &&
          key !== 'frames' &&
          obj[key] && 
          typeof obj[key] === 'object' &&
          !Array.isArray(obj[key])
        ) {
          try {
            findAndOverrideInObject(obj[key], `${path}.${key}`);
          } catch (e) {
            // Skip inaccessible properties
          }
        }
      }
    };
    
    // Start searching from window
    try {
      findAndOverrideInObject(window);
    } catch (e) {
      console.error('🚨 EMERGENCY CORS FIX v3: Error while searching for objects to override:', e);
    }
  }
  
  // Apply override immediately
  forceOverrideAllMethods();
  
  // Also apply it after a short delay to catch late-loaded scripts
  setTimeout(forceOverrideAllMethods, 1000);
  
  // And again after DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceOverrideAllMethods);
  }
  
  // Also monkey patch addEventListener to catch scripts being added later
  const originalAddEventListener = Element.prototype.addEventListener;
  Element.prototype.addEventListener = function(type, listener, options) {
    if (type === 'load' && this.tagName === 'SCRIPT') {
      const original = listener;
      listener = function(event) {
        try {
          original.call(this, event);
        } finally {
          // Apply our override after script loads
          setTimeout(forceOverrideAllMethods, 0);
        }
      };
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Export a test function
  window.testEmergencyCORSFix = function() {
    console.log('🚨 EMERGENCY CORS FIX v3: Running test...');
    const testMessage = "This is a test message from emergency fix";
    const testSessionId = `test-${Date.now()}`;
    
    return window.directCorsFixFn(testMessage, testSessionId, 'test-user')
      .then(result => {
        console.log('🚨 EMERGENCY CORS FIX v3: Test successful!', result);
        return result;
      })
      .catch(err => {
        console.error('🚨 EMERGENCY CORS FIX v3: Test failed!', err);
        throw err;
      });
  };
  
  console.log('🚨 EMERGENCY CORS FIX v3: Initialization complete!');
})(); 