"""
HR Data Service - Direct API Key Method
Uses direct Keka API calls with on-demand token generation
No OAuth required
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import HTTPException, status

from app.models.hr import (
    EmployeeProfile, LeaveBalance, LeaveHistory, AttendanceRecord,
    Payslip, Holiday
)
from app.services.keka_api_service import keka_api_service
from app.services.keka_db_cache_service import keka_db_cache_service

logger = logging.getLogger(__name__)

class HRDataServiceDirect:
    """
    Service to access HR data using direct Keka API key authentication
    """
    
    def __init__(self):
        self.authenticated_user_email: Optional[str] = None
        self.cached_employee_id: Optional[str] = None
    
    def set_authenticated_user(self, email: str) -> None:
        """Set the authenticated user's email for this session"""
        if not email or "@" not in email:
            raise ValueError("Invalid email address")
        
        self.authenticated_user_email = email
        self.cached_employee_id = None  # Reset cache
        logger.info(f"Set authenticated user: {email}")
    
    async def _get_employee_id(self) -> str:
        """Get employee ID for the authenticated user from DATABASE"""
        if not self.authenticated_user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Return cached ID if available
        if self.cached_employee_id:
            return self.cached_employee_id
        
        # ** NEW: Get from database first **
        cache_service = keka_db_cache_service
        if cache_service and cache_service.supabase:
            try:
                cached_employee = await cache_service.get_cached_employee_by_email(self.authenticated_user_email)
                if cached_employee and cached_employee.get("keka_employee_id"):
                    employee_id = cached_employee.get("keka_employee_id")
                    logger.info(f"Found employee ID {employee_id} in database for {self.authenticated_user_email}")
                    self.cached_employee_id = employee_id
                    return employee_id
            except Exception as e:
                logger.warning(f"Failed to get employee ID from database: {str(e)}")
        
        # Fallback: Fetch employee ID from Keka API
        logger.info(f"Employee not found in database, fetching from Keka API for {self.authenticated_user_email}")
        employee_id = await keka_api_service.get_employee_id_from_email(self.authenticated_user_email)
        
        if not employee_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee not found with email: {self.authenticated_user_email}"
            )
        
        self.cached_employee_id = employee_id
        return employee_id
    
    async def get_my_profile(self) -> EmployeeProfile:
        """Get employee profile from DATABASE"""
        try:
            # Step 1: Get employee ID from database by email
            if not self.authenticated_user_email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not authenticated"
                )
            
            # Step 2: Get employee data from DATABASE
            cache_service = keka_db_cache_service
            if cache_service and cache_service.supabase:
                try:
                    cached_employee = await cache_service.get_cached_employee_by_email(self.authenticated_user_email)
                    if cached_employee:
                        logger.info(f"Found employee profile in DATABASE for {self.authenticated_user_email}")
                        
                        # Map database fields to Keka API format
                        employee_data = {
                            "id": cached_employee.get("keka_employee_id"),
                            "employeeNumber": cached_employee.get("employee_number"),
                            "firstName": cached_employee.get("first_name"),
                            "middleName": cached_employee.get("middle_name"),
                            "lastName": cached_employee.get("last_name"),
                            "displayName": cached_employee.get("display_name"),
                            "fullName": cached_employee.get("display_name"),  # Alias
                            "email": cached_employee.get("email"),
                            "city": cached_employee.get("city"),
                            "jobTitle": cached_employee.get("job_title"),
                            "secondaryJobTitle": cached_employee.get("secondary_job_title"),
                            "reportsToEmail": cached_employee.get("reports_to_email"),
                            "designation": cached_employee.get("job_title"),  # Map job_title to designation
                            "department": None,  # TODO: Add department mapping
                            "gender": cached_employee.get("gender"),
                            "joiningDate": cached_employee.get("joining_date"),
                            "dateOfBirth": cached_employee.get("date_of_birth"),
                            "mobilePhone": cached_employee.get("mobile_phone"),
                            "workPhone": cached_employee.get("work_phone"),
                            "currentAddress": cached_employee.get("current_address"),
                            "permanentAddress": cached_employee.get("permanent_address"),
                            "employmentStatus": cached_employee.get("employment_status"),
                            "accountStatus": cached_employee.get("account_status"),
                        }
                        
                        logger.info(f"Mapped employee data from DATABASE: {employee_data.get('displayName')}")
                    else:
                        # Fallback to Keka API
                        logger.info(f"Employee not found in DATABASE, fetching from Keka API")
                        employee_id = await self._get_employee_id()
                        employee_data = await keka_api_service.get_employee_by_id(employee_id)
                        
                        if not employee_data:
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail="Employee profile not found"
                            )
                        
                        # Keka wraps the actual data in a 'data' field
                        if 'data' in employee_data and isinstance(employee_data['data'], dict):
                            logger.info("Unwrapping employee data from 'data' field")
                            employee_data = employee_data['data']
                except Exception as e:
                    logger.error(f"Error getting profile from DATABASE: {str(e)}")
                    # Fallback to Keka API
                    employee_id = await self._get_employee_id()
                    employee_data = await keka_api_service.get_employee_by_id(employee_id)
                    
                    if not employee_data:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="Employee profile not found"
                        )
                    
                    # Keka wraps the actual data in a 'data' field
                    if 'data' in employee_data and isinstance(employee_data['data'], dict):
                        employee_data = employee_data['data']
            else:
                # No database service, fall back to API
                employee_id = await self._get_employee_id()
                employee_data = await keka_api_service.get_employee_by_id(employee_id)
                
                if not employee_data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Employee profile not found"
                    )
                
                # Keka wraps the actual data in a 'data' field
                if 'data' in employee_data and isinstance(employee_data['data'], dict):
                    employee_data = employee_data['data']
            
            # Map Keka data to our model
            # Try multiple field name variations
            full_name = (
                employee_data.get("fullName") or 
                employee_data.get("displayName") or 
                f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip() or
                "N/A"
            )
            
            designation_name = ""
            if isinstance(employee_data.get("designation"), dict):
                designation_name = employee_data.get("designation", {}).get("name", "")
            elif isinstance(employee_data.get("designation"), str):
                designation_name = employee_data.get("designation", "")
            
            department_name = ""
            if isinstance(employee_data.get("department"), dict):
                department_name = employee_data.get("department", {}).get("name", "")
            elif isinstance(employee_data.get("department"), str):
                department_name = employee_data.get("department", "")
            
            manager_name = None
            if isinstance(employee_data.get("reportingManager"), dict):
                manager_name = employee_data.get("reportingManager", {}).get("fullName")
            elif isinstance(employee_data.get("reportingManager"), str):
                manager_name = employee_data.get("reportingManager")
            
            return EmployeeProfile(
                employee_id=employee_data.get("id", ""),
                email=employee_data.get("email", self.authenticated_user_email),
                full_name=full_name,
                designation=designation_name,
                department=department_name,
                manager=manager_name,
                join_date=datetime.fromisoformat(employee_data.get("joiningDate", datetime.now().isoformat()).replace("Z", "+00:00")).date(),
                phone=employee_data.get("mobilePhone") or employee_data.get("workPhone"),
                address=employee_data.get("currentAddress"),
                employee_status=self._map_employee_status(employee_data.get("employmentStatus") or employee_data.get("accountStatus", 1))
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve profile: {str(e)}"
            )
    
    def _map_employee_status(self, status_value: any) -> str:
        """Map employee status from int or string to string"""
        if isinstance(status_value, str):
            return status_value.lower()
        elif isinstance(status_value, int):
            # Map numeric status to string
            status_map = {0: "inactive", 1: "active", 2: "suspended", 3: "terminated"}
            return status_map.get(status_value, "active")
        else:
            return "active"
    
    async def get_my_raw_profile(self) -> Dict[str, Any]:
        """Get raw employee profile data FROM DATABASE (keka_employees table)"""
        try:
            if not self.authenticated_user_email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not authenticated"
                )
            
            # Get employee data from DATABASE
            cache_service = keka_db_cache_service
            if cache_service and cache_service.supabase:
                cached_employee = await cache_service.get_cached_employee_by_email(self.authenticated_user_email)
                if cached_employee:
                    logger.info(f"Returning raw employee data from DATABASE for {self.authenticated_user_email}")
                    # Return the raw database record with all fields
                    return cached_employee
            
            # Fallback: Get from Keka API if not in database
            logger.warning(f"Employee not in DATABASE, fetching from Keka API")
            employee_id = await self._get_employee_id()
            employee_data = await keka_api_service.get_employee_by_id(employee_id)
            
            if not employee_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Employee profile not found"
                )
            
            # Unwrap if needed
            if 'data' in employee_data and isinstance(employee_data['data'], dict):
                return employee_data['data']
            
            return employee_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get raw profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve raw profile: {str(e)}"
            )
    
    async def get_my_leave_balances(self, leave_type: Optional[str] = None) -> List[LeaveBalance]:
        """Get leave balances"""
        try:
            employee_id = await self._get_employee_id()
            balance_data = await keka_api_service.get_leave_balance(employee_id)
            
            if not balance_data:
                return []
            
            # Extract leave balances from response
            balances = []
            leave_balance_list = balance_data.get("data", [])
            
            if isinstance(leave_balance_list, list) and len(leave_balance_list) > 0:
                employee_balances = leave_balance_list[0].get("leaveBalance", [])
                
                for balance in employee_balances:
                    # Get leave type name - Keka API returns it as 'leaveTypeName' (flat string)
                    leave_type_name = balance.get("leaveTypeName", "Unknown")
                    
                    # Skip if filtering by leave type
                    if leave_type and leave_type_name != leave_type:
                        continue
                    
                    # Skip leave types with no annual quota (like Unpaid Leave with -1)
                    annual_quota = float(balance.get("annualQuota", 0))
                    if annual_quota <= 0:
                        continue
                    
                    balances.append(LeaveBalance(
                        leave_type=leave_type_name,
                        total_allocated=annual_quota,
                        used=float(balance.get("consumedAmount", 0)),
                        remaining=float(balance.get("availableBalance", 0)),
                        carry_forward=float(balance.get("accruedAmount", 0)) - float(balance.get("consumedAmount", 0)) if balance.get("accruedAmount", 0) > balance.get("consumedAmount", 0) else 0.0
                    ))
            
            return balances
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get leave balances: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve leave balances: {str(e)}"
            )
    
    async def get_my_leave_requests(self) -> List[Dict[str, Any]]:
        """Get leave requests"""
        try:
            employee_id = await self._get_employee_id()
            requests_data = await keka_api_service.get_leave_requests(employee_id)
            
            if not requests_data:
                return []
            
            return requests_data.get("data", [])
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get leave requests: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve leave requests: {str(e)}"
            )
    
    async def get_my_leave_history(
        self, 
        from_date: Optional[date] = None, 
        to_date: Optional[date] = None
    ) -> List[LeaveHistory]:
        """Get leave history for the authenticated user"""
        try:
            employee_id = await self._get_employee_id()
            
            # Use default date range if not provided (last 6 months)
            if not to_date:
                to_date = date.today()
            if not from_date:
                from_date = to_date - timedelta(days=180)
            
            # Get leave requests from Keka API (which includes history)
            requests_data = await keka_api_service.get_leave_requests(employee_id)
            
            if not requests_data or "data" not in requests_data:
                return []
            
            # Transform to LeaveHistory format
            history = []
            for req in requests_data.get("data", []):
                try:
                    # Parse dates
                    req_from_date = datetime.fromisoformat(req.get("fromDate", "").replace("Z", "+00:00")).date()
                    req_to_date = datetime.fromisoformat(req.get("toDate", "").replace("Z", "+00:00")).date()
                    
                    # Filter by date range
                    if from_date and req_from_date < from_date:
                        continue
                    if to_date and req_from_date > to_date:
                        continue
                    
                    # Calculate days count
                    days_count = (req_to_date - req_from_date).days + 1
                    
                    # Map status (0=pending, 1=approved, 2=rejected, 3=cancelled)
                    status_map = {0: "pending", 1: "approved", 2: "rejected", 3: "cancelled"}
                    status_code = req.get("status", 0)
                    status_str = status_map.get(status_code, "pending")
                    
                    # Parse applied_date
                    applied_date = None
                    if req.get("createdDate"):
                        try:
                            applied_date = datetime.fromisoformat(req.get("createdDate").replace("Z", "+00:00"))
                        except:
                            pass
                    
                    history_item = LeaveHistory(
                        id=str(req.get("id", "")),
                        leave_type=req.get("leaveTypeName", "Unknown"),
                        from_date=req_from_date,
                        to_date=req_to_date,
                        days_count=days_count,
                        reason=req.get("reason", ""),
                        status=status_str,
                        applied_date=applied_date
                    )
                    history.append(history_item)
                except (ValueError, KeyError, TypeError) as e:
                    logger.warning(f"Skipping invalid leave record: {str(e)}")
                    continue
            
            return history
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get leave history: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve leave history: {str(e)}"
            )
    
    async def get_leave_types(self) -> List[Dict[str, Any]]:
        """Get all leave types"""
        try:
            types_data = await keka_api_service.get_leave_types()
            
            if not types_data:
                logger.warning("No leave types data received from Keka API")
                return []
            
            # Extract data from response
            leave_types = types_data.get("data", [])
            
            # Ensure it's a list
            if not isinstance(leave_types, list):
                logger.warning(f"Leave types data is not a list: {type(leave_types)}, returning empty list")
                return []
            
            logger.info(f"Retrieved {len(leave_types)} leave types")
            return leave_types
            
        except Exception as e:
            logger.error(f"Failed to get leave types: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve leave types: {str(e)}"
            )
    
    async def apply_for_leave(self, leave_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply for leave"""
        try:
            employee_id = await self._get_employee_id()
            result = await keka_api_service.apply_leave(employee_id, leave_data)
            
            if not result:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to apply for leave"
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to apply for leave: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to apply for leave: {str(e)}"
            )
    
    async def get_my_attendance(self, from_date: str = None, to_date: str = None) -> List[Dict[str, Any]]:
        """Get attendance records"""
        try:
            employee_id = await self._get_employee_id()
            attendance_data = await keka_api_service.get_attendance(employee_id, from_date, to_date)
            
            if not attendance_data:
                return []
            
            return attendance_data.get("data", [])
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get attendance: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve attendance: {str(e)}"
            )
    
    async def get_current_month_attendance(self) -> List[Dict[str, Any]]:
        """Get current month's attendance"""
        try:
            now = datetime.now()
            first_day = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
            last_day = (datetime(now.year, now.month + 1, 1) - timedelta(days=1)).strftime("%Y-%m-%d") if now.month < 12 else datetime(now.year, 12, 31).strftime("%Y-%m-%d")
            
            return await self.get_my_attendance(first_day, last_day)
            
        except Exception as e:
            logger.error(f"Failed to get current month attendance: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve current month attendance: {str(e)}"
            )
    
    async def get_holidays(self, year: int = None) -> List[Dict[str, Any]]:
        """Get company holidays"""
        try:
            holidays_data = await keka_api_service.get_holidays(year)
            
            if not holidays_data:
                return []
            
            return holidays_data.get("data", [])
            
        except Exception as e:
            logger.error(f"Failed to get holidays: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve holidays: {str(e)}"
            )
    
    async def get_upcoming_holidays(self) -> List[Dict[str, Any]]:
        """Get upcoming holidays"""
        try:
            current_year = datetime.now().year
            holidays = await self.get_holidays(current_year)
            
            # Filter for upcoming holidays
            now = datetime.now().date()
            upcoming = [h for h in holidays if datetime.fromisoformat(h.get("date", "")).date() >= now]
            upcoming.sort(key=lambda x: x.get("date", ""))
            
            return upcoming
            
        except Exception as e:
            logger.error(f"Failed to get upcoming holidays: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve upcoming holidays: {str(e)}"
            )
    
    async def get_payslip(self, month: int, year: int) -> Optional[Dict[str, Any]]:
        """Get payslip for a specific month"""
        try:
            employee_id = await self._get_employee_id()
            salary_data = await keka_api_service.get_payroll_salaries(employee_id)
            
            if not salary_data:
                return None
            
            # Note: This is a simplified implementation
            # You may need to adjust based on actual Keka payroll API structure
            return salary_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get payslip: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve payslip: {str(e)}"
            )
    
    async def check_health(self) -> Dict[str, Any]:
        """Check service health"""
        try:
            # Try to generate a token to verify configuration
            token = await keka_api_service.generate_access_token()
            
            return {
                "status": "healthy" if token else "unhealthy",
                "message": "HR Data Service is operational" if token else "Failed to generate Keka token",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            }


# Global instance
hr_data_service_direct = HRDataServiceDirect()

