/**
 * Session Fix Utility
 * 
 * This module provides a function that can be copied and pasted into the browser console 
 * to fix local session handling and connect to the backend API without Supabase.
 */

// Export a function that can be run in the console
export const fixLocalSessions = () => {
  console.log("Attempting to fix local session handling...");
  
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
  
  // Find the API service
  const apiService = findApiService(window);
  
  if (!apiService) {
    console.error("Could not find sendMessage function to override");
    return null;
  }
  
  // Keep a reference to the original function
  const originalSendMessage = apiService.service.sendMessage;
  
  // The URL for the backend API
  const API_URL = 'https://hr-self-service.onrender.com';
  
  // Define a function to send messages to the backend
  const sendMessageToBackend = async (sessionId, message) => {
    console.log(`Sending message to backend with session: ${sessionId}`);
    
    // Get user ID and token
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
    
    const userId = getUserId();
    const token = localStorage.getItem('token');
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      // First try authenticated endpoint
      console.log(`Calling ${API_URL}/api/chat`);
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: headers,
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
  
  // Replace the sendMessage function
  apiService.service.sendMessage = async (sessionId, message) => {
    console.log(`Intercepted sendMessage call for session: ${sessionId}`);
    
    // If it's a local session, use direct backend integration
    if (sessionId && sessionId.startsWith('local-')) {
      console.log('Using direct backend integration for local session');
      return sendMessageToBackend(sessionId, message);
    }
    
    // For other sessions, try the original function first
    try {
      console.log('Calling original sendMessage for non-local session');
      return await originalSendMessage.call(apiService.service, sessionId, message);
    } catch (error) {
      console.error('Original sendMessage failed:', error);
      
      // If Supabase error, fall back to direct backend
      if (error.message && (
        error.message.includes('Supabase') || 
        error.message.includes('Invalid session ID') ||
        error.message.includes('Row Level Security')
      )) {
        console.log('Supabase error, falling back to direct backend');
        return sendMessageToBackend(sessionId, message);
      }
      
      throw error;
    }
  };
  
  console.log(`Successfully patched sendMessage function at ${apiService.path}`);
  return "Session fix applied - local sessions will now use the backend API directly";
};

// Create a version that can be easily copied into console
export const getConsoleFixCode = () => {
  return `
// Copy this entire function and paste it in your browser console
function fixLocalSessions() {
  console.log("Attempting to fix local session handling...");
  
  // Find the API service using a recursive search
  const findApiService = (obj, depth = 0, path = 'window') => {
    if (!obj || typeof obj !== 'object' || depth > 3) return null;
    
    // Check if this object has a chat property with sendMessage
    if (obj.chat && typeof obj.chat.sendMessage === 'function') {
      console.log(\`Found API service at \${path}.chat\`);
      return {
        type: 'chat',
        service: obj.chat,
        path: \`\${path}.chat\`
      };
    }
    
    // Check if this object has sendMessage directly
    if (typeof obj.sendMessage === 'function') {
      console.log(\`Found API service at \${path}\`);
      return {
        type: 'direct',
        service: obj,
        path: path
      };
    }
    
    // Check if it's the supabase service we're looking for
    if (obj.supabase && obj.chat && typeof obj.chat.sendMessage === 'function') {
      console.log(\`Found Supabase service at \${path}\`);
      return {
        type: 'supabase',
        service: obj.chat,
        path: \`\${path}.chat\`
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
          const result = findApiService(obj[key], depth + 1, \`\${path}.\${key}\`);
          if (result) return result;
        }
      } catch (e) {
        // Ignore errors from accessing restricted properties
      }
    }
    
    return null;
  };
  
  // Find the API service
  const apiService = findApiService(window);
  
  if (!apiService) {
    console.error("Could not find sendMessage function to override");
    return null;
  }
  
  // Keep a reference to the original function
  const originalSendMessage = apiService.service.sendMessage;
  
  // The URL for the backend API
  const API_URL = 'https://hr-self-service.onrender.com';
  
  // Define a function to send messages to the backend
  const sendMessageToBackend = async (sessionId, message) => {
    console.log(\`Sending message to backend with session: \${sessionId}\`);
    
    // Get user ID and token
    const getUserId = () => {
      const localUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (localUser && localUser.email) {
        return \`user-\${localUser.email.replace(/[^a-zA-Z0-9]/g, '')}\`;
      }
      const guestId = localStorage.getItem('guestId') || Date.now().toString();
      if (!localStorage.getItem('guestId')) {
        localStorage.setItem('guestId', guestId);
      }
      return \`guest-\${guestId}\`;
    };
    
    const userId = getUserId();
    const token = localStorage.getItem('token');
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = \`Bearer \${token}\`;
    }
    
    try {
      // First try authenticated endpoint
      console.log(\`Calling \${API_URL}/api/chat\`);
      const response = await fetch(\`\${API_URL}/api/chat\`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          user_id: userId
        })
      });
      
      // If authentication fails, try public endpoint
      if (response.status === 401) {
        console.log('Authentication failed, trying public endpoint');
        const publicResponse = await fetch(\`\${API_URL}/api/chat-public\`, {
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
        
        if (!publicResponse.ok) {
          throw new Error(\`Public API failed with status: \${publicResponse.status}\`);
        }
        
        const data = await publicResponse.json();
        return formatResponse(message, data.response || 'No response from API');
      }
      
      if (!response.ok) {
        throw new Error(\`API failed with status: \${response.status}\`);
      }
      
      const data = await response.json();
      return formatResponse(message, data.response || data.message || 'No response from API');
    } catch (error) {
      console.error('Error calling backend:', error);
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
  
  // Replace the sendMessage function
  apiService.service.sendMessage = async (sessionId, message) => {
    console.log(\`Intercepted sendMessage call for session: \${sessionId}\`);
    
    // If it's a local session, use direct backend integration
    if (sessionId && sessionId.startsWith('local-')) {
      console.log('Using direct backend integration for local session');
      return sendMessageToBackend(sessionId, message);
    }
    
    // For other sessions, try the original function first
    try {
      console.log('Calling original sendMessage for non-local session');
      return await originalSendMessage.call(apiService.service, sessionId, message);
    } catch (error) {
      console.error('Original sendMessage failed:', error);
      
      // If Supabase error, fall back to direct backend
      if (error.message && (
        error.message.includes('Supabase') || 
        error.message.includes('Invalid session ID') ||
        error.message.includes('Row Level Security')
      )) {
        console.log('Supabase error, falling back to direct backend');
        return sendMessageToBackend(sessionId, message);
      }
      
      throw error;
    }
  };
  
  console.log(\`Successfully patched sendMessage function at \${apiService.path}\`);
  return "Session fix applied - local sessions will now use the backend API directly";
}

// Run the function
fixLocalSessions();
`;
};

// If this script is loaded directly in the browser, run the fix
if (typeof window !== 'undefined' && window.document) {
  setTimeout(() => {
    console.log("Session fix utility loaded");
    console.log("To apply the fix, run fixLocalSessions() in the console");
  }, 1000);
} 