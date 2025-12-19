# Keka API Authentication & Data Flow Documentation

## Overview
This document describes how the HR Self-Service application authenticates users and retrieves data from Keka API using the `keka_employees` table as the source of truth.

## Architecture Diagram

```
┌─────────────────┐
│   User Login    │
│  (Supabase)     │
└────────┬────────┘
         │
         │ JWT Token
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                                │
│                                                                          │
│  1. User logs in with Supabase Auth                                     │
│  2. Receives JWT access_token                                           │
│  3. Stores token in session                                             │
│  4. Attaches token to all API requests: Authorization: Bearer <token>   │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ HTTP Request + JWT Token
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                                │
│                                                                          │
│  Step 1: Verify JWT Token                                              │
│  ├─ Extract JWT from Authorization header                              │
│  ├─ Verify signature with Supabase                                     │
│  └─ Extract user email from token payload                              │
│                                                                          │
│  Step 2: Lookup Employee in keka_employees Table                       │
│  ├─ Query: SELECT * FROM keka_employees                                │
│  │         WHERE email = <user_email>                                  │
│  │         AND account_status = 1                                      │
│  └─ Extract: keka_employee_id                                          │
│                                                                          │
│  Step 3: Generate Keka API Token                                       │
│  ├─ Use stored KEKA_CLIENT_ID & KEKA_CLIENT_SECRET                    │
│  ├─ Call: POST https://login.keka.com/connect/token                   │
│  └─ Receive: access_token for Keka API                                │
│                                                                          │
│  Step 4: Call Keka API with Employee ID                               │
│  ├─ Use keka_employee_id from Step 2                                  │
│  ├─ Call appropriate Keka endpoint with employee_id                   │
│  └─ Return formatted data to frontend                                 │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ API Response (JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                                │
│                                                                          │
│  1. Receives data with employee_id                                      │
│  2. Displays in UI components                                           │
│  3. Shows employee_id in profile header                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Flow

### 1. Frontend Authentication (HRSelfService.js)

**File:** `frontend/src/pages/HRSelfService.js`

```javascript
// Step 1: Fetch employee ID mapping
const employeeIdResult = await hrService.getMyEmployeeId();
const mapping = employeeIdResult.data;

// Step 2: Use employee_id for all subsequent requests
setEmployeeId(mapping.employee_id);
setEmployeeMapping(mapping);

// Step 3: Load dashboard data
const profileResult = await hrService.getMyProfile();
const leaveBalancesResult = await hrService.getMyLeaveBalances();
```

**Key Points:**
- First call resolves `keka_employee_id` from `keka_employees` table
- All subsequent API calls use this employee_id internally
- Employee ID is displayed in the UI for transparency

### 2. Frontend Service (hrService.js)

**File:** `frontend/src/services/hrService.js`

```javascript
// Request interceptor adds Supabase JWT to all requests
hrApiClient.interceptors.request.use(async (config) => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  return config;
});

// New endpoint to get employee ID mapping
async getMyEmployeeId() {
  const response = await hrApiClient.get('/employee-id');
  return { success: true, data: response.data };
}
```

**Key Points:**
- Axios interceptor automatically adds JWT to every request
- No need to manually handle auth in each API call
- Dedicated endpoint for employee ID resolution

### 3. Backend Authentication (hr.py)

**File:** `backend/app/routers/hr.py`

```python
def get_user_email(current_user: dict = Depends(get_current_supabase_user)) -> str:
    """Extract and validate user email from authentication"""
    email = current_user.get('email')
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User email not found in authentication token"
        )
    return email

@router.get("/employee-id")
async def get_my_employee_id(user_email: str = Depends(get_user_email)):
    """Get the authenticated user's keka_employee_id mapping"""
    hr_data_service.set_authenticated_user(user_email)
    employee_data = await hr_data_service._get_employee_by_email(user_email)
    return {
        "success": True,
        "employee_id": employee_data["keka_employee_id"],
        "email": employee_data["email"],
        "display_name": employee_data.get("display_name", ""),
        "employee_number": employee_data.get("employee_number", "")
    }
```

**Key Points:**
- `get_current_supabase_user` dependency verifies JWT token
- Extracts email from verified token
- Returns employee mapping from `keka_employees` table

### 4. Backend HR Data Service (hr_data_service.py)

**File:** `backend/app/services/hr_data_service.py`

```python
async def _get_employee_by_email(self, email: str) -> Dict[str, Any]:
    """Get employee data by email from keka_employees table"""
    response = supabase_admin_client.table("keka_employees")\
        .select("*")\
        .eq("email", email)\
        .eq("account_status", 1)\
        .execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee not found with email: {email}"
        )
    
    return response.data[0]

async def get_my_profile(self) -> EmployeeProfile:
    """Get the authenticated user's profile"""
    employee_data = await self._get_employee_by_email(self.authenticated_user_email)
    
    return EmployeeProfile(
        employee_id=employee_data["keka_employee_id"],
        email=employee_data["email"],
        full_name=employee_data["display_name"],
        designation=employee_data["job_title"],
        # ... other fields
    )

async def get_my_leave_balances(self, leave_type: Optional[str] = None) -> List[LeaveBalance]:
    """Get leave balances using keka_employee_id"""
    employee_data = await self._get_employee_by_email(self.authenticated_user_email)
    employee_id = employee_data["keka_employee_id"]
    
    # Fetch from Keka API using employee_id
    keka_leave_data = await self._fetch_keka_leave_balance(employee_id)
    # ... process and return
```

**Key Points:**
- Single source of truth: `keka_employees` table
- Employee lookup by email happens for every request
- Uses `keka_employee_id` for Keka API calls
- Token management handled by `keka_token_service`

### 5. Keka Token Service (keka_token_service.py)

**File:** `backend/app/services/keka_token_service.py`

```python
async def ensure_valid_tokens(self, user_email: str) -> Optional[UserKekaTokens]:
    """Ensure user has valid Keka tokens"""
    tokens = await self.get_user_tokens(user_email)
    
    if not tokens or self._is_token_expired(tokens.expires_at):
        # Refresh or generate new token
        tokens = await self.refresh_user_tokens(user_email)
    
    return tokens
```

**Key Points:**
- Manages Keka API tokens per user
- Automatically refreshes expired tokens
- Uses stored KEKA_CLIENT_ID and KEKA_CLIENT_SECRET

### 6. Keka API Service (keka_api_service.py)

**File:** `backend/app/services/keka_api_service.py`

```python
class KekaAPIService:
    async def generate_access_token(self) -> Optional[str]:
        """Generate Keka API access token using client credentials"""
        data = {
            "grant_type": "kekaapi",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        response = await httpx.post(self.token_endpoint, data=data)
        token_data = response.json()
        return token_data.get("access_token")
```

**Key Points:**
- Uses client credentials grant type
- Generates tokens on-demand
- Tokens used for Keka API calls

## Database Schema

### keka_employees Table

```sql
CREATE TABLE IF NOT EXISTS keka_employees (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) UNIQUE NOT NULL,  -- Key field
    employee_number VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,             -- Lookup field
    display_name VARCHAR(255),
    job_title VARCHAR(255),
    account_status INTEGER,                         -- 1 = Active
    -- ... many other fields
    last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_keka_employees_email ON keka_employees(email);
CREATE INDEX idx_keka_employees_account_status ON keka_employees(account_status);
```

**Key Points:**
- `email` is the lookup key (from JWT token)
- `keka_employee_id` is the unique identifier for Keka API
- `account_status = 1` means active employee
- Data synced from Keka API periodically

## API Endpoints

### GET /api/hr/employee-id
**Purpose:** Get employee ID mapping from keka_employees table

**Request:**
```http
GET /api/hr/employee-id
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "employee_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@company.com",
  "display_name": "John Doe",
  "employee_number": "EMP001"
}
```

### GET /api/hr/profile
**Purpose:** Get employee profile

**Request:**
```http
GET /api/hr/profile
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
{
  "employee_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@company.com",
  "full_name": "John Doe",
  "designation": "Software Engineer",
  "department": "Engineering",
  "join_date": "2023-01-15"
}
```

### GET /api/hr/leave/balances
**Purpose:** Get leave balances from Keka API

**Request:**
```http
GET /api/hr/leave/balances
Authorization: Bearer <supabase_jwt_token>
```

**Response:**
```json
[
  {
    "leave_type": "Casual Leave",
    "total_allocated": 12.0,
    "used": 3.0,
    "remaining": 9.0,
    "carry_forward": 0.0
  },
  {
    "leave_type": "Sick Leave",
    "total_allocated": 6.0,
    "used": 1.0,
    "remaining": 5.0,
    "carry_forward": 0.0
  }
]
```

## Environment Variables

### Backend Required Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Keka API Configuration
KEKA_CLIENT_ID=your-keka-client-id
KEKA_CLIENT_SECRET=your-keka-client-secret
KEKA_COMPANY_NAME=your-company
KEKA_ENVIRONMENT=keka  # or kekademo for sandbox
```

### Frontend Required Variables

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000  # or production URL

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## Security Considerations

1. **JWT Token Validation**
   - All backend endpoints verify Supabase JWT tokens
   - Expired tokens are rejected with 401 Unauthorized

2. **Employee Data Access**
   - Users can only access their own data
   - Email from JWT must match email in keka_employees

3. **Keka API Token Management**
   - Tokens generated server-side with stored credentials
   - Frontend never sees Keka API credentials
   - Tokens automatically refreshed when expired

4. **Database Access**
   - Backend uses service role for keka_employees queries
   - Row Level Security (RLS) on sensitive tables

## Testing the Flow

### Manual Testing Steps

1. **Verify Employee Exists in Database**
   ```sql
   SELECT keka_employee_id, email, display_name, account_status
   FROM keka_employees
   WHERE email = 'your-email@company.com';
   ```

2. **Test Backend Endpoint (with auth token)**
   ```bash
   curl -H "Authorization: Bearer <your-jwt-token>" \
        http://localhost:8000/api/hr/employee-id
   ```

3. **Test Frontend Flow**
   - Open browser console
   - Look for logs: "Step 1: Fetching employee ID mapping..."
   - Verify employee_id is displayed in UI

### Automated Testing

Run the test script:
```bash
python3 test_hr_flow_simple.py
```

Expected output:
- ✓ Keka Token: PASSED
- ✓ Employee Lookup: PASSED
- ✓ HR Data Service: PASSED

## Troubleshooting

### Employee Not Found
**Error:** "Employee not found with email: xxx"

**Solution:**
1. Check if employee exists in keka_employees table
2. Verify email matches exactly (case-sensitive)
3. Check account_status = 1 (active)
4. Run employee sync if needed

### Keka Token Generation Failed
**Error:** "Failed to generate Keka token"

**Solution:**
1. Verify KEKA_CLIENT_ID and KEKA_CLIENT_SECRET are set
2. Check Keka API credentials are valid
3. Ensure network access to login.keka.com

### 401 Unauthorized
**Error:** "User not authenticated"

**Solution:**
1. Check Supabase JWT token is valid
2. Verify token is included in Authorization header
3. Check token hasn't expired (re-login if needed)

## Maintenance

### Employee Data Sync

The `keka_employees` table should be synced periodically:

```bash
python backend/sync_employees.py
```

Recommended frequency: Daily (automated via cron/scheduler)

### Monitoring

Key metrics to monitor:
- Employee lookup success rate
- Keka API token generation success rate
- API response times
- Token expiration and refresh rates

## Related Files

- Frontend:
  - `frontend/src/pages/HRSelfService.js`
  - `frontend/src/services/hrService.js`
  
- Backend:
  - `backend/app/routers/hr.py`
  - `backend/app/services/hr_data_service.py`
  - `backend/app/services/keka_token_service.py`
  - `backend/app/services/keka_api_service.py`
  - `backend/app/utils/auth_utils.py`

- Database:
  - `backend/keka_employee_sync_schema.sql`

## Summary

The HR Self-Service application uses a three-tier authentication and data flow:

1. **User Authentication:** Supabase JWT tokens
2. **Employee Resolution:** keka_employees table lookup by email
3. **Data Retrieval:** Keka API calls using keka_employee_id

This architecture ensures:
- ✓ Secure authentication
- ✓ Accurate employee mapping
- ✓ Real-time data from Keka API
- ✓ Transparent employee ID display
- ✓ Easy debugging and troubleshooting

