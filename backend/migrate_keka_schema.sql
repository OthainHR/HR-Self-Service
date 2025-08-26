-- Migration script to safely update Keka schema
-- Run this script to add the new keka_employee_id column

-- Step 1: Drop existing views that might conflict
DROP VIEW IF EXISTS v_user_keka_token_status CASCADE;

-- Step 2: Drop existing functions that need to be recreated
DROP FUNCTION IF EXISTS get_user_keka_tokens(VARCHAR(255)) CASCADE;
DROP FUNCTION IF EXISTS has_valid_keka_tokens(VARCHAR(255)) CASCADE;

-- Step 3: Add new columns safely
DO $$ 
BEGIN
    -- Add keka_user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_keka_tokens' AND column_name = 'keka_user_id') THEN
        ALTER TABLE user_keka_tokens ADD COLUMN keka_user_id VARCHAR(255);
    END IF;
    
    -- Add keka_employee_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_keka_tokens' AND column_name = 'keka_employee_id') THEN
        ALTER TABLE user_keka_tokens ADD COLUMN keka_employee_id VARCHAR(255);
    END IF;
    
    -- Add keka_employee_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_keka_tokens' AND column_name = 'keka_employee_code') THEN
        ALTER TABLE user_keka_tokens ADD COLUMN keka_employee_code VARCHAR(100);
    END IF;
    
    -- Add last_used_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_keka_tokens' AND column_name = 'last_used_at') THEN
        ALTER TABLE user_keka_tokens ADD COLUMN last_used_at TIMESTAMPTZ;
    END IF;
END $$;

-- Step 4: Create indexes safely
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_keka_user_id ON user_keka_tokens(keka_user_id);
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_keka_employee_id ON user_keka_tokens(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_last_used ON user_keka_tokens(last_used_at);

-- Step 5: Recreate the view with new columns
CREATE OR REPLACE VIEW v_user_keka_token_status AS
SELECT 
    user_email,
    access_token,
    expires_at,
    keka_user_id,
    keka_employee_id,
    keka_employee_code,
    scope as token_scope,
    created_at,
    updated_at,
    last_used_at,
    -- Computed field: is token expired?
    (expires_at < NOW()) AS is_expired,
    -- Computed field: time until expiration
    (expires_at - NOW()) AS time_until_expiry
FROM user_keka_tokens
ORDER BY updated_at DESC;

-- Step 6: Recreate functions with new return types
CREATE OR REPLACE FUNCTION has_valid_keka_tokens(user_email_param VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_keka_tokens 
        WHERE user_email = user_email_param 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_keka_tokens(user_email_param VARCHAR(255))
RETURNS TABLE (
    access_token TEXT,
    expires_at TIMESTAMPTZ,
    keka_user_id VARCHAR(255),
    keka_employee_id VARCHAR(255),
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ukt.access_token,
        ukt.expires_at,
        ukt.keka_user_id,
        ukt.keka_employee_id,
        (ukt.expires_at < NOW()) AS is_expired
    FROM user_keka_tokens ukt
    WHERE ukt.user_email = user_email_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add comments
COMMENT ON COLUMN user_keka_tokens.keka_user_id IS 'Keka internal user ID (if available)';
COMMENT ON COLUMN user_keka_tokens.keka_employee_id IS 'Keka employee ID for API calls';
COMMENT ON COLUMN user_keka_tokens.keka_employee_code IS 'Employee code from Keka (if available)';
COMMENT ON COLUMN user_keka_tokens.last_used_at IS 'When tokens were last used for API calls';

-- Verification query
SELECT 'Migration completed successfully' as status;
