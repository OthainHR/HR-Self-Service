"""
Keka API Service - Direct API Key Authentication
Generates tokens on-demand using grant_type=kekaapi
No OAuth flow required
"""

import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from app.utils.supabase_client import supabase_admin_client

logger = logging.getLogger(__name__)

class KekaAPIService:
    """
    Direct Keka API service using API key authentication
    Tokens are generated on-demand for each request
    """
    
    def __init__(self):
        # Load from environment
        self.api_key = os.getenv("KEKA_API_KEY")
        self.client_id = os.getenv("KEKA_CLIENT_ID")
        self.client_secret = os.getenv("KEKA_CLIENT_SECRET")
        self.company_name = os.getenv("KEKA_COMPANY_NAME")
        self.environment = os.getenv("KEKA_ENVIRONMENT", "keka")
        
        # Construct URLs
        if self.environment == 'keka':
            self.token_endpoint = "https://login.keka.com/connect/token"
            self.api_base_url = f"https://{self.company_name}.keka.com/api/v1"
        else:
            self.token_endpoint = f"https://login.{self.environment}.com/connect/token"
            self.api_base_url = f"https://{self.company_name}.{self.environment}.com/api/v1"
        
        logger.info(f"Keka API Service initialized for {self.company_name} ({self.environment})")
    
    async def generate_access_token(self) -> Optional[str]:
        """
        Generate a fresh access token using API credentials
        This token is NOT cached and should be generated for each session
        
        Returns:
            Access token string or None if failed
        """
        try:
            if not all([self.client_id, self.client_secret, self.api_key]):
                logger.error("Keka API credentials not configured in environment")
                return None
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_endpoint,
                    data={
                        "grant_type": "kekaapi",
                        "scope": "kekaapi",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "api_key": self.api_key
                    },
                    headers={
                        "accept": "application/json",
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    token_data = response.json()
                    access_token = token_data.get("access_token")
                    expires_in = token_data.get("expires_in", 3600)
                    
                    logger.info(f"Successfully generated Keka access token (expires in {expires_in}s)")
                    return access_token
                else:
                    logger.error(f"Failed to generate token: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception generating Keka token: {str(e)}")
            return None
    
    async def get_employee_by_id(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """
        Get employee data by ID
        
        Args:
            employee_id: Keka employee ID
            
        Returns:
            Employee data dict or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/hris/employees/{employee_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get employee: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting employee {employee_id}: {str(e)}")
            return None
    
    async def get_employee_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get employee data by email
        
        Args:
            email: Employee email address
            
        Returns:
            Employee data dict or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/hris/employees"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params={"email": email},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    employees = data if isinstance(data, list) else data.get('data', [])
                    
                    if employees and len(employees) > 0:
                        return employees[0]
                    else:
                        logger.warning(f"No employee found with email: {email}")
                        return None
                else:
                    logger.error(f"Failed to search employees: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception searching for employee {email}: {str(e)}")
            return None
    
    async def get_leave_balance(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """
        Get leave balance for employee
        
        Args:
            employee_id: Keka employee ID
            
        Returns:
            Leave balance data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/time/leavebalance"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params={"employeeId": employee_id},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get leave balance: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting leave balance for {employee_id}: {str(e)}")
            return None
    
    async def get_attendance(self, employee_id: str, from_date: str = None, to_date: str = None) -> Optional[Dict[str, Any]]:
        """
        Get attendance records for employee
        
        Args:
            employee_id: Keka employee ID
            from_date: Start date (YYYY-MM-DD)
            to_date: End date (YYYY-MM-DD)
            
        Returns:
            Attendance data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/time/attendance"
            params = {"employeeId": employee_id}
            
            if from_date:
                params["from"] = from_date
            if to_date:
                params["to"] = to_date
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get attendance: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting attendance for {employee_id}: {str(e)}")
            return None
    
    async def get_leave_requests(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """
        Get leave requests for employee
        
        Args:
            employee_id: Keka employee ID
            
        Returns:
            Leave requests data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/time/leaverequests"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params={"employeeId": employee_id},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get leave requests: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting leave requests for {employee_id}: {str(e)}")
            return None
    
    async def get_leave_types(self) -> Optional[Dict[str, Any]]:
        """
        Get all leave types configured in Keka
        
        Returns:
            Leave types data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/time/leavetypes"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get leave types: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting leave types: {str(e)}")
            return None
    
    async def apply_leave(self, employee_id: str, leave_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Apply for leave
        
        Args:
            employee_id: Keka employee ID
            leave_data: Leave application data
            
        Returns:
            Response data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/time/leaverequests"
            
            # Add employee ID to leave data
            request_data = {**leave_data, "employeeId": employee_id}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json",
                        "content-type": "application/json"
                    },
                    json=request_data,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"Failed to apply leave: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception applying leave for {employee_id}: {str(e)}")
            return None
    
    async def get_payroll_salaries(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """
        Get salary information for employee
        
        Args:
            employee_id: Keka employee ID
            
        Returns:
            Salary data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            url = f"{self.api_base_url}/payroll/salaries"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params={"employeeId": employee_id},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get salaries: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting salaries for {employee_id}: {str(e)}")
            return None
    
    async def get_holidays(self, year: int = None) -> Optional[Dict[str, Any]]:
        """
        Get company holidays
        
        Args:
            year: Year for holidays (optional)
            
        Returns:
            Holidays data or None
        """
        try:
            access_token = await self.generate_access_token()
            if not access_token:
                return None
            
            # Note: Keka holidays endpoint requires calendar ID
            # You may need to get this from your Keka configuration
            calendar_id = os.getenv("KEKA_CALENDAR_ID", "default")
            url = f"{self.api_base_url}/time/holidayscalendar/{calendar_id}/holidays"
            
            params = {}
            if year:
                params["year"] = year
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "accept": "application/json"
                    },
                    params=params if params else None,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get holidays: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Exception getting holidays: {str(e)}")
            return None
    
    async def get_employee_id_from_email(self, email: str) -> Optional[str]:
        """
        Helper method to get employee ID from email
        Checks cache first, then fetches from API
        
        Args:
            email: Employee email
            
        Returns:
            Employee ID or None
        """
        try:
            # Check cache first
            response = supabase_admin_client.table("keka_employee_cache")\
                .select("employee_id, cache_expires_at")\
                .eq("user_email", email)\
                .single()\
                .execute()
            
            if response.data:
                cache_expires_at = datetime.fromisoformat(response.data["cache_expires_at"])
                if cache_expires_at > datetime.now():
                    logger.info(f"Using cached employee ID for {email}")
                    return response.data["employee_id"]
        except Exception as e:
            logger.debug(f"No cached employee ID for {email}: {str(e)}")
        
        # Fetch from API
        employee_data = await self.get_employee_by_email(email)
        if not employee_data:
            return None
        
        employee_id = employee_data.get("id")
        
        # Cache the result
        try:
            cache_expires_at = datetime.now() + timedelta(hours=24)
            supabase_admin_client.table("keka_employee_cache").upsert({
                "user_email": email,
                "employee_id": employee_id,
                "employee_data": employee_data,
                "cache_expires_at": cache_expires_at.isoformat(),
                "updated_at": datetime.now().isoformat()
            }, on_conflict="user_email").execute()
        except Exception as e:
            logger.warning(f"Failed to cache employee data: {str(e)}")
        
        return employee_id


# Global instance
keka_api_service = KekaAPIService()

