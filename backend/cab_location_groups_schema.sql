-- Cab Location Groups Schema for Supabase
-- This table stores the location group configurations for HR admins

-- Table to store location group configurations
CREATE TABLE IF NOT EXISTS cab_location_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_key VARCHAR(100) NOT NULL, -- e.g., 'north_zone', 'south_zone'
    group_name VARCHAR(200) NOT NULL, -- e.g., 'North Zone', 'South Zone'
    locations JSONB NOT NULL DEFAULT '[]', -- Array of location names
    created_by VARCHAR(255) NOT NULL, -- Email of HR admin who created the group
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255) NOT NULL, -- Email of HR admin who last updated
    is_active BOOLEAN DEFAULT true, -- Soft delete flag
    
    -- Ensure unique group keys (only one active group per key)
    UNIQUE(group_key, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cab_location_groups_created_by ON cab_location_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_cab_location_groups_is_active ON cab_location_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_cab_location_groups_group_key ON cab_location_groups(group_key);
CREATE INDEX IF NOT EXISTS idx_cab_location_groups_updated_at ON cab_location_groups(updated_at);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cab_location_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_cab_location_groups_updated_at_trigger
    BEFORE UPDATE ON cab_location_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_cab_location_groups_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE cab_location_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- HR admins can view all groups
CREATE POLICY "HR admins can view all location groups" ON cab_location_groups
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM cab_booking_whitelist WHERE email = auth.jwt() ->> 'email'
        )
        OR auth.jwt() ->> 'email' = 'hr@othainsoft.com'
    );

-- HR admins can create groups
CREATE POLICY "HR admins can create location groups" ON cab_location_groups
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM cab_booking_whitelist WHERE email = auth.jwt() ->> 'email'
        )
        OR auth.jwt() ->> 'email' = 'hr@othainsoft.com'
    );

-- HR admins can update groups
CREATE POLICY "HR admins can update location groups" ON cab_location_groups
    FOR UPDATE
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM cab_booking_whitelist WHERE email = auth.jwt() ->> 'email'
        )
        OR auth.jwt() ->> 'email' = 'hr@othainsoft.com'
    )
    WITH CHECK (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM cab_booking_whitelist WHERE email = auth.jwt() ->> 'email'
        )
        OR auth.jwt() ->> 'email' = 'hr@othainsoft.com'
    );

-- HR admins can delete (soft delete by setting is_active = false)
CREATE POLICY "HR admins can delete location groups" ON cab_location_groups
    FOR UPDATE
    USING (
        auth.jwt() ->> 'email' IN (
            SELECT email FROM cab_booking_whitelist WHERE email = auth.jwt() ->> 'email'
        )
        OR auth.jwt() ->> 'email' = 'hr@othainsoft.com'
    );

-- Create a view for active groups only
CREATE OR REPLACE VIEW v_active_cab_location_groups AS
SELECT 
    id,
    group_key,
    group_name,
    locations,
    created_by,
    created_at,
    updated_at,
    updated_by
FROM cab_location_groups
WHERE is_active = true
ORDER BY group_name;

-- Grant permissions for the view
GRANT SELECT ON v_active_cab_location_groups TO authenticated;

-- Comments for documentation
COMMENT ON TABLE cab_location_groups IS 'Stores location group configurations for cab booking Excel exports';
COMMENT ON COLUMN cab_location_groups.group_key IS 'Unique identifier for the group (lowercase, underscores)';
COMMENT ON COLUMN cab_location_groups.group_name IS 'Display name for the group';
COMMENT ON COLUMN cab_location_groups.locations IS 'JSON array of location names assigned to this group';
COMMENT ON COLUMN cab_location_groups.is_active IS 'Soft delete flag - false means deleted';
