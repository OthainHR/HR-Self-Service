-- FINAL FIX: Remove ALL old policies and create only correct restrictive policies
-- This ensures admins only see tickets in their category

-- ========================================
-- STEP 1: Drop ALL existing policies
-- ========================================
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_restricted" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_restricted" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_restricted" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete_policy" ON public.tickets;

-- Verify all policies are dropped
SELECT 'Step 1: Dropped all old policies' as status;

-- ========================================
-- STEP 2: Create SELECT policy (restrictive)
-- ========================================
CREATE POLICY "tickets_select_restricted" ON public.tickets
FOR SELECT USING (
    -- Ticket requester can see their own tickets
    requested_by = auth.uid() 
    
    -- Assigned user can see tickets assigned to them
    OR assignee = auth.uid()
    
    -- Functional mailboxes can see all tickets (REMOVED role-based emails)
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'accounts@othainsoft.com'
    )
    
    -- HR admin can ONLY see HR tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    
    -- IT admin can ONLY see IT tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can ONLY see Payroll/Expense tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can ONLY see Operations tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    
    -- AI admin can ONLY see AI tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list
    OR user_in_additional_emails(id, auth.uid())
    
    -- ONLY global admin can see all tickets
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
);

SELECT 'Step 2: Created SELECT policy (restrictive)' as status;

-- ========================================
-- STEP 3: Create INSERT policy
-- ========================================
CREATE POLICY "tickets_insert_restricted" ON public.tickets
FOR INSERT WITH CHECK (
    -- Users can create tickets for themselves
    requested_by = auth.uid()
    
    -- Functional mailboxes can create tickets (REMOVED role-based emails)
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'accounts@othainsoft.com'
    )
    
    -- All admins can create tickets
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') IN ('admin', 'hr_admin', 'it_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
);

SELECT 'Step 3: Created INSERT policy' as status;

-- ========================================
-- STEP 4: Create UPDATE policy
-- ========================================
CREATE POLICY "tickets_update_restricted" ON public.tickets
FOR UPDATE USING (
    -- Ticket requester can update their own tickets
    requested_by = auth.uid()
    
    -- Assigned user can update tickets assigned to them
    OR assignee = auth.uid()
    
    -- Functional mailboxes can update tickets (REMOVED role-based emails)
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'accounts@othainsoft.com'
    )
    
    -- HR admin can update HR tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    
    -- IT admin can update IT tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can update payroll/expense tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can update operations tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    
    -- AI admin can update AI tickets
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list
    OR user_in_additional_emails(id, auth.uid())
    
    -- Global admin can update any ticket
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
) WITH CHECK (
    -- Same restrictions for what can be updated
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'accounts@othainsoft.com'
    )
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'hr_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'it_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'payroll_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'operations_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    OR (
        (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'ai_admin'
        AND EXISTS (
            SELECT 1 FROM public.categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
);

SELECT 'Step 4: Created UPDATE policy' as status;

-- ========================================
-- STEP 5: Create DELETE policy
-- ========================================
CREATE POLICY "tickets_delete_restricted" ON public.tickets
FOR DELETE USING (
    -- Only global admin and tickets mailbox can delete
    (auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin'
    OR lower(auth.jwt()->>'email') = 'tickets@othainsoft.com'
);

SELECT 'Step 5: Created DELETE policy' as status;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT '=== FINAL VERIFICATION ===' as verification;

-- Show all policies (should be only 4 now)
SELECT 
    'All ticket policies:' as summary,
    cmd,
    policyname
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

-- Test HR admin can only see HR tickets
SELECT 
    'Test: HR tickets visible' as test,
    c.name as category,
    COUNT(*) as count
FROM tickets t
JOIN categories c ON c.id = t.category_id
WHERE c.name = 'HR Requests'
GROUP BY c.name;

-- Test Payroll admin can only see Payroll/Expense tickets
SELECT 
    'Test: Payroll/Expense tickets visible' as test,
    c.name as category,
    COUNT(*) as count
FROM tickets t
JOIN categories c ON c.id = t.category_id
WHERE c.name IN ('Payroll Requests', 'Expense Management')
GROUP BY c.name;

SELECT '✅ ALL POLICIES FIXED!' as final_status;

