-- Fix ticket assignment issues
-- Run this in Supabase SQL Editor

-- 1. First, let's check if v_user_emails view exists and has correct data
SELECT 'Checking v_user_emails view...' as status;

-- Check if the view exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'v_user_emails';

-- Check if the view has data
SELECT COUNT(*) as user_count FROM public.v_user_emails;

-- Check if admin emails exist in the view
SELECT email FROM public.v_user_emails 
WHERE email IN ('it@othainsoft.com', 'hr@othainsoft.com', 'accounts@othainsoft.com', 'operations@othainsoft.com', 'ai@othainsoft.com')
ORDER BY email;

-- 2. Create or recreate v_user_emails view with proper permissions
CREATE OR REPLACE VIEW public.v_user_emails AS
SELECT 
    id, 
    email
FROM auth.users
WHERE email IS NOT NULL;

-- Grant permissions on the view
ALTER VIEW public.v_user_emails OWNER TO postgres;
GRANT SELECT ON public.v_user_emails TO authenticated;
GRANT SELECT ON public.v_user_emails TO anon;

-- 3. Create a function to get user ID by email (more reliable than view)
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id 
        FROM auth.users 
        WHERE email = user_email 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;

-- 4. Test the function
SELECT 'Testing assignment functions...' as status;
SELECT get_user_id_by_email('it@othainsoft.com') as it_user_id;
SELECT get_user_id_by_email('hr@othainsoft.com') as hr_user_id;
SELECT get_user_id_by_email('accounts@othainsoft.com') as accounts_user_id;

-- 5. Check if there are any existing tickets without assignees
SELECT 
    'Existing tickets without assignees:' as status,
    COUNT(*) as unassigned_count
FROM public.tickets 
WHERE assignee IS NULL;

-- 6. Update existing unassigned tickets with proper assignees based on category
UPDATE public.tickets 
SET assignee = CASE 
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests' LIMIT 1) 
        THEN get_user_id_by_email('it@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'HR Requests' LIMIT 1) 
        THEN get_user_id_by_email('hr@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Expense Management' LIMIT 1) 
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Payroll Requests' LIMIT 1) 
        THEN get_user_id_by_email('accounts@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Operations' LIMIT 1) 
        THEN get_user_id_by_email('it@othainsoft.com')
    WHEN category_id = (SELECT id FROM public.ticket_categories WHERE name = 'AI Requests' LIMIT 1) 
        THEN get_user_id_by_email('sunhith.reddy@othainsoft.com')
    ELSE assignee
END
WHERE assignee IS NULL;

-- 7. Verify the update worked
SELECT 
    'Updated tickets:' as status,
    COUNT(*) as updated_count
FROM public.tickets 
WHERE assignee IS NOT NULL;

-- 8. Show final status
SELECT 'Ticket assignment fix completed!' as status;
