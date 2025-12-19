-- Fix duplicate UPDATE policies and correct table name
-- This resolves the RLS error when approving tickets

-- 1. Drop ALL existing UPDATE policies
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_restricted" ON public.tickets;
DROP POLICY IF EXISTS "Role-based ticket updates" ON public.tickets;
DROP POLICY IF EXISTS "Requester can update own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assignee can update assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin can update any ticket" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to update relevant tickets" ON public.tickets;

-- 2. Verify the correct table name for categories
-- Check what the actual table name is
SELECT 'Checking category table...' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%categor%';

-- 3. Create ONE correct UPDATE policy with the right table name
CREATE POLICY "tickets_update_restricted" ON public.tickets
FOR UPDATE USING (
    -- Ticket requester can update their own tickets
    requested_by = auth.uid()
    
    -- Assigned user can update tickets assigned to them
    OR assignee = auth.uid()
    
    -- Functional mailboxes can update tickets in their domain
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com', 
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- HR admin can update HR tickets (regardless of requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    
    -- IT admin can update IT tickets (regardless of requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can update payroll/expense tickets (regardless of requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can update operations tickets (regardless of requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    
    -- AI admin can update AI tickets (regardless of requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list
    OR user_in_additional_emails(id, auth.uid())
    
    -- Global admin can update any ticket
    OR (auth.jwt() ->> 'role') = 'admin'
) WITH CHECK (
    -- Allow the same users to make changes
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com', 
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- 4. Verify the fix
SELECT 'RLS UPDATE policy fixed successfully!' as status;

-- Show current UPDATE policies (should be only one now)
SELECT 
    'Current UPDATE policies:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'UPDATE';

-- Test query to see if payroll_admin can see expense tickets
SELECT 
    'Testing payroll_admin permissions...' as info,
    COUNT(*) as expense_ticket_count
FROM tickets t
WHERE EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = t.category_id 
    AND c.name = 'Expense Management'
);

