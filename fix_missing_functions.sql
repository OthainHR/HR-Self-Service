-- Fix missing functions that RLS policies depend on
-- Run this in Supabase SQL Editor

-- 1. Create get_user_role function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'role'),
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
        'user'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create get_category_id_by_name function
CREATE OR REPLACE FUNCTION get_category_id_by_name(category_name TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT id FROM public.ticket_categories WHERE name = category_name LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create user_in_additional_emails function
CREATE OR REPLACE FUNCTION user_in_additional_emails(ticket_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.ticket_additional_emails 
        WHERE ticket_id = user_in_additional_emails.ticket_id 
        AND user_id = user_in_additional_emails.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant execute permissions on these functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_id_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_additional_emails(UUID, UUID) TO authenticated;

-- 5. Test the functions
SELECT 'Functions created successfully' as status;
SELECT get_user_role() as test_user_role;
SELECT get_category_id_by_name('IT Requests') as test_category_id;
