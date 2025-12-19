-- Fix SELECT policy: Admins should only see tickets in their category
-- Remove permissive policy and update restrictive policy

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;

-- Drop the current restrictive policy so we can recreate it with correct logic
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_restricted" ON public.tickets;

-- Create correct SELECT policy: admins see their category tickets (not just their own)
CREATE POLICY "tickets_select_restricted" ON public.tickets
FOR SELECT USING (
    -- Ticket requester can see their own tickets
    requested_by = auth.uid() 
    
    -- Assigned user can see tickets assigned to them
    OR assignee = auth.uid()
    
    -- Functional mailboxes can see relevant tickets (these are service accounts)
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- HR admin can see ALL HR tickets (not just ones they're involved with)
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    
    -- IT admin can see ALL IT tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can see ALL payroll/expense tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can see ALL operations tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    
    -- AI admin can see ALL AI tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list for this ticket
    OR user_in_additional_emails(id, auth.uid())
    
    -- ONLY global admin (not role-based admins) can see all tickets
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
);

-- Verify the fix
SELECT 'SELECT policy fixed successfully!' as status;

-- Show only SELECT policies (should be only tickets_select_restricted now)
SELECT 
    'Current SELECT policies:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'SELECT';

-- Show all policies for reference
SELECT 
    'All ticket policies:' as summary,
    cmd,
    policyname
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

-- Test: Count tickets visible to payroll_admin in Expense Management
SELECT 
    'Test: Expense tickets visible to payroll_admin' as test,
    COUNT(*) as count
FROM tickets t
WHERE EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = t.category_id 
    AND c.name = 'Expense Management'
);

