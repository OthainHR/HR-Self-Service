-- Final cleanup: Remove duplicate SELECT policies
-- Keep only the permissive tickets_select_policy that allows admins to see all tickets in their domain

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;

-- Verify only tickets_select_policy remains
SELECT 
    'Remaining SELECT policies:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'SELECT';

-- Show all current policies
SELECT 
    'All current ticket policies:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY cmd, policyname;

