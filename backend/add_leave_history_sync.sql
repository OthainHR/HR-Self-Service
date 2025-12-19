-- Add leave_history sync type to existing keka_sync_status table
-- This script only adds the new sync type without recreating existing tables

-- Update the comment for sync_type column to include leave_history
COMMENT ON COLUMN keka_sync_status.sync_type IS 'Type of data being synced (employees, leave_balances, attendance, leave_history, payslips, holidays, holiday_calendars)';

-- Insert initial sync status record for leave_history if it doesn't exist
INSERT INTO keka_sync_status (sync_type, sync_status, records_processed, records_failed)
SELECT 'leave_history', 'pending', 0, 0
WHERE NOT EXISTS (
    SELECT 1 FROM keka_sync_status WHERE sync_type = 'leave_history'
);

-- Verify the change
SELECT sync_type, sync_status, last_sync_at, records_processed, records_failed 
FROM keka_sync_status 
WHERE sync_type = 'leave_history';
