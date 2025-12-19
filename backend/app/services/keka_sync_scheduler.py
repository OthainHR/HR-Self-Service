"""
Keka Data Sync Scheduler
Scheduled jobs to sync employee data from Keka API
"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Dict, Any
from app.services.keka_employee_sync_service import keka_employee_sync_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KekaSyncScheduler:
    """
    Scheduler for running Keka data sync operations
    """
    
    def __init__(self):
        self.sync_service = keka_employee_sync_service
    
    async def run_daily_sync(self) -> Dict[str, Any]:
        """Run daily sync operations"""
        logger.info("Starting daily Keka data sync...")
        
        results = {
            "employees": None,
            "leave_balances": None,
            "attendance": None,
            "holiday_calendars": None,
            "holidays": None,
            "overall_success": False,
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # 1. Sync all employees (daily)
            logger.info("Syncing employees...")
            results["employees"] = await self.sync_service.sync_all_employees()
            
            # 2. Sync leave balances (daily)
            logger.info("Syncing leave balances...")
            results["leave_balances"] = await self.sync_service.sync_employee_leave_balances()
            
            # 3. Sync attendance for current month (daily)
            logger.info("Syncing attendance...")
            today = date.today()
            month_start = date(today.year, today.month, 1)
            results["attendance"] = await self.sync_service.sync_employee_attendance(month_start, today)
            
            # 4. Sync leave history for last 3 months (daily)
            logger.info("Syncing leave history...")
            three_months_ago = today - timedelta(days=90)
            results["leave_history"] = await self.sync_service.sync_employee_leave_history(three_months_ago, today)
            
            # 5. Sync holiday calendars (weekly - only on Mondays)
            if today.weekday() == 0:  # Monday
                logger.info("Syncing holiday calendars...")
                results["holiday_calendars"] = await self.sync_service.sync_holiday_calendars()
            
            # 6. Sync holidays for current year (monthly - only on 1st of month)
            if today.day == 1:
                logger.info("Syncing holidays...")
                results["holidays"] = await self.sync_service.sync_company_holidays(today.year)
            
            results["overall_success"] = True
            results["completed_at"] = datetime.now().isoformat()
            
            logger.info("Daily sync completed successfully")
            
        except Exception as e:
            logger.error(f"Daily sync failed: {str(e)}")
            results["error"] = str(e)
            results["completed_at"] = datetime.now().isoformat()
        
        return results
    
    async def run_weekly_sync(self) -> Dict[str, Any]:
        """Run weekly sync operations"""
        logger.info("Starting weekly Keka data sync...")
        
        results = {
            "holiday_calendars": None,
            "overall_success": False,
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Sync holiday calendars (weekly)
            logger.info("Syncing holiday calendars...")
            results["holiday_calendars"] = await self.sync_service.sync_holiday_calendars()
            
            results["overall_success"] = True
            results["completed_at"] = datetime.now().isoformat()
            
            logger.info("Weekly sync completed successfully")
            
        except Exception as e:
            logger.error(f"Weekly sync failed: {str(e)}")
            results["error"] = str(e)
            results["completed_at"] = datetime.now().isoformat()
        
        return results
    
    async def run_monthly_sync(self) -> Dict[str, Any]:
        """Run monthly sync operations"""
        logger.info("Starting monthly Keka data sync...")
        
        results = {
            "holidays": None,
            "payslips": None,
            "overall_success": False,
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Sync holidays for current year (monthly)
            logger.info("Syncing holidays...")
            results["holidays"] = await self.sync_service.sync_company_holidays(datetime.now().year)
            
            # Note: Payslips sync would be added here when implemented
            # results["payslips"] = await self.sync_service.sync_employee_payslips()
            
            results["overall_success"] = True
            results["completed_at"] = datetime.now().isoformat()
            
            logger.info("Monthly sync completed successfully")
            
        except Exception as e:
            logger.error(f"Monthly sync failed: {str(e)}")
            results["error"] = str(e)
            results["completed_at"] = datetime.now().isoformat()
        
        return results
    
    async def run_full_sync(self) -> Dict[str, Any]:
        """Run full sync of all data"""
        logger.info("Starting full Keka data sync...")
        
        results = {
            "employees": None,
            "leave_balances": None,
            "attendance": None,
            "leave_history": None,
            "holiday_calendars": None,
            "holidays": None,
            "overall_success": False,
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }
        
        try:
            # Sync all data types
            logger.info("Syncing employees...")
            results["employees"] = await self.sync_service.sync_all_employees()
            
            logger.info("Syncing leave balances...")
            results["leave_balances"] = await self.sync_service.sync_employee_leave_balances()
            
            logger.info("Syncing attendance for last 3 months...")
            today = date.today()
            three_months_ago = today - timedelta(days=90)
            results["attendance"] = await self.sync_service.sync_employee_attendance(three_months_ago, today)
            
            logger.info("Syncing leave history for last 3 months...")
            results["leave_history"] = await self.sync_service.sync_employee_leave_history(three_months_ago, today)
            
            logger.info("Syncing holiday calendars...")
            results["holiday_calendars"] = await self.sync_service.sync_holiday_calendars()
            
            logger.info("Syncing holidays...")
            results["holidays"] = await self.sync_service.sync_company_holidays(today.year)
            
            results["overall_success"] = True
            results["completed_at"] = datetime.now().isoformat()
            
            logger.info("Full sync completed successfully")
            
        except Exception as e:
            logger.error(f"Full sync failed: {str(e)}")
            results["error"] = str(e)
            results["completed_at"] = datetime.now().isoformat()
        
        return results
    
    async def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status"""
        return await self.sync_service.get_sync_status()

# Global instance
keka_sync_scheduler = KekaSyncScheduler()
