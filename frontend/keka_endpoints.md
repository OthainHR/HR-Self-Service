# Complete Keka API Endpoints Reference

**Base URL Structure**: `https://{company}.{environment}.com/api/v1/`

Examples:
- Production: `https://yourcompany.keka.com/api/v1/`
- Sandbox: `https://yourcompany.kekademo.com/api/v1/`

## Authentication Endpoints

### OAuth Token Management
- **Generate Access Token**: `POST /oauth/token`
- **Refresh Token**: `POST /oauth/token` (with refresh_token grant)
- **Identity URLs**:
  - Production: `https://login.keka.com/connect/token`
  - Sandbox: `https://login.kekademo.com/connect/token`

## HRIS Endpoints (Human Resources Information System)

### Employee Management
- **Get All Employees**: `GET /hris/employees`
  - Gets all employees or filtered employees based on search parameters
- **Get Single Employee**: `GET /hris/employees/{id}`
  - Get an employee with specified identifier
- **Create Employee**: `POST /hris/employees`
  - Create an Employee and returns created employee identifier
- **Update Employee Personal Details**: `PUT /hris/employees/{id}/personaldetails`
  - Update Employee personal details
- **Deactivate Employee**: `POST /hris/employees/{id}/exitrequest`
  - Deactivate an employee (exit request)

### Employee Skills Management
- **Add Employee Skills**: `POST /hris/employees/{employeeId}/skills`
  - Add skills to an employee

### Employee Documents Management
- **Upload Employee Documents**: `POST /hris/employees/{employeeId}/documenttypes/{typeId}`
  - Upload documents for an employee
- **Get Employee Documents**: `GET /hris/employees/{employeeId}/documenttypes/{documentTypeId}/documents`
  - Retrieve employee documents

### Employee Fields
- **Get All Update Fields**: `GET /hris/employees/updatefields`
  - Get all available employee update fields

## Time & Attendance Endpoints

### Attendance Management
- **Get All Attendance Records**: `GET /time/attendance`
  - Gets all attendance records between date range from and to
  - If both from and to are not specified, last 30 days records are returned
  - From date should be before to date
  - The difference between from and to date cannot be more than 90 days

### Leave Management
- **Get All Leave Requests**: `GET /time/leaverequests`
  - Get all the leaves in the organization between from and to date
  - If both from and to are not specified, last 30 days records are returned
  - From date should be before to date
  - The difference between from and to date cannot be more than 90 days
- **Create Leave Request**: `POST /time/leaverequests`
  - Create a leave request and returns leave request identifier
- **Get All Leave Balances**: `GET /time/leavebalance`
  - Get all the leave balances for employees
- **Get All Leave Types**: `GET /time/leavetypes`
  - Get all available leave types
- **Get All Leave Plans**: `GET /time/leaveplans`
  - Get all leave plans

### Holiday Management
- **Get Holidays**: `GET /time/holidayscalendar/{calendarId}/holidays`
  - Get holidays for a specific calendar
  - Note: Requires calendar ID

## Recruitment/Hiring Endpoints

### Candidate Management
- **Upload Candidate Resume**: `POST /v1/hire/jobs/candidate/{candidateId}/resume`
  - Upload the candidate resume
- **Get Candidate Scorecards**: `GET /v1/hire/jobs/{jobId}/candidate/{candidateId}/scorecards`
  - Get the scorecards which are submitted for a specified job candidate

## API Configuration & Scopes

### Available Scopes
The following scopes can be configured for API access:
- **Employee And Org Information**: Access to employee and organization data
- **Leave**: Access to leave-related data and operations
- **Attendance**: Access to attendance data
- **Payroll**: Access to payroll information
- **Timesheet**: Access to timesheet data
- **Performance**: Access to performance management data

### Rate Limiting
- **Rate Limit**: 50 API requests per minute
- Rate limits are enforced and automatically reset after 60 seconds
- If exceeded, returns 429 error with reason "rateLimitExceeded"

### Pagination
- **Default Page Size**: 100 records
- **Default Page Number**: 1

## Webhooks

### Event Types
Keka supports webhooks for various events including:
- **exitCancelled**: Occurs when employee exit has been cancelled post exit approval and during the exit process
- Additional webhook events are available through the Keka platform

### Webhook Configuration
- Configure webhooks through: Settings > Communications > Event Triggers
- Webhook URL must be publicly accessible
- Keka will POST JSON object representation of events to your webhook URL

## Data Models & Enums

### Attendance Day Types
```
AttendanceDayType:
0 = WorkingDay
1 = Holiday
2 = FullDayWeeklyOff
3 = FirstHalfWeeklyOff
4 = SecondHalfWeeklyOff
```

## Important Notes

1. **Company-Specific URLs**: All endpoints require your company subdomain
2. **Environment Support**: Production uses `keka.com`, Sandbox uses `kekademo.com`
3. **OAuth2 Authentication**: All API calls require Bearer token authentication
4. **Date Range Limitations**: Most time-based endpoints have a 90-day maximum range
5. **API Key Configuration**: Access API keys through Global admin settings → Integrations & Automation → API access → API key

## Missing Endpoint Categories

Based on the search results, these endpoint categories may exist but weren't fully documented in the public search results:
- **Payroll endpoints**: While payroll scope exists, specific endpoints weren't found
- **Performance management endpoints**: Scope exists but endpoints not detailed
- **Organization settings endpoints**: Not explicitly documented
- **Timesheet endpoints**: Scope exists but endpoints not detailed

For complete documentation including request/response formats and examples, refer to:
- Official documentation: https://developers.keka.com/
- Postman collection: https://apidocs.keka.com/

## Authentication Setup

To use these endpoints:
1. Set up OAuth2 with your company's Keka instance
2. Configure proper scopes based on your needs
3. Generate client credentials through Keka admin panel
4. Use company-specific base URL with your subdomain
5. Include Bearer token in all API requests

All endpoints follow REST conventions and return JSON responses.