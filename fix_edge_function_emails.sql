-- Fix Edge Function email issues
-- Run this in Supabase SQL Editor

-- 1. Check if the users table exists and has email data
SELECT 'Checking users table...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- 2. Check if v_user_emails has the admin emails we need
SELECT 'Checking admin emails in v_user_emails...' as status;
SELECT email FROM public.v_user_emails 
WHERE email IN ('it@othainsoft.com', 'hr@othainsoft.com', 'accounts@othainsoft.com', 'operations@othainsoft.com', 'ai@othainsoft.com', 'sunhith.reddy@othainsoft.com')
ORDER BY email;

-- 3. Check if users is a view or table
SELECT 'Checking users object type...' as status;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';

-- 4. Drop the view if it exists and create a proper table
DROP VIEW IF EXISTS public.users;
DROP TABLE IF EXISTS public.users;

-- Create a proper users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create a function to sync users from auth.users
CREATE OR REPLACE FUNCTION sync_users_from_auth()
RETURNS void AS $$
BEGIN
    -- Insert or update users from auth.users
    INSERT INTO public.users (id, email, full_name, updated_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''),
        NOW()
    FROM auth.users au
    WHERE au.email IS NOT NULL
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION sync_users_from_auth() TO authenticated;
GRANT SELECT ON public.users TO authenticated;

-- 7. Run the sync function
SELECT sync_users_from_auth();

-- 8. Check the results
SELECT 'Users synced successfully!' as status;
SELECT COUNT(*) as user_count FROM public.users;
SELECT email, full_name FROM public.users 
WHERE email IN ('it@othainsoft.com', 'hr@othainsoft.com', 'accounts@othainsoft.com', 'operations@othainsoft.com', 'ai@othainsoft.com', 'sunhith.reddy@othainsoft.com')
ORDER BY email;

-- 9. Create a trigger to automatically sync users when auth.users changes
CREATE OR REPLACE FUNCTION trigger_sync_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users (id, email, full_name, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
    END IF;
    
    -- Update existing user
    IF TG_OP = 'UPDATE' THEN
        UPDATE public.users 
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
            updated_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;
    
    -- Delete user
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.users WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create the trigger
DROP TRIGGER IF EXISTS sync_users_trigger ON auth.users;
CREATE TRIGGER sync_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_users();

-- 11. Test the setup
SELECT 'Testing email lookup...' as status;
SELECT 
    t.id as ticket_id,
    t.title,
    t.assignee,
    u.email as assignee_email
FROM public.tickets t
LEFT JOIN public.users u ON t.assignee = u.id
WHERE t.assignee IS NOT NULL
LIMIT 5;
