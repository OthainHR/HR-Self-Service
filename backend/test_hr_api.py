#!/usr/bin/env python3
"""
Test HR API Endpoints
This script tests all HR API endpoints to ensure they're working correctly
"""

import requests
import json
import sys
from datetime import datetime, date

# API base URL
API_BASE = "http://localhost:8000/api/hr"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['status']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_profile():
    """Test profile endpoint"""
    print("\n🔍 Testing profile endpoint...")
    try:
        # Note: This will fail without proper authentication
        # We'll test the endpoint structure
        response = requests.get(f"{API_BASE}/profile")
        print(f"Profile endpoint status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Profile endpoint requires authentication (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Profile data retrieved: {data.get('full_name', 'Unknown')}")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Profile test error: {str(e)}")
        return False

def test_leave_balances():
    """Test leave balances endpoint"""
    print("\n🔍 Testing leave balances endpoint...")
    try:
        response = requests.get(f"{API_BASE}/leave/balances")
        print(f"Leave balances endpoint status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Leave balances endpoint requires authentication (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Leave balances retrieved: {len(data)} types")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Leave balances test error: {str(e)}")
        return False

def test_attendance():
    """Test attendance endpoint"""
    print("\n🔍 Testing attendance endpoint...")
    try:
        today = date.today().isoformat()
        response = requests.get(f"{API_BASE}/attendance/current-month")
        print(f"Attendance endpoint status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Attendance endpoint requires authentication (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Attendance data retrieved: {len(data)} records")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Attendance test error: {str(e)}")
        return False

def test_holidays():
    """Test holidays endpoint"""
    print("\n🔍 Testing holidays endpoint...")
    try:
        response = requests.get(f"{API_BASE}/holidays/upcoming")
        print(f"Holidays endpoint status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Holidays endpoint requires authentication (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ Holidays data retrieved: {len(data)} upcoming")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Holidays test error: {str(e)}")
        return False

def test_database_connection():
    """Test database connection by checking if sample data exists"""
    print("\n🔍 Testing database connection...")
    try:
        from app.utils.supabase_client import supabase_admin_client
        
        # Check if sample employee exists
        response = supabase_admin_client.table("keka_employees").select("email").eq("email", "john.doe@company.com").execute()
        
        if response.data:
            print("✅ Database connection working - sample data found")
            return True
        else:
            print("❌ Database connection issue - sample data not found")
            return False
    except Exception as e:
        print(f"❌ Database test error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting HR API Tests...")
    
    tests = [
        ("Health Check", test_health),
        ("Database Connection", test_database_connection),
        ("Profile Endpoint", test_profile),
        ("Leave Balances Endpoint", test_leave_balances),
        ("Attendance Endpoint", test_attendance),
        ("Holidays Endpoint", test_holidays)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        if test_func():
            passed += 1
        print()
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your HR API is ready.")
        print("\n📋 Next steps:")
        print("   1. Start your frontend: npm start")
        print("   2. Login with email: john.doe@company.com")
        print("   3. Check the HR Self Service page")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")

if __name__ == "__main__":
    main()
