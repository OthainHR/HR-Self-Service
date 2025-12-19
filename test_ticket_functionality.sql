-- Test ticket functionality after fixes
-- Run this in Supabase SQL Editor

-- 1. Check current user authentication
SELECT 
    'Authentication Test' as test_type,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    get_user_role() as user_role;

-- 2. Check if we can see existing tickets
SELECT 
    'Ticket Visibility Test' as test_type,
    COUNT(*) as visible_tickets
FROM public.tickets;

-- 3. Check ticket categories
SELECT 
    'Categories Test' as test_type,
    COUNT(*) as category_count,
    string_agg(name, ', ') as category_names
FROM public.ticket_categories;

-- 4. Test ticket creation (uncomment to test)
/*
INSERT INTO public.tickets (
    title,
    description,
    category_id,
    priority,
    status,
    requested_by
) VALUES (
    'Test Ticket - ' || now()::text,
    'This is a test ticket to verify functionality',
    (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests' LIMIT 1),
    'MEDIUM',
    'OPEN',
    auth.uid()
) RETURNING id, title, status, priority, requested_by;
*/

-- 5. Check RLS policies
SELECT 
    'RLS Policies Test' as test_type,
    policyname,
    cmd as command,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tickets'
ORDER BY policyname;

-- 6. Test ticket update (uncomment to test with actual ticket ID)
/*
UPDATE public.tickets 
SET status = 'IN_PROGRESS', 
    updated_at = NOW()
WHERE id = 'YOUR_TICKET_ID_HERE'
RETURNING id, title, status, updated_at;
*/

SELECT 'Test completed - check results above' as status;
