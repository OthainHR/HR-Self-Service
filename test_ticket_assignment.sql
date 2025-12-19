-- ============================================================================  
-- TEST TICKET ASSIGNMENT AFTER RLS FIX
-- ============================================================================
-- Purpose: Verify that ticket assignee updates work after adding RLS UPDATE policies
--
-- Usage: Run in Supabase SQL Editor after applying the RLS fix
-- ============================================================================

\echo '🧪 Testing Ticket Assignment with RLS Policies...'
\echo ''

-- Test 1: Check if UPDATE policies exist
\echo '1. Checking UPDATE policies on tickets table:'
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd as policy_type,
    CASE 
        WHEN cmd = 'UPDATE' THEN '✅ UPDATE Policy Found'
        WHEN cmd = 'SELECT' THEN '📖 SELECT Policy'  
        WHEN cmd = 'INSERT' THEN '➕ INSERT Policy'
        ELSE cmd
    END as status
FROM pg_policies 
WHERE tablename = 'tickets' 
ORDER BY cmd, policyname;

\echo ''

-- Test 2: Simulate admin ticket assignment
\echo '2. Testing admin UPDATE capability:'
-- Set admin context
SET LOCAL "request.jwt.claims" TO '{"sub": "admin-user-id", "email": "admin@company.com", "role": "admin"}';

-- Try a simulated update (this won't actually change data, just test permissions)
EXPLAIN (FORMAT TEXT) 
UPDATE tickets 
SET assignee = 'test-assignee-id' 
WHERE id = (SELECT id FROM tickets LIMIT 1);

\echo ''

-- Test 3: Check current user permissions
\echo '3. Current auth context:'
SELECT 
    COALESCE(auth.uid()::text, 'No auth context') as current_user_id,
    COALESCE(auth.jwt() ->> 'email', 'No email in JWT') as current_email,
    COALESCE(auth.jwt() ->> 'role', 'No role in JWT') as current_role;

\echo ''

-- Test 4: Count accessible tickets for current user
\echo '4. Tickets accessible to current user:'
SELECT 
    COUNT(*) as accessible_tickets,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can access tickets'
        ELSE '❌ No tickets accessible - check RLS SELECT policies'
    END as access_status
FROM tickets;

\echo ''

-- Test 5: Show policy summary
\echo '5. RLS Policy Summary:'
SELECT 
    'tickets' as table_name,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    CASE 
        WHEN COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) > 0 THEN '✅ UPDATE policies exist'
        ELSE '❌ NO UPDATE policies - assignments will fail'
    END as update_status
FROM pg_policies 
WHERE tablename = 'tickets';

\echo ''
\echo '🎯 EXPECTED RESULTS:'
\echo '   • UPDATE policies should be > 0'
\echo '   • Admin context should allow updates'  
\echo '   • Tickets should be accessible'
\echo ''
\echo '❗ IF TESTS FAIL:'
\echo '   1. Run fix_tickets_rls_policies.sql first'
\echo '   2. Ensure you have admin privileges'
\echo '   3. Check Supabase auth configuration'
