-- Database Schema for Keka ESS Integration
-- User token storage and management

-- Create table for storing user-specific Keka OAuth tokens
CREATE TABLE IF NOT EXISTS user_keka_tokens (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    -- INDEX idx_user_email (user_email),
    -- INDEX idx_expires_at (expires_at),
    
    -- Constraints
    CONSTRAINT chk_token_type CHECK (token_type IN ('Bearer', 'bearer')),
    CONSTRAINT chk_expires_at CHECK (expires_at > created_at)
);

-- Create table for tracking Keka API usage (for rate limiting and monitoring)
CREATE TABLE IF NOT EXISTS keka_api_usage (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    -- Will be created separately below
    
    -- Foreign key constraint
    FOREIGN KEY (user_email) REFERENCES user_keka_tokens(user_email) ON DELETE CASCADE
);

-- Create table for caching employee data to reduce API calls
CREATE TABLE IF NOT EXISTS keka_employee_cache (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    employee_id VARCHAR(100) NOT NULL,
    employee_data JSON NOT NULL,
    cache_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    -- Will be created separately below
    
    -- Foreign key constraint
    FOREIGN KEY (user_email) REFERENCES user_keka_tokens(user_email) ON DELETE CASCADE
);

-- Create table for storing Keka configuration per organization
CREATE TABLE IF NOT EXISTS keka_config (
    id SERIAL PRIMARY KEY,
    organization_domain VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    api_base_url VARCHAR(500) NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    scopes VARCHAR(255) DEFAULT 'read:profile read:attendance read:leave read:payroll',
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    -- Will be created separately below
    
    -- Constraints
    CONSTRAINT chk_rate_limit CHECK (rate_limit_per_minute > 0 AND rate_limit_per_minute <= 1000),
    CONSTRAINT chk_api_base_url CHECK (api_base_url LIKE 'https://%')
);

-- Insert default configuration (update with your actual values)
INSERT INTO keka_config (
    organization_domain,
    client_id,
    client_secret,
    api_base_url,
    redirect_uri
) VALUES (
    'othainsoft.keka.com',
    '1234567890',
    '1234567890',
    'https://othainsoft.keka.com/api/v1',
    'https://othainsoft.keka.com/api/auth/keka/callback'
) ON CONFLICT (organization_domain) DO NOTHING;

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_user_keka_tokens_updated_at 
    BEFORE UPDATE ON user_keka_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_employee_cache_updated_at 
    BEFORE UPDATE ON keka_employee_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_config_updated_at 
    BEFORE UPDATE ON keka_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for monitoring token health
CREATE OR REPLACE VIEW keka_token_health AS
SELECT 
    user_email,
    expires_at,
    CASE 
        WHEN expires_at < NOW() THEN 'expired'
        WHEN expires_at < NOW() + INTERVAL '1 day' THEN 'expiring_soon'
        ELSE 'healthy'
    END as token_status,
    created_at,
    updated_at
FROM user_keka_tokens
ORDER BY expires_at ASC;

-- Create view for API usage analytics
CREATE OR REPLACE VIEW keka_api_analytics AS
SELECT 
    DATE(created_at) as usage_date,
    user_email,
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time,
    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
    ROUND(
        (COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) * 100.0) / COUNT(*), 
        2
    ) as success_rate_percent
FROM keka_api_usage
GROUP BY DATE(created_at), user_email, endpoint
ORDER BY usage_date DESC, request_count DESC;

-- Create indexes for performance (PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_user_email ON user_keka_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_user_keka_tokens_expires_at ON user_keka_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_keka_api_usage_user_email_created ON keka_api_usage(user_email, created_at);
CREATE INDEX IF NOT EXISTS idx_keka_api_usage_endpoint ON keka_api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_keka_api_usage_status_code ON keka_api_usage(status_code);

CREATE INDEX IF NOT EXISTS idx_keka_employee_cache_user_email ON keka_employee_cache(user_email);
CREATE INDEX IF NOT EXISTS idx_keka_employee_cache_employee_id ON keka_employee_cache(employee_id);
CREATE INDEX IF NOT EXISTS idx_keka_employee_cache_cache_expires ON keka_employee_cache(cache_expires_at);

CREATE INDEX IF NOT EXISTS idx_keka_config_organization_domain ON keka_config(organization_domain);
CREATE INDEX IF NOT EXISTS idx_keka_config_is_active ON keka_config(is_active);

-- Grant necessary permissions (adjust user as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hr_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hr_app_user;

-- Add comments for documentation
COMMENT ON TABLE user_keka_tokens IS 'Stores OAuth tokens for each user to access their Keka data';
COMMENT ON TABLE keka_api_usage IS 'Tracks API usage for monitoring and rate limiting';
COMMENT ON TABLE keka_employee_cache IS 'Caches employee data to reduce API calls and improve performance';
COMMENT ON TABLE keka_config IS 'Stores Keka API configuration per organization';

COMMENT ON COLUMN user_keka_tokens.expires_at IS 'When the access token expires (UTC)';
COMMENT ON COLUMN keka_employee_cache.cache_expires_at IS 'When the cached employee data expires (UTC)';
COMMENT ON COLUMN keka_config.rate_limit_per_minute IS 'Maximum API requests allowed per user per minute';
