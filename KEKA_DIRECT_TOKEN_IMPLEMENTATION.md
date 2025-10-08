# Keka Direct Token Implementation

## Overview

This implementation provides a simpler alternative to OAuth2 flow for Keka API access. Instead of requiring users to go through the OAuth authorization process, the system automatically generates Keka API tokens using `grant_type=kekaapi` for each authenticated user.

## Architecture

### Backend Components

#### 1. **Keka Direct Token Service**
`backend/app/services/keka_direct_token_service.py`

Handles token generation, caching, and management:
- `generate_token()`: Generates new Keka API token using grant_type=kekaapi
- `get_or_generate_token_for_user(user_email)`: Gets cached token or generates new one
- `_get_cached_token(user_email)`: Retrieves valid cached token
- `_cache_token(user_email, token_data)`: Stores token in database
- `revoke_cached_token(user_email)`: Removes cached token
- `get_token_status(user_email)`: Returns token status (valid/expired/not_found)

#### 2. **API Router**
`backend/app/routers/keka_direct_auth.py`

Provides HTTP endpoints:
- `POST /api/keka-direct/generate-token`: Generate new token
- `GET /api/keka-direct/token-status`: Get token status
- `DELETE /api/keka-direct/revoke-token`: Revoke token
- `POST /api/keka-direct/refresh-token`: Force refresh token

#### 3. **Database Schema**
`backend/user_keka_direct_tokens_schema.sql`

Stores cached tokens:
```sql
CREATE TABLE public.user_keka_direct_tokens (
    id UUID PRIMARY KEY,
    user_email TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Frontend Components

#### 1. **HR Service Extension**
`frontend/src/services/hrServiceDirect.js`

Added methods to DirectHRService class:
- `generateKekaToken()`: Request new token from backend
- `getKekaTokenStatus()`: Check token status
- `refreshKekaToken()`: Force token refresh
- `revokeKekaToken()`: Revoke cached token
- `ensureKekaToken()`: Automatically ensure valid token exists

#### 2. **HR Self Service Integration**
`frontend/src/pages/HRSelfService.js`

Automatically calls `ensureKekaToken()` on component mount to ensure user has valid token before loading HR data.

## Token Generation Flow

### Method 1: Backend (Python)

```python
import requests

url = "https://login.keka.com/connect/token"

payload = {
    "grant_type": "kekaapi",
    "scope": "kekaapi",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
}

headers = {
    "accept": "application/json",
    "content-type": "application/x-www-form-urlencoded"
}

response = requests.post(url, data=payload, headers=headers)
token_data = response.json()
```

### Method 2: Frontend (JavaScript)

```javascript
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'kekaapi',
    scope: 'kekaapi',
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET'
  })
};

fetch('https://login.keka.com/connect/token', options)
  .then(res => res.json())
  .then(token => console.log(token))
  .catch(err => console.error(err));
```

## User Flow

1. **User logs in** to the application (Supabase auth)
2. **Navigate to HR section** (HRSelfService.js component)
3. **Automatic token check**:
   - Frontend calls `hrService.ensureKekaToken()`
   - Backend checks if cached token exists and is valid
   - If no token or expired: generates new token using Keka API
   - Token is cached in database for reuse
4. **HR API calls**: All subsequent HR API calls use the cached token
5. **Token refresh**: Automatically refreshes when expired or near expiration

## Environment Variables Required

Add these to your `.env` file:

```bash
# Keka API Configuration
KEKA_CLIENT_ID=your_client_id_here
KEKA_CLIENT_SECRET=your_client_secret_here
KEKA_COMPANY_NAME=your_company_name
KEKA_ENVIRONMENT=keka  # or "kekademo" for sandbox

# Optional
KEKA_API_BASE_URL=https://yourcompany.keka.com/api/v1
KEKA_REDIRECT_URI=http://localhost:3000/keka/callback
```

## Database Setup

Run the SQL schema file to create the tokens table:

```bash
# Using Supabase CLI
supabase db execute --file backend/user_keka_direct_tokens_schema.sql

# Or run directly in Supabase SQL Editor
```

## API Usage Examples

### Generate Token

```javascript
// Frontend
const result = await hrService.generateKekaToken();
if (result.success) {
  console.log('Token:', result.data.access_token);
  console.log('Expires in:', result.data.expires_in, 'seconds');
}
```

### Check Token Status

```javascript
const status = await hrService.getKekaTokenStatus();
console.log('Status:', status.data.status); // 'valid', 'expired', 'not_found'
console.log('Expires at:', status.data.expires_at);
```

### Ensure Token (Recommended)

```javascript
// This automatically handles generation/refresh
const result = await hrService.ensureKekaToken();
if (result.success) {
  // Token is ready, proceed with HR API calls
  const profile = await hrService.getMyProfile();
}
```

## Security Considerations

1. **RLS Policies**: Users can only access their own tokens
2. **Service Role**: Backend uses service_role to manage tokens
3. **Token Storage**: Tokens are encrypted at rest in Supabase
4. **Expiration**: Tokens automatically expire (typically 1 hour)
5. **Automatic Refresh**: System refreshes tokens before expiration
6. **Cleanup Function**: `cleanup_expired_keka_tokens()` removes old tokens

## Benefits Over OAuth2 Flow

1. **Simpler UX**: No redirect to Keka authorization page
2. **Automatic**: Token generation happens behind the scenes
3. **Faster**: No user interaction required
4. **Cached**: Tokens are reused until expiration
5. **Reliable**: Automatic refresh before expiration

## Comparison

| Feature | OAuth2 Flow | Direct Token |
|---------|------------|--------------|
| User Interaction | Required | None |
| Setup Complexity | High | Low |
| Token Lifespan | Long (with refresh) | Medium (1 hour) |
| Caching | Manual | Automatic |
| Best For | User-specific data | Company-wide access |

## Troubleshooting

### Token Generation Fails

1. Check environment variables are set correctly
2. Verify `KEKA_CLIENT_ID` and `KEKA_CLIENT_SECRET`
3. Ensure correct `KEKA_ENVIRONMENT` (keka vs kekademo)
4. Check Keka API status

### Token Expired Quickly

- Keka tokens typically expire in 1 hour
- System automatically refreshes when < 5 minutes remaining
- Check database for token expiration times

### Database Errors

```sql
-- Verify table exists
SELECT * FROM user_keka_direct_tokens LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_keka_direct_tokens';

-- Manual cleanup
SELECT cleanup_expired_keka_tokens();
```

## Testing

### Backend

```python
# Test token generation
from app.services.keka_direct_token_service import keka_direct_token_service
import asyncio

async def test():
    token = await keka_direct_token_service.generate_token()
    print(token)

asyncio.run(test())
```

### Frontend

```javascript
// Open browser console on HR Self Service page
const result = await hrService.generateKekaToken();
console.log('Token generated:', result);

const status = await hrService.getKekaTokenStatus();
console.log('Token status:', status);
```

## Maintenance

### Automatic Cleanup

Set up a cron job to clean expired tokens:

```sql
-- Run daily to clean tokens older than 7 days
SELECT cleanup_expired_keka_tokens();
```

### Monitoring

```sql
-- Check active tokens
SELECT 
    user_email,
    expires_at,
    EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 AS minutes_until_expiry
FROM user_keka_direct_tokens
WHERE expires_at > NOW()
ORDER BY expires_at;

-- Check expired tokens
SELECT COUNT(*) FROM user_keka_direct_tokens 
WHERE expires_at < NOW();
```

## Future Enhancements

1. **Background Refresh**: Proactively refresh tokens for active users
2. **Token Pooling**: Share tokens across users in same company
3. **Metrics**: Track token usage and generation patterns
4. **Alerts**: Notify admins of token generation failures
5. **Rate Limiting**: Implement per-user token generation limits

## Support

For issues or questions:
1. Check environment variables
2. Review Supabase logs
3. Check backend logs (`/var/log` or render.com logs)
4. Verify Keka API credentials
5. Test token generation directly with curl/Postman

