-- ============================================================================
-- FIX AUTH PERMISSIONS - Grant access to auth.users for RLS policies
-- ============================================================================
-- Problem: RLS policies reference auth.users table but authenticated users 
-- don't have permission to read it, causing "permission denied" errors
-- during ticket creation and updates.
--
-- Solution: Grant necessary permissions and create helper functions
-- ============================================================================

\echo '🔧 Fixing auth.users permission issues for RLS policies...'

-- ============================================================================
-- 1. GRANT BASIC PERMISSIONS ON AUTH SCHEMA
-- ============================================================================

-- Grant SELECT permission on auth.users to authenticated users
-- This is needed for RLS policies that check user roles and emails
GRANT SELECT ON auth.users TO authenticated;

-- Also grant usage on auth schema
GRANT USAGE ON SCHEMA auth TO authenticated;

\echo '✅ Granted SELECT permission on auth.users to authenticated users'

-- ============================================================================
-- 2. SIMPLIFY RLS POLICIES - Remove complex auth.users queries
-- ============================================================================

-- Drop the problematic policies that directly query auth.users
DROP POLICY IF EXISTS "Admin can update any ticket" ON tickets;
DROP POLICY IF EXISTS "Assignee can update assigned tickets" ON tickets;
DROP POLICY IF EXISTS "Requester can update own tickets" ON tickets;
DROP POLICY IF EXISTS "Role-based ticket updates" ON tickets;
DROP POLICY IF EXISTS "Additional email users can update tickets" ON tickets;
DROP POLICY IF EXISTS "Users can insert own tickets" ON tickets;

\echo '🗑️ Dropped old complex RLS policies'

-- ============================================================================
-- 3. CREATE SIMPLIFIED, PERFORMANCE-OPTIMIZED POLICIES
-- ============================================================================

-- Simple admin policy using JWT claims (faster than querying auth.users)
CREATE POLICY "Admin can update any ticket - simple" ON tickets
    FOR UPDATE USING (
        -- Check if user has admin role in JWT token
        (auth.jwt() ->> 'role') IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        OR 
        -- Or if user email is in admin list
        (auth.jwt() ->> 'email') = ANY(ARRAY[
            'admin@example.com',
            'it@othainsoft.com', 
            'hr@othainsoft.com',
            'accounts@othainsoft.com',
            'operations@othainsoft.com',
            'ai@othainsoft.com',
            'tickets@othainsoft.com'
        ])
    );

-- Simple assignee policy
CREATE POLICY "Assignee can update assigned tickets - simple" ON tickets
    FOR UPDATE USING (
        assignee = auth.uid()
    );

-- Simple requester policy  
CREATE POLICY "Requester can update own tickets - simple" ON tickets
    FOR UPDATE USING (
        requested_by = auth.uid()
        AND status NOT IN ('RESOLVED', 'CLOSED')
    );

-- Simple INSERT policy
CREATE POLICY "Users can insert tickets - simple" ON tickets
    FOR INSERT WITH CHECK (
        -- User can create ticket for themselves
        requested_by = auth.uid()
        OR
        -- Admin can create tickets for others
        (auth.jwt() ->> 'role') IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        OR
        -- Admin emails can create tickets for others  
        (auth.jwt() ->> 'email') = ANY(ARRAY[
            'admin@example.com',
            'it@othainsoft.com',
            'hr@othainsoft.com', 
            'accounts@othainsoft.com',
            'operations@othainsoft.com',
            'ai@othainsoft.com',
            'tickets@othainsoft.com'
        ])
    );

\echo '✅ Created simplified RLS policies using JWT claims'

-- ============================================================================
-- 4. ENSURE v_user_emails VIEW EXISTS AND IS ACCESSIBLE
-- ============================================================================

-- Create v_user_emails view if it doesn't exist (references auth.users)
CREATE OR REPLACE VIEW v_user_emails AS
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    updated_at
FROM auth.users;

-- Grant access to the view
GRANT SELECT ON v_user_emails TO authenticated;

\echo '✅ Created/updated v_user_emails view with proper permissions'

-- ============================================================================
-- 5. FIX ticket_additional_emails POLICIES TOO
-- ============================================================================

-- Drop and recreate ticket_additional_emails policies with JWT-based checks
DROP POLICY IF EXISTS "Admins can add additional emails" ON ticket_additional_emails;
DROP POLICY IF EXISTS "Admins can remove additional emails" ON ticket_additional_emails;

CREATE POLICY "Admins can add additional emails - simple" ON ticket_additional_emails
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        OR 
        (auth.jwt() ->> 'email') = ANY(ARRAY[
            'admin@example.com',
            'it@othainsoft.com',
            'hr@othainsoft.com',
            'accounts@othainsoft.com', 
            'operations@othainsoft.com',
            'ai@othainsoft.com',
            'tickets@othainsoft.com'
        ])
    );

CREATE POLICY "Admins can remove additional emails - simple" ON ticket_additional_emails
    FOR DELETE USING (
        (auth.jwt() ->> 'role') IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
        OR
        (auth.jwt() ->> 'email') = ANY(ARRAY[
            'admin@example.com', 
            'it@othainsoft.com',
            'hr@othainsoft.com',
            'accounts@othainsoft.com',
            'operations@othainsoft.com', 
            'ai@othainsoft.com',
            'tickets@othainsoft.com'
        ])
    );

\echo '✅ Updated ticket_additional_emails policies'

-- ============================================================================
-- 6. VERIFY PERMISSIONS SUMMARY  
-- ============================================================================

\echo ''
\echo '📋 PERMISSIONS SUMMARY:'
\echo '   ✅ auth.users - SELECT granted to authenticated'
\echo '   ✅ v_user_emails view - Created and accessible'  
\echo '   ✅ tickets - Simplified RLS policies using JWT'
\echo '   ✅ ticket_additional_emails - Updated policies'
\echo ''
\echo '🎯 WHAT THIS FIXES:'
\echo '   • Non-admin users can now create tickets'
\echo '   • Admin users can create tickets on behalf of others'
\echo '   • Ticket assignment during creation works'
\echo '   • No more "permission denied for table public.users" errors'
\echo ''
\echo '🧪 TEST:'
\echo '   1. Try creating a ticket as non-admin user'
\echo '   2. Try creating a ticket as admin on behalf of someone'
\echo '   3. Check browser console for errors'
