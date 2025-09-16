#!/usr/bin/env python3
"""
Apply leave_history sync type update to existing database
"""

import os
import sys
import asyncio
from supabase import create_client, Client

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def apply_leave_history_update():
    """Apply the leave_history sync type update"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return False
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("Applying leave_history sync type update...")
        
        # Update the comment for sync_type column
        result = supabase.rpc('exec_sql', {
            'sql': """
                COMMENT ON COLUMN keka_sync_status.sync_type IS 'Type of data being synced (employees, leave_balances, attendance, leave_history, payslips, holidays, holiday_calendars)';
            """
        }).execute()
        
        # Insert initial sync status record for leave_history if it doesn't exist
        result = supabase.rpc('exec_sql', {
            'sql': """
                INSERT INTO keka_sync_status (sync_type, sync_status, records_processed, records_failed)
                SELECT 'leave_history', 'pending', 0, 0
                WHERE NOT EXISTS (
                    SELECT 1 FROM keka_sync_status WHERE sync_type = 'leave_history'
                );
            """
        }).execute()
        
        # Verify the change
        result = supabase.table("keka_sync_status").select("*").eq("sync_type", "leave_history").execute()
        
        if result.data:
            print("✅ Leave history sync type added successfully!")
            print(f"Sync status: {result.data[0]}")
        else:
            print("❌ Failed to add leave history sync type")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error applying update: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(apply_leave_history_update())
    sys.exit(0 if success else 1)

