# Frontend Testing Guide for HR Self Service

## Overview
This guide helps you test all HR components to ensure they display data correctly after setting up the Keka employee sync schema.

## Prerequisites
- Backend server running on `http://localhost:8000`
- Frontend server running on `http://localhost:3000`
- Sample data inserted in the database

## Test Data
The system has been set up with sample data for testing:
- **Email**: `john.doe@company.com`
- **Name**: John Doe
- **Position**: Software Engineer
- **Leave Balance**: 16 days remaining out of 21 total
- **Attendance**: Present today (8 hours)
- **Holiday**: Christmas Day (Dec 25, 2025)

## Testing Steps

### 1. Login and Authentication
1. Open `http://localhost:3000` in your browser
2. Login with email: `john.doe@company.com`
3. Use any password (authentication is handled by Supabase)
4. Verify you're redirected to the HR Self Service page

### 2. Dashboard Component (HRDashboard.js)
**What to test:**
- Profile summary card shows "John Doe" and "Software Engineer"
- Leave balances show "16 / 21 days" for Annual Leave
- Attendance summary shows current month data
- Upcoming holidays show "Christmas Day"

**Expected behavior:**
- All cards should display data without errors
- Progress bars should show correct percentages
- Statistics should be calculated correctly

### 3. Profile Component (HRProfile.js)
**What to test:**
- Employee avatar with initials "JD"
- Full name: "John Doe"
- Designation: "Software Engineer"
- Employee ID: "EMP001"
- Status: "Active"
- Years at company calculation

**Expected behavior:**
- All personal information should be displayed
- Employment summary cards should show correct calculations
- No loading skeletons should appear

### 4. Leave Management Component (HRLeaveManagement.js)
**What to test:**
- Leave balances table shows Annual Leave
- Remaining days: 16
- Total allocated: 21
- Used days: 5
- Leave history (if any)

**Expected behavior:**
- Leave balances should be displayed in a table format
- Progress indicators should show correct percentages
- No error messages should appear

### 5. Attendance Component (HRAttendance.js)
**What to test:**
- Current month attendance records
- Today's attendance shows "Present"
- Check-in/check-out times
- Total hours worked

**Expected behavior:**
- Attendance records should be displayed in a grid
- Status chips should be color-coded correctly
- Date formatting should be readable

### 6. Payslips Component (HRPayslips.js)
**What to test:**
- Payslip data retrieval
- Month/year selection
- Salary information display

**Expected behavior:**
- Component should load without errors
- If no payslip data, should show appropriate message

### 7. Holidays Component (HRHolidays.js)
**What to test:**
- Company holidays list
- Upcoming holidays sidebar
- Holiday statistics
- Year selection dropdown

**Expected behavior:**
- Christmas Day should appear in the list
- Upcoming holidays sidebar should show the holiday
- Statistics should show 1 national holiday

## Common Issues and Solutions

### Issue: "Employee not found" error
**Solution:** 
- Verify the email in the database matches the logged-in user
- Check that the employee has `account_status = 1`

### Issue: Empty data in components
**Solution:**
- Check browser console for API errors
- Verify backend server is running
- Check network tab for failed requests

### Issue: Authentication errors
**Solution:**
- Verify Supabase configuration
- Check if user is properly authenticated
- Clear browser cache and try again

### Issue: CORS errors
**Solution:**
- Verify backend CORS configuration
- Check that frontend is calling the correct API URL
- Ensure both servers are running

## API Endpoints to Verify

Test these endpoints directly to ensure they're working:

```bash
# Health check
curl http://localhost:8000/api/hr/health

# Profile (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/hr/profile

# Leave balances (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/hr/leave/balances

# Attendance (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/hr/attendance/current-month

# Holidays (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/hr/holidays/upcoming
```

## Database Verification

Check that sample data exists in your database:

```sql
-- Check employees
SELECT email, display_name, job_title FROM keka_employees WHERE email = 'john.doe@company.com';

-- Check leave balances
SELECT * FROM keka_employee_leave_balances WHERE keka_employee_id = 'EMP001';

-- Check attendance
SELECT * FROM keka_employee_attendance WHERE keka_employee_id = 'EMP001';

-- Check holidays
SELECT * FROM keka_company_holidays WHERE name = 'Christmas Day';
```

## Success Criteria

✅ All components load without errors
✅ Data is displayed correctly in each component
✅ No console errors in browser
✅ API calls return expected data
✅ Authentication works properly
✅ Responsive design works on mobile

## Next Steps

Once all components are working:
1. Set up real Keka API credentials
2. Run the actual sync to get real employee data
3. Test with multiple employee accounts
4. Set up automated sync scheduling
5. Deploy to production

## Troubleshooting

If you encounter issues:
1. Check browser console for errors
2. Verify backend logs for API errors
3. Test API endpoints directly
4. Check database for data integrity
5. Verify environment variables are set correctly

