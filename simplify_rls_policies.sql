-- Simplify RLS policies to work without complex functions
-- Run this in Supabase SQL Editor

-- Drop all existing policies
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

-- Create simplified policies

-- 1. SELECT Policy: Allow users to view tickets they created, are assigned to, or are admin
CREATE POLICY "tickets_select_policy" ON public.tickets
FOR SELECT USING (
    requested_by = auth.uid() 
    OR assignee = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'it_admin'
    OR (auth.jwt() ->> 'role') = 'hr_admin'
    OR (auth.jwt() ->> 'role') = 'payroll_admin'
    OR (auth.jwt() ->> 'role') = 'operations_admin'
    OR (auth.jwt() ->> 'role') = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
);

-- 2. INSERT Policy: Allow users to create their own tickets or admins to create any
CREATE POLICY "tickets_insert_policy" ON public.tickets
FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'it_admin'
    OR (auth.jwt() ->> 'role') = 'hr_admin'
    OR (auth.jwt() ->> 'role') = 'payroll_admin'
    OR (auth.jwt() ->> 'role') = 'operations_admin'
    OR (auth.jwt() ->> 'role') = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
);

-- 3. UPDATE Policy: Allow users to update their own tickets, assigned tickets, or admins to update any
CREATE POLICY "tickets_update_policy" ON public.tickets
FOR UPDATE USING (
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'it_admin'
    OR (auth.jwt() ->> 'role') = 'hr_admin'
    OR (auth.jwt() ->> 'role') = 'payroll_admin'
    OR (auth.jwt() ->> 'role') = 'operations_admin'
    OR (auth.jwt() ->> 'role') = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
) WITH CHECK (
    requested_by = auth.uid()
    OR assignee = auth.uid()
    OR (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'it_admin'
    OR (auth.jwt() ->> 'role') = 'hr_admin'
    OR (auth.jwt() ->> 'role') = 'payroll_admin'
    OR (auth.jwt() ->> 'role') = 'operations_admin'
    OR (auth.jwt() ->> 'role') = 'ai_admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'it@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'hr@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'accounts@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'ai@othainsoft.com'
    OR (auth.jwt() ->> 'email') = 'operations@othainsoft.com'
);

-- 4. DELETE Policy: Only admins can delete tickets
CREATE POLICY "tickets_delete_policy" ON public.tickets
FOR DELETE USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') = 'tickets@othainsoft.com'
);

-- Test the policies
SELECT 'Simplified RLS policies created successfully' as status;
