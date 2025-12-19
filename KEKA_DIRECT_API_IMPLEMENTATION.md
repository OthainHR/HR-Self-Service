# Keka Direct API Implementation Guide

## Overview

This implementation uses **Direct API Key Authentication** with Keka instead of OAuth2. The backend generates access tokens on-demand using company-level API credentials, eliminating the need for individual user OAuth flows.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│   Frontend  │────────▶│   Backend    │────────▶│  Keka API  │
│             │ Supabase│   (FastAPI)  │  Token  │            │
│   React     │   Auth  │              │   Gen   │            │
└─────────────┘         └──────────────┘         └────────────┘
                             │
                             ▼
                        ┌──────────┐
                        │ Supabase │
                        │ Database │
                        └──────────┘
```

### Key Components

1. **Frontend (React)**
   - Simple HR service that calls backend endpoints
   - No OAuth flow required
   - Only needs Supabase authentication

2. **Backend (FastAPI)**
   - Generates Keka tokens on-demand using API credentials
   - Caches employee data for performance
   - Handles all Keka API interactions

3. **Keka API**
   - Direct token generation using `grant_type=kekaapi`
   - Company-level API credentials

## Environment Configuration

### Backend `.env` Requirements

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Keka API Configuration (Direct Method)
KEKA_API_KEY=your_keka_api_key
KEKA_CLIENT_ID=your_client_id
KEKA_CLIENT_SECRET=your_client_secret
KEKA_COMPANY_NAME=yourcompany
KEKA_ENVIRONMENT=keka  # or kekademo for sandbox
KEKA_CALENDAR_ID=default  # Optional: for holidays endpoint

# Application Settings
ENVIRONMENT=production
LOG_LEVEL=INFO
```

### Frontend `.env` Requirements

```bash
# Backend API URL
REACT_APP_API_URL=https://your-backend-url.com

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

## Token Generation Flow

### 1. Authentication Endpoint

**URL:** `https://login.{environment}.com/connect/token`

**Method:** POST

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
Accept: application/json
```

**Body:**
```
grant_type=kekaapi
scope=kekaapi
client_id=your_client_id
client_secret=your_client_secret
api_key=your_api_key
```

**Response:**
```json
{
  "access_token": "eyJhR...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "scope": "kekaapi"
}
```

### 2. Token Usage

Every API request to Keka includes:
```
Authorization: Bearer {access_token}
```

## API Endpoints Implementation

### Employee Profile
```javascript
// GET /api/v1/hris/employees/{employeeId}
const employee = await keka_api_service.get_employee_by_id(employee_id);
```

### Leave Balance
```javascript
// GET /api/v1/time/leavebalance?employeeId={employeeId}
const balance = await keka_api_service.get_leave_balance(employee_id);
```

### Attendance
```javascript
// GET /api/v1/time/attendance?employeeId={employeeId}&from={date}&to={date}
const attendance = await keka_api_service.get_attendance(
  employee_id,
  from_date,
  to_date
);
```

### Leave Requests
```javascript
// GET /api/v1/time/leaverequests?employeeId={employeeId}
const requests = await keka_api_service.get_leave_requests(employee_id);
```

### Leave Types
```javascript
// GET /api/v1/time/leavetypes
const types = await keka_api_service.get_leave_types();
```

### Apply Leave
```javascript
// POST /api/v1/time/leaverequests
const result = await keka_api_service.apply_leave(employee_id, leave_data);
```

### Holidays
```javascript
// GET /api/v1/time/holidayscalendar/{calendarId}/holidays
const holidays = await keka_api_service.get_holidays(year);
```

### Payroll
```javascript
// GET /api/v1/payroll/salaries?employeeId={employeeId}
const salaries = await keka_api_service.get_payroll_salaries(employee_id);
```

## Backend Implementation

### Core Service: `keka_api_service.py`

```python
class KekaAPIService:
    async def generate_access_token(self) -> Optional[str]:
        """Generate fresh token for each session"""
        # Token generation using company credentials
        # No user-specific OAuth flow required
        
    async def get_employee_by_email(self, email: str):
        """Get employee data by email"""
        # Caches employee ID for 24 hours
        
    async def get_leave_balance(self, employee_id: str):
        """Get leave balance using fresh token"""
```

### HR Data Service: `hr_data_service_direct.py`

```python
class HRDataServiceDirect:
    def set_authenticated_user(self, email: str):
        """Set current user context"""
        
    async def get_my_profile(self):
        """Get employee profile for authenticated user"""
        # Uses employee ID from email mapping
        
    async def get_my_leave_balances(self):
        """Get leave balances"""
        # Generates token on-demand
        # Fetches data from Keka API
```

### Router: `hr.py`

```python
@router.get("/profile")
async def get_my_profile(user_email: str = Depends(get_user_email)):
    """Get authenticated user's profile"""
    hr_data_service.set_authenticated_user(user_email)
    return await hr_data_service.get_my_profile()
```

## Frontend Implementation

### Service: `hrService.js`

```javascript
class HRService {
  async getMyProfile() {
    // Simple API call to backend
    // Backend handles all Keka token management
    const response = await hrApiClient.get('/profile');
    return { success: true, data: response.data };
  }
  
  async getMyLeaveBalances() {
    const response = await hrApiClient.get('/leave/balances');
    return { success: true, data: response.data };
  }
}
```

### Component Usage

```javascript
// In React components
import { hrService } from '../../services/hrService';

const HRProfile = () => {
  const loadProfile = async () => {
    const result = await hrService.getMyProfile();
    if (result.success) {
      setProfile(result.data);
    }
  };
};
```

## Employee ID Mapping

### Automatic Caching

1. **First Request**: Backend searches Keka API by email
2. **Cache**: Employee ID stored in `keka_employee_cache` table
3. **Subsequent Requests**: Use cached ID (24-hour TTL)

### Cache Table Schema

```sql
CREATE TABLE keka_employee_cache (
  user_email TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_data JSONB,
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### ✅ Advantages of Direct API Method

1. **Centralized Credentials**: API keys managed at company level
2. **No User OAuth**: Simpler user experience
3. **Consistent Tokens**: Same token generation process for all users
4. **Easier Maintenance**: Single set of credentials to manage

### 🔒 Security Best Practices

1. **Environment Variables**: Never commit API keys to git
2. **Token Expiration**: Tokens expire after 24 hours (configurable)
3. **Supabase Auth**: Frontend still requires user authentication
4. **RLS Policies**: Database-level access control
5. **HTTPS Only**: All API calls over secure connections

## Migration from OAuth

### Files to Remove

- ❌ `backend/app/routers/keka_auth.py` (OAuth router)
- ❌ `backend/app/routers/keka_direct_auth.py` (Old direct auth)
- ❌ `backend/app/services/keka_oauth_service.py`
- ❌ `backend/app/services/keka_direct_token_service.py`
- ❌ `frontend/src/services/hrServiceDirect.js` (old version with OAuth)

### Files to Keep & Update

- ✅ `backend/app/services/keka_api_service.py` (NEW)
- ✅ `backend/app/services/hr_data_service_direct.py` (NEW)
- ✅ `backend/app/routers/hr.py` (UPDATED)
- ✅ `frontend/src/services/hrService.js` (UPDATED)

### Database Tables

**Keep:**
- `keka_employee_cache` - For employee ID caching

**Optional to Remove:**
- `user_keka_tokens` - OAuth tokens (no longer needed)
- `user_keka_direct_tokens` - Old direct tokens (no longer needed)

## Testing

### Backend Health Check

```bash
curl -X GET "http://localhost:8000/api/hr/health" \
  -H "Authorization: Bearer {supabase_token}"
```

### Test Profile Endpoint

```bash
curl -X GET "http://localhost:8000/api/hr/profile" \
  -H "Authorization: Bearer {supabase_token}"
```

### Frontend Testing

```javascript
// In browser console
import { hrService } from './services/hrService';

// Test profile fetch
const profile = await hrService.getMyProfile();
console.log(profile);

// Test leave balances
const balances = await hrService.getMyLeaveBalances();
console.log(balances);
```

## Troubleshooting

### Common Issues

**1. "Failed to generate Keka API token"**
- ✅ Check `KEKA_API_KEY`, `KEKA_CLIENT_ID`, `KEKA_CLIENT_SECRET` in `.env`
- ✅ Verify environment (`keka` vs `kekademo`)
- ✅ Check token endpoint URL

**2. "Employee not found with email"**
- ✅ Verify email exists in Keka
- ✅ Check email format matches Keka records
- ✅ Clear `keka_employee_cache` table

**3. "401 Unauthorized"**
- ✅ Check Supabase authentication
- ✅ Verify JWT token in request headers
- ✅ Check token expiration

**4. "Network connection issue"**
- ✅ Verify backend URL in `REACT_APP_API_URL`
- ✅ Check CORS configuration
- ✅ Ensure backend is running

## Performance Optimization

### Caching Strategy

1. **Employee Data**: 24-hour cache
2. **Tokens**: Generated on-demand (not cached)
3. **API Responses**: No caching (always fresh data)

### Rate Limiting

- Frontend: Debounce rapid requests
- Backend: Rate limit per IP on sensitive endpoints
- Keka API: Respect their rate limits (usually 100 req/min)

## Monitoring

### Logs to Monitor

```python
logger.info(f"Successfully generated Keka access token")
logger.info(f"Using cached employee ID for {email}")
logger.error(f"Failed to generate token: {status_code}")
logger.error(f"Employee not found with email: {email}")
```

### Metrics to Track

- Token generation success rate
- API response times
- Cache hit rate
- Error rates by endpoint

## Support

For issues or questions:
1. Check backend logs: `tail -f backend/logs/app.log`
2. Check frontend console for errors
3. Verify environment variables
4. Test with Keka API documentation: https://developers.keka.com/

---

**Last Updated**: October 22, 2025
**Version**: 2.0 - Direct API Key Method

