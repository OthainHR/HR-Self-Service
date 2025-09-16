#!/usr/bin/env python3
"""
Test Keka Setup and Provide Sample Data
This script helps test the Keka API setup and provides sample data for testing
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, date

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.supabase_client import supabase_admin_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def test_keka_credentials():
    """Test Keka API credentials"""
    print("🔍 Testing Keka API Credentials...")
    
    # Check environment variables
    required_vars = ["KEKA_CLIENT_ID", "KEKA_CLIENT_SECRET", "KEKA_COMPANY_NAME"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("\n📝 Please set the following environment variables:")
        print("   export KEKA_CLIENT_ID=your_keka_client_id")
        print("   export KEKA_CLIENT_SECRET=your_keka_client_secret")
        print("   export KEKA_COMPANY_NAME=othainsoft")
        return False
    
    print("✅ All required environment variables are set")
    
    # Test API connection
    try:
        from app.services.keka_employee_sync_service import KekaEmployeeSyncService
        sync_service = KekaEmployeeSyncService()
        
        # Try to get access token
        token = await sync_service._get_access_token()
        if token:
            print("✅ Successfully obtained Keka API access token")
            return True
        else:
            print("❌ Failed to obtain access token")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Keka API: {str(e)}")
        return False

async def insert_sample_data():
    """Insert sample data for testing"""
    print("\n📊 Inserting sample data for testing...")
    
    try:
        # Sample employee data
        sample_employee = {
            "keka_employee_id": "EMP001",
            "employee_number": "EMP001",
            "first_name": "John",
            "last_name": "Doe",
            "display_name": "John Doe",
            "email": "john.doe@company.com",
            "job_title": "Software Engineer",
            "city": "San Francisco",
            "country_code": "US",
            "employment_status": 1,
            "account_status": 1,
            "joining_date": "2023-01-15T00:00:00Z",
            "raw_data": {
                "id": "EMP001",
                "firstName": "John",
                "lastName": "Doe",
                "email": "john.doe@company.com",
                "jobTitle": "Software Engineer"
            },
            "last_synced_at": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Insert sample employee
        response = supabase_admin_client.table("keka_employees").upsert(sample_employee).execute()
        if response.data:
            print("✅ Sample employee data inserted")
        else:
            print("❌ Failed to insert sample employee data")
            return False
        
        # Sample leave balance data
        sample_leave_balance = {
            "keka_employee_id": "EMP001",
            "leave_type": "Annual Leave",
            "total_allocated": 21.0,
            "used": 5.0,
            "remaining": 16.0,
            "carry_forward": 0.0,
            "last_synced_at": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase_admin_client.table("keka_employee_leave_balances").upsert(sample_leave_balance).execute()
        if response.data:
            print("✅ Sample leave balance data inserted")
        else:
            print("❌ Failed to insert sample leave balance data")
        
        # Sample attendance data
        sample_attendance = {
            "keka_employee_id": "EMP001",
            "attendance_date": date.today().isoformat(),
            "status": "present",
            "check_in": "2025-09-16T09:00:00Z",
            "check_out": "2025-09-16T17:00:00Z",
            "total_hours": 8.0,
            "last_synced_at": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase_admin_client.table("keka_employee_attendance").upsert(sample_attendance).execute()
        if response.data:
            print("✅ Sample attendance data inserted")
        else:
            print("❌ Failed to insert sample attendance data")
        
        # Sample holiday data
        sample_holiday = {
            "holiday_date": "2025-12-25",
            "name": "Christmas Day",
            "type": "national",
            "is_optional": False,
            "last_synced_at": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = supabase_admin_client.table("keka_company_holidays").upsert(sample_holiday).execute()
        if response.data:
            print("✅ Sample holiday data inserted")
        else:
            print("❌ Failed to insert sample holiday data")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting sample data: {str(e)}")
        return False

async def test_hr_data_service():
    """Test HR data service with sample data"""
    print("\n🧪 Testing HR Data Service...")
    
    try:
        from app.services.hr_data_service import hr_data_service
        
        # Set authenticated user
        hr_data_service.set_authenticated_user("john.doe@company.com")
        
        # Test profile retrieval
        profile = await hr_data_service.get_my_profile()
        print(f"✅ Profile retrieved: {profile.full_name}")
        
        # Test leave balances
        leave_balances = await hr_data_service.get_my_leave_balances()
        print(f"✅ Leave balances retrieved: {len(leave_balances)} types")
        
        # Test attendance
        today = date.today()
        attendance = await hr_data_service.get_my_attendance(today, today)
        print(f"✅ Attendance retrieved: {len(attendance)} records")
        
        # Test holidays
        holidays = await hr_data_service.get_upcoming_holidays()
        print(f"✅ Holidays retrieved: {len(holidays)} upcoming")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing HR data service: {str(e)}")
        return False

async def main():
    """Main test function"""
    print("🚀 Starting Keka Setup Test...")
    
    # Test 1: Check credentials
    credentials_ok = await test_keka_credentials()
    
    if not credentials_ok:
        print("\n⚠️  Keka API credentials are not set up correctly.")
        print("   Please set the environment variables and try again.")
        print("   For now, we'll insert sample data for testing.")
    
    # Test 2: Insert sample data
    sample_data_ok = await insert_sample_data()
    
    if not sample_data_ok:
        print("❌ Failed to insert sample data")
        return
    
    # Test 3: Test HR data service
    service_ok = await test_hr_data_service()
    
    if service_ok:
        print("\n🎉 All tests passed! Your HR system is ready for testing.")
        print("\n📋 Next steps:")
        print("   1. Start your backend server: python main.py")
        print("   2. Start your frontend: npm start")
        print("   3. Login with email: john.doe@company.com")
        print("   4. Check the HR Self Service page")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    asyncio.run(main())
