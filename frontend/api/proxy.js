// Proxy handler for Vercel serverless function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,OPTIONS,PATCH,DELETE,POST,PUT'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract parameters from request
    const { body } = req;
    const apiUrl = 'https://hr-self-service.onrender.com/api/chat/public';

    console.log('Vercel Proxy: Forwarding request to:', apiUrl);
    console.log('Vercel Proxy: Request body:', body);

    // Forward the request to the actual API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();
    
    // Return the response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Vercel Proxy: Error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy request',
      message: error.message 
    });
  }
} 