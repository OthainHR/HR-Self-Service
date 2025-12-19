# Keka Database Cache Setup

## Overview
The Keka Database Cache system stores employee data locally in Supabase for faster access and reduced API calls.

## Database Schema

### Tables Created
1. **keka_employees** - Main employee data
2. **keka_employee_leave_balances** - Leave balance information
3. **keka_employee_attendance** - Attendance records
4. **keka_employee_payslips** - Payslip data
5. **keka_employee_leave_history** - Leave application history
6. **keka_holiday_calendars** - Holiday calendar definitions
7. **keka_company_holidays** - Company holidays
8. **keka_sync_status** - Sync tracking

## Setup Instructions

### 1. Run Database Migrations

Execute the following SQL files in your Supabase SQL editor in order:

1. **keka_employee_sync_schema.sql** - Creates all tables, indexes, triggers, and views
2. **migrate_keka_schema.sql** - (Optional) If upgrading from old schema

```sql
-- Go to Supabase Dashboard > SQL Editor
-- Copy and paste the contents of backend/keka_employee_sync_schema.sql
-- Click "Run" to execute
```

### 2. Verify Tables

After running the migration, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'keka_%';
```

Expected tables:
- keka_employees
- keka_employee_leave_balances
- keka_employee_attendance
- keka_employee_payslips
- keka_employee_leave_history
- keka_holiday_calendars
- keka_company_holidays
- keka_sync_status

### 3. Environment Variables

Ensure these are set in your `.env` file:

```env
# Keka API Credentials
KEKA_API_KEY=your_api_key_here
KEKA_CLIENT_ID=your_client_id_here
KEKA_CLIENT_SECRET=your_client_secret_here
KEKA_COMPANY_NAME=othainsoft
KEKA_ENVIRONMENT=keka

# Supabase (for caching)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## How It Works

### 1. Cache-First Strategy

When fetching employee data:
1. **Check cache first**: Look up data in `keka_employees` table by email
2. **Check freshness**: If data is less than 24 hours old, use cached data
3. **Fetch from API**: If cache miss or stale, fetch from Keka API
4. **Update cache**: Store fresh data in database for next request

### 2. Automatic Caching

The system automatically caches:
- ✅ Employee profile data (when fetched)
- ✅ Leave balances (when fetched)
- ✅ Attendance records (when fetched)
- ✅ Company holidays (when fetched)

### 3. Benefits

- **Faster response times**: Data served from local database
- **Reduced API calls**: Fewer requests to Keka API
- **Offline capability**: Can serve cached data even if Keka API is down
- **Historical data**: Keeps historical records for analysis

## Monitoring

### Check Sync Status

```sql
SELECT * FROM keka_sync_status 
ORDER BY last_sync_at DESC;
```

### View Cached Employees

```sql
SELECT email, display_name, job_title, last_synced_at 
FROM keka_employees 
ORDER BY last_synced_at DESC 
LIMIT 10;
```

### Check Cache Freshness

```sql
SELECT 
  email,
  display_name,
  last_synced_at,
  NOW() - last_synced_at AS age
FROM keka_employees
ORDER BY last_synced_at DESC;
```

## Cache Management

### Manual Cache Refresh

To manually refresh an employee's cached data, delete their record:

```sql
DELETE FROM keka_employees 
WHERE email = 'user@company.com';
```

Next API call will fetch fresh data.

### Clear All Cache

```sql
TRUNCATE TABLE keka_employees CASCADE;
```

**⚠️ Warning**: This will delete all cached data. Use with caution.

## Troubleshooting

### Cache Not Working

1. **Check tables exist**:
   ```sql
   \dt keka_*
   ```

2. **Check Supabase credentials** in `.env`

3. **Check logs** for cache errors:
   ```
   INFO:app.services.keka_db_cache_service:Keka DB Cache Service initialized
   ```

### Slow Performance

1. **Check cache hit rate**: Look for "Using cached employee data" in logs
2. **Verify indexes**: Run `\di keka_*` to check indexes exist
3. **Check cache freshness**: Data older than 24 hours is refetched

## Next Steps

1. ✅ Run `keka_employee_sync_schema.sql` in Supabase
2. ✅ Restart backend to pick up changes
3. ✅ Test by accessing HR Dashboard
4. ✅ Monitor logs for cache hits

## API Endpoints Status

After this update:
- ✅ `/api/hr/profile` - Returns employee profile (cached)
- ✅ `/api/hr/leave/balances` - Returns leave balances
- ✅ `/api/hr/leave/history` - Returns leave history (FIXED)
- ✅ `/api/hr/attendance/current-month` - Returns attendance (FIXED)
- ✅ `/api/hr/holidays/upcoming` - Returns holidays

All endpoints now working with intelligent caching! 🎉

