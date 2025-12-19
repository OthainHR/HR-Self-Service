"""
Keka Employee Data Sync Service
Fetches and stores all employee data from Keka API for centralized access
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
import httpx
from app.utils.supabase_client import supabase_admin_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KekaEmployeeSyncService:
    """
    Service to sync all employee data from Keka API and store in Supabase
    """
    
    def __init__(self):
        # Keka API Configuration
        self.company_name = os.getenv("KEKA_COMPANY_NAME", "othainsoft")
        self.environment = os.getenv("KEKA_ENVIRONMENT", "keka")
        self.api_base_url = f"https://{self.company_name}.{self.environment}.com/api/v1"
        
        # API credentials (should be stored securely)
        self.client_id = os.getenv("KEKA_CLIENT_ID")
        self.client_secret = os.getenv("KEKA_CLIENT_SECRET")
        self.api_key = os.getenv("KEKA_API_KEY")
        
        # Use the correct token endpoint (same as keka_api_service)
        self.token_endpoint = "https://login.keka.com/connect/token"
        
        if not self.client_id or not self.client_secret or not self.api_key:
            raise ValueError("KEKA_CLIENT_ID, KEKA_CLIENT_SECRET, and KEKA_API_KEY must be set")
    
    async def _get_access_token(self) -> str:
        """Get access token for Keka API using kekaapi grant type (same as keka_api_service)"""
        try:
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
                    logger.info("Successfully generated Keka access token for sync")
                    return token_data["access_token"]
                else:
                    logger.error(f"Failed to get access token: {response.status_code} - {response.text}")
                    raise Exception(f"Failed to get access token: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Error getting access token: {str(e)}")
            raise
    
    async def _make_keka_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Keka API"""
        access_token = await self._get_access_token()
        
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
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Keka API error: {response.status_code} - {response.text}")
                    raise Exception(f"Keka API request failed: {response.status_code}")
                    
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during Keka request: {str(e)}")
            raise
    
    async def sync_all_employees(self) -> Dict[str, Any]:
        """Sync all employee data from Keka"""
        try:
            logger.info("Starting employee data sync...")
            
            # Update sync status
            await self._update_sync_status("employees", "in_progress", 0, 0)
            
            # Fetch all employees
            employees_data = await self._make_keka_request(
                "GET", 
                "hris/employees",
                params={"inProbation": "false", "inNoticePeriod": "false"}
            )
            
            employees = employees_data.get("data", [])
            logger.info(f"Found {len(employees)} employees to sync")
            
            processed = 0
            failed = 0
            
            for employee in employees:
                try:
                    await self._sync_employee_data(employee)
                    processed += 1
                except Exception as e:
                    logger.error(f"Failed to sync employee {employee.get('email', 'unknown')}: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("employees", "success", processed, failed)
            
            logger.info(f"Employee sync completed: {processed} processed, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} employees successfully"
            }
            
        except Exception as e:
            logger.error(f"Employee sync failed: {str(e)}")
            await self._update_sync_status("employees", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Employee sync failed"
            }
    
    async def _sync_employee_data(self, employee_data: Dict[str, Any]) -> None:
        """Sync individual employee data to database"""
        try:
            # Extract basic employee information
            employee_record = {
                "keka_employee_id": employee_data["id"],
                "employee_number": employee_data.get("employeeNumber"),
                "first_name": employee_data.get("firstName"),
                "middle_name": employee_data.get("middleName"),
                "last_name": employee_data.get("lastName"),
                "display_name": employee_data.get("displayName"),
                "email": employee_data.get("email"),
                "city": employee_data.get("city"),
                "country_code": employee_data.get("countryCode"),
                "image_file_name": employee_data.get("image", {}).get("fileName"),
                "image_thumbs": employee_data.get("image", {}).get("thumbs"),
                "job_title_identifier": employee_data.get("jobTitle", {}).get("identifier"),
                "job_title": employee_data.get("jobTitle", {}).get("title"),
                "secondary_job_title": employee_data.get("secondaryJobTitle"),
                "reports_to_id": employee_data.get("reportsTo", {}).get("id"),
                "reports_to_first_name": employee_data.get("reportsTo", {}).get("firstName"),
                "reports_to_last_name": employee_data.get("reportsTo", {}).get("lastName"),
                "reports_to_email": employee_data.get("reportsTo", {}).get("email"),
                "l2_manager_id": employee_data.get("l2Manager", {}).get("id"),
                "l2_manager_first_name": employee_data.get("l2Manager", {}).get("firstName"),
                "l2_manager_last_name": employee_data.get("l2Manager", {}).get("lastName"),
                "l2_manager_email": employee_data.get("l2Manager", {}).get("email"),
                "dotted_line_manager_id": employee_data.get("dottedLineManager", {}).get("id"),
                "dotted_line_manager_first_name": employee_data.get("dottedLineManager", {}).get("firstName"),
                "dotted_line_manager_last_name": employee_data.get("dottedLineManager", {}).get("lastName"),
                "dotted_line_manager_email": employee_data.get("dottedLineManager", {}).get("email"),
                "contingent_type_id": employee_data.get("contingentType", {}).get("id"),
                "contingent_type_name": employee_data.get("contingentType", {}).get("name"),
                "time_type": employee_data.get("timeType"),
                "worker_type": employee_data.get("workerType"),
                "is_private": employee_data.get("isPrivate", False),
                "is_profile_complete": employee_data.get("isProfileComplete", False),
                "marital_status": employee_data.get("maritalStatus"),
                "marriage_date": self._parse_datetime(employee_data.get("marriageDate")),
                "gender": employee_data.get("gender"),
                "joining_date": self._parse_datetime(employee_data.get("joiningDate")),
                "total_experience_in_days": employee_data.get("totalExperienceInDays"),
                "professional_summary": employee_data.get("professionalSummary"),
                "date_of_birth": self._parse_datetime(employee_data.get("dateOfBirth")),
                "resignation_submitted_date": self._parse_datetime(employee_data.get("resignationSubmittedDate")),
                "exit_date": self._parse_datetime(employee_data.get("exitDate")),
                "employment_status": employee_data.get("employmentStatus"),
                "account_status": employee_data.get("accountStatus"),
                "invitation_status": employee_data.get("invitationStatus"),
                "exit_status": employee_data.get("exitStatus"),
                "exit_type": employee_data.get("exitType"),
                "exit_reason": employee_data.get("exitReason"),
                "personal_email": employee_data.get("personalEmail"),
                "work_phone": employee_data.get("workPhone"),
                "home_phone": employee_data.get("homePhone"),
                "mobile_phone": employee_data.get("mobilePhone"),
                "blood_group": employee_data.get("bloodGroup"),
                "nationality": employee_data.get("nationality"),
                "attendance_number": employee_data.get("attendanceNumber"),
                "probation_end_date": self._parse_datetime(employee_data.get("probationEndDate")),
                "current_address": employee_data.get("currentAddress"),
                "permanent_address": employee_data.get("permanentAddress"),
                "relations": employee_data.get("relations"),
                "education_details": employee_data.get("educationDetails"),
                "experience_details": employee_data.get("experienceDetails"),
                "custom_fields": employee_data.get("customFields"),
                "groups": employee_data.get("groups"),
                "leave_plan_identifier": employee_data.get("leavePlanInfo", {}).get("identifier"),
                "leave_plan_title": employee_data.get("leavePlanInfo", {}).get("title"),
                "holiday_calendar_id": employee_data.get("holidayCalendarId"),
                "band_info_identifier": employee_data.get("bandInfo", {}).get("identifier"),
                "band_info_title": employee_data.get("bandInfo", {}).get("title"),
                "pay_grade_identifier": employee_data.get("payGradeInfo", {}).get("identifier"),
                "pay_grade_title": employee_data.get("payGradeInfo", {}).get("title"),
                "shift_policy_identifier": employee_data.get("shiftPolicyInfo", {}).get("identifier"),
                "shift_policy_title": employee_data.get("shiftPolicyInfo", {}).get("title"),
                "weekly_off_policy_identifier": employee_data.get("weeklyOffPolicyInfo", {}).get("identifier"),
                "weekly_off_policy_title": employee_data.get("weeklyOffPolicyInfo", {}).get("title"),
                "capture_scheme_identifier": employee_data.get("captureSchemeInfo", {}).get("identifier"),
                "capture_scheme_title": employee_data.get("captureSchemeInfo", {}).get("title"),
                "tracking_policy_identifier": employee_data.get("trackingPolicyInfo", {}).get("identifier"),
                "tracking_policy_title": employee_data.get("trackingPolicyInfo", {}).get("title"),
                "expense_policy_identifier": employee_data.get("expensePolicyInfo", {}).get("identifier"),
                "expense_policy_title": employee_data.get("expensePolicyInfo", {}).get("title"),
                "overtime_policy_identifier": employee_data.get("overtimePolicyInfo", {}).get("identifier"),
                "overtime_policy_title": employee_data.get("overtimePolicyInfo", {}).get("title"),
                "raw_data": employee_data,
                "last_synced_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert employee data
            supabase_admin_client.table("keka_employees").upsert(
                employee_record,
                on_conflict="keka_employee_id"
            ).execute()
            
            logger.debug(f"Synced employee: {employee_data.get('email')}")
            
        except Exception as e:
            logger.error(f"Failed to sync employee data: {str(e)}")
            raise
    
    async def sync_employee_leave_balances(self) -> Dict[str, Any]:
        """Sync leave balances for all employees using global endpoint"""
        try:
            logger.info("Starting leave balances sync...")
            
            # Update sync status
            await self._update_sync_status("leave_balances", "in_progress", 0, 0)
            
            # Fetch all leave balances from global endpoint
            leave_balances_data = await self._make_keka_request(
                "GET",
                "time/leavebalance"
            )
            
            leave_balances = leave_balances_data.get("data", [])
            logger.info(f"Found {len(leave_balances)} leave balance records to sync")
            
            processed = 0
            failed = 0
            
            # Clear existing leave balances
            supabase_admin_client.table("keka_employee_leave_balances").delete().execute()
            
            for balance in leave_balances:
                try:
                    # Extract employee ID from the balance record
                    employee_id = balance.get("employeeId") or balance.get("employee_id")
                    if not employee_id:
                        logger.warning(f"Leave balance record missing employee ID: {balance}")
                        failed += 1
                        continue
                    
                    balance_record = {
                        "keka_employee_id": employee_id,
                        "leave_type": balance.get("leaveType") or balance.get("leave_type"),
                        "total_allocated": balance.get("allocated", 0),
                        "used": balance.get("consumed", 0),
                        "remaining": balance.get("balance", 0),
                        "carry_forward": balance.get("carryForward", 0),
                        "last_synced_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    supabase_admin_client.table("keka_employee_leave_balances").insert(balance_record).execute()
                    processed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to sync leave balance record: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("leave_balances", "success", processed, failed)
            
            logger.info(f"Leave balances sync completed: {processed} processed, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} leave balance records"
            }
            
        except Exception as e:
            logger.error(f"Leave balances sync failed: {str(e)}")
            await self._update_sync_status("leave_balances", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Leave balances sync failed"
            }
    
    
    async def sync_employee_attendance(self, from_date: date, to_date: date) -> Dict[str, Any]:
        """Sync attendance records for all employees using global endpoint"""
        try:
            logger.info(f"Starting attendance sync from {from_date} to {to_date}...")
            
            # Update sync status
            await self._update_sync_status("attendance", "in_progress", 0, 0)
            
            # Fetch all attendance records from global endpoint
            attendance_data = await self._make_keka_request(
                "GET",
                "time/attendance",
                params={
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                }
            )
            
            attendance_records = attendance_data.get("data", [])
            logger.info(f"Found {len(attendance_records)} attendance records to sync")
            
            processed = 0
            failed = 0
            
            # Clear existing attendance records for the date range
            supabase_admin_client.table("keka_employee_attendance").delete().gte("attendance_date", from_date.isoformat()).lte("attendance_date", to_date.isoformat()).execute()
            
            for record in attendance_records:
                try:
                    # Extract employee ID from the attendance record
                    employee_id = record.get("employeeId") or record.get("employee_id")
                    if not employee_id:
                        logger.warning(f"Attendance record missing employee ID: {record}")
                        failed += 1
                        continue
                    
                    attendance_record = {
                        "keka_employee_id": employee_id,
                        "attendance_date": record.get("date"),
                        "status": record.get("status"),
                        "check_in": self._parse_datetime(record.get("checkIn")),
                        "check_out": self._parse_datetime(record.get("checkOut")),
                        "break_hours": record.get("breakHours"),
                        "total_hours": record.get("totalHours"),
                        "overtime_hours": record.get("overtimeHours"),
                        "location": record.get("location"),
                        "last_synced_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    supabase_admin_client.table("keka_employee_attendance").insert(attendance_record).execute()
                    processed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to sync attendance record: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("attendance", "success", processed, failed)
            
            logger.info(f"Attendance sync completed: {processed} processed, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} attendance records"
            }
            
        except Exception as e:
            logger.error(f"Attendance sync failed: {str(e)}")
            await self._update_sync_status("attendance", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Attendance sync failed"
            }
    
    async def sync_employee_leave_history(self, from_date: date = None, to_date: date = None) -> Dict[str, Any]:
        """Sync leave history for all employees using global endpoint"""
        try:
            logger.info(f"Starting leave history sync from {from_date} to {to_date}...")
            
            # Update sync status
            await self._update_sync_status("leave_history", "in_progress", 0, 0)
            
            # Set default date range if not provided (last 3 months)
            if not from_date:
                from_date = date.today() - timedelta(days=90)
            if not to_date:
                to_date = date.today()
            
            # Fetch all leave requests from global endpoint
            leave_requests_data = await self._make_keka_request(
                "GET",
                "time/leaverequests",
                params={
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                }
            )
            
            leave_requests = leave_requests_data.get("data", [])
            logger.info(f"Found {len(leave_requests)} leave request records to sync")
            
            processed = 0
            failed = 0
            
            # Clear existing leave history for the date range
            supabase_admin_client.table("keka_employee_leave_history").delete().gte("from_date", from_date.isoformat()).lte("from_date", to_date.isoformat()).execute()
            
            for request in leave_requests:
                try:
                    # Extract employee ID from the leave request record
                    employee_id = request.get("employeeId") or request.get("employee_id")
                    if not employee_id:
                        logger.warning(f"Leave request record missing employee ID: {request}")
                        failed += 1
                        continue
                    
                    leave_record = {
                        "keka_employee_id": employee_id,
                        "leave_request_id": request.get("id"),
                        "leave_type": request.get("leaveType") or request.get("leave_type"),
                        "from_date": request.get("fromDate") or request.get("from_date"),
                        "to_date": request.get("toDate") or request.get("to_date"),
                        "days_count": request.get("daysCount") or request.get("days_count"),
                        "reason": request.get("reason"),
                        "status": request.get("status"),
                        "applied_date": self._parse_datetime(request.get("appliedDate") or request.get("applied_date")),
                        "approved_date": self._parse_datetime(request.get("approvedDate") or request.get("approved_date")),
                        "approved_by": request.get("approvedBy") or request.get("approved_by"),
                        "comments": request.get("comments"),
                        "last_synced_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    supabase_admin_client.table("keka_employee_leave_history").insert(leave_record).execute()
                    processed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to sync leave request record: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("leave_history", "success", processed, failed)
            
            logger.info(f"Leave history sync completed: {processed} processed, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} leave request records"
            }
            
        except Exception as e:
            logger.error(f"Leave history sync failed: {str(e)}")
            await self._update_sync_status("leave_history", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Leave history sync failed"
            }
    
    async def sync_holiday_calendars(self) -> Dict[str, Any]:
        """Sync holiday calendars from Keka"""
        try:
            logger.info("Starting holiday calendars sync...")
            
            # Update sync status
            await self._update_sync_status("holiday_calendars", "in_progress", 0, 0)
            
            # Fetch holiday calendars from Keka API
            calendars_data = await self._make_keka_request(
                "GET",
                "time/holidayscalendar"
            )
            
            calendars = calendars_data.get("data", [])
            
            processed = 0
            failed = 0
            
            for calendar in calendars:
                try:
                    calendar_record = {
                        "calendar_id": calendar.get("id"),
                        "name": calendar.get("name"),
                        "description": calendar.get("description"),
                        "year": calendar.get("year", datetime.now().year),
                        "is_active": calendar.get("isActive", True),
                        "last_synced_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    
                    supabase_admin_client.table("keka_holiday_calendars").upsert(
                        calendar_record,
                        on_conflict="calendar_id, year"
                    ).execute()
                    
                    processed += 1
                except Exception as e:
                    logger.error(f"Failed to sync holiday calendar {calendar.get('name')}: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("holiday_calendars", "success", processed, failed)
            
            logger.info(f"Holiday calendars sync completed: {processed} processed, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} holiday calendars"
            }
            
        except Exception as e:
            logger.error(f"Holiday calendars sync failed: {str(e)}")
            await self._update_sync_status("holiday_calendars", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Holiday calendars sync failed"
            }
    
    async def sync_company_holidays(self, year: int = None) -> Dict[str, Any]:
        """Sync company holidays"""
        try:
            if not year:
                year = datetime.now().year
            
            logger.info(f"Starting holidays sync for year {year}...")
            
            # Update sync status
            await self._update_sync_status("holidays", "in_progress", 0, 0)
            
            # First sync holiday calendars to get available calendar IDs
            await self.sync_holiday_calendars()
            
            # Get available calendar IDs
            calendars_response = supabase_admin_client.table("keka_holiday_calendars").select("calendar_id").eq("is_active", True).execute()
            calendar_ids = [cal["calendar_id"] for cal in calendars_response.data]
            
            if not calendar_ids:
                # Fallback to environment variable
                calendar_id = os.getenv("KEKA_CALENDAR_ID", "default")
                calendar_ids = [calendar_id]
            
            processed = 0
            failed = 0
            
            for calendar_id in calendar_ids:
                try:
                    # Fetch holidays from Keka API for this calendar
                    holidays_data = await self._make_keka_request(
                        "GET",
                        f"time/holidayscalendar/{calendar_id}/holidays",
                        params={"year": year}
                    )
                    
                    holidays = holidays_data.get("data", [])
                    
                    # Clear existing holidays for this calendar and year
                    supabase_admin_client.table("keka_company_holidays").delete().eq("calendar_id", calendar_id).gte("holiday_date", f"{year}-01-01").lte("holiday_date", f"{year}-12-31").execute()
                    
                    for holiday in holidays:
                        try:
                            holiday_record = {
                                "holiday_date": holiday.get("date"),
                                "name": holiday.get("name"),
                                "type": holiday.get("type", "company"),
                                "is_optional": holiday.get("isOptional", False),
                                "calendar_id": calendar_id,
                                "last_synced_at": datetime.now().isoformat(),
                                "updated_at": datetime.now().isoformat()
                            }
                            
                            supabase_admin_client.table("keka_company_holidays").upsert(
                                holiday_record,
                                on_conflict="holiday_date, name, calendar_id"
                            ).execute()
                            
                            processed += 1
                        except Exception as e:
                            logger.error(f"Failed to sync holiday {holiday.get('name')}: {str(e)}")
                            failed += 1
                            
                except Exception as e:
                    logger.error(f"Failed to sync holidays for calendar {calendar_id}: {str(e)}")
                    failed += 1
            
            # Update sync status
            await self._update_sync_status("holidays", "success", processed, failed)
            
            logger.info(f"Holidays sync completed: {processed} holidays synced, {failed} failed")
            return {
                "success": True,
                "processed": processed,
                "failed": failed,
                "message": f"Synced {processed} holidays for {year}"
            }
            
        except Exception as e:
            logger.error(f"Holidays sync failed: {str(e)}")
            await self._update_sync_status("holidays", "failed", 0, 0, str(e))
            return {
                "success": False,
                "error": str(e),
                "message": "Holidays sync failed"
            }
    
    async def _update_sync_status(self, sync_type: str, status: str, processed: int, failed: int, error_message: str = None) -> None:
        """Update sync status in database"""
        try:
            status_record = {
                "sync_type": sync_type,
                "last_sync_at": datetime.now().isoformat(),
                "sync_status": status,
                "records_processed": processed,
                "records_failed": failed,
                "error_message": error_message,
                "updated_at": datetime.now().isoformat()
            }
            
            supabase_admin_client.table("keka_sync_status").upsert(
                status_record,
                on_conflict="sync_type"
            ).execute()
            
        except Exception as e:
            logger.error(f"Failed to update sync status: {str(e)}")
    
    def _parse_datetime(self, date_string: str) -> Optional[str]:
        """Parse datetime string and return ISO format"""
        if not date_string:
            return None
        
        try:
            # Handle various date formats from Keka API
            if "T" in date_string:
                # ISO format
                dt = datetime.fromisoformat(date_string.replace("Z", "+00:00"))
            else:
                # Date only format
                dt = datetime.strptime(date_string, "%Y-%m-%d")
            
            return dt.isoformat()
        except Exception as e:
            logger.warning(f"Failed to parse date '{date_string}': {str(e)}")
            return None
    
    async def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status for all data types"""
        try:
            response = supabase_admin_client.table("keka_sync_status").select("*").execute()
            return {
                "success": True,
                "data": response.data
            }
        except Exception as e:
            logger.error(f"Failed to get sync status: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

# Global instance
keka_employee_sync_service = KekaEmployeeSyncService()
