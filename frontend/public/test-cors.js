/**
 * HR Chatbot CORS Debug Helper
 * 
 * Run this in your browser console to test CORS configuration
 */

// Configuration
const API_URL = 'https://hr-self-service.onrender.com';
const API_ENDPOINTS = [
  '/api/chat/public',
  '/api/chat',
  '/api/status',
  '/api/cors-test'
];

// Test functions
async function testDirectCall(endpoint) {
  console.log(`Testing direct call to ${API_URL}${endpoint}...`);
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: endpoint.includes('status') ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: endpoint.includes('status') ? undefined : JSON.stringify({
        message: 'Hello from CORS Test',
        session_id: `test-${Date.now()}`,
        user_id: 'cors-test-user'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success for ${endpoint}:`, data);
      return true;
    } else {
      console.log(`❌ Failed for ${endpoint}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error for ${endpoint}:`, error.message);
    return false;
  }
}

async function testProxyCall(endpoint, proxyType) {
  let proxyUrl;
  
  if (proxyType === 'corsproxy') {
    proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`${API_URL}${endpoint}`)}`;
  } else if (proxyType === 'allorigins') {
    proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${API_URL}${endpoint}`)}`;
  } else if (proxyType === 'thingproxy') {
    proxyUrl = `https://thingproxy.freeboard.io/fetch/${API_URL}${endpoint}`;
  }
  
  console.log(`Testing ${proxyType} proxy call to ${endpoint}...`);
  try {
    const response = await fetch(proxyUrl, {
      method: endpoint.includes('status') ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: endpoint.includes('status') ? undefined : JSON.stringify({
        message: `Hello from CORS Test via ${proxyType}`,
        session_id: `test-${Date.now()}`,
        user_id: 'cors-test-user'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success for ${endpoint} via ${proxyType}:`, data);
      return true;
    } else {
      console.log(`❌ Failed for ${endpoint} via ${proxyType}: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error for ${endpoint} via ${proxyType}:`, error.message);
    return false;
  }
}

// Main test function
async function runCorsTests() {
  console.log('🧪 Starting CORS tests...');
  console.log('------------------------------------');
  
  // Test each endpoint directly
  console.log('📌 Testing direct calls:');
  for (const endpoint of API_ENDPOINTS) {
    await testDirectCall(endpoint);
  }
  
  console.log('------------------------------------');
  
  // Test each endpoint with proxies
  const proxyTypes = ['corsproxy', 'allorigins', 'thingproxy'];
  
  for (const proxyType of proxyTypes) {
    console.log(`📌 Testing with ${proxyType}:`);
    for (const endpoint of API_ENDPOINTS) {
      await testProxyCall(endpoint, proxyType);
    }
    console.log('------------------------------------');
  }
  
  console.log('🧪 CORS tests completed!');
}

// Print instructions
console.log('🧪 HR Chatbot CORS Debug Helper');
console.log('Run runCorsTests() to start testing CORS configuration');

// Expose the function globally
window.runCorsTests = runCorsTests; 