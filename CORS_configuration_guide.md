# CORS Configuration Guide for HR Chatbot Backend

## Issue
Your frontend on Vercel (`https://hr-self-service-inky.vercel.app`) cannot communicate with your backend on Render (`https://hr-self-service.onrender.com`) due to CORS restrictions.

## Solution
You need to update your backend's CORS configuration to allow requests from your Vercel domain.

## Steps to Update CORS in FastAPI

1. Locate your main application file, typically named `main.py` or `app.py` in your backend codebase.

2. Add or update the CORS middleware configuration with the following code:

```python
from fastapi.middleware.cors import CORSMiddleware

# Add your frontend domains here
origins = [
    "https://hr-self-service-inky.vercel.app",  # Your current Vercel domain
    "https://hr-self-service.vercel.app",       # Your production Vercel domain
    "http://localhost:3000",                    # Local development
    "*"                                         # Temporarily allow all origins for testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. Make sure this code is added **before** any route definitions but **after** the app creation.

Example placement:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration (place here)
origins = [
    "https://hr-self-service-inky.vercel.app",
    "https://hr-self-service.vercel.app",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes come after this point
@app.get("/")
async def root():
    return {"message": "Welcome to the HR Chatbot API"}
```

## Alternative: Environment Variable Configuration

If you prefer to configure CORS through environment variables:

1. Add this to your backend code:

```python
from fastapi.middleware.cors import CORSMiddleware
import os

# Get allowed origins from environment variable
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = cors_origins_str.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. Update your Render environment variables:
   - Go to your Render dashboard
   - Select your backend service
   - Go to Environment
   - Add a new environment variable:
     - Key: `CORS_ORIGINS`
     - Value: `https://hr-self-service-inky.vercel.app,https://hr-self-service.vercel.app,http://localhost:3000,*`

## Temporary Workaround: Using the CORS Proxy in Frontend

If you can't immediately update your backend, you can use a CORS proxy in your frontend:

```javascript
// Function to call backend through a CORS proxy
async function callBackendWithProxy(endpoint, data) {
  const proxyUrl = 'https://corsproxy.io/?';
  const targetUrl = `https://hr-self-service.onrender.com${endpoint}`;
  
  try {
    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`API responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calling backend through proxy:', error);
    throw error;
  }
}

// Example usage
callBackendWithProxy('/api/chat', {
  message: 'Hello, this is a test',
  session_id: 'test-123',
  user_id: 'guest-456'
}).then(response => {
  console.log('Response:', response);
}).catch(error => {
  console.error('Error:', error);
});
```

## Testing Your CORS Configuration

After updating your backend, you can test if CORS is properly configured with this script:

```javascript
async function testCorsConfiguration() {
  try {
    const response = await fetch('https://hr-self-service.onrender.com/api/status', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('CORS is properly configured! Response:', data);
      return true;
    } else {
      console.error('Request failed but not because of CORS');
      return false;
    }
  } catch (error) {
    console.error('CORS test failed:', error);
    return false;
  }
}

testCorsConfiguration();
```

## Remember

After making changes to your backend code, you'll need to:
1. Commit the changes to your repository
2. Redeploy the application on Render
3. Wait for the deployment to complete
4. Test the CORS configuration 