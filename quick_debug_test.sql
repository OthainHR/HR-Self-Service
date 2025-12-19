-- Quick debug test - run this first
-- This will quickly identify the most common issues

-- 1. Check if RLS is enabled
SELECT 
    'RLS Status' as check_type,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tickets';

-- 2. Check if required columns exist
SELECT 
    'Schema Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'priority') 
        THEN 'PRIORITY COLUMN EXISTS' 
        ELSE 'PRIORITY COLUMN MISSING' 
    END as status
UNION ALL
SELECT 
    'Schema Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'status') 
        THEN 'STATUS COLUMN EXISTS' 
        ELSE 'STATUS COLUMN MISSING' 
    END as status;

-- 3. Check if required functions exist
SELECT 
    'Function Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_role' AND routine_schema = 'public') 
        THEN 'get_user_role EXISTS' 
        ELSE 'get_user_role MISSING' 
    END as status
UNION ALL
SELECT 
    'Function Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_category_id_by_name' AND routine_schema = 'public') 
        THEN 'get_category_id_by_name EXISTS' 
        ELSE 'get_category_id_by_name MISSING' 
    END as status;

-- 4. Check ticket categories
SELECT 
    'Categories Check' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'CATEGORIES EXIST (' || COUNT(*) || ' found)'
        ELSE 'NO CATEGORIES FOUND'
    END as status
FROM public.ticket_categories;

-- 5. Check RLS policies count
SELECT 
    'RLS Policies' as check_type,
    CASE 
        WHEN COUNT(*) > 0 THEN 'POLICIES EXIST (' || COUNT(*) || ' found)'
        ELSE 'NO POLICIES FOUND'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tickets';
