#!/usr/bin/env python3
"""
Update sync_status table to include leave_history sync type
"""

import os
import sys
import asyncio
from supabase import create_client, Client

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def update_sync_status():
    """Add leave_history sync type to existing database"""
    
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
        
        print("Adding leave_history sync type to keka_sync_status table...")
        
        # Check if leave_history sync type already exists
        result = supabase.table("keka_sync_status").select("*").eq("sync_type", "leave_history").execute()
        
        if result.data:
            print("✅ leave_history sync type already exists")
            print(f"Current status: {result.data[0]}")
            return True
        
        # Insert leave_history sync type
        result = supabase.table("keka_sync_status").insert({
            "sync_type": "leave_history",
            "sync_status": "pending",
            "records_processed": 0,
            "records_failed": 0
        }).execute()
        
        if result.data:
            print("✅ Successfully added leave_history sync type!")
            print(f"New record: {result.data[0]}")
        else:
            print("❌ Failed to add leave_history sync type")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating sync status: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(update_sync_status())
    sys.exit(0 if success else 1)


