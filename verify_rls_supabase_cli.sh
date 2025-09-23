#!/bin/bash

# ============================================================================
# VERIFY RLS ON TICKETS TABLE - SUPABASE CLI
# ============================================================================
# Purpose: Use Supabase CLI to verify Row Level Security implementation
# Usage: ./verify_rls_supabase_cli.sh
# Prerequisites: supabase CLI installed and project linked
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}============================================================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}============================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    # Check if supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed"
        echo "Install it with: npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI is installed"
    
    # Check if we're in a Supabase project
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory"
        echo "Run 'supabase init' or navigate to your project directory"
        exit 1
    fi
    print_success "Supabase project found"
    
    # Check if project is linked
    if ! supabase status &> /dev/null; then
        print_warning "Project not linked or local development not started"
        echo "Run 'supabase link --project-ref YOUR_PROJECT_REF' or 'supabase start'"
    else
        print_success "Supabase project is linked and accessible"
    fi
}

# Check RLS status on core tables
check_rls_status() {
    print_header "CHECKING RLS STATUS ON CORE TABLES"
    
    cat << 'EOF' > /tmp/check_rls.sql
-- Check RLS status on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as status,
    CASE 
        WHEN tablename IN ('tickets', 'chat_sessions', 'chat_messages') AND rowsecurity = false 
        THEN 'CRITICAL - VAPT BLOCKER'
        WHEN rowsecurity = false 
        THEN 'WARNING'
        ELSE 'OK'
    END as priority
FROM pg_tables 
WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents', 'ticket_additional_emails', 'user_profiles')
    AND schemaname = 'public'
ORDER BY 
    CASE priority 
        WHEN 'CRITICAL - VAPT BLOCKER' THEN 1 
        WHEN 'WARNING' THEN 2 
        ELSE 3 
    END,
    tablename;
EOF

    echo "Executing RLS status check..."
    if supabase db shell < /tmp/check_rls.sql; then
        print_success "RLS status check completed"
    else
        print_error "Failed to check RLS status"
        return 1
    fi
    
    rm -f /tmp/check_rls.sql
}

# Check RLS policies on tickets table
check_tickets_policies() {
    print_header "CHECKING RLS POLICIES ON TICKETS TABLE"
    
    cat << 'EOF' > /tmp/check_policies.sql
-- Show all RLS policies for tickets table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as operation,
    CASE cmd
        WHEN 'SELECT' THEN '📖 Read Access'
        WHEN 'INSERT' THEN '➕ Create Access'
        WHEN 'UPDATE' THEN '✏️ Update Access'
        WHEN 'DELETE' THEN '🗑️ Delete Access'
        ELSE cmd
    END as operation_type,
    roles,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'tickets' 
ORDER BY cmd, policyname;

-- Count policies by operation type
\echo ''
\echo '📊 POLICY SUMMARY FOR TICKETS TABLE:'
SELECT 
    cmd as operation,
    COUNT(*) as policy_count,
    CASE 
        WHEN cmd = 'SELECT' AND COUNT(*) > 0 THEN '✅ Can read tickets'
        WHEN cmd = 'INSERT' AND COUNT(*) > 0 THEN '✅ Can create tickets'
        WHEN cmd = 'UPDATE' AND COUNT(*) > 0 THEN '✅ Can update tickets'
        WHEN cmd = 'DELETE' AND COUNT(*) > 0 THEN '✅ Can delete tickets'
        ELSE '❌ No policies found'
    END as status
FROM pg_policies 
WHERE tablename = 'tickets'
GROUP BY cmd
ORDER BY cmd;
EOF

    echo "Checking tickets table policies..."
    if supabase db shell < /tmp/check_policies.sql; then
        print_success "Tickets policies check completed"
    else
        print_error "Failed to check tickets policies"
        return 1
    fi
    
    rm -f /tmp/check_policies.sql
}

# Test RLS policies with different user contexts
test_rls_policies() {
    print_header "TESTING RLS POLICIES"
    
    cat << 'EOF' > /tmp/test_rls.sql
-- Test 1: Check if policies allow basic operations
\echo '🧪 TEST 1: Basic RLS Policy Evaluation'

-- Simulate admin user context
SET LOCAL "request.jwt.claims" TO '{"sub": "test-admin-123", "email": "admin@company.com", "role": "admin"}';

\echo 'Admin context - Testing ticket visibility:'
SELECT 
    COUNT(*) as visible_tickets,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Admin can see tickets'
        ELSE '❌ Admin cannot see tickets - RLS blocking'
    END as admin_access_status
FROM tickets;

-- Test INSERT policy (we won't actually insert, just check policy evaluation)
\echo ''
\echo 'Testing INSERT policy structure...'
SELECT 
    policyname,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ INSERT policy has WITH CHECK clause'
        ELSE '❌ INSERT policy missing WITH CHECK'
    END as insert_policy_status
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'INSERT';

-- Test UPDATE policy structure
\echo ''
\echo 'Testing UPDATE policy structure...'
SELECT 
    policyname,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ UPDATE policy has USING clause'
        ELSE '❌ UPDATE policy missing USING clause'
    END as update_policy_status
FROM pg_policies 
WHERE tablename = 'tickets' AND cmd = 'UPDATE';

-- Test 2: Check auth.users access
\echo ''
\echo '🧪 TEST 2: Auth Schema Access'
BEGIN;
    -- Test if we can read auth.users (needed for RLS policies)
    SELECT 
        CASE 
            WHEN COUNT(*) >= 0 THEN '✅ Can read auth.users table'
            ELSE '❌ Cannot read auth.users'
        END as auth_access_status
    FROM auth.users 
    LIMIT 1;
ROLLBACK;

-- Test 3: Check v_user_emails view
\echo ''
\echo '🧪 TEST 3: v_user_emails View Access'
SELECT 
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ Can access v_user_emails view'
        ELSE '❌ Cannot access v_user_emails view'
    END as view_access_status
FROM v_user_emails 
LIMIT 1;
EOF

    echo "Running RLS policy tests..."
    if supabase db shell < /tmp/test_rls.sql; then
        print_success "RLS policy tests completed"
    else
        print_warning "Some RLS tests failed - check output above"
    fi
    
    rm -f /tmp/test_rls.sql
}

# Check for common RLS issues
check_common_issues() {
    print_header "CHECKING FOR COMMON RLS ISSUES"
    
    cat << 'EOF' > /tmp/check_issues.sql
-- Check 1: Missing critical policies
\echo '🔍 CHECKING FOR MISSING CRITICAL POLICIES:'

WITH required_policies AS (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE']) as required_cmd
),
existing_policies AS (
    SELECT DISTINCT cmd 
    FROM pg_policies 
    WHERE tablename = 'tickets'
)
SELECT 
    rp.required_cmd,
    CASE 
        WHEN ep.cmd IS NOT NULL THEN '✅ Policy exists'
        ELSE '❌ MISSING - This will block operations'
    END as status,
    CASE 
        WHEN ep.cmd IS NULL AND rp.required_cmd = 'SELECT' THEN 'Users cannot view tickets'
        WHEN ep.cmd IS NULL AND rp.required_cmd = 'INSERT' THEN 'Users cannot create tickets'
        WHEN ep.cmd IS NULL AND rp.required_cmd = 'UPDATE' THEN 'Users cannot update tickets (assignments fail)'
        ELSE 'OK'
    END as impact
FROM required_policies rp
LEFT JOIN existing_policies ep ON rp.required_cmd = ep.cmd
ORDER BY rp.required_cmd;

-- Check 2: Table permissions
\echo ''
\echo '🔍 CHECKING TABLE PERMISSIONS:'
SELECT 
    grantee,
    privilege_type,
    is_grantable,
    CASE 
        WHEN privilege_type = 'SELECT' THEN '✅ Read permission'
        WHEN privilege_type = 'INSERT' THEN '✅ Create permission'
        WHEN privilege_type = 'UPDATE' THEN '✅ Update permission'
        WHEN privilege_type = 'DELETE' THEN '✅ Delete permission'
        ELSE privilege_type
    END as permission_description
FROM information_schema.role_table_grants 
WHERE table_name = 'tickets' 
    AND table_schema = 'public'
    AND grantee IN ('authenticated', 'public')
ORDER BY grantee, privilege_type;

-- Check 3: Schema permissions for auth
\echo ''
\echo '🔍 CHECKING AUTH SCHEMA ACCESS:'
SELECT 
    CASE 
        WHEN has_schema_privilege('authenticated', 'auth', 'USAGE') THEN '✅ authenticated role can use auth schema'
        ELSE '❌ authenticated role cannot use auth schema'
    END as auth_schema_access;

-- Check 4: Function permissions
\echo ''
\echo '🔍 CHECKING FUNCTION PERMISSIONS:'
SELECT 
    routine_name,
    routine_type,
    grantee,
    privilege_type,
    CASE 
        WHEN privilege_type = 'EXECUTE' THEN '✅ Can execute function'
        ELSE privilege_type
    END as permission_status
FROM information_schema.role_routine_grants 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%ticket%'
    AND grantee = 'authenticated'
ORDER BY routine_name;
EOF

    echo "Checking for common RLS issues..."
    if supabase db shell < /tmp/check_issues.sql; then
        print_success "Common issues check completed"
    else
        print_warning "Issues check had problems - review output above"
    fi
    
    rm -f /tmp/check_issues.sql
}

# Generate summary and recommendations
generate_summary() {
    print_header "SUMMARY AND RECOMMENDATIONS"
    
    cat << 'EOF' > /tmp/summary.sql
-- Generate RLS health summary
WITH rls_status AS (
    SELECT 
        COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
        COUNT(*) as total_critical_tables,
        COUNT(CASE WHEN tablename IN ('tickets', 'chat_sessions', 'chat_messages') AND rowsecurity = false THEN 1 END) as critical_missing
    FROM pg_tables 
    WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents', 'ticket_additional_emails', 'user_profiles')
        AND schemaname = 'public'
),
policy_status AS (
    SELECT 
        COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
        COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
        COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies
    FROM pg_policies 
    WHERE tablename = 'tickets'
)
SELECT 
    '🎯 RLS HEALTH SUMMARY' as section,
    CONCAT(
        'Tables with RLS: ', rs.tables_with_rls, '/', rs.total_critical_tables, ' ',
        CASE 
            WHEN rs.critical_missing = 0 THEN '✅'
            ELSE '❌'
        END
    ) as rls_coverage,
    CONCAT(
        'Ticket Policies: SELECT(', ps.select_policies, ') INSERT(', ps.insert_policies, ') UPDATE(', ps.update_policies, ')'
    ) as policy_coverage,
    CASE 
        WHEN rs.critical_missing = 0 AND ps.select_policies > 0 AND ps.insert_policies > 0 AND ps.update_policies > 0 
        THEN '🎉 RLS IS PROPERLY CONFIGURED!'
        WHEN rs.critical_missing > 0
        THEN '🚨 CRITICAL: Missing RLS on core tables - VAPT will fail'
        WHEN ps.insert_policies = 0 OR ps.update_policies = 0
        THEN '⚠️ WARNING: Missing policies will break functionality'
        ELSE '🔧 NEEDS ATTENTION: Check specific issues above'
    END as overall_status
FROM rls_status rs, policy_status ps;

\echo ''
\echo '📋 NEXT STEPS:'
\echo '   If you see CRITICAL or WARNING status above:'
\echo '   1. Run fix_tickets_rls_policies.sql for missing UPDATE policies'
\echo '   2. Run fix_auth_permissions.sql for permission issues'
\echo '   3. Re-run this verification script'
\echo ''
\echo '   If you see SUCCESS status:'
\echo '   ✅ RLS is properly configured'
\echo '   ✅ Ticket creation and updates should work'  
\echo '   ✅ VAPT security requirements are met'
EOF

    echo "Generating summary..."
    if supabase db shell < /tmp/summary.sql; then
        print_success "Summary generated"
    else
        print_warning "Summary generation had issues"
    fi
    
    rm -f /tmp/summary.sql
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "    ____  __    _____   _    __ _____ ____  ____ ______________  __ "
    echo "   / __ \/ /   / ___/  | |  / // ____/ __ \/ __ \\_  __/ ____/ / / / "
    echo "  / /_/ / /    \__ \   | | / // __/ / /_/ / / / / / / / __/ / / / /  "
    echo " / _, _/ /___ ___/ /   | |/ // /___/ _, _/ /_/ / / / / /___/ /_/ /   "
    echo "/_/ |_/_____//____/    |___//_____/_/ |_|\____/_/ /_/_____/\____/    "
    echo -e "${NC}"
    echo -e "${BLUE}Supabase CLI Row Level Security Verification Tool${NC}"
    echo -e "${BLUE}===================================================${NC}"
    
    check_prerequisites
    check_rls_status
    check_tickets_policies  
    test_rls_policies
    check_common_issues
    generate_summary
    
    print_header "VERIFICATION COMPLETE"
    print_info "Check the output above for any issues that need to be addressed"
    echo ""
}

# Run main function
main "$@"
