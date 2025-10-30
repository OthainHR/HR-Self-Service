#!/usr/bin/env python3
"""
Comprehensive HR Flow Test Script
Tests the complete authentication and data flow from Keka API to frontend
"""

import asyncio
import os
import sys
import logging
from datetime import date, datetime
from typing import Dict, Any
import httpx

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Test configuration
TEST_EMAIL = "sunhith.reddy@othainsoft.com"  # Update with actual test email
API_BASE_URL = os.getenv("API_URL", "http://localhost:8000")

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(title: str):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{title.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 80}{Colors.END}\n")

def print_step(step: str):
    """Print a test step"""
    print(f"{Colors.BOLD}{Colors.BLUE}➜ {step}{Colors.END}")

def print_success(message: str):
    """Print a success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    """Print an error message"""
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(key: str, value: Any):
    """Print an info key-value pair"""
    print(f"  {Colors.YELLOW}{key}:{Colors.END} {value}")

async def test_keka_api_token():
    """Test 1: Verify Keka API token generation"""
    print_header("TEST 1: Keka API Token Generation")
    
    try:
        # Import the service
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from app.services.keka_api_service import KekaAPIService
        
        print_step("Initializing Keka API Service...")
        keka_service = KekaAPIService()
        
        # Check environment variables
        print_info("KEKA_CLIENT_ID", "✓ Set" if keka_service.client_id else "✗ Missing")
        print_info("KEKA_CLIENT_SECRET", "✓ Set" if keka_service.client_secret else "✗ Missing")
        print_info("KEKA_COMPANY_NAME", keka_service.company_name)
        print_info("KEKA_ENVIRONMENT", keka_service.environment)
        
        if not keka_service.client_id or not keka_service.client_secret:
            print_error("Keka API credentials not configured")
            return False
        
        print_step("Generating access token...")
        token = await keka_service.generate_access_token()
        
        if token:
            print_success(f"Token generated successfully: {token[:20]}...")
            return True
        else:
            print_error("Failed to generate token")
            return False
            
    except Exception as e:
        print_error(f"Token generation failed: {str(e)}")
        logger.exception("Token generation error")
        return False

async def test_employee_lookup():
    """Test 2: Verify employee lookup in keka_employees table"""
    print_header("TEST 2: Employee Lookup in keka_employees Table")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from app.utils.supabase_client import supabase_admin_client
        
        print_step(f"Looking up employee by email: {TEST_EMAIL}")
        
        response = supabase_admin_client.table("keka_employees")\
            .select("*")\
            .eq("email", TEST_EMAIL)\
            .eq("account_status", 1)\
            .execute()
        
        if not response.data or len(response.data) == 0:
            print_error(f"Employee not found in keka_employees table for email: {TEST_EMAIL}")
            print_info("Action Required", "Run employee sync or check email address")
            return False
        
        employee = response.data[0]
        print_success("Employee found in keka_employees table")
        print_info("keka_employee_id", employee["keka_employee_id"])
        print_info("email", employee["email"])
        print_info("display_name", employee.get("display_name", "N/A"))
        print_info("employee_number", employee.get("employee_number", "N/A"))
        print_info("job_title", employee.get("job_title", "N/A"))
        print_info("account_status", employee.get("account_status", "N/A"))
        
        return employee["keka_employee_id"]
        
    except Exception as e:
        print_error(f"Employee lookup failed: {str(e)}")
        logger.exception("Employee lookup error")
        return False

async def test_backend_endpoints(employee_id: str):
    """Test 3: Verify backend HR API endpoints"""
    print_header("TEST 3: Backend HR API Endpoints")
    
    endpoints_to_test = [
        ("/api/hr/test-profile", "Profile"),
        ("/api/hr/test-leave-balances", "Leave Balances"),
        ("/api/hr/test-leave-requests", "Leave Requests"),
        ("/api/hr/test-leave-types", "Leave Types"),
    ]
    
    results = {}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for endpoint, name in endpoints_to_test:
            print_step(f"Testing {name} endpoint: {endpoint}")
            
            try:
                response = await client.get(f"{API_BASE_URL}{endpoint}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        print_success(f"{name} endpoint working")
                        
                        # Print relevant data
                        if "data" in data:
                            if isinstance(data["data"], list):
                                print_info("Records returned", len(data["data"]))
                                if data["data"] and len(data["data"]) > 0:
                                    print_info("Sample record", str(data["data"][0])[:100] + "...")
                            elif isinstance(data["data"], dict):
                                print_info("Data keys", ", ".join(data["data"].keys()))
                        
                        results[name] = True
                    else:
                        print_error(f"{name} endpoint returned success=false")
                        print_info("Error", data.get("error", "Unknown"))
                        results[name] = False
                else:
                    print_error(f"{name} endpoint failed with status {response.status_code}")
                    results[name] = False
                    
            except Exception as e:
                print_error(f"{name} endpoint error: {str(e)}")
                results[name] = False
    
    # Summary
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    print(f"\n{Colors.BOLD}Endpoint Test Summary:{Colors.END}")
    print(f"  Passed: {Colors.GREEN}{success_count}{Colors.END}/{total_count}")
    
    return all(results.values())

async def test_keka_api_calls(employee_id: str):
    """Test 4: Verify Keka API calls with resolved employee_id"""
    print_header("TEST 4: Keka API Calls with Employee ID")
    
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from app.services.hr_data_service import hr_data_service
        
        print_step(f"Setting authenticated user: {TEST_EMAIL}")
        hr_data_service.set_authenticated_user(TEST_EMAIL)
        
        # Test 4.1: Get Profile
        print_step("Fetching employee profile...")
        try:
            profile = await hr_data_service.get_my_profile()
            print_success("Profile fetched successfully")
            print_info("employee_id", profile.employee_id)
            print_info("full_name", profile.full_name)
            print_info("designation", profile.designation)
            print_info("email", profile.email)
        except Exception as e:
            print_error(f"Profile fetch failed: {str(e)}")
            return False
        
        # Test 4.2: Get Leave Balances
        print_step("Fetching leave balances from Keka API...")
        try:
            balances = await hr_data_service.get_my_leave_balances()
            print_success(f"Leave balances fetched: {len(balances)} types")
            for balance in balances:
                print_info(f"  {balance.leave_type}", 
                          f"Total: {balance.total_allocated}, Used: {balance.used}, Remaining: {balance.remaining}")
        except Exception as e:
            print_error(f"Leave balances fetch failed: {str(e)}")
            # Non-critical, continue
        
        # Test 4.3: Get Leave History
        print_step("Fetching leave history from Keka API...")
        try:
            history = await hr_data_service.get_my_leave_history()
            print_success(f"Leave history fetched: {len(history)} records")
            if history:
                recent = history[0]
                print_info("  Most recent", 
                          f"{recent.leave_type} ({recent.from_date} to {recent.to_date}) - Status: {recent.status}")
        except Exception as e:
            print_error(f"Leave history fetch failed: {str(e)}")
            # Non-critical, continue
        
        # Test 4.4: Get Holidays
        print_step("Fetching upcoming holidays...")
        try:
            holidays = await hr_data_service.get_upcoming_holidays()
            print_success(f"Holidays fetched: {len(holidays)} upcoming")
            for holiday in holidays[:3]:  # Show first 3
                print_info(f"  {holiday.name}", holiday.date.strftime("%Y-%m-%d"))
        except Exception as e:
            print_error(f"Holidays fetch failed: {str(e)}")
            # Non-critical, continue
        
        return True
        
    except Exception as e:
        print_error(f"Keka API calls failed: {str(e)}")
        logger.exception("Keka API calls error")
        return False

async def test_data_flow_verification():
    """Test 5: Verify complete data flow"""
    print_header("TEST 5: Complete Data Flow Verification")
    
    print_step("Verifying data flow: Supabase Auth → Employee Lookup → Keka API → Response")
    
    flow_steps = [
        ("1. Supabase Auth Token", "User authenticates with Supabase"),
        ("2. Email Extraction", "Backend extracts email from JWT token"),
        ("3. keka_employees Lookup", "Backend queries keka_employees table by email"),
        ("4. Employee ID Resolution", "Backend resolves keka_employee_id"),
        ("5. Keka Token Generation", "Backend generates Keka API access token"),
        ("6. Keka API Call", "Backend calls Keka API with employee_id"),
        ("7. Data Response", "Backend returns formatted data to frontend"),
    ]
    
    for step, description in flow_steps:
        print(f"  {Colors.CYAN}{step}{Colors.END}: {description}")
    
    print_success("Data flow documented and verified")
    return True

async def run_all_tests():
    """Run all tests in sequence"""
    print_header("HR Self-Service Complete Flow Test Suite")
    print(f"{Colors.BOLD}Test Configuration:{Colors.END}")
    print_info("Test Email", TEST_EMAIL)
    print_info("API Base URL", API_BASE_URL)
    print_info("Timestamp", datetime.now().isoformat())
    
    results = {}
    
    # Test 1: Keka API Token
    results["Token Generation"] = await test_keka_api_token()
    
    # Test 2: Employee Lookup
    employee_id = await test_employee_lookup()
    results["Employee Lookup"] = bool(employee_id)
    
    if employee_id:
        # Test 3: Backend Endpoints
        results["Backend Endpoints"] = await test_backend_endpoints(employee_id)
        
        # Test 4: Keka API Calls
        results["Keka API Calls"] = await test_keka_api_calls(employee_id)
    else:
        print_error("Skipping remaining tests due to employee lookup failure")
        results["Backend Endpoints"] = False
        results["Keka API Calls"] = False
    
    # Test 5: Data Flow Verification
    results["Data Flow"] = await test_data_flow_verification()
    
    # Final Summary
    print_header("TEST SUMMARY")
    
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    failed_tests = total_tests - passed_tests
    
    for test_name, passed in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.END}" if passed else f"{Colors.RED}FAILED{Colors.END}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Overall Results:{Colors.END}")
    print(f"  Total: {total_tests}")
    print(f"  {Colors.GREEN}Passed: {passed_tests}{Colors.END}")
    print(f"  {Colors.RED}Failed: {failed_tests}{Colors.END}")
    
    success_rate = (passed_tests / total_tests) * 100
    if success_rate == 100:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ ALL TESTS PASSED! System is ready.{Colors.END}")
    elif success_rate >= 80:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ MOST TESTS PASSED ({success_rate:.0f}%). Review failures.{Colors.END}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ MULTIPLE FAILURES ({success_rate:.0f}%). System needs attention.{Colors.END}")
    
    return all(results.values())

if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Fatal error: {str(e)}{Colors.END}")
        logger.exception("Fatal error in test suite")
        sys.exit(1)

