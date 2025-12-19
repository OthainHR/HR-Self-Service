/**
 * API Test Utility
 * 
 * This module provides functions to test the direct connection to the backend API
 * without interference from Supabase or the main application logic.
 */

// API URL from environment variables or default to Render deployment
const API_URL = process.env.REACT_APP_API_URL || 
                process.env.NEXT_PUBLIC_BACKEND_URL || 
                process.env.REACT_APP_BACKEND_URL || 
                'https://hr-self-service.onrender.com';

/**
 * Test the connection to the backend API
 * @returns {Promise<object>} The API status response
 */
export const testApiConnection = async () => {
  try {
    console.log(`[API Test] Testing connection to ${API_URL}/api/status`);
    
    const response = await fetch(`${API_URL}/api/status`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API Test] Connection successful:', data);
    return data;
  } catch (error) {
    console.error('[API Test] Connection failed:', error);
    throw error;
  }
};

/**
 * Test sending a message to the API (using public endpoint)
 * @param {string} message - The message to send
 * @returns {Promise<object>} The API response
 */
export const testSendMessage = async (message = 'Hello, this is a test message') => {
  try {
    console.log(`[API Test] Sending test message to ${API_URL}/api/chat-public`);
    
    // Create a unique session ID for this test
    const sessionId = `test-${Date.now()}`;
    
    // Get a guest ID
    const guestId = localStorage.getItem('guestId') || `guest-${Date.now()}`;
    if (!localStorage.getItem('guestId')) {
      localStorage.setItem('guestId', guestId);
    }
    
    // Send the message to the public endpoint
    const response = await fetch(`${API_URL}/api/chat-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        session_id: sessionId,
        user_id: guestId
      })
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[API Test] Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('[API Test] Sending message failed:', error);
    throw error;
  }
};

/**
 * Check for CORS issues by testing a preflight request
 * @returns {Promise<boolean>} True if CORS is properly configured
 */
export const testCorsConfig = async () => {
  try {
    console.log(`[API Test] Testing CORS configuration for ${API_URL}`);
    
    // Use OPTIONS method to simulate preflight
    const response = await fetch(`${API_URL}/api/status`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
        'Origin': window.location.origin
      }
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    };
    
    console.log('[API Test] CORS headers received:', corsHeaders);
    
    const corsConfigured = response.status === 204 || response.ok;
    
    if (corsConfigured) {
      console.log('[API Test] CORS appears to be properly configured');
    } else {
      console.error('[API Test] CORS configuration issue detected');
    }
    
    return {
      success: corsConfigured,
      status: response.status,
      headers: corsHeaders
    };
  } catch (error) {
    console.error('[API Test] CORS test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export a direct testing function for browser console
export const getConsoleTestCode = () => {
  return `
// Function to test the API connection
async function testApi() {
  const API_URL = 'https://hr-self-service.onrender.com';
  
  try {
    console.log('Testing API connection...');
    const response = await fetch(\`\${API_URL}/api/status\`);
    
    if (!response.ok) {
      throw new Error(\`API responded with status: \${response.status}\`);
    }
    
    const data = await response.json();
    console.log('API Status:', data);
    return data;
  } catch (error) {
    console.error('API Test Failed:', error);
    return { error: error.message };
  }
}

// Function to test sending a message
async function testSendMessage() {
  const API_URL = 'https://hr-self-service.onrender.com';
  const sessionId = \`test-\${Date.now()}\`;
  const userId = \`guest-\${Date.now()}\`;
  
  try {
    console.log('Sending test message to API...');
    const response = await fetch(\`\${API_URL}/api/chat-public\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, this is a test message from the console',
        session_id: sessionId,
        user_id: userId
      })
    });
    
    if (!response.ok) {
      throw new Error(\`API responded with status: \${response.status}\`);
    }
    
    const data = await response.json();
    console.log('Message sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Send message failed:', error);
    return { error: error.message };
  }
}

// Run the API test
console.log('Starting API tests...');
testApi().then(() => testSendMessage());
  `;
};

// If this script is loaded directly in the browser, show a message
if (typeof window !== 'undefined' && window.document) {
  setTimeout(() => {
    console.log("API Test utility loaded");
    console.log("To test API connection, run testApiConnection() in the console");
    console.log("To test sending a message, run testSendMessage() in the console");
  }, 1000);
} 