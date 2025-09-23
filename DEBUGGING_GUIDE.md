# Debugging Guide for Ticket Creation and Assignment Issues

## Step 1: Run the Debug SQL Script

1. Go to https://supabase.com/dashboard/project/sethhceiojxrevvpzupf
2. Navigate to SQL Editor
3. Run the contents of `debug_ticket_issues.sql`
4. Share the results with me

## Step 2: Test Specific Scenarios

### Test 1: Check Authentication
Run this in SQL Editor while logged in as a user:
```sql
SELECT 
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'role' as role;
```

### Test 2: Test get_user_role Function
```sql
SELECT get_user_role() as user_role;
```

### Test 3: Test Simple Ticket Insert
```sql
INSERT INTO public.tickets (
    title,
    description,
    category_id,
    priority,
    status,
    requested_by
) VALUES (
    'Test Ticket',
    'Test Description',
    (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests' LIMIT 1),
    'MEDIUM',
    'OPEN',
    auth.uid()
) RETURNING *;
```

## Step 3: Check Frontend Errors

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try to create a ticket
4. Look for any JavaScript errors
5. Go to Network tab and check for failed API calls

## Step 4: Check Backend Logs

If you have access to backend logs, look for:
- Authentication errors
- Database connection errors
- RLS policy violations
- SQL syntax errors

## Common Issues and Solutions

### Issue 1: "permission denied for table public.users"
**Solution**: The RLS policies should be using JWT claims instead of querying auth.users directly.

### Issue 2: "function get_user_role() does not exist"
**Solution**: Need to create the get_user_role() function.

### Issue 3: "column priority does not exist"
**Solution**: Need to run the schema fix to add missing columns.

### Issue 4: "permission denied for table tickets"
**Solution**: RLS policies might be too restrictive or missing.

## Step 5: Create Missing Functions

If the debug script shows missing functions, run this:

```sql
-- Create get_user_role function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'role'),
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
        'user'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_category_id_by_name function
CREATE OR REPLACE FUNCTION get_category_id_by_name(category_name TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.ticket_categories WHERE name = category_name LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_in_additional_emails function
CREATE OR REPLACE FUNCTION user_in_additional_emails(ticket_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.ticket_additional_emails 
        WHERE ticket_id = user_in_additional_emails.ticket_id 
        AND user_id = user_in_additional_emails.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 6: Test with Different User Roles

1. Test as admin user
2. Test as regular user
3. Test as different role types (hr_admin, it_admin, etc.)

## Step 7: Check Database Connection

Make sure the frontend is connecting to the correct Supabase project:
- Check SUPABASE_URL in frontend environment
- Check SUPABASE_ANON_KEY in frontend environment
- Verify the project is not paused

## Step 8: Verify RLS Policies

The policies should allow:
- Users to create their own tickets
- Users to view tickets they created or are assigned to
- Admins to create tickets for any user
- Role-based access to relevant ticket categories

## What to Share

Please share:
1. Results from the debug SQL script
2. Any error messages from the frontend console
3. Any error messages from the backend logs
4. The specific steps that are failing (creation, assignment, viewing, etc.)

This will help me identify the exact issue and provide a targeted solution.
