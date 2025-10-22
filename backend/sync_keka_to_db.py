"""
Sync Keka Data to Database
Run this script to sync all employee data from Keka API to the database
Then the frontend will read from the database instead of making live API calls
"""

import asyncio
import os
import sys
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.keka_api_service import keka_api_service
from app.services.keka_db_cache_service import keka_db_cache_service
from dotenv import load_dotenv

load_dotenv()


async def sync_employee_data(email: str):
    """Sync a single employee's data from Keka to database"""
    print(f"\n{'='*60}")
    print(f"Syncing data for: {email}")
    print(f"{'='*60}")
    
    try:
        # 1. Get employee data from Keka
        print("\n1. Fetching employee profile...")
        employee_data = await keka_api_service.get_employee_by_email(email)
        
        if not employee_data:
            print(f"❌ Employee not found in Keka: {email}")
            return False
        
        print(f"✅ Found employee: {employee_data.get('displayName', email)}")
        
        # Cache employee data
        await keka_db_cache_service.cache_employee_data(employee_data)
        print(f"✅ Cached employee profile data")
        
        employee_id = employee_data.get('id')
        
        # 2. Get and cache leave balances
        print("\n2. Fetching leave balances...")
        try:
            leave_balances = await keka_api_service.get_leave_balances(employee_id)
            if leave_balances:
                # Cache leave balances
                await keka_db_cache_service.cache_leave_balances(employee_id, leave_balances)
                print(f"✅ Cached {len(leave_balances.get('data', []))} leave balance records")
        except Exception as e:
            print(f"⚠️  Could not fetch leave balances: {str(e)}")
        
        # 3. Get and cache attendance (last 30 days)
        print("\n3. Fetching attendance data (last 30 days)...")
        try:
            to_date = date.today()
            from_date = to_date - timedelta(days=30)
            attendance_data = await keka_api_service.get_attendance(employee_id, from_date, to_date)
            if attendance_data:
                # Cache attendance
                await keka_db_cache_service.cache_attendance(employee_id, attendance_data)
                print(f"✅ Cached attendance records")
        except Exception as e:
            print(f"⚠️  Could not fetch attendance: {str(e)}")
        
        # 4. Get and cache company holidays
        print("\n4. Fetching company holidays...")
        try:
            current_year = datetime.now().year
            holidays_data = await keka_api_service.get_holidays(current_year)
            if holidays_data:
                # Cache holidays
                await keka_db_cache_service.cache_holidays(holidays_data)
                print(f"✅ Cached company holidays for {current_year}")
        except Exception as e:
            print(f"⚠️  Could not fetch holidays: {str(e)}")
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully synced all data for {email}")
        print(f"{'='*60}\n")
        return True
        
    except Exception as e:
        print(f"\n❌ Error syncing employee {email}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def sync_all_employees():
    """Sync all employees from the users table"""
    print("\n" + "="*60)
    print("KEKA TO DATABASE SYNC")
    print("="*60)
    
    # Get all user emails from the database
    try:
        result = keka_db_cache_service.supabase.table('users').select('email').execute()
        user_emails = [row['email'] for row in result.data]
        
        print(f"\nFound {len(user_emails)} users to sync")
        
        success_count = 0
        fail_count = 0
        
        for email in user_emails:
            success = await sync_employee_data(email)
            if success:
                success_count += 1
            else:
                fail_count += 1
        
        print("\n" + "="*60)
        print("SYNC COMPLETE")
        print("="*60)
        print(f"✅ Successfully synced: {success_count}")
        print(f"❌ Failed: {fail_count}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error fetching users: {str(e)}")
        import traceback
        traceback.print_exc()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sync Keka data to database')
    parser.add_argument('--email', type=str, help='Sync specific employee email')
    parser.add_argument('--all', action='store_true', help='Sync all employees')
    
    args = parser.parse_args()
    
    if args.email:
        await sync_employee_data(args.email)
    elif args.all:
        await sync_all_employees()
    else:
        # Default: sync current user from env or prompt
        email = os.getenv('USER_EMAIL') or input("Enter employee email to sync: ")
        await sync_employee_data(email)


if __name__ == "__main__":
    asyncio.run(main())

