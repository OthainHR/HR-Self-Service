# CORS Configuration for HR Chatbot Backend on Render

## Issue
Your frontend on Vercel is experiencing CORS errors when trying to connect to the backend on Render. This is happening because the backend is not configured to allow requests from your Vercel domain.

## Solution
You need to update the `CORS_ORIGINS` environment variable on your Render deployment to include your Vercel domain.

### Steps to Fix

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Select your HR Chatbot backend service
3. Go to "Environment" in the left sidebar
4. Find the `CORS_ORIGINS` environment variable
5. Add your Vercel domain to the list (comma-separated)

Example:
```
CORS_ORIGINS=http://localhost:3000,https://hr-self-service.vercel.app,https://hr-self-service-gipb97koc-othainhrs-projects.vercel.app
```

6. Click "Save Changes" 
7. Your service will redeploy automatically

### Domains to Include

Make sure to include all the domains that need to access your API:
- `http://localhost:3000` (for local development)
- `https://hr-self-service.vercel.app` (your main Vercel domain)
- `https://hr-self-service-gipb97koc-othainhrs-projects.vercel.app` (the preview deployment domain shown in your error message)

### Testing

After updating the CORS settings, test the connection from your Vercel deployment by:
1. Refreshing your Vercel app
2. Trying the operation that was failing (adding a document)
3. Check browser console for any remaining CORS errors

## Security Note

In production, you should only allow specific domains to access your API, rather than using wildcards like `*`. 