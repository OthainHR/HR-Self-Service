-- Schema for user_keka_direct_tokens table
-- This table stores Keka API tokens generated using grant_type=kekaapi

CREATE TABLE IF NOT EXISTS public.user_keka_direct_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_keka_direct_tokens_email 
ON public.user_keka_direct_tokens(user_email);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_keka_direct_tokens_expires 
ON public.user_keka_direct_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.user_keka_direct_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own tokens
CREATE POLICY "Users can access their own tokens" 
ON public.user_keka_direct_tokens
FOR SELECT
USING (auth.jwt()->>'email' = user_email);

-- RLS Policy: Service role can manage all tokens
CREATE POLICY "Service role can manage all tokens" 
ON public.user_keka_direct_tokens
FOR ALL
USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_keka_direct_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_user_keka_direct_tokens_updated_at
    BEFORE UPDATE ON public.user_keka_direct_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_user_keka_direct_tokens_updated_at();

-- Function to clean up expired tokens (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_keka_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_keka_direct_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keka_direct_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_keka_tokens() TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.user_keka_direct_tokens IS 'Stores Keka API tokens generated using grant_type=kekaapi for each user';
COMMENT ON COLUMN public.user_keka_direct_tokens.user_email IS 'User email address';
COMMENT ON COLUMN public.user_keka_direct_tokens.access_token IS 'Keka API access token';
COMMENT ON COLUMN public.user_keka_direct_tokens.expires_at IS 'Token expiration timestamp';

