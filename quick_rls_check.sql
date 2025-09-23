-- ============================================================================
-- QUICK RLS VERIFICATION FOR TICKETS TABLE
-- ============================================================================
-- Usage: supabase db shell < quick_rls_check.sql
-- Or: psql -f quick_rls_check.sql "your-connection-string"
-- ============================================================================

\echo '🔐 QUICK RLS VERIFICATION FOR TICKETS TABLE'
\echo '============================================='
\echo ''

-- 1. Check RLS Status on Critical Tables
\echo '1️⃣ RLS STATUS ON CRITICAL TABLES:'
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED - CRITICAL ISSUE'
    END as rls_status,
    CASE 
        WHEN tablename IN ('tickets', 'chat_sessions', 'chat_messages') AND rowsecurity = false 
        THEN '🚨 VAPT BLOCKER'
        WHEN rowsecurity = false 
        THEN '⚠️ WARNING'
        ELSE '✅ OK'
    END as priority
FROM pg_tables 
WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents')
    AND schemaname = 'public'
ORDER BY 
    CASE priority 
        WHEN '🚨 VAPT BLOCKER' THEN 1 
        WHEN '⚠️ WARNING' THEN 2 
        ELSE 3 
    END;

\echo ''

-- 2. Check Tickets Table Policies
\echo '2️⃣ TICKETS TABLE RLS POLICIES:'
SELECT 
    cmd as operation,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policy_names,
    CASE 
        WHEN cmd = 'SELECT' AND COUNT(*) > 0 THEN '✅ Users can view tickets'
        WHEN cmd = 'INSERT' AND COUNT(*) > 0 THEN '✅ Users can create tickets'
        WHEN cmd = 'UPDATE' AND COUNT(*) > 0 THEN '✅ Users can update tickets'
        WHEN cmd = 'DELETE' AND COUNT(*) > 0 THEN '✅ Users can delete tickets'
        ELSE '❌ NO POLICIES - Operations will fail'
    END as status
FROM pg_policies 
WHERE tablename = 'tickets'
GROUP BY cmd
ORDER BY 
    CASE cmd 
        WHEN 'SELECT' THEN 1 
        WHEN 'INSERT' THEN 2 
        WHEN 'UPDATE' THEN 3 
        WHEN 'DELETE' THEN 4 
    END;

\echo ''

-- 3. Check Critical Permissions
\echo '3️⃣ CRITICAL PERMISSIONS CHECK:'

-- Check table permissions
SELECT 
    'tickets table permissions' as check_type,
    string_agg(DISTINCT privilege_type, ', ') as granted_privileges,
    CASE 
        WHEN 'SELECT' = ANY(array_agg(privilege_type)) AND 'INSERT' = ANY(array_agg(privilege_type)) AND 'UPDATE' = ANY(array_agg(privilege_type))
        THEN '✅ All required permissions granted'
        ELSE '❌ Missing permissions - operations will fail'
    END as permission_status
FROM information_schema.role_table_grants 
WHERE table_name = 'tickets' 
    AND table_schema = 'public' 
    AND grantee = 'authenticated'
GROUP BY check_type

UNION ALL

-- Check auth schema access
SELECT 
    'auth schema access' as check_type,
    CASE 
        WHEN has_schema_privilege('authenticated', 'auth', 'USAGE') THEN 'USAGE granted'
        ELSE 'USAGE not granted'
    END as granted_privileges,
    CASE 
        WHEN has_schema_privilege('authenticated', 'auth', 'USAGE') THEN '✅ Can access auth schema'
        ELSE '❌ Cannot access auth schema - RLS policies may fail'
    END as permission_status;

\echo ''

-- 4. Test Basic Functionality
\echo '4️⃣ BASIC FUNCTIONALITY TEST:'

-- Set admin context for testing
SET LOCAL "request.jwt.claims" TO '{"sub": "test-admin-id", "email": "admin@company.com", "role": "admin"}';

-- Test ticket visibility
SELECT 
    'Ticket Visibility' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ Can query tickets table'
        ELSE '❌ Cannot query tickets table'
    END as test_status
FROM tickets

UNION ALL

-- Test auth.users access
SELECT 
    'Auth Users Access' as test_name,
    COUNT(*) as result,
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ Can access auth.users'
        ELSE '❌ Cannot access auth.users - RLS policies will fail'
    END as test_status
FROM auth.users 
LIMIT 1;

\echo ''

-- 5. Summary and Recommendations
\echo '5️⃣ SUMMARY AND RECOMMENDATIONS:'

WITH 
rls_check AS (
    SELECT 
        COUNT(CASE WHEN rowsecurity = true THEN 1 END) as enabled_count,
        COUNT(CASE WHEN tablename IN ('tickets', 'chat_sessions', 'chat_messages') AND rowsecurity = false THEN 1 END) as critical_missing
    FROM pg_tables 
    WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents')
        AND schemaname = 'public'
),
policy_check AS (
    SELECT 
        COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_count,
        COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_count,
        COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_count
    FROM pg_policies 
    WHERE tablename = 'tickets'
)
SELECT 
    CASE 
        WHEN r.critical_missing = 0 AND p.select_count > 0 AND p.insert_count > 0 AND p.update_count > 0
        THEN '🎉 SUCCESS: RLS is properly configured!'
        WHEN r.critical_missing > 0
        THEN '🚨 CRITICAL: Missing RLS on core tables - Run SQL fixes immediately'
        WHEN p.update_count = 0
        THEN '❌ CRITICAL: No UPDATE policies - Ticket assignments will fail'
        WHEN p.insert_count = 0
        THEN '❌ CRITICAL: No INSERT policies - Cannot create tickets'
        ELSE '⚠️ WARNING: Some issues detected - review output above'
    END as overall_status,
    CONCAT('RLS Tables: ', r.enabled_count, ', Policies: SELECT(', p.select_count, ') INSERT(', p.insert_count, ') UPDATE(', p.update_count, ')') as details
FROM rls_check r, policy_check p;

\echo ''
\echo '📋 RECOMMENDED ACTIONS:'
\echo '   🚨 If CRITICAL status:'
\echo '      → Run: fix_tickets_rls_policies.sql (for missing policies)'
\echo '      → Run: fix_auth_permissions.sql (for permission issues)'
\echo '   ✅ If SUCCESS status:'
\echo '      → RLS is working correctly'
\echo '      → Ticket operations should work'
\echo '      → VAPT security requirements met'
\echo ''
\echo '🧪 TO TEST IN BROWSER:'
\echo '   1. Try creating a ticket as regular user'
\echo '   2. Try updating ticket assignee as admin'  
\echo '   3. Check browser console for RLS errors'
