from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum

# Enums for HR data
class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class LeaveType(str, Enum):
    VACATION = "vacation"
    SICK = "sick"
    PERSONAL = "personal"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    EMERGENCY = "emergency"

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LATE = "late"
    WORK_FROM_HOME = "work_from_home"

# Employee Profile Models
class EmployeeProfile(BaseModel):
    employee_id: str
    email: str
    full_name: str
    designation: str
    department: str
    manager: Optional[str] = None
    join_date: date
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    employee_status: str = "active"

# Leave Models
class LeaveBalance(BaseModel):
    leave_type: str
    total_allocated: float
    used: float
    remaining: float
    carry_forward: Optional[float] = None

class LeaveApplication(BaseModel):
    leave_type: str
    from_date: date
    to_date: date
    days_count: float
    reason: str
    is_half_day: bool = False
    half_day_type: Optional[str] = None  # "first_half" or "second_half"

class LeaveHistory(BaseModel):
    id: str
    leave_type: str
    from_date: date
    to_date: date
    days_count: float
    reason: str
    status: LeaveStatus
    applied_date: datetime
    approved_date: Optional[datetime] = None
    approved_by: Optional[str] = None
    comments: Optional[str] = None

# Attendance Models
class AttendanceRecord(BaseModel):
    date: date
    status: AttendanceStatus
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    break_hours: Optional[float] = None
    total_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    location: Optional[str] = None

class AttendanceRequest(BaseModel):
    from_date: date
    to_date: date

# Payslip Models
class PayslipRequest(BaseModel):
    month: int
    year: int

class PayslipItem(BaseModel):
    component: str
    amount: float
    type: str  # "earning" or "deduction"

class Payslip(BaseModel):
    employee_id: str
    month: int
    year: int
    pay_period: str
    gross_salary: float
    net_salary: float
    total_deductions: float
    earnings: List[PayslipItem]
    deductions: List[PayslipItem]
    ytd_gross: Optional[float] = None
    ytd_net: Optional[float] = None

# Holiday Models
class Holiday(BaseModel):
    date: date
    name: str
    type: str  # "national", "regional", "company"
    is_optional: bool = False

# General Response Models
class KekaMCPResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Request Models for API endpoints
class ProfileRequest(BaseModel):
    """Request to get employee profile - email is extracted from JWT token"""
    pass

class LeaveBalanceRequest(BaseModel):
    """Request to get leave balances - email is extracted from JWT token"""
    leave_type: Optional[str] = None

class ApplyLeaveRequest(BaseModel):
    leave_type_id: str = Field(..., description="Leave type ID from Keka API")
    from_date: str = Field(..., description="From date in ISO format (YYYY-MM-DDTHH:mm:ss)")
    to_date: str = Field(..., description="To date in ISO format (YYYY-MM-DDTHH:mm:ss)")
    from_session: int = Field(0, ge=0, le=1, description="0 = First Half, 1 = Second Half")
    to_session: int = Field(0, ge=0, le=1, description="0 = First Half, 1 = Second Half")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for leave")
    note: Optional[str] = Field(None, max_length=1000, description="Additional notes")

    @validator('from_date', 'to_date')
    def validate_date_format(cls, v):
        try:
            from datetime import datetime
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('Date must be in ISO format (YYYY-MM-DDTHH:mm:ss)')

    @validator('reason')
    def validate_reason(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Reason must be at least 10 characters long')
        return v.strip()

class LeaveHistoryRequest(BaseModel):
    """Request to get leave history - email is extracted from JWT token"""
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    status: Optional[LeaveStatus] = None

class HolidayRequest(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None

# Chat Integration Models
class HRChatContext(BaseModel):
    """Context for HR-related chat queries"""
    user_email: str
    employee_id: Optional[str] = None
    query_type: str  # "profile", "attendance", "leave", "payslip", "general"
    intent: Optional[str] = None
    entities: Optional[Dict[str, Any]] = None

class HRChatResponse(BaseModel):
    """Response for HR chat queries"""
    response_text: str
    data: Optional[Dict[str, Any]] = None
    suggested_actions: Optional[List[str]] = None
    requires_action: bool = False
    action_type: Optional[str] = None

# User Token Storage Models
class UserKekaTokens(BaseModel):
    """User's Keka OAuth tokens"""
    user_email: EmailStr
    access_token: str
    refresh_token: str
    expires_at: datetime
    token_type: str = "Bearer"
    scope: Optional[str] = None
    keka_employee_id: Optional[str] = None

class KekaAuthRequest(BaseModel):
    """Request to initialize Keka authentication"""
    authorization_code: str = Field(..., min_length=10)
    redirect_uri: Optional[str] = None

class KekaAuthResponse(BaseModel):
    """Response from Keka authentication"""
    success: bool
    message: str
    requires_setup: bool = False
    auth_url: Optional[str] = None

class KekaDirectTokenRequest(BaseModel):
    """Request to generate Keka direct token"""
    pass

class KekaDirectTokenResponse(BaseModel):
    """Response from Keka direct token generation"""
    success: bool
    message: str
    access_token: Optional[str] = None
    expires_in: Optional[int] = None
    token_type: Optional[str] = "Bearer"
