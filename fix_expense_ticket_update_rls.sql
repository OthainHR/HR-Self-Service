-- Fix RLS policy to allow admins to update tickets in their domain
-- This fixes the "row-level security policy" error when approving tickets

-- Drop the overly restrictive UPDATE policy
DROP POLICY IF EXISTS "tickets_update_restricted" ON public.tickets;

-- Create a more permissive UPDATE policy that allows domain admins to update tickets
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

-- Verify the policy was created
SELECT 'RLS UPDATE policy fixed successfully!' as status;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'UPDATE';

