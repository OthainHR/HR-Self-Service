// HR Chatbot Fix Script
import { chatApi } from '../services/api';

console.log('⚙️ HR Chatbot Fix: Initializing...');

// Function to patch the API service
function patchAPIService() {
    console.log('⚙️ HR Chatbot Fix: Searching for API service...');
    
    if (chatApi && typeof chatApi.sendMessage === 'function') {
        console.log('⚙️ HR Chatbot Fix: Found API service, patching sendMessage...');
        
        // Store original function
        const originalSendMessage = chatApi.sendMessage;
        
        // Override sendMessage
        chatApi.sendMessage = async function(sessionId, content) {
            console.log('⚙️ HR Chatbot Fix: Intercepted sendMessage call');
            
            try {
                // Get the API URL from environment variables
                const apiUrl = process.env.REACT_APP_API_URL || 
                             process.env.NEXT_PUBLIC_BACKEND_URL || 
                             process.env.REACT_APP_BACKEND_URL || 
                             'http://localhost:8000';
                
                // Try to use the public endpoint first
                const response = await fetch(`${apiUrl}/api/chat-public`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: content,
                        session_id: sessionId,
                        user_id: 'guest-' + sessionId
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('⚙️ HR Chatbot Fix: Successfully got response from public endpoint');
                    return {
                        messages: [{
                            role: 'assistant',
                            content: data.response || 'No response content.',
                            id: Date.now().toString(),
                            timestamp: new Date().toISOString()
                        }]
                    };
                }
                
                // If public endpoint fails, fall back to original function
                console.log('⚙️ HR Chatbot Fix: Falling back to original sendMessage');
                return await originalSendMessage.call(this, sessionId, content);
                
            } catch (error) {
                console.error('⚙️ HR Chatbot Fix: Error in patched sendMessage:', error);
                // Fall back to original function on error
                return await originalSendMessage.call(this, sessionId, content);
            }
        };
        
        console.log('⚙️ HR Chatbot Fix: Successfully patched sendMessage');
        
        // Also expose it to window for easy testing
        window.chatApiPatched = chatApi;
        
        return true;
    }
    
    console.log('⚙️ HR Chatbot Fix: Could not find sendMessage function to override');
    return false;
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
    const testSessionId = 'test-' + Date.now();
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