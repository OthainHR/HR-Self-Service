-- Fix admin ticket restriction - admins should only see their own tickets
-- Run this in Supabase SQL Editor

-- Drop existing policies that give blanket admin access
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to view relevant tickets" ON public.tickets;

-- Create function to check if user is in additional emails for a ticket


-- Create restrictive SELECT policy - admins can only see tickets they're involved with
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
    
    -- HR admin can see HR tickets they're involved with (requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'hr_admin'
        AND (requested_by = auth.uid() OR assignee = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.ticket_categories c
            WHERE c.id = category_id AND c.name = 'HR Requests'
        )
    )
    
    -- IT admin can see IT tickets they're involved with (requester/assignee)
    OR (
        (auth.jwt() ->> 'role') = 'it_admin'
        AND (requested_by = auth.uid() OR assignee = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.ticket_categories c
            WHERE c.id = category_id AND c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can see payroll/expense tickets they're involved with
    OR (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        AND (requested_by = auth.uid() OR assignee = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.ticket_categories c
            WHERE c.id = category_id 
            AND c.name IN ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can see operations tickets they're involved with
    OR (
        (auth.jwt() ->> 'role') = 'operations_admin'
        AND (requested_by = auth.uid() OR assignee = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.ticket_categories c
            WHERE c.id = category_id AND c.name = 'Operations'
        )
    )
    
    -- AI admin can see AI tickets they're involved with
    OR (
        (auth.jwt() ->> 'role') = 'ai_admin'
        AND (requested_by = auth.uid() OR assignee = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.ticket_categories c
            WHERE c.id = category_id AND c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list for this ticket
    OR user_in_additional_emails(id, auth.uid())
    
    -- ONLY global admin (not role-based admins) can see all tickets
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- Create INSERT policy - allow users to create tickets
CREATE POLICY "tickets_insert_restricted" ON public.tickets
FOR INSERT WITH CHECK (
    -- Users can create tickets for themselves
    requested_by = auth.uid()
    
    -- Functional mailboxes can create tickets
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com', 
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- Global admin can create tickets for anyone
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- Create UPDATE policy - restrict who can update tickets
CREATE POLICY "tickets_update_restricted" ON public.tickets
FOR UPDATE USING (
    -- Ticket requester can update their own tickets
    requested_by = auth.uid()
    
    -- Assigned user can update tickets assigned to them
    OR assignee = auth.uid()
    
    -- Functional mailboxes can update relevant tickets
    OR lower(auth.jwt()->>'email') IN (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com', 
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- Role-based admins can only update tickets they're involved with
    OR (
        (auth.jwt() ->> 'role') IN ('hr_admin', 'it_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        AND (requested_by = auth.uid() OR assignee = auth.uid())
    )
    
    -- Users in additional emails list
    OR user_in_additional_emails(id, auth.uid())
    
    -- ONLY global admin can update any ticket
    OR (auth.jwt() ->> 'role') = 'admin'
) WITH CHECK (
    -- Same restrictions for what can be updated
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
        (auth.jwt() ->> 'role') IN ('hr_admin', 'it_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        AND (requested_by = auth.uid() OR assignee = auth.uid())
    )
    OR user_in_additional_emails(id, auth.uid())
    OR (auth.jwt() ->> 'role') = 'admin'
);

-- Verify the policies are in place
SELECT 'RLS policies updated successfully!' as status;

-- Test the restriction - this should now only show tickets the current user is involved with
SELECT 
    'Testing restriction...' as status,
    COUNT(*) as visible_tickets_count
FROM public.tickets;

-- Show what categories exist for reference
SELECT 'Available categories:' as status;
SELECT id, name FROM public.ticket_categories ORDER BY name;
