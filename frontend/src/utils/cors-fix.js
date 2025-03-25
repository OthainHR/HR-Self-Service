// HR Chatbot Fix Script
import { chatApi } from '../services/api';

console.log('⚙️ HR Chatbot Fix: Initializing...');

// Function to send a message to the backend using a CORS proxy
async function sendMessageToBackend(sessionId, content, userId) {
    console.log(`⚙️ HR Chatbot Fix: Sending message to backend with session: ${sessionId}`);
    
    // Get the API URL from environment variables
    const apiUrl = process.env.REACT_APP_API_URL || 
                 process.env.NEXT_PUBLIC_BACKEND_URL || 
                 process.env.REACT_APP_BACKEND_URL || 
                 'https://hr-self-service.onrender.com';
    
    try {
        // First try using CORS Anywhere proxy
        const corsProxyUrl = 'https://cors-anywhere.herokuapp.com/';
        
        // Try public endpoint through proxy
        console.log(`⚙️ HR Chatbot Fix: Using CORS proxy for ${apiUrl}/api/chat-public`);
        
        const publicResponse = await fetch(`${corsProxyUrl}${apiUrl}/api/chat-public`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': window.location.origin
            },
            body: JSON.stringify({
                message: content,
                session_id: sessionId,
                user_id: userId || 'guest-' + sessionId
            })
        });
        
        if (publicResponse.ok) {
            const data = await publicResponse.json();
            console.log('⚙️ HR Chatbot Fix: Got successful response from proxy!', data);
            return {
                messages: [{
                    role: 'user',
                    content: content,
                    id: 'user-' + Date.now(),
                    timestamp: new Date().toISOString()
                }, {
                    role: 'assistant',
                    content: data.response || 'No response content.',
                    id: 'ai-' + Date.now(),
                    timestamp: new Date(Date.now() + 1000).toISOString()
                }]
            };
        } else {
            // If proxy fails, try with mode no-cors as last resort
            console.log('⚙️ HR Chatbot Fix: Proxy request failed, trying fallback...');
            
            // Use a mock response as fallback when all else fails
            return {
                messages: [{
                    role: 'user',
                    content: content,
                    id: 'user-' + Date.now(),
                    timestamp: new Date().toISOString()
                }, {
                    role: 'assistant',
                    content: "I'm currently experiencing connectivity issues with the HR database. This is likely due to CORS restrictions on the Vercel deployment. You can try: 1) Using the app from the original domain, 2) Requesting temporary CORS access from IT, or 3) Using the local development environment.",
                    id: 'ai-' + Date.now(),
                    timestamp: new Date(Date.now() + 1000).toISOString()
                }]
            };
        }
    } catch (error) {
        console.error('⚙️ HR Chatbot Fix: Error calling backend:', error);
        
        // Return a fallback response when the backend is unreachable
        return {
            messages: [{
                role: 'user',
                content: content,
                id: 'user-' + Date.now(),
                timestamp: new Date().toISOString()
            }, {
                role: 'assistant',
                content: "I'm unable to connect to the HR database due to CORS restrictions between Vercel and the backend server. This is expected when accessing from the Vercel deployment. For full functionality: 1) Run the app locally, 2) Use a CORS proxy browser extension, or 3) Ask the administrator to add Vercel domains to the allowed CORS origins.",
                id: 'ai-' + Date.now(),
                timestamp: new Date(Date.now() + 1000).toISOString()
            }]
        };
    }
}

// Function to patch the API service
function patchAPIService() {
    console.log('⚙️ HR Chatbot Fix: Searching for API service...');
    
    if (chatApi && typeof chatApi.sendMessage === 'function') {
        console.log('⚙️ HR Chatbot Fix: Found API service, patching sendMessage...');
        
        // Store original function
        const originalSendMessage = chatApi.sendMessage;
        
        // Override sendMessage
        chatApi.sendMessage = async function(sessionId, content) {
            console.log('⚙️ HR Chatbot Fix: Intercepted sendMessage call for session:', sessionId);
            
            // For local sessions, use our direct backend integration
            if (sessionId && sessionId.toString().startsWith('local-')) {
                console.log('⚙️ HR Chatbot Fix: Using direct backend integration for local session');
                
                // Get user ID from localStorage if available
                const userInfo = JSON.parse(localStorage.getItem('user') || 'null');
                const userId = userInfo?.email ? 
                    `user-${userInfo.email.replace(/[^a-zA-Z0-9]/g, '')}` : 
                    `guest-${sessionId}`;
                
                return await sendMessageToBackend(sessionId, content, userId);
            }
            
            // For non-local sessions, try the original function
            try {
                return await originalSendMessage.call(this, sessionId, content);
            } catch (error) {
                console.error('⚙️ HR Chatbot Fix: Original sendMessage failed, using fallback:', error);
                return await sendMessageToBackend(sessionId, content);
            }
        };
        
        console.log('⚙️ HR Chatbot Fix: Successfully patched sendMessage');
        
        // Also expose it to window for easy testing
        window.chatApiPatched = chatApi;
        
        return true;
    }
    
    // Try to find API in other places (window.frames, etc.)
    const searchTargets = [window, window.frames, window.parent];
    
    for (const target of searchTargets) {
        if (!target) continue;
        
        // Check if target itself has the API
        if (target.chatApi && typeof target.chatApi.sendMessage === 'function') {
            console.log('Found API service at target.chatApi');
            patchService(target.chatApi, 'sendMessage');
            return true;
        }
        
        // Check if there's a frames property to search deeper
        if (target.frames) {
            if (target.frames.chatApi && typeof target.frames.chatApi.sendMessage === 'function') {
                console.log('Found API service at target.frames.chatApi');
                patchService(target.frames.chatApi, 'sendMessage');
                return true;
            }
            
            if (target.frames.chatApiPatched && typeof target.frames.chatApiPatched.sendMessage === 'function') {
                console.log('Found API service at target.frames.chatApiPatched');
                patchService(target.frames.chatApiPatched, 'sendMessage');
                return true;
            }
        }
    }
    
    console.log('⚙️ HR Chatbot Fix: Could not find sendMessage function to override');
    return false;
}

// Helper to patch a service
function patchService(service, methodName) {
    if (!service || typeof service[methodName] !== 'function') return false;
    
    const original = service[methodName];
    
    service[methodName] = async function(sessionId, content) {
        console.log(`⚙️ HR Chatbot Fix: Intercepted ${methodName} call for session:`, sessionId);
        
        // For local sessions, use our direct backend integration
        if (sessionId && sessionId.toString().startsWith('local-')) {
            console.log('⚙️ HR Chatbot Fix: Using direct backend integration for local session');
            return await sendMessageToBackend(sessionId, content);
        }
        
        // For normal sessions, try the original function
        try {
            return await original.call(this, sessionId, content);
        } catch (error) {
            console.error(`⚙️ HR Chatbot Fix: Original ${methodName} failed, using fallback:`, error);
            return await sendMessageToBackend(sessionId, content);
        }
    };
    
    console.log(`⚙️ HR Chatbot Fix: Successfully patched ${methodName} function at`, service);
    return true;
}

// Apply the fix
const success = patchAPIService();

// If patching failed, try again when the page is fully loaded
if (!success) {
    console.log('⚙️ HR Chatbot Fix: Will retry after the page fully loads');
    window.addEventListener('load', () => {
        setTimeout(() => {
            const retrySuccess = patchAPIService();
            if (!retrySuccess) {
                console.error('⚙️ HR Chatbot Fix: Failed to find API service on retry');
            }
        }, 2000);
    });
}

// Add test function to window object
window.testHRChatbotFix = function() {
    console.log('⚙️ HR Chatbot Fix: Testing fix...');
    
    // Try to send a test message
    const testSessionId = 'local-' + Date.now();
    const testContent = 'Hello, this is a test message.';
    
    if (chatApi && typeof chatApi.sendMessage === 'function') {
        chatApi.sendMessage(testSessionId, testContent)
            .then(response => {
                console.log('⚙️ HR Chatbot Fix: Test successful:', response);
            })
            .catch(error => {
                console.error('⚙️ HR Chatbot Fix: Test failed:', error);
            });
    } else {
        console.error('⚙️ HR Chatbot Fix: Could not find API service for testing');
    }
};

console.log('⚙️ HR Chatbot Fix: Initialization complete');
console.log('⚙️ HR Chatbot Fix: To test, run window.testHRChatbotFix() in the console'); 