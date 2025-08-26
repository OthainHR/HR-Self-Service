"""
Enhanced HR Router with Keka OAuth Integration
Provides HR endpoints that require proper Keka authentication via OAuth2 tokens
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta

from app.models.hr import (
    EmployeeProfile, LeaveBalance, LeaveHistory, AttendanceRecord,
    Payslip, Holiday, KekaMCPResponse, ApplyLeaveRequest, LeaveHistoryRequest,
    AttendanceRequest, PayslipRequest, HolidayRequest, LeaveBalanceRequest
)
from app.services.keka_oauth_service import keka_oauth_service
from app.services.keka_mcp_service import keka_mcp_service
from app.utils.auth_utils import get_current_supabase_user
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/hr", tags=["hr-enhanced"])

class KekaAuthenticationError(HTTPException):
    """Custom exception for Keka authentication issues"""
    def __init__(self, detail: str = "Keka account not connected"):
        super().__init__(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail={
                "error": "keka_auth_required",
                "message": detail,
                "action": "connect_keka_account"
            }
        )

def get_keka_authenticated_user(current_user: dict = Depends(get_current_supabase_user)) -> str:
    """
    Enhanced dependency that ensures user has valid Keka authentication
    
    Returns:
        User email if Keka authentication is valid
        
    Raises:
        KekaAuthenticationError if Keka account is not connected or tokens are invalid
    """
    user_email = current_user.get('email')
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User email not found in authentication token"
        )
    
    # Check if user has valid Keka tokens
    access_token = keka_oauth_service.get_valid_access_token(user_email)
    
    if not access_token:
        logger.warning(f"User {user_email} attempted to access HR data without valid Keka tokens")
        raise KekaAuthenticationError(
            "To access your HR information, please connect your Keka account first."
        )
    
    # Set up Keka MCP service with valid tokens
    keka_mcp_service.set_authenticated_user(user_email)
    
    return user_email

# Employee Profile Endpoints
@router.get("/profile", response_model=EmployeeProfile)
async def get_my_profile(user_email: str = Depends(get_keka_authenticated_user)):
    """Get the authenticated user's employee profile from Keka"""
    try:
        logger.info(f"Fetching profile for authenticated user: {user_email}")
        profile = await keka_mcp_service.get_my_profile()
        return profile
    except Exception as e:
        logger.error(f"Failed to fetch profile for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve employee profile: {str(e)}"
        )

# Leave Management Endpoints
@router.get("/leave/balances", response_model=List[LeaveBalance])
async def get_my_leave_balances(
    leave_type: Optional[str] = None,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Get leave balances for the authenticated user"""
    try:
        logger.info(f"Fetching leave balances for user: {user_email}, type: {leave_type}")
        balances = await keka_mcp_service.get_my_leave_balances(leave_type)
        return balances
    except Exception as e:
        logger.error(f"Failed to fetch leave balances for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve leave balances: {str(e)}"
        )

@router.get("/leave/history", response_model=List[LeaveHistory])
async def get_my_leave_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Get leave history for the authenticated user"""
    try:
        logger.info(f"Fetching leave history for user: {user_email}, from: {from_date}, to: {to_date}")
        history = await keka_mcp_service.get_my_leave_history(from_date, to_date)
        return history
    except Exception as e:
        logger.error(f"Failed to fetch leave history for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve leave history: {str(e)}"
        )

@router.post("/leave/apply", response_model=KekaMCPResponse)
async def apply_for_leave(
    leave_request: ApplyLeaveRequest,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Apply for leave"""
    try:
        logger.info(f"Processing leave application for user: {user_email}")
        
        # Create leave application object
        from app.models.hr import LeaveApplication
        leave_app = LeaveApplication(
            leave_type=leave_request.leave_type,
            start_date=leave_request.start_date,
            end_date=leave_request.end_date,
            reason=leave_request.reason,
            is_half_day=leave_request.is_half_day
        )
        
        response = await keka_mcp_service.apply_for_leave(leave_app)
        return response
    except Exception as e:
        logger.error(f"Failed to apply for leave for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply for leave: {str(e)}"
        )

# Attendance Endpoints
@router.get("/attendance", response_model=List[AttendanceRecord])
async def get_my_attendance(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Get attendance records for the authenticated user"""
    try:
        logger.info(f"Fetching attendance for user: {user_email}, from: {from_date}, to: {to_date}")
        attendance = await keka_mcp_service.get_my_attendance(from_date, to_date)
        return attendance
    except Exception as e:
        logger.error(f"Failed to fetch attendance for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve attendance records: {str(e)}"
        )

# Payroll Endpoints
@router.get("/payslips", response_model=List[Payslip])
async def get_my_payslips(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Get payslips for the authenticated user"""
    try:
        logger.info(f"Fetching payslips for user: {user_email}, year: {year}, month: {month}")
        payslips = await keka_mcp_service.get_my_payslips(year, month)
        return payslips
    except Exception as e:
        logger.error(f"Failed to fetch payslips for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve payslips: {str(e)}"
        )

# Holiday Calendar Endpoints
@router.get("/holidays", response_model=List[Holiday])
async def get_holidays(
    year: Optional[int] = None,
    user_email: str = Depends(get_keka_authenticated_user)
):
    """Get holiday calendar"""
    try:
        logger.info(f"Fetching holidays for user: {user_email}, year: {year}")
        holidays = await keka_mcp_service.get_holidays(year)
        return holidays
    except Exception as e:
        logger.error(f"Failed to fetch holidays for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve holidays: {str(e)}"
        )

# Summary Dashboard Endpoint
@router.get("/dashboard")
async def get_hr_dashboard(user_email: str = Depends(get_keka_authenticated_user)) -> Dict[str, Any]:
    """
    Get HR dashboard data - combines multiple HR data sources
    
    Returns:
        Dict containing profile, leave balances, recent attendance, and upcoming holidays
    """
    try:
        logger.info(f"Fetching HR dashboard data for user: {user_email}")
        
        # Get current date for filtering
        today = date.today()
        current_month_start = today.replace(day=1)
        
        # Parallel fetch of multiple data sources
        dashboard_data = {}
        
        try:
            # Basic profile info
            profile = await keka_mcp_service.get_my_profile()
            dashboard_data['profile'] = {
                'employee_id': profile.employee_id,
                'full_name': profile.full_name,
                'designation': profile.designation,
                'department': profile.department
            }
        except Exception as e:
            logger.warning(f"Failed to fetch profile for dashboard: {str(e)}")
            dashboard_data['profile'] = None
        
        try:
            # Leave balances
            leave_balances = await keka_mcp_service.get_my_leave_balances()
            dashboard_data['leave_balances'] = leave_balances
        except Exception as e:
            logger.warning(f"Failed to fetch leave balances for dashboard: {str(e)}")
            dashboard_data['leave_balances'] = []
        
        try:
            # Current month attendance
            attendance = await keka_mcp_service.get_my_attendance(
                from_date=current_month_start,
                to_date=today
            )
            dashboard_data['current_month_attendance'] = attendance
        except Exception as e:
            logger.warning(f"Failed to fetch attendance for dashboard: {str(e)}")
            dashboard_data['current_month_attendance'] = []
        
        try:
            # Upcoming holidays (next 3 months)
            holidays = await keka_mcp_service.get_holidays(today.year)
            upcoming_holidays = [
                h for h in holidays 
                if h.date >= today and h.date <= today + timedelta(days=90)
            ]
            dashboard_data['upcoming_holidays'] = upcoming_holidays[:5]  # Limit to 5 upcoming
        except Exception as e:
            logger.warning(f"Failed to fetch holidays for dashboard: {str(e)}")
            dashboard_data['upcoming_holidays'] = []
        
        # Calculate some stats
        dashboard_data['stats'] = {
            'total_leave_types': len(dashboard_data['leave_balances']),
            'days_worked_this_month': len([
                a for a in dashboard_data['current_month_attendance'] 
                if a.status == 'Present'
            ]),
            'upcoming_holidays_count': len(dashboard_data['upcoming_holidays'])
        }
        
        return {
            'status': 'success',
            'data': dashboard_data,
            'last_updated': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch HR dashboard for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve HR dashboard: {str(e)}"
        )

# Token Management Endpoints
@router.get("/auth/status")
async def get_auth_status(user_email: str = Depends(get_current_supabase_user)) -> Dict[str, Any]:
    """
    Get Keka authentication status for the user
    (This endpoint doesn't require Keka auth - it checks the status)
    """
    try:
        status = keka_oauth_service.get_connection_status(user_email)
        return {
            "status": "success",
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to get auth status for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get authentication status: {str(e)}"
        )

@router.post("/auth/refresh")
async def refresh_auth_tokens(user_email: str = Depends(get_current_supabase_user)) -> Dict[str, Any]:
    """
    Refresh user's Keka authentication tokens
    (This endpoint doesn't require Keka auth - it attempts to refresh)
    """
    try:
        success = keka_oauth_service.refresh_user_tokens(user_email)
        
        if success:
            status = keka_oauth_service.get_connection_status(user_email)
            return {
                "status": "success",
                "message": "Authentication tokens refreshed successfully",
                "data": status
            }
        else:
            return {
                "status": "error",
                "message": "Failed to refresh tokens. Please reconnect your Keka account.",
                "action": "reconnect_required"
            }
            
    except Exception as e:
        logger.error(f"Failed to refresh auth tokens for {user_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh authentication tokens: {str(e)}"
        )

# Health check
@router.get("/health")
async def health_check():
    """Health check for enhanced HR service"""
    return {
        "status": "healthy",
        "service": "hr-enhanced",
        "message": "Enhanced HR service with Keka OAuth is running",
        "timestamp": datetime.now().isoformat()
    }
