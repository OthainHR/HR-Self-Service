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
from app.services.keka_token_service import keka_token_service

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
    
    async def _get_keka_headers(self) -> Dict[str, str]:
        """Get Keka API headers with valid token"""
        if not self.authenticated_user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Get valid tokens for the user
        tokens = await keka_token_service.ensure_valid_tokens(self.authenticated_user_email)
        if not tokens or not tokens.access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Keka authentication required. Please connect your Keka account."
            )
        
        return {
            "accept": "application/json",
            "authorization": f"Bearer {tokens.access_token}"
        }
    
    async def _fetch_keka_leave_balance(self, employee_id: str) -> List[Dict[str, Any]]:
        """Fetch leave balance from Keka API"""
        try:
            url = f"https://othainsoft.keka.com/api/v1/time/leavebalance?employeeIds={employee_id}"
            headers = await self._get_keka_headers()
            
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
    
    async def _fetch_keka_leave_requests(self, employee_id: str) -> List[Dict[str, Any]]:
        """Fetch leave requests from Keka API"""
        try:
            url = f"https://othainsoft.keka.com/api/v1/time/leaverequests?employeeIds={employee_id}"
            headers = await self._get_keka_headers()
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"Keka leave requests API response: {data}")
            if data.get("succeeded") and data.get("data"):
                logger.info(f"Found {len(data['data'])} leave requests for employee {employee_id}")
                logger.info(f"Pagination info: page {data.get('pageNumber', 1)} of {data.get('totalPages', 1)}, total records: {data.get('totalRecords', 0)}")
                return data["data"]
            else:
                logger.warning(f"No leave requests found for employee {employee_id}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to fetch leave requests from Keka API: {str(e)}")
            return []
    
    async def _fetch_keka_leave_types(self) -> List[Dict[str, Any]]:
        """Fetch leave types from Keka API"""
        try:
            url = "https://othainsoft.keka.com/api/v1/time/leavetypes"
            headers = await self._get_keka_headers()
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get("succeeded") and data.get("data"):
                return data["data"]
            else:
                logger.warning("No leave types found")
                return []
                
        except Exception as e:
            logger.error(f"Failed to fetch leave types from Keka API: {str(e)}")
            return []
    
    async def _create_keka_leave_request(self, employee_id: str, leave_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a leave request in Keka API"""
        try:
            url = "https://othainsoft.keka.com/api/v1/time/leaverequests"
            headers = await self._get_keka_headers()
            headers["content-type"] = "application/*+json"
            
            # Prepare the request data according to Keka API format
            # Convert date strings to proper datetime format for Keka API
            from datetime import datetime
            from_date_dt = datetime.fromisoformat(leave_data["from_date"].replace('Z', '+00:00'))
            to_date_dt = datetime.fromisoformat(leave_data["to_date"].replace('Z', '+00:00'))
            
            request_data = {
                "employeeId": employee_id,
                "requestedBy": employee_id,
                "fromDate": from_date_dt.isoformat(),
                "toDate": to_date_dt.isoformat(),
                "fromSession": leave_data.get("from_session", 0),  # 0 = First Half, 1 = Second Half
                "toSession": leave_data.get("to_session", 0),
                "leaveTypeId": leave_data["leave_type_id"],
                "reason": leave_data["reason"],
                "note": leave_data.get("note", "")
            }
            
            response = requests.post(url, headers=headers, json=request_data)
            
            # Log the request details for debugging
            logger.info(f"Keka API Request URL: {url}")
            logger.info(f"Keka API Request Headers: {headers}")
            logger.info(f"Keka API Request Data: {request_data}")
            logger.info(f"Keka API Response Status: {response.status_code}")
            logger.info(f"Keka API Response Text: {response.text}")
            
            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"Keka API Error {response.status_code}: {error_detail}")
                return {"success": False, "error": f"Keka API Error {response.status_code}: {error_detail}"}
            
            data = response.json()
            if data.get("succeeded"):
                return {"success": True, "data": data}
            else:
                return {"success": False, "error": data.get("message", "Failed to create leave request")}
                
        except Exception as e:
            logger.error(f"Failed to create leave request in Keka API: {str(e)}")
            return {"success": False, "error": str(e)}
    
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
    
    async def get_my_leave_requests(self) -> List[Dict[str, Any]]:
        """Get leave requests for the authenticated user from Keka API"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            # Fetch real leave requests data from Keka API
            keka_leave_requests = await self._fetch_keka_leave_requests(employee_id)
            
            # Process the data to match the frontend expectations
            processed_requests = []
            for request in keka_leave_requests:
                try:
                    # Parse dates - handle ISO format with timezone
                    from_date_str = request["fromDate"].replace('Z', '+00:00')
                    to_date_str = request["toDate"].replace('Z', '+00:00')
                    applied_date_str = request["requestedOn"].replace('Z', '+00:00')
                    
                    from_date_parsed = datetime.fromisoformat(from_date_str).date()
                    to_date_parsed = datetime.fromisoformat(to_date_str).date()
                    applied_date_parsed = datetime.fromisoformat(applied_date_str)
                    
                    # Extract leave type from selection array
                    leave_type = "Unknown"
                    if request.get("selection") and len(request["selection"]) > 0:
                        leave_type = request["selection"][0].get("leaveTypeName", "Unknown")
                    
                    # Map status (1 = approved, 0 = pending, 2 = rejected, etc.)
                    status_map = {0: "pending", 1: "approved", 2: "rejected", 3: "cancelled"}
                    status = status_map.get(request.get("status", 0), "pending")
                    
                    processed_requests.append({
                        "id": request["id"],
                        "leaveTypeName": leave_type,
                        "fromDate": from_date_parsed.isoformat(),
                        "toDate": to_date_parsed.isoformat(),
                        "appliedDate": applied_date_parsed.isoformat(),
                        "createdDate": applied_date_parsed.isoformat(),
                        "status": status,
                        "reason": request.get("leaveReason") or request.get("note", "") or "No reason provided",
                        "note": request.get("note", ""),
                        "daysCount": request["selection"][0].get("count", 1) if request.get("selection") else 1
                    })
                except Exception as e:
                    logger.warning(f"Failed to process leave request {request.get('id', 'unknown')}: {str(e)}")
                    continue
            
            # Sort by applied date descending
            processed_requests.sort(key=lambda x: x["appliedDate"], reverse=True)
            
            return processed_requests
            
        except Exception as e:
            logger.error(f"Failed to get leave requests for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leave requests"
            )
    
    async def get_leave_types(self) -> List[Dict[str, Any]]:
        """Get leave types from Keka API"""
        try:
            # Fetch real leave types data from Keka API
            keka_leave_types = await self._fetch_keka_leave_types()
            
            return keka_leave_types
            
        except Exception as e:
            logger.error(f"Failed to get leave types: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve leave types"
            )
    
    async def create_leave_request(self, leave_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a leave request for the authenticated user"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            # Create leave request in Keka API
            result = await self._create_keka_leave_request(employee_id, leave_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to create leave request for {self.authenticated_user_email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create leave request"
            )
    
    async def get_my_leave_history(self, from_date: Optional[date] = None, to_date: Optional[date] = None) -> List[LeaveHistory]:
        """Get leave history for the authenticated user"""
        if not self.authenticated_user_email:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        try:
            employee_data = await self._get_employee_by_email(self.authenticated_user_email)
            employee_id = employee_data["keka_employee_id"]
            
            # Fetch live data from Keka API instead of database
            keka_leave_requests = await self._fetch_keka_leave_requests(employee_id)
            
            # Convert to LeaveHistory objects
            leave_history = []
            for request in keka_leave_requests:
                try:
                    # Parse dates - handle ISO format with timezone
                    from_date_str = request["fromDate"].replace('Z', '+00:00')
                    to_date_str = request["toDate"].replace('Z', '+00:00')
                    applied_date_str = request["requestedOn"].replace('Z', '+00:00')
                    
                    from_date_parsed = datetime.fromisoformat(from_date_str).date()
                    to_date_parsed = datetime.fromisoformat(to_date_str).date()
                    applied_date_parsed = datetime.fromisoformat(applied_date_str)
                    
                    # Apply date filters
                    if from_date and from_date_parsed < from_date:
                        continue
                    if to_date and from_date_parsed > to_date:
                        continue
                    
                    # Extract leave type from selection array
                    leave_type = "Unknown"
                    if request.get("selection") and len(request["selection"]) > 0:
                        leave_type = request["selection"][0].get("leaveTypeName", "Unknown")
                    
                    # Map status (1 = approved, 0 = pending, 2 = rejected, etc.)
                    status_map = {0: LeaveStatus.PENDING, 1: LeaveStatus.APPROVED, 2: LeaveStatus.REJECTED, 3: LeaveStatus.CANCELLED}
                    status = status_map.get(request.get("status", 0), LeaveStatus.PENDING)
                    
                    # Debug logging
                    logger.info(f"Processing leave request {request['id']}: status={request.get('status')} -> {status}")
                    
                    leave_history.append(LeaveHistory(
                        id=request["id"],
                        leave_type=leave_type,
                        from_date=from_date_parsed,
                        to_date=to_date_parsed,
                        days_count=request["selection"][0].get("count", 1) if request.get("selection") else 1,
                        reason=request.get("leaveReason") or request.get("note", "") or "No reason provided",
                        status=status,
                        applied_date=applied_date_parsed,
                        approved_date=datetime.fromisoformat(request["lastActionTakenOn"].replace('Z', '+00:00')) if request.get("lastActionTakenOn") and status == LeaveStatus.APPROVED else None,
                        approved_by=None,  # Not available in this API response
                        comments=request.get("note", "")
                    ))
                except Exception as e:
                    logger.warning(f"Failed to parse leave request {request.get('id', 'unknown')}: {str(e)}")
                    continue
            
            # Sort by applied date descending
            leave_history.sort(key=lambda x: x.applied_date, reverse=True)
            
            return leave_history
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
