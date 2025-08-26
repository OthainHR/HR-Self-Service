"""
Keka MCP Service for ESS Integration
Handles all Keka API interactions with email-based authentication using per-user tokens
"""

import os
import json
import asyncio
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, date, timedelta
from fastapi import HTTPException
import httpx
from app.models.hr import (
    EmployeeProfile, LeaveBalance, LeaveHistory, AttendanceRecord,
    Payslip, Holiday, KekaMCPResponse, LeaveApplication, LeaveStatus
)
from app.services.keka_token_service import keka_token_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KekaMCPServer:
    """
    Keka MCP Server for ESS Integration  
    Provides email-based authentication and employee-specific HR tools using per-user tokens
    """
    
    def __init__(self):
        # Keka API Configuration
        self.api_base_url = os.getenv("KEKA_API_BASE_URL", "https://api.keka.com/v1")
        
        # Current user context
        self.authenticated_user_email: Optional[str] = None
        
        # Employee ID cache for email-to-ID mapping (per user)
        self.employee_cache: Dict[str, str] = {}
        
        # Rate limiting (per user)
        self.request_count: Dict[str, Dict] = {}
        self.rate_limit_per_minute = 50

    def set_authenticated_user(self, email: str) -> None:
        """Set the authenticated user's email for this session"""
        if not email or not self._is_valid_email(email):
            raise ValueError("Invalid email address")
        
        self.authenticated_user_email = email
        logger.info(f"Set authenticated user: {email}")

    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        return "@" in email and "." in email.split("@")[1]

    async def _ensure_authenticated(self) -> str:
        """Ensure we have a valid access token for the current user and return it"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")

        # Check if user is authenticated with Keka
        is_authenticated = await keka_token_service.is_user_authenticated(self.authenticated_user_email)
        if not is_authenticated:
            auth_url = keka_token_service.get_authorization_url()
            raise HTTPException(
                status_code=401, 
                detail=f"User not authenticated with Keka. Please visit: {auth_url}"
            )

        # Get valid tokens (will refresh if needed)
        tokens = await keka_token_service.ensure_valid_tokens(self.authenticated_user_email)
        if not tokens:
            raise HTTPException(
                status_code=401, 
                detail="Failed to obtain valid Keka authentication tokens"
            )

        return tokens.access_token

    def _check_rate_limit(self, email: str) -> None:
        """Check and enforce rate limiting per user"""
        current_time = datetime.now()
        
        if email not in self.request_count:
            self.request_count[email] = {"count": 0, "reset_time": current_time + timedelta(minutes=1)}
        
        user_data = self.request_count[email]
        
        if current_time > user_data["reset_time"]:
            user_data["count"] = 0
            user_data["reset_time"] = current_time + timedelta(minutes=1)
        
        if user_data["count"] >= self.rate_limit_per_minute:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        user_data["count"] += 1

    async def get_employee_id_by_email(self, email: str) -> str:
        """Get employee ID by email with caching and database storage"""
        # Check cache first
        if email in self.employee_cache:
            return self.employee_cache[email]
        
        # Check database cache
        try:
            from app.utils.supabase_client import supabase_admin_client
            
            cache_response = supabase_admin_client.table("keka_employee_cache").select("employee_id, employee_data, cache_expires_at").eq("user_email", email).single().execute()
            
            if cache_response.data:
                cache_expires_at = datetime.fromisoformat(cache_response.data["cache_expires_at"])
                if cache_expires_at > datetime.now():
                    employee_id = cache_response.data["employee_id"]
                    self.employee_cache[email] = employee_id
                    return employee_id
        except Exception as e:
            logger.debug(f"Database cache miss for employee lookup: {str(e)}")
        
        # Fetch from API
        access_token = await self._ensure_authenticated()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base_url}/employees",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    params={"email": email}
                )
                
                if response.status_code == 200:
                    employees = response.json()
                    if employees and len(employees) > 0:
                        employee_data = employees[0]
                        employee_id = employee_data["id"]
                        
                        # Cache in memory
                        self.employee_cache[email] = employee_id
                        
                        # Cache in database (expires in 24 hours)
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
                    else:
                        raise HTTPException(status_code=404, detail=f"Employee not found with email: {email}")
                else:
                    logger.error(f"Employee lookup failed: {response.status_code} - {response.text}")
                    raise HTTPException(status_code=response.status_code, detail="Failed to fetch employee data")
                    
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during employee lookup: {str(e)}")
            raise HTTPException(status_code=500, detail="Employee lookup service unavailable")

    async def _make_keka_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Keka API"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        self._check_rate_limit(self.authenticated_user_email)
        access_token = await self._ensure_authenticated()
        
        start_time = datetime.now()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await getattr(client, method.lower())(
                    f"{self.api_base_url}/{endpoint.lstrip('/')}",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        **kwargs.get("headers", {})
                    },
                    **{k: v for k, v in kwargs.items() if k != "headers"}
                )
                
                # Log API usage for monitoring
                response_time = int((datetime.now() - start_time).total_seconds() * 1000)
                await self._log_api_usage(endpoint, method, response.status_code, response_time)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 404:
                    raise HTTPException(status_code=404, detail="Resource not found")
                elif response.status_code == 403:
                    raise HTTPException(status_code=403, detail="Access denied")
                elif response.status_code == 401:
                    # Token might be invalid, try refreshing
                    logger.warning(f"401 error for {self.authenticated_user_email}, attempting token refresh")
                    refreshed_tokens = await keka_token_service.refresh_user_tokens(self.authenticated_user_email)
                    if refreshed_tokens:
                        # Retry the request with new token
                        response = await getattr(client, method.lower())(
                            f"{self.api_base_url}/{endpoint.lstrip('/')}",
                            headers={
                                "Authorization": f"Bearer {refreshed_tokens.access_token}",
                                "Content-Type": "application/json",
                                **kwargs.get("headers", {})
                            },
                            **{k: v for k, v in kwargs.items() if k != "headers"}
                        )
                        if response.status_code == 200:
                            return response.json()
                    
                    raise HTTPException(status_code=401, detail="Keka authentication failed")
                else:
                    logger.error(f"Keka API error: {response.status_code} - {response.text}")
                    raise HTTPException(status_code=response.status_code, detail="Keka API request failed")
                    
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Keka request: {str(e)}")
            await self._log_api_usage(endpoint, method, 500, (datetime.now() - start_time).total_seconds() * 1000, str(e))
            raise HTTPException(status_code=500, detail="Keka service unavailable")

    async def _log_api_usage(self, endpoint: str, method: str, status_code: int, response_time: int, error_message: Optional[str] = None):
        """Log API usage for monitoring and analytics"""
        try:
            from app.utils.supabase_client import supabase_admin_client
            
            supabase_admin_client.table("keka_api_usage").insert({
                "user_email": self.authenticated_user_email,
                "endpoint": endpoint,
                "method": method.upper(),
                "status_code": status_code,
                "response_time_ms": int(response_time),
                "error_message": error_message,
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            # Don't fail the main request if logging fails
            logger.warning(f"Failed to log API usage: {str(e)}")

    # Employee Profile Methods
    async def get_my_profile(self) -> EmployeeProfile:
        """Get the authenticated user's profile"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        data = await self._make_keka_request("GET", f"/employees/{employee_id}")
        
        return EmployeeProfile(
            employee_id=data["id"],
            email=data["email"],
            full_name=data["fullName"],
            designation=data.get("designation", ""),
            department=data.get("department", ""),
            manager=data.get("manager", {}).get("fullName") if data.get("manager") else None,
            join_date=datetime.strptime(data["joinDate"], "%Y-%m-%d").date(),
            phone=data.get("phone"),
            address=data.get("address"),
            employee_status=data.get("status", "active")
        )

    # Leave Management Methods
    async def get_my_leave_balances(self, leave_type: Optional[str] = None) -> List[LeaveBalance]:
        """Get leave balances for the authenticated user"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        
        params = {"employee_id": employee_id}
        if leave_type:
            params["leave_type"] = leave_type
            
        data = await self._make_keka_request("GET", "/leave-balances", params=params)
        
        return [
            LeaveBalance(
                leave_type=balance["leaveType"],
                total_allocated=balance["totalAllocated"],
                used=balance["used"],
                remaining=balance["remaining"],
                carry_forward=balance.get("carryForward")
            ) for balance in data
        ]

    async def get_my_leave_history(self, from_date: Optional[date] = None, 
                                 to_date: Optional[date] = None) -> List[LeaveHistory]:
        """Get leave history for the authenticated user"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        
        params = {"employee_id": employee_id}
        if from_date:
            params["from_date"] = from_date.isoformat()
        if to_date:
            params["to_date"] = to_date.isoformat()
            
        data = await self._make_keka_request("GET", "/leave-applications", params=params)
        
        return [
            LeaveHistory(
                id=leave["id"],
                leave_type=leave["leaveType"],
                from_date=datetime.strptime(leave["fromDate"], "%Y-%m-%d").date(),
                to_date=datetime.strptime(leave["toDate"], "%Y-%m-%d").date(),
                days_count=leave["daysCount"],
                reason=leave["reason"],
                status=LeaveStatus(leave["status"].lower()),
                applied_date=datetime.fromisoformat(leave["appliedDate"]),
                approved_date=datetime.fromisoformat(leave["approvedDate"]) if leave.get("approvedDate") else None,
                approved_by=leave.get("approvedBy", {}).get("fullName") if leave.get("approvedBy") else None,
                comments=leave.get("comments")
            ) for leave in data
        ]

    async def apply_my_leave(self, leave_application: LeaveApplication) -> Dict[str, Any]:
        """Apply for leave for the authenticated user"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        
        payload = {
            "employee_id": employee_id,
            "leave_type": leave_application.leave_type,
            "from_date": leave_application.from_date.isoformat(),
            "to_date": leave_application.to_date.isoformat(),
            "reason": leave_application.reason,
            "is_half_day": leave_application.is_half_day
        }
        
        if leave_application.is_half_day and leave_application.half_day_type:
            payload["half_day_type"] = leave_application.half_day_type
            
        data = await self._make_keka_request("POST", "/leave-applications", json=payload)
        
        return {
            "application_id": data["id"],
            "status": data["status"],
            "message": "Leave application submitted successfully"
        }

    # Attendance Methods
    async def get_my_attendance(self, from_date: date, to_date: date) -> List[AttendanceRecord]:
        """Get attendance records for the authenticated user"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        
        params = {
            "employee_id": employee_id,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat()
        }
        
        data = await self._make_keka_request("GET", "/attendance", params=params)
        
        return [
            AttendanceRecord(
                date=datetime.strptime(record["date"], "%Y-%m-%d").date(),
                status=record["status"],
                check_in=datetime.fromisoformat(record["checkIn"]) if record.get("checkIn") else None,
                check_out=datetime.fromisoformat(record["checkOut"]) if record.get("checkOut") else None,
                break_hours=record.get("breakHours"),
                total_hours=record.get("totalHours"),
                overtime_hours=record.get("overtimeHours"),
                location=record.get("location")
            ) for record in data
        ]

    # Payslip Methods
    async def get_my_payslip(self, month: int, year: int) -> Payslip:
        """Get payslip for the authenticated user"""
        employee_id = await self.get_employee_id_by_email(self.authenticated_user_email)
        
        params = {
            "employee_id": employee_id,
            "month": month,
            "year": year
        }
        
        data = await self._make_keka_request("GET", "/payslips", params=params)
        
        if not data:
            raise HTTPException(status_code=404, detail=f"Payslip not found for {month}/{year}")
        
        payslip_data = data[0] if isinstance(data, list) else data
        
        return Payslip(
            employee_id=payslip_data["employeeId"],
            month=payslip_data["month"],
            year=payslip_data["year"],
            pay_period=payslip_data["payPeriod"],
            gross_salary=payslip_data["grossSalary"],
            net_salary=payslip_data["netSalary"],
            total_deductions=payslip_data["totalDeductions"],
            earnings=payslip_data["earnings"],
            deductions=payslip_data["deductions"],
            ytd_gross=payslip_data.get("ytdGross"),
            ytd_net=payslip_data.get("ytdNet")
        )

    # General Information Methods
    async def get_leave_types(self) -> List[Dict[str, Any]]:
        """Get available leave types"""
        data = await self._make_keka_request("GET", "/leave-types")
        return data

    async def get_upcoming_holidays(self, year: Optional[int] = None) -> List[Holiday]:
        """Get upcoming company holidays"""
        if not year:
            year = datetime.now().year
            
        params = {"year": year}
        data = await self._make_keka_request("GET", "/holidays", params=params)
        
        return [
            Holiday(
                date=datetime.strptime(holiday["date"], "%Y-%m-%d").date(),
                name=holiday["name"],
                type=holiday.get("type", "company"),
                is_optional=holiday.get("isOptional", False)
            ) for holiday in data
        ]

# Global instance
keka_mcp_service = KekaMCPServer()
