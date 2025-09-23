-- ============================================================================
-- COPY AND PASTE THIS INTO SUPABASE DASHBOARD SQL EDITOR
-- ============================================================================
-- Project: https://supabase.com/dashboard/project/sethhceiojxrevvpzupf
-- Navigate to: SQL Editor → New query → Paste this code → Run
-- ============================================================================

-- 1. CHECK RLS STATUS ON CRITICAL TABLES
SELECT 
    '🔐 RLS STATUS CHECK' as check_name,
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

-- 2. CHECK TICKETS TABLE POLICIES
SELECT 
    '📋 POLICY CHECK' as check_name,
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

-- 3. CHECK CRITICAL PERMISSIONS
SELECT 
    '🔑 PERMISSIONS CHECK' as check_name,
    'tickets table permissions' as permission_type,
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
GROUP BY check_name, permission_type;

-- 4. OVERALL SUMMARY
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
    '🎯 OVERALL SUMMARY' as summary,
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

-- ============================================================================
-- NEXT STEPS BASED ON RESULTS:
-- ============================================================================
-- 🚨 If you see CRITICAL status:
--    1. Copy fix_tickets_rls_policies.sql into SQL Editor and run it
--    2. Copy fix_auth_permissions.sql into SQL Editor and run it
--    3. Re-run this check to verify fixes
--
-- ✅ If you see SUCCESS status:
--    - RLS is working correctly
--    - Ticket operations should work
--    - VAPT security requirements met
-- ============================================================================
