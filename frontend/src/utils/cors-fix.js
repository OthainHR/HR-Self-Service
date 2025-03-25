// HR Chatbot Fix Script
console.log('⚙️ HR Chatbot Fix: Initializing...');

// Function to find and patch the API service
function patchAPIService() {
    console.log('⚙️ HR Chatbot Fix: Searching for API service...');
    
    // Try to find the API service in different locations
    const possibleLocations = [
        window.api,
        window.apiService,
        window.supabaseService?.chat,
        window.supabase?.chat
    ];
    
    for (const service of possibleLocations) {
        if (service && typeof service.sendMessage === 'function') {
            console.log('⚙️ HR Chatbot Fix: Found API service, patching sendMessage...');
            
            // Store original function
            const originalSendMessage = service.sendMessage;
            
            // Override sendMessage
            service.sendMessage = async function(sessionId, content) {
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
            return true;
        }
    }
    
    console.log('⚙️ HR Chatbot Fix: Could not find sendMessage function to override');
    return false;
}

// Function to apply the fix
function applyFix() {
    console.log('⚙️ HR Chatbot Fix: Applying fix...');
    
    // Try to patch the API service
    const success = patchAPIService();
    
    if (!success) {
        console.log('⚙️ HR Chatbot Fix: Will retry after the page fully loads');
        // Retry after a short delay
        setTimeout(applyFix, 1000);
    }
}

// Initialize the fix
applyFix();

// Add test function to window object
window.testHRChatbotFix = function() {
    console.log('⚙️ HR Chatbot Fix: Testing fix...');
    
    // Try to send a test message
    const testSessionId = 'test-' + Date.now();
    const testContent = 'Hello, this is a test message.';
    
    // Find the API service
    const service = window.api || window.apiService || window.supabaseService?.chat || window.supabase?.chat;
    
    if (service && typeof service.sendMessage === 'function') {
        service.sendMessage(testSessionId, testContent)
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