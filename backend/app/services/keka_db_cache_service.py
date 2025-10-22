"""
Keka Database Cache Service
Manages caching of Keka employee data in PostgreSQL database
Uses the keka_employees and related tables for fast data access
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class KekaDBCacheService:
    """Service to cache and retrieve Keka employee data from database"""
    
    def __init__(self):
        # Try service role key first, then fall back to anon key for read operations
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not found, database caching disabled")
            self.supabase = None
        else:
            try:
                self.supabase: Client = create_client(supabase_url, supabase_key)
                logger.info("Keka DB Cache Service initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Keka DB Cache Service: {str(e)}")
                self.supabase = None
    
    async def cache_employee_data(self, employee_data: Dict[str, Any]) -> bool:
        """Cache employee data in database"""
        if not self.supabase:
            return False
        
        try:
            # Extract key fields
            keka_employee_id = employee_data.get("id")
            email = employee_data.get("email")
            
            if not keka_employee_id or not email:
                logger.warning(f"Missing required fields for caching: id={keka_employee_id}, email={email}")
                return False
            
            # Prepare employee record
            employee_record = {
                "keka_employee_id": keka_employee_id,
                "employee_number": employee_data.get("employeeNumber"),
                "first_name": employee_data.get("firstName"),
                "middle_name": employee_data.get("middleName"),
                "last_name": employee_data.get("lastName"),
                "display_name": employee_data.get("fullName") or f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip(),
                "email": email,
                "city": employee_data.get("city"),
                "country_code": employee_data.get("countryCode"),
                "image_file_name": employee_data.get("imageFileName"),
                "image_thumbs": employee_data.get("imageThumbs"),
                "job_title_identifier": employee_data.get("jobTitleIdentifier"),
                "job_title": employee_data.get("jobTitle"),
                "secondary_job_title": employee_data.get("secondaryJobTitle"),
                "reports_to_id": employee_data.get("reportsToId"),
                "reports_to_first_name": employee_data.get("reportsToFirstName"),
                "reports_to_last_name": employee_data.get("reportsToLastName"),
                "reports_to_email": employee_data.get("reportsToEmail"),
                "l2_manager_id": employee_data.get("l2ManagerId"),
                "l2_manager_first_name": employee_data.get("l2ManagerFirstName"),
                "l2_manager_last_name": employee_data.get("l2ManagerLastName"),
                "l2_manager_email": employee_data.get("l2ManagerEmail"),
                "dotted_line_manager_id": employee_data.get("dottedLineManagerId"),
                "dotted_line_manager_first_name": employee_data.get("dottedLineManagerFirstName"),
                "dotted_line_manager_last_name": employee_data.get("dottedLineManagerLastName"),
                "dotted_line_manager_email": employee_data.get("dottedLineManagerEmail"),
                "time_type": employee_data.get("timeType"),
                "worker_type": employee_data.get("workerType"),
                "is_private": employee_data.get("isPrivate", False),
                "is_profile_complete": employee_data.get("isProfileComplete", False),
                "marital_status": employee_data.get("maritalStatus"),
                "marriage_date": employee_data.get("marriageDate"),
                "gender": employee_data.get("gender"),
                "joining_date": employee_data.get("joiningDate"),
                "total_experience_in_days": employee_data.get("totalExperienceInDays"),
                "professional_summary": employee_data.get("professionalSummary"),
                "date_of_birth": employee_data.get("dateOfBirth"),
                "employment_status": employee_data.get("employmentStatus"),
                "account_status": employee_data.get("accountStatus"),
                "invitation_status": employee_data.get("invitationStatus"),
                "personal_email": employee_data.get("personalEmail"),
                "work_phone": employee_data.get("workPhone"),
                "home_phone": employee_data.get("homePhone"),
                "mobile_phone": employee_data.get("mobilePhone"),
                "blood_group": employee_data.get("bloodGroup"),
                "nationality": employee_data.get("nationality"),
                "attendance_number": employee_data.get("attendanceNumber"),
                "probation_end_date": employee_data.get("probationEndDate"),
                "current_address": employee_data.get("currentAddress"),
                "permanent_address": employee_data.get("permanentAddress"),
                "relations": employee_data.get("relations"),
                "education_details": employee_data.get("educationDetails"),
                "experience_details": employee_data.get("experienceDetails"),
                "custom_fields": employee_data.get("customFields"),
                "groups": employee_data.get("groups"),
                "leave_plan_identifier": employee_data.get("leavePlanIdentifier"),
                "leave_plan_title": employee_data.get("leavePlanTitle"),
                "holiday_calendar_id": employee_data.get("holidayCalendarId"),
                "band_info_identifier": employee_data.get("bandInfoIdentifier"),
                "band_info_title": employee_data.get("bandInfoTitle"),
                "pay_grade_identifier": employee_data.get("payGradeIdentifier"),
                "pay_grade_title": employee_data.get("payGradeTitle"),
                "shift_policy_identifier": employee_data.get("shiftPolicyIdentifier"),
                "shift_policy_title": employee_data.get("shiftPolicyTitle"),
                "weekly_off_policy_identifier": employee_data.get("weeklyOffPolicyIdentifier"),
                "weekly_off_policy_title": employee_data.get("weeklyOffPolicyTitle"),
                "capture_scheme_identifier": employee_data.get("captureSchemeIdentifier"),
                "capture_scheme_title": employee_data.get("captureSchemeTitle"),
                "tracking_policy_identifier": employee_data.get("trackingPolicyIdentifier"),
                "tracking_policy_title": employee_data.get("trackingPolicyTitle"),
                "expense_policy_identifier": employee_data.get("expensePolicyIdentifier"),
                "expense_policy_title": employee_data.get("expensePolicyTitle"),
                "overtime_policy_identifier": employee_data.get("overtimePolicyIdentifier"),
                "overtime_policy_title": employee_data.get("overtimePolicyTitle"),
                "raw_data": employee_data,
                "last_synced_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert employee record
            result = self.supabase.table("keka_employees").upsert(
                employee_record,
                on_conflict="keka_employee_id"
            ).execute()
            
            logger.info(f"Successfully cached employee data for {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache employee data: {str(e)}")
            return False
    
    async def get_cached_employee_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get cached employee data by email"""
        if not self.supabase:
            return None
        
        try:
            result = self.supabase.table("keka_employees").select("*").eq("email", email).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"Found cached employee data for {email}")
                return result.data[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get cached employee: {str(e)}")
            return None
    
    async def cache_leave_balances(self, keka_employee_id: str, leave_balances: List[Dict[str, Any]]) -> bool:
        """Cache employee leave balances"""
        if not self.supabase or not leave_balances:
            return False
        
        try:
            records = []
            for balance in leave_balances:
                record = {
                    "keka_employee_id": keka_employee_id,
                    "leave_type": balance.get("leaveType", {}).get("name", "Unknown"),
                    "total_allocated": float(balance.get("totalAllocated", 0)),
                    "used": float(balance.get("used", 0)),
                    "remaining": float(balance.get("remaining", 0)),
                    "carry_forward": float(balance.get("carryForward", 0)),
                    "last_synced_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                records.append(record)
            
            # Upsert leave balances
            self.supabase.table("keka_employee_leave_balances").upsert(
                records,
                on_conflict="keka_employee_id,leave_type"
            ).execute()
            
            logger.info(f"Cached {len(records)} leave balances for employee {keka_employee_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache leave balances: {str(e)}")
            return False
    
    async def get_cached_leave_balances(self, keka_employee_id: str) -> List[Dict[str, Any]]:
        """Get cached leave balances"""
        if not self.supabase:
            return []
        
        try:
            result = self.supabase.table("keka_employee_leave_balances").select("*").eq(
                "keka_employee_id", keka_employee_id
            ).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get cached leave balances: {str(e)}")
            return []
    
    async def cache_attendance_records(self, keka_employee_id: str, attendance_records: List[Dict[str, Any]]) -> bool:
        """Cache employee attendance records"""
        if not self.supabase or not attendance_records:
            return False
        
        try:
            records = []
            for record in attendance_records:
                att_date = record.get("attendanceDate", "").split("T")[0]
                if not att_date:
                    continue
                
                rec = {
                    "keka_employee_id": keka_employee_id,
                    "attendance_date": att_date,
                    "status": self._map_attendance_status(record.get("dayType", 0)),
                    "check_in": record.get("firstInOfTheDay"),
                    "check_out": record.get("lastOutOfTheDay"),
                    "break_hours": float(record.get("totalBreakDuration", 0)),
                    "total_hours": float(record.get("totalEffectiveHours", 0)),
                    "overtime_hours": float(record.get("totalEffectiveOvertimeDuration", 0)),
                    "last_synced_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                records.append(rec)
            
            # Upsert attendance records
            self.supabase.table("keka_employee_attendance").upsert(
                records,
                on_conflict="keka_employee_id,attendance_date"
            ).execute()
            
            logger.info(f"Cached {len(records)} attendance records for employee {keka_employee_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache attendance records: {str(e)}")
            return False
    
    def _map_attendance_status(self, day_type: int) -> str:
        """Map Keka day type to status string"""
        status_map = {
            0: "present",
            1: "absent",
            2: "weekend",
            3: "holiday",
            4: "leave",
            5: "half_day"
        }
        return status_map.get(day_type, "unknown")
    
    async def cache_company_holidays(self, holidays: List[Dict[str, Any]], calendar_id: str = "default") -> bool:
        """Cache company holidays"""
        if not self.supabase or not holidays:
            return False
        
        try:
            records = []
            for holiday in holidays:
                holiday_date = holiday.get("date", "").split("T")[0]
                if not holiday_date:
                    continue
                
                rec = {
                    "holiday_date": holiday_date,
                    "name": holiday.get("name", "Unknown Holiday"),
                    "type": holiday.get("type", "company"),
                    "is_optional": holiday.get("isOptional", False),
                    "calendar_id": calendar_id,
                    "last_synced_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                records.append(rec)
            
            # Upsert holidays
            self.supabase.table("keka_company_holidays").upsert(
                records,
                on_conflict="holiday_date,name,calendar_id"
            ).execute()
            
            logger.info(f"Cached {len(records)} company holidays")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache holidays: {str(e)}")
            return False
    
    async def get_cached_holidays(self, year: Optional[int] = None, upcoming_only: bool = False) -> List[Dict[str, Any]]:
        """Get cached holidays"""
        if not self.supabase:
            return []
        
        try:
            query = self.supabase.table("keka_company_holidays").select("*")
            
            if upcoming_only:
                today = date.today().isoformat()
                query = query.gte("holiday_date", today)
            elif year:
                start_date = f"{year}-01-01"
                end_date = f"{year}-12-31"
                query = query.gte("holiday_date", start_date).lte("holiday_date", end_date)
            
            result = query.order("holiday_date").execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get cached holidays: {str(e)}")
            return []


# Singleton instance
keka_db_cache_service = KekaDBCacheService()

