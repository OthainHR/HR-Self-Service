#!/usr/bin/env python3
"""
Simple HR Flow Test Script
Tests the employee lookup and data flow without external dependencies
"""

import asyncio
import os
import sys
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

class Colors:
    """ANSI color codes"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{title.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}\n")

def print_step(step: str):
    print(f"{Colors.BOLD}{Colors.BLUE}➜ {step}{Colors.END}")

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(key: str, value):
    print(f"  {Colors.YELLOW}{key}:{Colors.END} {value}")

async def test_employee_lookup():
    """Test employee lookup in keka_employees table"""
    print_header("Employee Lookup Test")
    
    TEST_EMAIL = "sunhith.reddy@othainsoft.com"
    
    try:
        from app.utils.supabase_client import supabase_admin_client
        
        print_step(f"Looking up employee by email: {TEST_EMAIL}")
        
        response = supabase_admin_client.table("keka_employees")\
            .select("*")\
            .eq("email", TEST_EMAIL)\
            .eq("account_status", 1)\
            .execute()
        
        if not response.data or len(response.data) == 0:
            print_error(f"Employee not found in keka_employees table")
            print_info("Checked email", TEST_EMAIL)
            print_info("Action", "Run employee sync: python backend/sync_employees.py")
            return False, None
        
        employee = response.data[0]
        print_success("Employee found in keka_employees table!")
        print_info("keka_employee_id", employee["keka_employee_id"])
        print_info("email", employee["email"])
        print_info("display_name", employee.get("display_name", "N/A"))
        print_info("employee_number", employee.get("employee_number", "N/A"))
        print_info("job_title", employee.get("job_title", "N/A"))
        print_info("department", employee.get("groups", [{}])[0].get("title", "N/A") if employee.get("groups") else "N/A")
        print_info("account_status", "Active" if employee.get("account_status") == 1 else "Inactive")
        print_info("last_synced", employee.get("last_synced_at", "N/A"))
        
        return True, employee
        
    except Exception as e:
        print_error(f"Employee lookup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

async def test_hr_data_service(email: str, employee_id: str):
    """Test HR data service with employee lookup"""
    print_header("HR Data Service Test")
    
    try:
        from app.services.hr_data_service import hr_data_service
        
        print_step(f"Setting authenticated user: {email}")
        hr_data_service.set_authenticated_user(email)
        print_success("User authenticated")
        
        # Test profile fetch
        print_step("Fetching employee profile...")
        try:
            profile = await hr_data_service.get_my_profile()
            print_success("Profile fetched successfully!")
            print_info("employee_id", profile.employee_id)
            print_info("full_name", profile.full_name)
            print_info("email", profile.email)
            print_info("designation", profile.designation)
            print_info("department", profile.department or "N/A")
            print_info("manager", profile.manager or "N/A")
            print_info("join_date", profile.join_date or "N/A")
        except Exception as e:
            print_error(f"Profile fetch failed: {str(e)}")
            return False
        
        # Test leave balances
        print_step("Fetching leave balances from Keka API...")
        try:
            balances = await hr_data_service.get_my_leave_balances()
            print_success(f"Leave balances fetched: {len(balances)} types")
            for balance in balances:
                print_info(
                    f"  {balance.leave_type}",
                    f"Total: {balance.total_allocated}, Used: {balance.used}, Remaining: {balance.remaining}"
                )
        except Exception as e:
            print_error(f"Leave balances fetch failed: {str(e)}")
            # Non-critical
        
        # Test holidays
        print_step("Fetching upcoming holidays...")
        try:
            holidays = await hr_data_service.get_upcoming_holidays()
            print_success(f"Holidays fetched: {len(holidays)} upcoming")
            for holiday in holidays[:5]:
                print_info(f"  {holiday.date.strftime('%Y-%m-%d')}", holiday.name)
        except Exception as e:
            print_error(f"Holidays fetch failed: {str(e)}")
            # Non-critical
        
        return True
        
    except Exception as e:
        print_error(f"HR data service test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def test_keka_token():
    """Test Keka API token generation"""
    print_header("Keka API Token Test")
    
    try:
        from app.services.keka_api_service import KekaAPIService
        
        print_step("Initializing Keka API Service...")
        keka_service = KekaAPIService()
        
        print_info("KEKA_CLIENT_ID", "✓ Set" if keka_service.client_id else "✗ Missing")
        print_info("KEKA_CLIENT_SECRET", "✓ Set" if keka_service.client_secret else "✗ Missing")
        print_info("KEKA_COMPANY_NAME", keka_service.company_name)
        print_info("KEKA_ENVIRONMENT", keka_service.environment)
        print_info("Token Endpoint", keka_service.token_endpoint)
        print_info("API Base URL", keka_service.api_base_url)
        
        if not keka_service.client_id or not keka_service.client_secret:
            print_error("Keka API credentials not configured in environment")
            return False
        
        print_step("Generating Keka API access token...")
        token = await keka_service.generate_access_token()
        
        if token:
            print_success(f"Token generated successfully: {token[:30]}...")
            return True
        else:
            print_error("Failed to generate token")
            return False
            
    except Exception as e:
        print_error(f"Keka token test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

async def run_all_tests():
    """Run all tests"""
    print_header("HR Self-Service Flow Test Suite")
    print_info("Timestamp", datetime.now().isoformat())
    print_info("Python Version", sys.version.split()[0])
    
    results = {}
    
    # Test 1: Keka Token
    print("\n")
    results["Keka Token"] = await test_keka_token()
    
    # Test 2: Employee Lookup
    print("\n")
    employee_found, employee_data = await test_employee_lookup()
    results["Employee Lookup"] = employee_found
    
    # Test 3: HR Data Service
    if employee_found and employee_data:
        print("\n")
        results["HR Data Service"] = await test_hr_data_service(
            employee_data["email"],
            employee_data["keka_employee_id"]
        )
    else:
        print_error("Skipping HR Data Service test (employee not found)")
        results["HR Data Service"] = False
    
    # Summary
    print_header("TEST SUMMARY")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.END}" if result else f"{Colors.RED}FAILED{Colors.END}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Results:{Colors.END}")
    print(f"  Total: {total}")
    print(f"  {Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"  {Colors.RED}Failed: {failed}{Colors.END}")
    
    success_rate = (passed / total) * 100 if total > 0 else 0
    
    if success_rate == 100:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED! System is working correctly.{Colors.END}")
    elif success_rate >= 60:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ PARTIAL SUCCESS ({success_rate:.0f}%). Review failures.{Colors.END}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ MULTIPLE FAILURES ({success_rate:.0f}%). System needs attention.{Colors.END}")
    
    print(f"\n{Colors.CYAN}Data Flow:{Colors.END}")
    print("  1. User logs in → Supabase Auth Token")
    print("  2. Frontend sends request → Backend with Auth Token")
    print("  3. Backend extracts email → Looks up keka_employees table")
    print("  4. Backend resolves keka_employee_id → Generates Keka API token")
    print("  5. Backend calls Keka API → Gets employee data")
    print("  6. Backend returns data → Frontend displays")
    
    return all(results.values())

if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Fatal error: {str(e)}{Colors.END}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

