# Sync and Database Approach

## Overview
Instead of making live API calls to Keka every time, we now:
1. **Sync data from Keka → Database** (once or periodically)
2. **Read from Database** (fast and offline-capable)

## Benefits
- ✅ **Faster Load Times**: No waiting for Keka API
- ✅ **Offline Capability**: Works even if Keka is down
- ✅ **Cost Effective**: Fewer API calls = lower costs
- ✅ **Consistent Data**: Everyone sees the same data
- ✅ **Better Control**: You control when data updates

## How It Works

### 1. Sync Script (`sync_keka_to_db.py`)
Run this script to pull data from Keka and store it in your database:

```bash
# Sync a specific employee
cd backend
python sync_keka_to_db.py --email sunhith.reddy@othainsoft.com

# Sync all employees
python sync_keka_to_db.py --all
```

**What it syncs:**
- ✅ Employee profile data
- ✅ Leave balances
- ✅ Attendance records (last 30 days)
- ✅ Company holidays

### 2. Database Tables Used
- `keka_employees` - Employee profiles
- `keka_employee_leave_balances` - Leave balances
- `keka_employee_attendance` - Attendance records
- `keka_company_holidays` - Company holidays
- `keka_sync_status` - Track sync timestamps

### 3. Automatic Sync (Optional)
Set up a cron job or scheduled task to sync automatically:

```bash
# Every day at 6 AM
0 6 * * * cd /path/to/backend && python sync_keka_to_db.py --all
```

## Usage

### Step 1: Run Initial Sync
```bash
cd /Users/sunhithreddy/Documents/Code/HR-Self-Service/backend
python sync_keka_to_db.py --email sunhith.reddy@othainsoft.com
```

### Step 2: Backend Reads from Database
The backend has been updated to:
1. Check database cache first
2. Only call Keka API if data is missing or stale
3. Cache TTL: 24 hours (configurable)

### Step 3: Frontend Displays Data
The frontend (HRSelfService.js) will automatically show data from the database.

## Sync Schedule Recommendations

| Data Type | Recommended Sync Frequency |
|-----------|---------------------------|
| Employee Profile | Daily (6 AM) |
| Leave Balances | Every 6 hours |
| Attendance | Every 4 hours |
| Holidays | Weekly |

## Manual Sync

To manually trigger a sync for a user:
1. Go to backend directory
2. Run: `python sync_keka_to_db.py --email <user-email>`
3. Data will be available immediately in the app

## Troubleshooting

### Issue: "Employee not found"
**Solution**: Ensure the email in your `users` table matches the email in Keka

### Issue: "Keka API error"
**Solution**: Check your `.env` file has correct Keka credentials:
- `KEKA_API_KEY`
- `KEKA_CLIENT_ID`
- `KEKA_CLIENT_SECRET`
- `KEKA_COMPANY_NAME`

### Issue: "Database connection error"
**Solution**: Check your Supabase credentials in `.env`:
- `SUPABASE_URL`
- `SUPABASE_KEY`

## Next Steps

1. **Fix the validation error first** (see below)
2. **Run the sync script** for your email
3. **Refresh the frontend** - data should now display!

## Current Issue to Fix

The `employee_status` field is returning an integer but expects a string. This has been fixed in the code by mapping:
- `0` → `"inactive"`
- `1` → `"active"`  
- `2` → `"suspended"`
- `3` → `"terminated"`

Let's deploy this fix first, then run the sync!

