"""
HR Data Service
Provides HR data access using stored Keka employee data instead of OAuth
"""

import logging
import requests
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import HTTPException, status
from app.models.hr import (
    EmployeeProfile, LeaveBalance, LeaveHistory, AttendanceRecord,
    Payslip, Holiday, KekaMCPResponse, LeaveStatus
)
from app.utils.supabase_client import supabase_admin_client

# Configure logging
logger = logging.getLogger(__name__)

class HRDataService:
    """
    Service to access HR data from stored Keka employee data
    """
    
    def __init__(self):
        self.authenticated_user_email: Optional[str] = None
    
    def set_authenticated_user(self, email: str) -> None:
        """Set the authenticated user's email for this session"""
        if not email or not self._is_valid_email(email):
            raise ValueError("Invalid email address")
        
        self.authenticated_user_email = email
        logger.info(f"Set authenticated user: {email}")
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        return "@" in email and "." in email.split("@")[1]
    
    def _get_keka_headers(self) -> Dict[str, str]:
        """Get Keka API headers"""
        return {
            "accept": "application/json",
            "authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFBRjQzNjk5RUE0NDlDNkNCRUU3NDZFMjhDODM5NUIyMEE0MUNFMTgiLCJ4NXQiOiJHdlEybWVwRW5HeS01MGJpaklPVnNncEJ6aGciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2xvZ2luLmtla2EuY29tIiwibmJmIjoxNzU4MDE5NDY2LCJpYXQiOjE3NTgwMTk0NjYsImV4cCI6MTc1ODEwNTg2NiwiYXVkIjpbImtla2FhcGkiLCJodHRwczovL2xvZ2luLmtla2EuY29tL3Jlc291cmNlcyJdLCJzY29wZSI6WyJrZWthYXBpIl0sImFtciI6WyJrZWthYXBpIl0sImNsaWVudF9pZCI6IjUyNDVhMGRlLTQ3Y2UtNGZhZi1iZGQ4LWMwYWEzNmIxY2Q2MCIsInN1YiI6IjIwYmQzZTMwLWJmNjktNDdhZC04YTUxLTg3ZWU1NmZmOTkwZiIsImF1dGhfdGltZSI6MTc1ODAxOTQ2NiwiaWRwIjoibG9jYWwiLCJ0ZW5hbnRfaWQiOiIyN2U1NGNhNy1mMWI1LTRjNjMtOWYwNi1iNzkwZjI3MmQ5MjgiLCJ0ZW5hbnRpZCI6IjI3ZTU0Y2E3LWYxYjUtNGM2My05ZjA2LWI3OTBmMjcyZDkyOCIsImFwcF9uYW1lIjoiUGF5cm9sbCBBdXRvbWF0aW9uIEtleSIsInN1YmRvbWFpbiI6Im90aGFpbnNvZnQua2VrYS5jb20iLCJqdGkiOiIxNkRBMkFGMDNCMTEwQUNCNTdCMTM0ODkxMzlCNUQwRiJ9.XAkfFvpTeMcZnpokNs-yV6k400z1bQWgKnP2rAV8N5wAV1X0YAN3_1WspYgGsnpIJTw1gPpw1BiehQu8wKbbWv5H2OVMl30yDGlU4G2YH14iiJDO0sNZdLaoZ_7IFbduw2U4hRT2zc5tsLXlgcCP3IMKlHBxXwgcydu1YQJNU-jvw3J54112BCxMPc_t9Y028f_fCKvHnS9Snk7wsytzpPIYT5myWviCxVS_ceiUsiA-DbEqi7sMIWbLuWAEmNljXf8aK2SwIfh9YKE56yfmMHjAQaZpFNAdGwJchZAAJxE1YV59IwSpA1nOiqPsx9jdAAFcjuJYrKb_b3Y6tgQqCA"
        }
    
    async def _fetch_keka_leave_balance(self, employee_id: str) -> List[Dict[str, Any]]:
        """Fetch leave balance from Keka API"""
        try:
            url = f"https://othainsoft.keka.com/api/v1/time/leavebalance?employeeIds={employee_id}"
            headers = self._get_keka_headers()
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get("succeeded") and data.get("data"):
                return data["data"][0]["leaveBalance"]  # Get the first employee's leave balance
            else:
                logger.warning(f"No leave balance data found for employee {employee_id}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to fetch leave balance from Keka API: {str(e)}")
            return []
    
    async def _get_employee_by_email(self, email: str) -> Dict[str, Any]:
        """Get employee data by email"""
        try:
            response = supabase_admin_client.table("keka_employees").select("*").eq("email", email).eq("account_status", 1).execute()
            
            if not response.data or len(response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee not found with email: {email}"
                )
            
            # Return the first matching employee
            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get employee by email {email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve employee information"
            )
    
    async def get_my_profile(self) -> EmployeeProfile:
        """Get the authenticated user's profile"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            
            return EmployeeProfile(
                employee_id=employee_data["keka_employee_id"],
                email=employee_data["email"],
                full_name=employee_data["display_name"] or f"{employee_data['first_name']} {employee_data['last_name']}".strip(),
                designation=employee_data["job_title"] or "",
                department=employee_data.get("groups", [{}])[0].get("title") if employee_data.get("groups") else "",
                manager=f"{employee_data['reports_to_first_name']} {employee_data['reports_to_last_name']}".strip() if employee_data.get("reports_to_first_name") else None,
                join_date=datetime.fromisoformat(employee_data["joining_date"]).date() if employee_data.get("joining_date") else None,
                phone=employee_data.get("work_phone") or employee_data.get("mobile_phone"),
                address=employee_data.get("current_address"),
                employee_status="active" if employee_data.get("account_status") == 1 else "inactive"
            )
        except Exception as e:
            logger.error(f"Failed to get profile for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve employee profile"
            )
    
    async def get_my_raw_profile(self) -> Dict[str, Any]:
        """Get the authenticated user's raw profile data from Keka"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            return employee_data
        except Exception as e:
            logger.error(f"Failed to get raw profile for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve raw employee data"
            )
    
    async def get_my_leave_balances(self, leave_type: Optional[str] = None) -> List[LeaveBalance]:
        """Get leave balances for the authenticated user from Keka API"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            # Fetch real leave balance data from Keka API
            keka_leave_data = await self._fetch_keka_leave_balance(employee_id)
            
            if not keka_leave_data:
                logger.warning(f"No leave balance data found for employee {employee_id}")
                return []
            
            # Convert Keka API data to our LeaveBalance model
            leave_balances = []
            for leave in keka_leave_data:
                # Skip leave types with negative or zero annual quota (like Unpaid Leave)
                if leave.get("annualQuota", 0) <= 0:
                    continue
                    
                # Filter by leave type if specified
                if leave_type and leave.get("leaveTypeName", "").lower() != leave_type.lower():
                    continue
                
                leave_balances.append(LeaveBalance(
                    leave_type=leave.get("leaveTypeName", "Unknown"),
                    total_allocated=float(leave.get("annualQuota", 0)),
                    used=float(leave.get("consumedAmount", 0)),
                    remaining=float(leave.get("availableBalance", 0)),
                    carry_forward=float(leave.get("accruedAmount", 0)) - float(leave.get("consumedAmount", 0)) if leave.get("accruedAmount", 0) > leave.get("consumedAmount", 0) else 0
                ))
            
            return leave_balances
            
        except Exception as e:
            logger.error(f"Failed to get leave balances for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leave balances"
            )
    
    async def get_my_leave_history(self, from_date: Optional[date] = None, to_date: Optional[date] = None) -> List[LeaveHistory]:
        """Get leave history for the authenticated user"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            query = supabase_admin_client.table("keka_employee_leave_history").select("*").eq("keka_employee_id", employee_id)
            
            if from_date:
                query = query.gte("from_date", from_date.isoformat())
            if to_date:
                query = query.lte("to_date", to_date.isoformat())
            
            response = query.order("applied_date", desc=True).execute()
            leave_requests = response.data
            
            return [
                LeaveHistory(
                    id=leave["leave_request_id"],
                    leave_type=leave["leave_type"],
                    from_date=datetime.fromisoformat(leave["from_date"]).date() if leave.get("from_date") else None,
                    to_date=datetime.fromisoformat(leave["to_date"]).date() if leave.get("to_date") else None,
                    days_count=float(leave["days_count"]) if leave.get("days_count") else 0,
                    reason=leave.get("reason"),
                    status=LeaveStatus(leave["status"].lower()) if leave.get("status") else LeaveStatus.PENDING,
                    applied_date=datetime.fromisoformat(leave["applied_date"]) if leave.get("applied_date") else None,
                    approved_date=datetime.fromisoformat(leave["approved_date"]) if leave.get("approved_date") else None,
                    approved_by=leave.get("approved_by"),
                    comments=leave.get("comments")
                ) for leave in leave_requests
            ]
        except Exception as e:
            logger.error(f"Failed to get leave history for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leave history"
            )
    
    async def get_my_attendance(self, from_date: date, to_date: date) -> List[AttendanceRecord]:
        """Get attendance records for the authenticated user"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            response = supabase_admin_client.table("keka_employee_attendance").select("*").eq("keka_employee_id", employee_id).gte("attendance_date", from_date.isoformat()).lte("attendance_date", to_date.isoformat()).order("attendance_date", desc=True).execute()
            
            records = response.data
            
            return [
                AttendanceRecord(
                    date=datetime.fromisoformat(record["attendance_date"]).date(),
                    status=record["status"].lower(),
                    check_in=datetime.fromisoformat(record["check_in"].replace('Z', '+00:00')) if record.get("check_in") else None,
                    check_out=datetime.fromisoformat(record["check_out"].replace('Z', '+00:00')) if record.get("check_out") else None,
                    break_hours=float(record["break_hours"]) if record.get("break_hours") else None,
                    total_hours=float(record["total_hours"]) if record.get("total_hours") else None,
                    overtime_hours=float(record["overtime_hours"]) if record.get("overtime_hours") else None,
                    location=record.get("location")
                ) for record in records
            ]
        except Exception as e:
            logger.error(f"Failed to get attendance for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve attendance records"
            )
    
    async def get_my_payslip(self, month: int, year: int) -> Payslip:
        """Get payslip for specific month and year"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            # Find payslip for the requested month/year
            response = supabase_admin_client.table("keka_employee_payslips").select("*").eq("keka_employee_id", employee_id).execute()
            
            payslips = response.data
            target_payslip = None
            
            for payslip in payslips:
                if payslip.get("start_date"):
                    try:
                        start_date = datetime.fromisoformat(payslip["start_date"]).date()
                        if start_date.month == month and start_date.year == year:
                            target_payslip = payslip
                            break
                    except Exception:
                        continue
            
            if not target_payslip:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Payslip not found for {month}/{year}"
                )
            
            return Payslip(
                employee_id=employee_id,
                month=month,
                year=year,
                pay_period=target_payslip.get("pay_period", ""),
                gross_salary=float(target_payslip.get("gross_amount", 0)),
                net_salary=float(target_payslip.get("net_amount", 0)),
                total_deductions=float(target_payslip.get("gross_amount", 0)) - float(target_payslip.get("net_amount", 0)),
                earnings=target_payslip.get("earnings", []),
                deductions=target_payslip.get("deductions", []),
                ytd_gross=None,  # Not available in current schema
                ytd_net=None     # Not available in current schema
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get payslip for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve payslip"
            )
    
    async def get_upcoming_holidays(self, year: Optional[int] = None) -> List[Holiday]:
        """Get upcoming company holidays"""
        try:
            if not year:
                year = datetime.now().year
            
            today = date.today()
            year_end = date(year, 12, 31)
            
            response = supabase_admin_client.table("keka_company_holidays").select("*").gte("holiday_date", today.isoformat()).lte("holiday_date", year_end.isoformat()).order("holiday_date").execute()
            
            holidays = response.data
            
            return [
                Holiday(
                    date=datetime.fromisoformat(holiday["holiday_date"]).date(),
                    name=holiday["name"],
                    type=holiday.get("type", "company"),
                    is_optional=holiday.get("is_optional", False)
                ) for holiday in holidays
            ]
        except Exception as e:
            logger.error(f"Failed to get holidays: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve holidays"
            )
    
    async def get_leave_types(self) -> List[Dict[str, Any]]:
        """Get available leave types from leave balances"""
        try:
            response = supabase_admin_client.table("keka_employee_leave_balances").select("leave_type").execute()
            
            # Get unique leave types
            leave_types = list(set([balance["leave_type"] for balance in response.data if balance.get("leave_type")]))
            
            return [{"name": leave_type, "identifier": leave_type} for leave_type in leave_types]
        except Exception as e:
            logger.error(f"Failed to get leave types: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leave types"
            )
    
    def _format_address(self, address_data: Optional[Dict[str, Any]]) -> Optional[str]:
        """Format address data into a readable string"""
        if not address_data:
            return None
        
        address_parts = []
        if address_data.get("addressLine1"):
            address_parts.append(address_data["addressLine1"])
        if address_data.get("addressLine2"):
            address_parts.append(address_data["addressLine2"])
        if address_data.get("city"):
            address_parts.append(address_data["city"])
        if address_data.get("state"):
            address_parts.append(address_data["state"])
        if address_data.get("zip"):
            address_parts.append(address_data["zip"])
        if address_data.get("countryCode"):
            address_parts.append(address_data["countryCode"])
        
        return ", ".join(address_parts) if address_parts else None

# Global instance
hr_data_service = HRDataService()
