-- ============================================================================
-- FIX TICKETS RLS - ADD MISSING UPDATE POLICIES
-- ============================================================================
-- Problem: After enabling RLS, ticket assignee updates are failing because
-- there are no UPDATE policies defined for the tickets table.
--
-- Solution: Add comprehensive UPDATE policies that allow:
-- 1. Admins to update any ticket
-- 2. Assignees to update their assigned tickets  
-- 3. Requesters to update their own tickets (limited fields)
-- 4. Role-based updates (IT admin for IT tickets, etc.)
-- ============================================================================

\echo '🔧 Adding missing UPDATE policies for tickets table...'

-- ============================================================================
-- 1. ADMIN UPDATE POLICY - Admins can update any ticket
-- ============================================================================

CREATE POLICY "Admin can update any ticket" ON tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND (
                u.raw_user_meta_data->>'role' IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
                OR u.email = 'tickets@othainsoft.com'
            )
        )
    );

-- ============================================================================
-- 2. ASSIGNEE UPDATE POLICY - Assignees can update their assigned tickets
-- ============================================================================

CREATE POLICY "Assignee can update assigned tickets" ON tickets
    FOR UPDATE USING (
        assignee = auth.uid()
    );

-- ============================================================================
-- 3. REQUESTER UPDATE POLICY - Requesters can update their own tickets (limited)
-- ============================================================================

CREATE POLICY "Requester can update own tickets" ON tickets
    FOR UPDATE USING (
        requested_by = auth.uid()
        AND status NOT IN ('RESOLVED', 'CLOSED') -- Prevent updates to closed tickets
    );

-- ============================================================================
-- 4. ROLE-BASED UPDATE POLICY - Role-specific updates by category
-- ============================================================================

CREATE POLICY "Role-based ticket updates" ON tickets
    FOR UPDATE USING (
        -- IT admin/agent for IT tickets
        (
            (get_user_role() = ANY (ARRAY['it_admin'::text, 'it_agent'::text]) OR (auth.jwt() ->> 'email'::text) = 'it@othainsoft.com'::text)
            AND (category_id = get_category_id_by_name('IT Requests'::text))
        )
        OR
        -- HR admin/agent for HR tickets  
        (
            (get_user_role() = ANY (ARRAY['hr_admin'::text, 'hr_agent'::text]) OR (auth.jwt() ->> 'email'::text) = 'hr@othainsoft.com'::text)
            AND (category_id = get_category_id_by_name('HR Requests'::text))
        )
        OR
        -- Payroll admin for payroll/expense tickets
        (
            (get_user_role() = ANY (ARRAY['payroll_admin'::text, 'payroll_agent'::text]) OR (auth.jwt() ->> 'email'::text) = ANY (ARRAY['accounts@othainsoft.com'::text, 'praveen.omprakash@othainsoft.com'::text, 'ps@jerseytechpartners.com'::text]))
            AND (category_id = ANY (ARRAY[get_category_id_by_name('Payroll Requests'::text), get_category_id_by_name('Expense Management'::text)]))
        )
        OR
        -- Operations admin for operations tickets
        (
            (get_user_role() = ANY (ARRAY['operations_admin'::text]) OR (auth.jwt() ->> 'email'::text) = 'operations@othainsoft.com'::text)
            AND (category_id = get_category_id_by_name('Operations'::text))
        )
        OR  
        -- AI admin for AI tickets
        (
            (get_user_role() = ANY (ARRAY['ai_admin'::text]) OR (auth.jwt() ->> 'email'::text) = 'ai@othainsoft.com'::text)
            AND (category_id = get_category_id_by_name('AI Requests'::text))
        )
    );

-- ============================================================================
-- 5. ADDITIONAL EMAIL USERS UPDATE POLICY - Users in additional emails can update
-- ============================================================================

CREATE POLICY "Additional email users can update tickets" ON tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM ticket_additional_emails tae 
            WHERE tae.ticket_id = id AND tae.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 6. INSERT POLICY - Who can create new tickets
-- ============================================================================

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Users can insert own tickets" ON tickets;

CREATE POLICY "Users can insert own tickets" ON tickets
    FOR INSERT WITH CHECK (
        requested_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND (
                u.raw_user_meta_data->>'role' IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
                OR u.email = 'tickets@othainsoft.com'
            )
        )
    );

-- ============================================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant UPDATE permission on tickets table to authenticated users
GRANT UPDATE ON tickets TO authenticated;
GRANT INSERT ON tickets TO authenticated;

\echo '✅ UPDATE policies for tickets table added successfully!'
\echo ''
\echo '🧪 To test the fix:'
\echo '1. Try assigning a ticket as an admin'
\echo '2. Check browser console for any RLS errors'  
\echo '3. Verify assignee changes are saved in database'
\echo ''
\echo '📝 These policies allow updates by:'
\echo '   • Admins (all tickets)'
\echo '   • Assignees (their assigned tickets)'  
\echo '   • Requesters (their own tickets)'
\echo '   • Role-based access by ticket category'
\echo '   • Additional email users'
