-- ============================================================================
-- TICKET ADDITIONAL EMAILS FUNCTIONALITY
-- ============================================================================
-- This file contains the database schema and functions for managing 
-- additional email members for tickets (non-expense tickets only)
-- ============================================================================

-- Create the ticket_additional_emails table
CREATE TABLE IF NOT EXISTS ticket_additional_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of ticket and user
    UNIQUE(ticket_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_additional_emails_ticket_id ON ticket_additional_emails(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_additional_emails_user_id ON ticket_additional_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_additional_emails_added_by ON ticket_additional_emails(added_by);

-- Enable RLS (Row Level Security)
ALTER TABLE ticket_additional_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view additional emails for accessible tickets" ON ticket_additional_emails;
DROP POLICY IF EXISTS "Admins can add additional emails" ON ticket_additional_emails;
DROP POLICY IF EXISTS "Admins can remove additional emails" ON ticket_additional_emails;

-- Create RLS policies
-- Policy for authenticated users to view additional emails for tickets they can access
CREATE POLICY "Users can view additional emails for accessible tickets" ON ticket_additional_emails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t 
            WHERE t.id = ticket_id 
            AND (
                t.requested_by = auth.uid() 
                OR t.assignee = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM ticket_additional_emails tae 
                    WHERE tae.ticket_id = t.id AND tae.user_id = auth.uid()
                )
            )
        )
    );

-- Policy for admins to insert additional emails
CREATE POLICY "Admins can add additional emails" ON ticket_additional_emails
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND (
                u.raw_user_meta_data->>'role' IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
                OR u.email = 'tickets@othainsoft.com'
            )
        )
    );

-- Policy for admins to delete additional emails
CREATE POLICY "Admins can remove additional emails" ON ticket_additional_emails
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND (
                u.raw_user_meta_data->>'role' IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
                OR u.email = 'tickets@othainsoft.com'
            )
        )
    );

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_ticket_additional_emails(UUID);

-- Function to get additional emails for a ticket with user details
CREATE OR REPLACE FUNCTION get_ticket_additional_emails(p_ticket_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email VARCHAR(255),
    added_by UUID,
    added_by_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tae.id,
        tae.user_id,
        ue.email::VARCHAR(255),
        tae.added_by,
        ue_added.email::VARCHAR(255) as added_by_email,
        tae.created_at
    FROM ticket_additional_emails tae
    JOIN v_user_emails ue ON tae.user_id = ue.id
    LEFT JOIN v_user_emails ue_added ON tae.added_by = ue_added.id
    WHERE tae.ticket_id = p_ticket_id
    ORDER BY tae.created_at ASC;
END;
$$;

-- Function to add additional email to ticket (with validation)
CREATE OR REPLACE FUNCTION add_ticket_additional_email(
    p_ticket_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_ticket_category_id INTEGER;
    v_existing_count INTEGER;
BEGIN
    -- Check if ticket exists and is not an expense ticket
    SELECT category_id INTO v_ticket_category_id
    FROM tickets 
    WHERE id = p_ticket_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Ticket not found');
    END IF;
    
    -- Prevent adding to expense tickets (category_id = 5)
    IF v_ticket_category_id = 5 THEN
        RETURN json_build_object('success', false, 'error', 'Cannot add additional emails to expense tickets');
    END IF;
    
    -- Check if user is already added
    SELECT COUNT(*) INTO v_existing_count
    FROM ticket_additional_emails
    WHERE ticket_id = p_ticket_id AND user_id = p_user_id;
    
    IF v_existing_count > 0 THEN
        RETURN json_build_object('success', false, 'error', 'User is already added to this ticket');
    END IF;
    
    -- Add the additional email
    INSERT INTO ticket_additional_emails (ticket_id, user_id, added_by)
    VALUES (p_ticket_id, p_user_id, auth.uid());
    
    RETURN json_build_object('success', true, 'message', 'User added successfully');
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to remove additional email from ticket
CREATE OR REPLACE FUNCTION remove_ticket_additional_email(p_additional_email_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    DELETE FROM ticket_additional_emails 
    WHERE id = p_additional_email_id;
    
    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'User removed successfully');
    ELSE
        RETURN json_build_object('success', false, 'error', 'Additional email record not found');
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to check if user has access to a ticket
CREATE OR REPLACE FUNCTION user_has_ticket_access(p_ticket_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access BOOLEAN := FALSE;
BEGIN
    -- Check if user is the requester, assignee, or in additional emails
    SELECT EXISTS (
        SELECT 1 FROM tickets t 
        WHERE t.id = p_ticket_id 
        AND (
            t.requested_by = p_user_id 
            OR t.assignee = p_user_id
            OR EXISTS (
                SELECT 1 FROM ticket_additional_emails tae 
                WHERE tae.ticket_id = t.id AND tae.user_id = p_user_id
            )
        )
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$;

-- Create or replace a view that includes access control for tickets
CREATE OR REPLACE VIEW v_ticket_board_with_access AS
SELECT 
    t.*,
    tc.name as category_name,
    assignee.email as assignee_email,
    requester.email as requester_email,
    -- Check if current user has access
    (
        t.requested_by = auth.uid() 
        OR t.assignee = auth.uid()
        OR EXISTS (
            SELECT 1 FROM ticket_additional_emails tae 
            WHERE tae.ticket_id = t.id AND tae.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM auth.users u 
            WHERE u.id = auth.uid() 
            AND (
                u.raw_user_meta_data->>'role' IN ('admin', 'it_admin', 'hr_admin', 'payroll_admin', 'operations_admin', 'ai_admin')
                OR u.email = 'tickets@othainsoft.com'
            )
        )
    ) as user_has_access
FROM tickets t
LEFT JOIN ticket_categories tc ON t.category_id = tc.id
LEFT JOIN v_user_emails assignee ON t.assignee = assignee.id
LEFT JOIN v_user_emails requester ON t.requested_by = requester.id;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_ticket_additional_emails_updated_at ON ticket_additional_emails;
DROP FUNCTION IF EXISTS update_ticket_additional_emails_updated_at();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_additional_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_additional_emails_updated_at
    BEFORE UPDATE ON ticket_additional_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_additional_emails_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON ticket_additional_emails TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_additional_emails(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_ticket_additional_email(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_ticket_additional_email(UUID) TO authenticated; 