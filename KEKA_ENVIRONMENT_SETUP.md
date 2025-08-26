# Keka Environment Setup Guide

## Critical Issues Fixed

This document addresses the critical issues identified in the Keka API integration.

## 1. Environment Variables Required

Add these to your `.env` file:

```bash
# Required OAuth Credentials (Get from Keka Admin Panel)
KEKA_CLIENT_ID=your_keka_client_id_here
KEKA_CLIENT_SECRET=your_keka_client_secret_here
KEKA_API_KEY=your_keka_api_key_here

# OAuth Configuration
KEKA_REDIRECT_URI=https://your-domain.com/api/keka-auth/callback
KEKA_COMPANY_NAME=yourcompany
KEKA_ENVIRONMENT=keka

# Optional Configuration
KEKA_CALENDAR_ID=default
```

## 2. How to Get Keka Credentials

1. **Login to Keka Admin Panel**
   - Go to **Global Settings** > **Integrations & Automation** > **API Access**

2. **Generate API Key**
   - Click "Create new key"
   - Set expiry date (optional)
   - Select required scopes
   - Copy the generated API key

3. **Get OAuth Credentials**
   - In the same section, find your `client_id` and `client_secret`
   - Copy these values

4. **Set Company Name**
   - Your `KEKA_COMPANY_NAME` is the subdomain of your Keka instance
   - Example: If your Keka URL is `https://mycompany.keka.com`, then `KEKA_COMPANY_NAME=mycompany`

## 3. OAuth Endpoints (CORRECTED)

Based on official Keka documentation:

| Environment | OAuth Token Endpoint |
|-------------|---------------------|
| Production | `https://login.keka.com/connect/token` |
| Sandbox | `https://login.kekademo.com/connect/token` |

**Important**: These are NOT company-specific URLs. They are global Keka OAuth endpoints.

## 4. OAuth Scope (CORRECTED)

The correct OAuth scope for Keka API is:
```
scope=kekaapi
```

Not the complex scope names that were used before.

## 5. Grant Type Consideration

Keka primarily uses `client_credentials` for server-to-server authentication. For user-specific data:

- **Option A**: Use `client_credentials` with API key for server-side access
- **Option B**: If Keka supports it, use `authorization_code` for user-specific OAuth

**Current Implementation**: We're using `authorization_code` for user-specific access. If this doesn't work, we may need to switch to `client_credentials` with API key.

## 6. API Endpoints Verification

### Confirmed Endpoints:
- ✅ `/time/leavebalance` - Leave balances
- ✅ `/time/leaverequests` - Leave requests
- ✅ `/time/attendance` - Attendance records
- ✅ `/time/leavetypes` - Leave types
- ✅ `/hris/employees` - Employee data

### Unconfirmed Endpoints (Need Verification):
- ❓ `/hris/me` - User profile (may not exist)
- ❓ `/payroll/payslips` - Payslips (endpoint structure unclear)
- ❓ `/time/holidayscalendar/{calendarId}/holidays` - Holidays (requires calendar ID)

## 7. Database Migration

Run this to add the required `keka_employee_id` column:

```bash
psql $DATABASE_URL -f backend/migrate_keka_schema.sql
```

## 8. Testing OAuth Flow

### Current Issue:
Users see "The result contains 0 rows" because they haven't completed OAuth authentication.

### Solution:
1. Add OAuth initiation button to frontend
2. Test OAuth flow with correct endpoints
3. Verify token storage with employee ID mapping

## 9. Frontend OAuth Integration Needed

Add this to your React components:

```javascript
// In your HR component
const initiateKekaAuth = async () => {
  try {
    const response = await fetch('/api/keka-auth/authorization-url', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    // Open OAuth popup
    const popup = window.open(data.authorization_url, 'kekaAuth', 'width=500,height=600');
    
    // Listen for OAuth completion
    window.addEventListener('message', (event) => {
      if (event.data.type === 'keka-oauth-result') {
        popup.close();
        if (event.data.status === 'success') {
          // Reload HR data
          loadHRData();
        }
      }
    });
  } catch (error) {
    console.error('Keka auth failed:', error);
  }
};

// Add this button to your UI
<button onClick={initiateKekaAuth}>
  Connect Keka Account
</button>
```

## 10. Testing Priority

1. **✅ Set Environment Variables** - Add all required vars to `.env`
2. **✅ Run Database Migration** - Add `keka_employee_id` column
3. **🔄 Test OAuth Endpoints** - Verify correct OAuth URLs work
4. **⏳ Add Frontend OAuth Button** - Let users initiate authentication
5. **⏳ Test Complete Flow** - End-to-end OAuth and API calls

## 11. Troubleshooting

### If OAuth fails:
1. Check that `KEKA_CLIENT_ID` and `KEKA_CLIENT_SECRET` are correct
2. Verify `KEKA_REDIRECT_URI` matches your callback URL
3. Ensure OAuth endpoints use `login.keka.com` (not company-specific)
4. Check that scope is set to `kekaapi`

### If API calls fail:
1. Verify user has completed OAuth authentication
2. Check that `keka_employee_id` is stored in database
3. Verify API endpoints match official documentation
4. Check rate limiting (50 requests per minute)

### If employee ID mapping fails:
1. Check if `/hris/me` endpoint exists in Keka
2. Try searching employees by email using `/hris/employees?email=user@example.com`
3. Verify employee ID is stored during OAuth flow

## 12. Next Steps

1. **Apply environment variables**
2. **Run database migration**
3. **Test OAuth with correct endpoints**
4. **Add frontend OAuth initiation**
5. **Verify unconfirmed API endpoints**
6. **Test complete user flow**
