"""
Test Keka API Direct Token Generation
Run this to verify your Keka API credentials are working
"""

import os
import sys
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_token_generation():
    """Test generating Keka API token"""
    
    # Get credentials from environment
    api_key = os.getenv("KEKA_API_KEY")
    client_id = os.getenv("KEKA_CLIENT_ID")
    client_secret = os.getenv("KEKA_CLIENT_SECRET")
    company_name = os.getenv("KEKA_COMPANY_NAME")
    environment = os.getenv("KEKA_ENVIRONMENT", "keka")
    
    print("=" * 60)
    print("KEKA API TOKEN GENERATION TEST")
    print("=" * 60)
    
    # Check if credentials are set
    print("\n1. Checking Environment Variables...")
    print(f"   KEKA_API_KEY: {'✓ SET' if api_key else '✗ NOT SET'}")
    print(f"   KEKA_CLIENT_ID: {'✓ SET' if client_id else '✗ NOT SET'}")
    print(f"   KEKA_CLIENT_SECRET: {'✓ SET' if client_secret else '✗ NOT SET'}")
    print(f"   KEKA_COMPANY_NAME: {company_name or '✗ NOT SET'}")
    print(f"   KEKA_ENVIRONMENT: {environment}")
    
    if not all([api_key, client_id, client_secret, company_name]):
        print("\n❌ ERROR: Missing required environment variables!")
        print("\nRequired in .env file:")
        print("KEKA_API_KEY=your_api_key")
        print("KEKA_CLIENT_ID=your_client_id")
        print("KEKA_CLIENT_SECRET=your_client_secret")
        print("KEKA_COMPANY_NAME=your_company")
        print("KEKA_ENVIRONMENT=keka")
        return False
    
    # Construct token endpoint
    if environment == 'keka':
        token_endpoint = "https://login.keka.com/connect/token"
        api_base_url = f"https://{company_name}.keka.com/api/v1"
    else:
        token_endpoint = f"https://login.{environment}.com/connect/token"
        api_base_url = f"https://{company_name}.{environment}.com/api/v1"
    
    print(f"\n2. Token Endpoint: {token_endpoint}")
    print(f"3. API Base URL: {api_base_url}")
    
    # Try to generate token
    print("\n4. Generating Access Token...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "kekaapi",
                    "scope": "kekaapi",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "api_key": api_key
                },
                headers={
                    "accept": "application/json",
                    "content-type": "application/x-www-form-urlencoded"
                },
                timeout=30.0
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get("access_token")
                expires_in = token_data.get("expires_in")
                
                print(f"   ✓ Token Generated Successfully!")
                print(f"   Token Type: {token_data.get('token_type')}")
                print(f"   Expires In: {expires_in} seconds ({expires_in/3600:.1f} hours)")
                print(f"   Access Token (first 50 chars): {access_token[:50]}...")
                
                # Test the token with an API call
                print("\n5. Testing Token with Keka API...")
                test_url = f"{api_base_url}/hris/employees"
                
                test_response = await client.get(
                    test_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params={"email": "sunhith.reddy@othainsoft.com"},  # Test with your email
                    timeout=30.0
                )
                
                print(f"   API Test Status: {test_response.status_code}")
                
                if test_response.status_code == 200:
                    employees = test_response.json()
                    print(f"   ✓ API Call Successful!")
                    print(f"   Employees Found: {len(employees) if isinstance(employees, list) else 'N/A'}")
                    
                    if isinstance(employees, list) and len(employees) > 0:
                        emp = employees[0]
                        print(f"   Employee: {emp.get('fullName')} (ID: {emp.get('id')})")
                else:
                    print(f"   ✗ API Call Failed: {test_response.text}")
                    return False
                
                # Test leave balance endpoint
                if isinstance(employees, list) and len(employees) > 0:
                    employee_id = employees[0].get('id')
                    print(f"\n6. Testing Leave Balance Endpoint...")
                    print(f"   Employee ID: {employee_id}")
                    
                    leave_url = f"{api_base_url}/time/leavebalance"
                    leave_response = await client.get(
                        leave_url,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "accept": "application/json"
                        },
                        params={"employeeId": employee_id},
                        timeout=30.0
                    )
                    
                    print(f"   Status: {leave_response.status_code}")
                    
                    if leave_response.status_code == 200:
                        leave_data = leave_response.json()
                        print(f"   ✓ Leave Balance Retrieved!")
                        print(f"   Response Keys: {list(leave_data.keys()) if isinstance(leave_data, dict) else 'N/A'}")
                        
                        # Show structure
                        if isinstance(leave_data, dict) and 'data' in leave_data:
                            data_list = leave_data['data']
                            if isinstance(data_list, list) and len(data_list) > 0:
                                first_emp = data_list[0]
                                print(f"   Employee Balances: {len(first_emp.get('leaveBalance', []))} leave types")
                                for balance in first_emp.get('leaveBalance', [])[:3]:  # Show first 3
                                    leave_type = balance.get('leaveType', {}).get('name', 'Unknown')
                                    remaining = balance.get('remaining', 0)
                                    print(f"     - {leave_type}: {remaining} days remaining")
                    else:
                        print(f"   ✗ Leave Balance Failed: {leave_response.text}")
                
                print("\n" + "=" * 60)
                print("✅ ALL TESTS PASSED!")
                print("=" * 60)
                print("\nYour Keka API integration is working correctly.")
                print("If the HR dashboard still shows empty data, check:")
                print("1. Backend logs for errors")
                print("2. Frontend network tab for failed API calls")
                print("3. Employee email matches Keka records exactly")
                return True
                
            else:
                print(f"   ✗ Token Generation Failed!")
                print(f"   Response: {response.text}")
                print("\n❌ ERROR: Could not generate access token")
                print("\nPossible issues:")
                print("1. Invalid API credentials")
                print("2. Wrong environment (keka vs kekademo)")
                print("3. API key not activated in Keka")
                return False
                
    except Exception as e:
        print(f"   ✗ Exception: {str(e)}")
        print("\n❌ ERROR: Exception occurred during token generation")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_token_generation())
    sys.exit(0 if result else 1)

