# Keka Employee Data Sync System

This system replaces individual Keka OAuth authentication with a centralized approach that syncs all employee data from Keka API and stores it in Supabase for direct access.

## Overview

Instead of each user logging into Keka individually, the system:
1. Fetches all employee data from Keka API using admin credentials
2. Stores the data in Supabase database tables
3. Maps authenticated users to their Keka employee data by email
4. Provides HR data through a simplified API without OAuth

## Database Schema

The system creates several tables in Supabase:

### Core Tables
- `keka_employees` - All employee information from Keka
- `keka_employee_leave_balances` - Employee leave balances
- `keka_employee_attendance` - Attendance records
- `keka_employee_payslips` - Payslip data
- `keka_employee_leave_history` - Leave request history
- `keka_holiday_calendars` - Holiday calendar information
- `keka_company_holidays` - Company holidays
- `keka_sync_status` - Sync operation status tracking

## Setup Instructions

### 1. Database Setup

Run the database schema:
```bash
psql -h your-supabase-host -U postgres -d postgres -f keka_employee_sync_schema.sql
```

### 2. Environment Variables

Set the following environment variables:

```bash
# Keka API Configuration
KEKA_CLIENT_ID=your_keka_client_id
KEKA_CLIENT_SECRET=your_keka_client_secret
KEKA_COMPANY_NAME=othainsoft  # Your Keka company name
KEKA_ENVIRONMENT=keka  # or kekademo for sandbox

# Optional
KEKA_CALENDAR_ID=your_calendar_id  # If you have a specific holiday calendar
```

### 3. Initial Sync

Run the initial sync to populate the database:

```bash
cd backend
python run_initial_sync.py
```

### 4. Scheduled Sync

The system supports different sync frequencies:

- **Daily**: Employees, leave balances, attendance
- **Weekly**: Holiday calendars
- **Monthly**: Holidays, payslips

## API Endpoints

### HR Data Endpoints (No OAuth Required)
- `GET /api/hr/profile` - Get employee profile
- `GET /api/hr/leave/balances` - Get leave balances
- `GET /api/hr/leave/history` - Get leave history
- `GET /api/hr/attendance` - Get attendance records
- `GET /api/hr/payslip` - Get payslip data
- `GET /api/hr/holidays` - Get company holidays

### Sync Management Endpoints
- `POST /api/sync/daily` - Trigger daily sync
- `POST /api/sync/weekly` - Trigger weekly sync
- `POST /api/sync/monthly` - Trigger monthly sync
- `POST /api/sync/full` - Trigger full sync
- `POST /api/sync/employees` - Sync employees only
- `POST /api/sync/leave-balances` - Sync leave balances only
- `POST /api/sync/attendance` - Sync attendance only
- `POST /api/sync/leave-history` - Sync leave history only
- `POST /api/sync/holidays` - Sync holidays only
- `POST /api/sync/holiday-calendars` - Sync holiday calendars only
- `GET /api/sync/status` - Get sync status

## How It Works

### 1. Employee Mapping
The system maps authenticated users to Keka employees by email:
- User logs in with Supabase Auth
- System extracts user email from JWT token
- Looks up employee data in `keka_employees` table by email
- Returns HR data for that employee

### 2. Data Sync Process
1. **Authentication**: Uses client credentials to get Keka API access token
2. **Data Fetching**: Calls Keka API global endpoints to get all employee data at once
3. **Data Processing**: Transforms and validates the data, extracting employee IDs
4. **Database Storage**: Stores data in appropriate Supabase tables with employee mapping
5. **Status Tracking**: Records sync status and any errors

**Global Endpoints Used:**
- `GET /api/v1/time/leavebalance` - All employee leave balances
- `GET /api/v1/time/attendance` - All employee attendance records
- `GET /api/v1/time/leaverequests` - All employee leave requests
- `GET /api/v1/hris/employees` - All employee information

### 3. Error Handling
- Failed syncs are logged with error details
- Partial syncs are supported (some employees may fail)
- Retry mechanisms for transient failures
- Status tracking for monitoring

## Frontend Changes

The frontend no longer needs:
- Keka OAuth flow
- Individual user authentication with Keka
- Token management for Keka API

Instead, it simply:
1. Authenticates with Supabase
2. Calls HR API endpoints directly
3. Receives employee data immediately

## Monitoring

### Sync Status
Check sync status via API:
```bash
curl -X GET "https://your-api.com/api/sync/status"
```

### Database Views
Useful database views for monitoring:
- `keka_employee_summary` - Employee overview
- `keka_leave_balance_summary` - Leave balance overview

## Troubleshooting

### Common Issues

1. **Sync Fails**
   - Check Keka API credentials
   - Verify network connectivity
   - Check database permissions

2. **Missing Employee Data**
   - Ensure employee email matches in both systems
   - Check if employee is active in Keka
   - Verify sync completed successfully

3. **Outdated Data**
   - Check last sync timestamp
   - Trigger manual sync if needed
   - Verify scheduled sync is running

### Logs
Check application logs for detailed error information:
```bash
# Check sync service logs
grep "keka_sync" /var/log/your-app.log

# Check specific sync type
grep "employees sync" /var/log/your-app.log
```

## Security Considerations

1. **API Credentials**: Store Keka credentials securely
2. **Database Access**: Use proper database permissions
3. **Rate Limiting**: Respect Keka API rate limits
4. **Data Privacy**: Ensure employee data is handled securely

## Performance

- **Caching**: Employee data is cached in database
- **Incremental Sync**: Only sync changed data when possible
- **Background Processing**: Sync operations run in background
- **Rate Limiting**: Built-in rate limiting for API calls

## Migration from OAuth System

1. **Deploy New System**: Deploy the new sync-based system
2. **Run Initial Sync**: Populate database with employee data
3. **Update Frontend**: Remove OAuth flow, use direct API calls
4. **Test Thoroughly**: Verify all HR data is accessible
5. **Monitor**: Watch sync status and data freshness
6. **Cleanup**: Remove old OAuth-related code and tables

## Support

For issues or questions:
1. Check sync status and logs
2. Verify environment configuration
3. Test API endpoints manually
4. Contact development team with specific error details
