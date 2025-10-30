"""
HR Router for ESS Integration
Provides FastAPI endpoints for HR functionality using Keka MCP
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, date, timedelta
import os

from app.models.hr import (
    EmployeeProfile, LeaveBalance, LeaveHistory, AttendanceRecord,
    Payslip, Holiday, KekaMCPResponse, ApplyLeaveRequest, LeaveHistoryRequest,
    AttendanceRequest, PayslipRequest, HolidayRequest, LeaveBalanceRequest
)
from app.services.hr_data_service_direct import hr_data_service_direct as hr_data_service
from app.utils.auth_utils import get_current_supabase_user
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

def get_user_email(current_user: dict = Depends(get_current_supabase_user)) -> str:
    """Extract and validate user email from authentication"""
    email = current_user.get('email')
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User email not found in authentication token"
        )
    return email

# Test endpoint without authentication
@router.get("/test-profile")
async def test_profile():
    """Test endpoint to check if HR data service is working"""
    try:
        # Use a test email from our database
        test_email = "sunhith.reddy@othainsoft.com"
        hr_data_service.set_authenticated_user(test_email)
        profile = await hr_data_service.get_my_profile()
        return {"success": True, "data": profile}
    except Exception as e:
        logger.error(f"Test profile failed: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/test-leave-balances")
async def test_leave_balances():
    """Test endpoint to check leave balance data from Keka API"""
    try:
        # Use a test email from our database
        test_email = "sunhith.reddy@othainsoft.com"
        hr_data_service.set_authenticated_user(test_email)
        balances = await hr_data_service.get_my_leave_balances()
        return {"success": True, "data": balances}
    except Exception as e:
        logger.error(f"Test leave balances failed: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/test-leave-requests")
async def test_leave_requests():
    """Test endpoint to check leave requests data from Keka API"""
    try:
        # Use a test email from our database
        test_email = "sunhith.reddy@othainsoft.com"
        hr_data_service.set_authenticated_user(test_email)
        requests = await hr_data_service.get_my_leave_requests()
        return {"success": True, "data": requests}
    except Exception as e:
        logger.error(f"Test leave requests failed: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/test-leave-types")
async def test_leave_types():
    """Test endpoint to check leave types data from Keka API"""
    try:
        leave_types = await hr_data_service.get_leave_types()
        return {"success": True, "data": leave_types}
    except Exception as e:
        logger.error(f"Test leave types failed: {str(e)}")
        return {"success": False, "error": str(e)}

# Employee Profile Endpoints
@router.get("/employee-id")
async def get_my_employee_id(user_email: str = Depends(get_user_email)):
    """Get the authenticated user's keka_employee_id mapping"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        employee_data = await hr_data_service._get_employee_by_email(user_email)
        return {
            "success": True,
            "employee_id": employee_data["keka_employee_id"],
            "email": employee_data["email"],
            "display_name": employee_data.get("display_name", ""),
            "employee_number": employee_data.get("employee_number", "")
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to fetch employee_id for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employee ID mapping"
        )

@router.get("/profile", response_model=EmployeeProfile)
async def get_my_profile(user_email: str = Depends(get_user_email)):
    """Get the authenticated user's employee profile"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        profile = await hr_data_service.get_my_profile()
        return profile
    except Exception as e:
        logger.error(f"Failed to fetch profile for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve employee profile"
        )

@router.get("/profile/raw")
async def get_my_raw_profile(user_email: str = Depends(get_user_email)):
    """Get the authenticated user's raw profile data from Keka"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        raw_data = await hr_data_service.get_my_raw_profile()
        return raw_data
    except Exception as e:
        logger.error(f"Failed to fetch raw profile for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve raw profile data"
        )

# Leave Management Endpoints
@router.get("/leave/balances", response_model=List[LeaveBalance])
async def get_my_leave_balances(
    leave_type: Optional[str] = None,
    user_email: str = Depends(get_user_email)
):
    """Get leave balances for the authenticated user"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        balances = await hr_data_service.get_my_leave_balances(leave_type)
        return balances
    except Exception as e:
        logger.error(f"Failed to fetch leave balances for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave balances"
        )

@router.get("/leave/requests")
async def get_my_leave_requests(user_email: str = Depends(get_user_email)):
    """Get leave requests for the authenticated user"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        requests = await hr_data_service.get_my_leave_requests()
        return {"success": True, "data": requests}
    except Exception as e:
        logger.error(f"Failed to fetch leave requests for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave requests"
        )

@router.get("/leave/types")
async def get_leave_types():
    """Get available leave types"""
    try:
        leave_types = await hr_data_service.get_leave_types()
        return {"success": True, "data": leave_types}
    except Exception as e:
        logger.error(f"Failed to fetch leave types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave types"
        )


@router.get("/leave/history", response_model=List[LeaveHistory])
async def get_my_leave_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    user_email: str = Depends(get_user_email)
):
    """Get leave history for the authenticated user"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        history = await hr_data_service.get_my_leave_history(from_date, to_date)
        return history
    except Exception as e:
        logger.error(f"Failed to fetch leave history for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave history"
        )

@router.post("/leave/apply", response_model=KekaMCPResponse)
async def apply_for_leave(
    leave_request: ApplyLeaveRequest,
    user_email: str = Depends(get_user_email)
):
    """Apply for leave"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        
        # Create leave application object
        from app.models.hr import LeaveApplication
        from datetime import datetime, date
        
        # Parse dates and convert to date objects
        from_datetime = datetime.fromisoformat(leave_request.from_date.replace('Z', '+00:00'))
        to_datetime = datetime.fromisoformat(leave_request.to_date.replace('Z', '+00:00'))
        from_date = from_datetime.date()
        to_date = to_datetime.date()
        
        # Determine if it's a half day based on sessions
        is_half_day = leave_request.from_session != leave_request.to_session
        
        # Convert session to string format
        half_day_type = None
        if is_half_day:
            half_day_type = "first_half" if leave_request.from_session == 0 else "second_half"
        
        leave_app = LeaveApplication(
            leave_type=leave_request.leave_type_id,
            from_date=from_date,
            to_date=to_date,
            days_count=0.5 if is_half_day else (to_date - from_date).days + 1,
            reason=leave_request.reason,
            is_half_day=is_half_day,
            half_day_type=half_day_type
        )
        
        # Convert LeaveApplication to dictionary for the service
        leave_data = {
            "leave_type_id": leave_app.leave_type,
            "from_date": leave_app.from_date.isoformat(),
            "to_date": leave_app.to_date.isoformat(),
            "from_session": 0 if leave_app.half_day_type == "first_half" else 1,
            "to_session": 0 if leave_app.half_day_type == "first_half" else 1,
            "reason": leave_app.reason,
            "note": leave_request.note or ""
        }
        
        result = await hr_data_service.create_leave_request(leave_data)
        
        return KekaMCPResponse(
            success=True,
            message="Leave application submitted successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Failed to apply leave for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit leave application"
        )

# Attendance Endpoints
@router.get("/attendance")
async def get_my_attendance(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    user_email: str = Depends(get_user_email)
):
    """Get attendance records for the authenticated user"""
    try:
        # Validate date range if provided
        if from_date and to_date and from_date > to_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="From date cannot be after to date"
            )
        
        # Limit to 6 months range if dates provided
        if from_date and to_date and (to_date - from_date).days > 180:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date range cannot exceed 6 months"
            )
        
        hr_data_service.set_authenticated_user(user_email)
        from_date_str = from_date.isoformat() if from_date else None
        to_date_str = to_date.isoformat() if to_date else None
        attendance = await hr_data_service.get_my_attendance(from_date_str, to_date_str)
        
        # Return raw Keka data structure
        return attendance
    except Exception as e:
        logger.error(f"Failed to fetch attendance for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve attendance records"
        )

@router.get("/attendance/current-month")
async def get_current_month_attendance(user_email: str = Depends(get_user_email)):
    """Get attendance for the current month"""
    try:
        today = date.today()
        from_date = date(today.year, today.month, 1)
        to_date = today
        
        hr_data_service.set_authenticated_user(user_email)
        attendance = await hr_data_service.get_current_month_attendance()
        
        # Return raw Keka data structure
        return attendance
    except Exception as e:
        logger.error(f"Failed to fetch current month attendance for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current month attendance"
        )

# Payslip Endpoints
@router.get("/payslip", response_model=Payslip)
async def get_my_payslip(
    month: int,
    year: int,
    user_email: str = Depends(get_user_email)
):
    """Get payslip for specific month and year"""
    try:
        # Validate month and year
        if not (1 <= month <= 12):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Month must be between 1 and 12"
            )
        
        current_year = datetime.now().year
        if not (2020 <= year <= current_year):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Year must be between 2020 and {current_year}"
            )
        
        hr_data_service.set_authenticated_user(user_email)
        payslip = await hr_data_service.get_my_payslip(month, year)
        return payslip
    except Exception as e:
        logger.error(f"Failed to fetch payslip for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payslip"
        )

@router.get("/payslip/latest", response_model=Payslip)
async def get_latest_payslip(user_email: str = Depends(get_user_email)):
    """Get the latest available payslip"""
    try:
        # Try current month first, then previous month
        today = date.today()
        
        try:
            hr_data_service.set_authenticated_user(user_email)
            return await hr_data_service.get_my_payslip(today.month, today.year)
        except HTTPException:
            # Try previous month
            if today.month == 1:
                prev_month = 12
                prev_year = today.year - 1
            else:
                prev_month = today.month - 1
                prev_year = today.year
                
            return await hr_data_service.get_my_payslip(prev_month, prev_year)
            
    except Exception as e:
        logger.error(f"Failed to fetch latest payslip for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve latest payslip"
        )

# General Information Endpoints
@router.get("/leave-types")
async def get_available_leave_types(user_email: str = Depends(get_user_email)):
    """Get available leave types"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        leave_types = await hr_data_service.get_leave_types()
        return {"leave_types": leave_types}
    except Exception as e:
        logger.error(f"Failed to fetch leave types: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leave types"
        )

@router.get("/holidays", response_model=List[Holiday])
async def get_company_holidays(
    year: Optional[int] = None,
    user_email: str = Depends(get_user_email)
):
    """Get company holidays"""
    try:
        if not year:
            year = datetime.now().year
            
        hr_data_service.set_authenticated_user(user_email)
        holidays = await hr_data_service.get_upcoming_holidays(year)
        return holidays
    except Exception as e:
        logger.error(f"Failed to fetch holidays: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve holidays"
        )

@router.get("/holidays/upcoming", response_model=List[Holiday])
async def get_upcoming_holidays(user_email: str = Depends(get_user_email)):
    """Get upcoming holidays in the next 3 months"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        holidays = await hr_data_service.get_upcoming_holidays()
        
        # Filter for upcoming holidays in next 3 months
        today = date.today()
        future_date = today + timedelta(days=90)
        
        upcoming = [
            holiday for holiday in holidays
            if today <= holiday.date <= future_date
        ]
        
        # Sort by date
        upcoming.sort(key=lambda x: x.date)
        
        return upcoming
    except Exception as e:
        logger.error(f"Failed to fetch upcoming holidays: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve upcoming holidays"
        )

# Utility endpoint for HR chat integration
@router.post("/chat/context", response_model=KekaMCPResponse)
async def get_hr_context_for_chat(
    query: str,
    user_email: str = Depends(get_user_email)
):
    """Get HR context for chat queries"""
    try:
        hr_data_service.set_authenticated_user(user_email)
        
        # Simple intent classification (can be enhanced with NLP)
        query_lower = query.lower()
        
        context_data = {}
        
        if any(word in query_lower for word in ['profile', 'details', 'information', 'me']):
            context_data['profile'] = await hr_data_service.get_my_profile()
            
        if any(word in query_lower for word in ['leave', 'vacation', 'time off']):
            if any(word in query_lower for word in ['balance', 'remaining', 'left']):
                context_data['leave_balances'] = await hr_data_service.get_my_leave_balances()
            if any(word in query_lower for word in ['history', 'past', 'previous']):
                context_data['leave_history'] = await hr_data_service.get_my_leave_history()
                
        if any(word in query_lower for word in ['attendance', 'present', 'hours']):
            today = date.today()
            from_date = date(today.year, today.month, 1)
            context_data['attendance'] = await hr_data_service.get_my_attendance(from_date, today)
            
        if any(word in query_lower for word in ['salary', 'payslip', 'pay']):
            try:
                today = date.today()
                context_data['payslip'] = await hr_data_service.get_my_payslip(today.month, today.year)
            except:
                # Try previous month if current month not available
                if today.month == 1:
                    prev_month, prev_year = 12, today.year - 1
                else:
                    prev_month, prev_year = today.month - 1, today.year
                try:
                    context_data['payslip'] = await hr_data_service.get_my_payslip(prev_month, prev_year)
                except:
                    pass  # No payslip available
                    
        if any(word in query_lower for word in ['holiday', 'holidays']):
            context_data['holidays'] = await hr_data_service.get_upcoming_holidays()
        
        return KekaMCPResponse(
            success=True,
            message="HR context retrieved successfully",
            data=context_data
        )
        
    except Exception as e:
        logger.error(f"Failed to get HR context for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve HR context"
        )

# Health check endpoint
@router.get("/health")
async def hr_service_health():
    """Health check for HR service"""
    return {
        "status": "healthy",
        "service": "HR ESS Integration",
        "timestamp": datetime.now().isoformat(),
        "keka_configured": bool(os.getenv("KEKA_CLIENT_ID") and os.getenv("KEKA_CLIENT_SECRET"))
    }

# Helper function
def _calculate_leave_days(from_date: date, to_date: date, is_half_day: bool = False) -> float:
    """Calculate number of leave days"""
    if is_half_day:
        return 0.5
    else:
        return (to_date - from_date).days + 1
