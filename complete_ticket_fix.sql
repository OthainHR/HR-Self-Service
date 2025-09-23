-- Complete fix for ticket creation and assignment issues
-- Run this in Supabase SQL Editor

-- 1. First, let's check the current state
SELECT 'Starting ticket fix process...' as status;

-- 2. Ensure RLS is enabled
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Additional email users can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin can update any ticket" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to create tickets for any user" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated users to create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to update relevant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to view relevant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assignee can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Requester can update own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Role-based ticket updates" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
DROP POLICY IF EXISTS "admin_all_access_to_tickets" ON public.tickets;
DROP POLICY IF EXISTS "admins_can_insert_on_behalf_of_others" ON public.tickets;

-- 4. Create clean, simple policies

-- SELECT Policy: Allow users to view tickets they created, are assigned to, or are admin
CREATE POLICY "tickets_select_policy" ON public.tickets
FOR SELECT USING (
    requested_by = auth.uid() 
    OR assignee = auth.uid()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'it_admin'
    OR get_user_role() = 'hr_admin'
    OR get_user_role() = 'payroll_admin'
    OR get_user_role() = 'operations_admin'
    OR get_user_role() = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
    OR user_in_additional_emails(id, auth.uid())
);

-- INSERT Policy: Allow users to create their own tickets or admins to create any
CREATE POLICY "tickets_insert_policy" ON public.tickets
FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'it_admin'
    OR get_user_role() = 'hr_admin'
    OR get_user_role() = 'payroll_admin'
    OR get_user_role() = 'operations_admin'
    OR get_user_role() = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
);

-- UPDATE Policy: Allow users to update their own tickets, assigned tickets, or admins to update any
CREATE POLICY "tickets_update_policy" ON public.tickets
FOR UPDATE USING (
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'it_admin'
    OR get_user_role() = 'hr_admin'
    OR get_user_role() = 'payroll_admin'
    OR get_user_role() = 'operations_admin'
    OR get_user_role() = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
    OR user_in_additional_emails(id, auth.uid())
) WITH CHECK (
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR get_user_role() = 'admin'
    OR get_user_role() = 'it_admin'
    OR get_user_role() = 'hr_admin'
    OR get_user_role() = 'payroll_admin'
    OR get_user_role() = 'operations_admin'
    OR get_user_role() = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
    OR user_in_additional_emails(id, auth.uid())
);

-- DELETE Policy: Only admins can delete tickets
CREATE POLICY "tickets_delete_policy" ON public.tickets
FOR DELETE USING (
    get_user_role() = 'admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
);

-- 5. Test the functions work
SELECT 'Testing functions...' as status;
SELECT get_user_role() as current_user_role;
SELECT get_category_id_by_name('IT Requests') as it_category_id;

-- 6. Test a simple ticket insert (this will show if there are any remaining issues)
-- Uncomment the following lines to test:
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
    'Test Description',
    (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests' LIMIT 1),
    'MEDIUM',
    'OPEN',
    auth.uid()
) RETURNING id, title, status;
*/

-- 7. Show final status
SELECT 'Ticket fix completed successfully!' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tickets';
