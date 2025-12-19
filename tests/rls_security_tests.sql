-- ============================================================================
-- RLS SECURITY VALIDATION TESTS
-- ============================================================================
-- Purpose: Comprehensive test suite to validate Row Level Security (RLS) 
-- implementation for VAPT compliance
--
-- Usage: Run with Supabase CLI
-- supabase db reset
-- supabase db push
-- psql -f tests/rls_security_tests.sql "postgresql://..."
-- ============================================================================

\echo '🔐 Starting RLS Security Validation Tests...'
\echo ''

-- ============================================================================
-- SETUP: Create Test Users and Data
-- ============================================================================

\echo '📋 SETUP: Creating test users and sample data...'

-- Create test users (simulating auth.users)
INSERT INTO auth.users (
    id, 
    email, 
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test.user1@company.com', '{"role": "employee"}', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'test.user2@company.com', '{"role": "employee"}', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'admin@company.com', '{"role": "admin"}', NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'hr@othainsoft.com', '{"role": "hr_admin"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test tickets
INSERT INTO tickets (
    id,
    title,
    description, 
    category_id,
    sub_category_id,
    priority,
    status,
    requested_by,
    assignee,
    client,
    created_at
) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User1 Ticket', 'Test ticket by user1', 1, 1, 'Medium', 'Open', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'IQVIA', NOW()),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User2 Ticket', 'Test ticket by user2', 1, 1, 'High', 'Open', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'GBT', NOW()),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Admin Ticket', 'Test ticket by admin', 2, 3, 'Low', 'Open', '33333333-3333-3333-3333-333333333333', NULL, 'Othain', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test chat sessions
INSERT INTO chat_sessions (
    id,
    user_id,
    user_email,
    created_at
) VALUES 
    ('session-1111', '11111111-1111-1111-1111-111111111111', 'test.user1@company.com', NOW()),
    ('session-2222', '22222222-2222-2222-2222-222222222222', 'test.user2@company.com', NOW()),
    ('session-3333', '33333333-3333-3333-3333-333333333333', 'admin@company.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test chat messages
INSERT INTO chat_messages (
    id,
    session_id,
    role,
    content,
    user_email,
    created_at
) VALUES 
    ('msg-1111-1', 'session-1111', 'user', 'Hello from user1', 'test.user1@company.com', NOW()),
    ('msg-1111-2', 'session-1111', 'assistant', 'Hi user1', 'test.user1@company.com', NOW()),
    ('msg-2222-1', 'session-2222', 'user', 'Hello from user2', 'test.user2@company.com', NOW()),
    ('msg-3333-1', 'session-3333', 'user', 'Hello from admin', 'admin@company.com', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test knowledge documents
INSERT INTO knowledge_documents (
    id,
    text,
    metadata,
    embedding,
    created_at
) VALUES 
    ('doc-1111', 'Test document 1', '{"title": "Test Doc 1", "source": "test"}', array_fill(0.1, ARRAY[1536]), NOW()),
    ('doc-2222', 'Test document 2', '{"title": "Test Doc 2", "source": "test"}', array_fill(0.2, ARRAY[1536]), NOW())
ON CONFLICT (id) DO NOTHING;

\echo '✅ Test data created successfully'
\echo ''

-- ============================================================================
-- TEST 1: Check if RLS is enabled on critical tables
-- ============================================================================

\echo '🔍 TEST 1: Checking RLS status on critical tables...'

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables 
WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents', 'ticket_additional_emails', 'user_profiles')
    AND schemaname = 'public'
ORDER BY tablename;

\echo ''

-- ============================================================================
-- TEST 2: Test Tickets Table RLS
-- ============================================================================

\echo '🎫 TEST 2: Testing Tickets Table RLS...'

-- Set context as user1
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test.user1@company.com", "role": "employee"}';

\echo 'As User1 - Should see only own ticket:'
SELECT 
    id, 
    title, 
    requested_by,
    CASE 
        WHEN requested_by::text = '11111111-1111-1111-1111-111111111111' THEN '✅ Own Ticket'
        ELSE '❌ OTHER USER TICKET - RLS VIOLATION'
    END as access_check
FROM tickets;

-- Set context as user2  
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "email": "test.user2@company.com", "role": "employee"}';

\echo ''
\echo 'As User2 - Should see only own ticket:'
SELECT 
    id, 
    title, 
    requested_by,
    CASE 
        WHEN requested_by::text = '22222222-2222-2222-2222-222222222222' THEN '✅ Own Ticket'
        ELSE '❌ OTHER USER TICKET - RLS VIOLATION'
    END as access_check
FROM tickets;

-- Set context as admin
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333", "email": "admin@company.com", "role": "admin"}';

\echo ''
\echo 'As Admin - Should see all tickets:'
SELECT 
    id, 
    title, 
    requested_by,
    '✅ Admin Access' as access_check
FROM tickets;

\echo ''

-- ============================================================================
-- TEST 3: Test Chat Sessions Table RLS
-- ============================================================================

\echo '💬 TEST 3: Testing Chat Sessions Table RLS...'

-- Set context as user1
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test.user1@company.com", "role": "employee"}';

\echo 'As User1 - Should see only own chat sessions:'
SELECT 
    id, 
    user_id,
    user_email,
    CASE 
        WHEN user_id = '11111111-1111-1111-1111-111111111111' THEN '✅ Own Session'
        ELSE '❌ OTHER USER SESSION - RLS VIOLATION'
    END as access_check
FROM chat_sessions;

-- Set context as user2
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "email": "test.user2@company.com", "role": "employee"}';

\echo ''
\echo 'As User2 - Should see only own chat sessions:'
SELECT 
    id, 
    user_id,
    user_email,
    CASE 
        WHEN user_id = '22222222-2222-2222-2222-222222222222' THEN '✅ Own Session'
        ELSE '❌ OTHER USER SESSION - RLS VIOLATION'
    END as access_check
FROM chat_sessions;

\echo ''

-- ============================================================================
-- TEST 4: Test Chat Messages Table RLS
-- ============================================================================

\echo '📨 TEST 4: Testing Chat Messages Table RLS...'

-- Set context as user1
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test.user1@company.com", "role": "employee"}';

\echo 'As User1 - Should see only own messages:'
SELECT 
    id, 
    session_id,
    content,
    user_email,
    CASE 
        WHEN user_email = 'test.user1@company.com' THEN '✅ Own Messages'
        ELSE '❌ OTHER USER MESSAGES - RLS VIOLATION'
    END as access_check
FROM chat_messages;

\echo ''

-- ============================================================================
-- TEST 5: Test Knowledge Documents RLS
-- ============================================================================

\echo '📚 TEST 5: Testing Knowledge Documents Table RLS...'

-- Set context as regular user
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test.user1@company.com", "role": "employee"}';

\echo 'As User1 - Knowledge documents access:'
SELECT 
    COUNT(*) as visible_docs,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can access knowledge base'
        ELSE '❌ No access to knowledge base'
    END as access_status
FROM knowledge_documents;

\echo ''

-- ============================================================================
-- TEST 6: Test Unauthorized Access Attempts
-- ============================================================================

\echo '🚫 TEST 6: Testing Unauthorized Access Prevention...'

-- Set context as user1
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "email": "test.user1@company.com", "role": "employee"}';

\echo 'Attempting to access another users ticket directly:'
\echo '(This should return 0 rows if RLS is working)'

SELECT 
    COUNT(*) as violation_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ RLS BLOCKING UNAUTHORIZED ACCESS'
        ELSE '❌ RLS VIOLATION - CAN ACCESS OTHER USER DATA'
    END as security_status
FROM tickets 
WHERE requested_by = '22222222-2222-2222-2222-222222222222';

\echo ''

-- ============================================================================
-- TEST 7: Test Admin Override Capabilities
-- ============================================================================

\echo '👑 TEST 7: Testing Admin Override Capabilities...'

-- Set context as admin
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333", "email": "admin@company.com", "role": "admin"}';

\echo 'Admin should see all data across all tables:'

SELECT 'tickets' as table_name, COUNT(*) as accessible_records FROM tickets
UNION ALL
SELECT 'chat_sessions' as table_name, COUNT(*) as accessible_records FROM chat_sessions  
UNION ALL
SELECT 'chat_messages' as table_name, COUNT(*) as accessible_records FROM chat_messages
UNION ALL
SELECT 'knowledge_documents' as table_name, COUNT(*) as accessible_records FROM knowledge_documents;

\echo ''

-- ============================================================================
-- TEST 8: Storage Bucket Security Test
-- ============================================================================

\echo '🗂️ TEST 8: Testing Storage Bucket Security...'

\echo 'Checking storage bucket configuration:'
SELECT 
    name,
    public,
    CASE 
        WHEN public = false THEN '✅ SECURE (Private)'
        ELSE '⚠️ PUBLIC - May need review'
    END as security_status
FROM storage.buckets 
WHERE name IN ('ticket-attachments', 'profile-pictures');

\echo ''

-- ============================================================================
-- SUMMARY AND RESULTS
-- ============================================================================

\echo '📊 SUMMARY: RLS Security Test Results'
\echo '======================================='

-- Final comprehensive check
WITH rls_status AS (
    SELECT 
        tablename,
        rowsecurity,
        CASE 
            WHEN tablename IN ('tickets', 'chat_sessions', 'chat_messages') AND rowsecurity = false 
            THEN 'CRITICAL'
            WHEN rowsecurity = false 
            THEN 'WARNING'
            ELSE 'OK'
        END as priority
    FROM pg_tables 
    WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages', 'knowledge_documents', 'ticket_additional_emails', 'user_profiles')
        AND schemaname = 'public'
)
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as "RLS Status",
    priority as "Priority"
FROM rls_status
ORDER BY 
    CASE priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'WARNING' THEN 2 
        ELSE 3 
    END,
    tablename;

\echo ''
\echo '🔍 Critical Issues Summary:'

-- Count critical issues
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO CRITICAL RLS ISSUES FOUND - READY FOR VAPT RETEST'
        ELSE CONCAT('❌ ', COUNT(*), ' CRITICAL RLS ISSUES FOUND - BLOCKS VAPT RETEST')
    END as "VAPT Readiness Status"
FROM pg_tables 
WHERE tablename IN ('tickets', 'chat_sessions', 'chat_messages')
    AND schemaname = 'public'
    AND rowsecurity = false;

-- Cleanup test data
\echo ''
\echo '🧹 Cleaning up test data...'

DELETE FROM chat_messages WHERE id LIKE 'msg-%';
DELETE FROM chat_sessions WHERE id LIKE 'session-%';
DELETE FROM tickets WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
DELETE FROM knowledge_documents WHERE id LIKE 'doc-%';
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');

\echo '✅ Test data cleanup completed'
\echo ''
\echo '🎯 RLS Security Validation Tests Complete!'
\echo 'Review the results above to ensure all critical tables have RLS enabled.'
