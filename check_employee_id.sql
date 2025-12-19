-- Check if the user has a keka_employee_id set
-- Run this in Supabase SQL Editor

-- Check current user's keka_employee_id
SELECT 
    email,
    keka_employee_id,
    created_at,
    role
FROM users 
WHERE email = 'sunhith.reddy@othainsoft.com';

-- If keka_employee_id is NULL, you need to set it
-- To set it (replace 'YOUR_KEKA_EMPLOYEE_ID' with the actual ID from Keka):
-- UPDATE users SET keka_employee_id = 'YOUR_KEKA_EMPLOYEE_ID' WHERE email = 'sunhith.reddy@othainsoft.com';

-- Check all users to see if anyone has keka_employee_id set
SELECT 
    email,
    keka_employee_id,
    role
FROM users 
ORDER BY created_at DESC;

