#!/usr/bin/env python3
"""
Test script to verify Keka global endpoints work
"""

import asyncio
import os
import sys
from datetime import date, timedelta

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.keka_employee_sync_service import keka_employee_sync_service

async def test_global_endpoints():
    """Test the global endpoints for leave balances and attendance"""
    
    print("Testing Keka global endpoints...")
    
    try:
        # Test leave balances sync
        print("\n1. Testing leave balances sync...")
        result = await keka_employee_sync_service.sync_employee_leave_balances()
        print(f"Leave balances sync result: {result}")
        
        # Test attendance sync (last 7 days)
        print("\n2. Testing attendance sync...")
        today = date.today()
        week_ago = today - timedelta(days=7)
        result = await keka_employee_sync_service.sync_employee_attendance(week_ago, today)
        print(f"Attendance sync result: {result}")
        
        # Test leave history sync (last 30 days)
        print("\n3. Testing leave history sync...")
        month_ago = today - timedelta(days=30)
        result = await keka_employee_sync_service.sync_employee_leave_history(month_ago, today)
        print(f"Leave history sync result: {result}")
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    # Check if required environment variables are set
    required_vars = ["KEKA_CLIENT_ID", "KEKA_CLIENT_SECRET", "KEKA_COMPANY_NAME"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {missing_vars}")
        print("Please set the following environment variables:")
        print("  KEKA_CLIENT_ID - Your Keka API client ID")
        print("  KEKA_CLIENT_SECRET - Your Keka API client secret")
        print("  KEKA_COMPANY_NAME - Your Keka company name (e.g., othainsoft)")
        sys.exit(1)
    
    success = asyncio.run(test_global_endpoints())
    sys.exit(0 if success else 1)


