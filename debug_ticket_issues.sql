-- Debug script to identify ticket creation and assignment issues
-- Run this in Supabase SQL Editor to diagnose problems

-- 1. Check if RLS is enabled on tickets table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tickets';

-- 2. Check tickets table schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if required functions exist
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_role', 'get_category_id_by_name', 'user_in_additional_emails')
ORDER BY routine_name;

-- 4. Check ticket_categories table
SELECT id, name FROM public.ticket_categories ORDER BY name;

-- 5. Test JWT claims extraction (run this as an authenticated user)
SELECT 
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    auth.jwt() ->> 'role' as role,
    auth.jwt() ->> 'sub' as sub;

-- 6. Test get_user_role function (run this as an authenticated user)
SELECT get_user_role() as user_role;

-- 7. Check if there are any existing tickets
SELECT 
    id,
    title,
    status,
    priority,
    requested_by,
    assignee,
    category_id,
    created_at
FROM public.tickets 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Check ticket_additional_emails table
SELECT * FROM public.ticket_additional_emails LIMIT 5;

-- 9. Test a simple ticket insert (this will show the exact error)
-- Replace with actual values when testing
/*
INSERT INTO public.tickets (
    title,
    description,
    category_id,
    priority,
    status,
    requested_by
) VALUES (
    'Test Ticket',
    'Test Description',
    (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests' LIMIT 1),
    'MEDIUM',
    'OPEN',
    auth.uid()
) RETURNING *;
*/

-- 10. Check for any constraint violations
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tickets'::regclass;

-- 11. Check if there are any triggers on tickets table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tickets' 
AND event_object_schema = 'public';

-- 12. Check RLS policy details
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tickets'
ORDER BY policyname;
