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
        """Get employee ID for the authenticated user"""
        if not self.authenticated_user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Return cached ID if available
        if self.cached_employee_id:
            return self.cached_employee_id
        
        # Fetch employee ID from Keka API
        employee_id = await keka_api_service.get_employee_id_from_email(self.authenticated_user_email)
        
        if not employee_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee not found with email: {self.authenticated_user_email}"
            )
        
        self.cached_employee_id = employee_id
        return employee_id
    
    async def get_my_profile(self) -> EmployeeProfile:
        """Get employee profile"""
        try:
            employee_id = await self._get_employee_id()
            employee_data = await keka_api_service.get_employee_by_id(employee_id)
            
            if not employee_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Employee profile not found"
                )
            
            # Map Keka data to our model
            return EmployeeProfile(
                employee_id=employee_data.get("id", ""),
                email=employee_data.get("email", self.authenticated_user_email),
                full_name=employee_data.get("fullName", ""),
                designation=employee_data.get("designation", {}).get("name", ""),
                department=employee_data.get("department", {}).get("name", ""),
                manager=employee_data.get("reportingManager", {}).get("fullName"),
                join_date=datetime.fromisoformat(employee_data.get("joiningDate", datetime.now().isoformat())).date(),
                phone=employee_data.get("mobilePhone"),
                address=employee_data.get("currentAddress"),
                employee_status=employee_data.get("employmentStatus", "active")
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get profile: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve profile: {str(e)}"
            )
    
    async def get_my_raw_profile(self) -> Dict[str, Any]:
        """Get raw employee data from Keka"""
        try:
            employee_id = await self._get_employee_id()
            employee_data = await keka_api_service.get_employee_by_id(employee_id)
            
            if not employee_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Employee data not found"
                )
            
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
                    if leave_type and balance.get("leaveType", {}).get("name") != leave_type:
                        continue
                    
                    balances.append(LeaveBalance(
                        leave_type=balance.get("leaveType", {}).get("name", ""),
                        total_allocated=balance.get("totalAllocated", 0),
                        used=balance.get("used", 0),
                        remaining=balance.get("remaining", 0),
                        carry_forward=balance.get("carryForward", 0)
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
    
    async def get_leave_types(self) -> List[Dict[str, Any]]:
        """Get all leave types"""
        try:
            types_data = await keka_api_service.get_leave_types()
            
            if not types_data:
                return []
            
            return types_data.get("data", [])
            
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

