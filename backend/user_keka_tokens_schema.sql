-- User Keka Tokens Schema for HR Data Access
-- This table stores Keka OAuth2 tokens for each user to access their HR data

-- Extend existing user_keka_tokens table with additional columns for enhanced functionality
-- Note: This assumes the base table exists from database_schema_keka.sql

-- First, drop any existing views and functions that might conflict
DROP VIEW IF EXISTS v_user_keka_token_status CASCADE;
DROP FUNCTION IF EXISTS get_user_keka_tokens(VARCHAR(255)) CASCADE;
DROP FUNCTION IF EXISTS has_valid_keka_tokens(VARCHAR(255)) CASCADE;

-- Add new columns to existing table if they don't exist
ALTER TABLE user_keka_tokens 
ADD COLUMN IF NOT EXISTS keka_user_id VARCHAR(255);

ALTER TABLE user_keka_tokens 
ADD COLUMN IF NOT EXISTS keka_employee_id VARCHAR(255);

ALTER TABLE user_keka_tokens 
ADD COLUMN IF NOT EXISTS keka_employee_code VARCHAR(100);

ALTER TABLE user_keka_tokens 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_keka_user_id ON user_keka_tokens(keka_user_id);
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_keka_employee_id ON user_keka_tokens(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_last_used ON user_keka_tokens(last_used_at);

-- Create view for token status (recreated to handle new columns)
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

-- Function to check if user has valid Keka tokens
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

-- Function to get user's Keka tokens (if valid)
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

-- Comments for documentation
COMMENT ON COLUMN user_keka_tokens.keka_user_id IS 'Keka internal user ID (if available)';
COMMENT ON COLUMN user_keka_tokens.keka_employee_id IS 'Keka employee ID for API calls';
COMMENT ON COLUMN user_keka_tokens.keka_employee_code IS 'Employee code from Keka (if available)';
COMMENT ON COLUMN user_keka_tokens.last_used_at IS 'When tokens were last used for API calls';

-- Sample queries for testing:
/*
-- Check if user has valid tokens:
SELECT has_valid_keka_tokens('user@othainsoft.com');

-- Get user's tokens:
SELECT * FROM get_user_keka_tokens('user@othainsoft.com');

-- View all token status:
SELECT * FROM v_user_keka_token_status;

-- Find expired tokens:
SELECT user_email, expires_at 
FROM user_keka_tokens 
WHERE expires_at < NOW();

-- Get tokens that expire soon (within 24 hours):
SELECT user_email, expires_at 
FROM user_keka_tokens 
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours';
*/
