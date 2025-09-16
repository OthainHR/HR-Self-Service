-- Simple SQL to add leave_history sync type to existing database
-- Run this in your Supabase SQL editor or psql

-- Insert leave_history sync type if it doesn't exist
INSERT INTO keka_sync_status (sync_type, sync_status, records_processed, records_failed)
SELECT 'leave_history', 'pending', 0, 0
WHERE NOT EXISTS (
    SELECT 1 FROM keka_sync_status WHERE sync_type = 'leave_history'
);

-- Verify the change
SELECT sync_type, sync_status, last_sync_at, records_processed, records_failed 
FROM keka_sync_status 
WHERE sync_type = 'leave_history';
