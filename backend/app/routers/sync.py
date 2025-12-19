"""
Sync Management Router
Provides endpoints for managing Keka data synchronization
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import Dict, Any, Optional
from datetime import datetime, date
import logging

from app.services.keka_sync_scheduler import keka_sync_scheduler
from app.services.keka_employee_sync_service import keka_employee_sync_service
from app.utils.auth_utils import get_current_supabase_user

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

def get_admin_user(current_user: dict = Depends(get_current_supabase_user)) -> dict:
    """Verify user is admin (you can implement your own admin check logic)"""
    # For now, just return the user - implement proper admin check
    return current_user

@router.post("/sync/daily")
async def trigger_daily_sync(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Trigger daily sync operation"""
    try:
        # Run sync in background
        background_tasks.add_task(keka_sync_scheduler.run_daily_sync)
        
        return {
            "success": True,
            "message": "Daily sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger daily sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger daily sync"
        )

@router.post("/sync/weekly")
async def trigger_weekly_sync(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Trigger weekly sync operation"""
    try:
        # Run sync in background
        background_tasks.add_task(keka_sync_scheduler.run_weekly_sync)
        
        return {
            "success": True,
            "message": "Weekly sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger weekly sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger weekly sync"
        )

@router.post("/sync/monthly")
async def trigger_monthly_sync(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Trigger monthly sync operation"""
    try:
        # Run sync in background
        background_tasks.add_task(keka_sync_scheduler.run_monthly_sync)
        
        return {
            "success": True,
            "message": "Monthly sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger monthly sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger monthly sync"
        )

@router.post("/sync/full")
async def trigger_full_sync(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Trigger full sync operation"""
    try:
        # Run sync in background
        background_tasks.add_task(keka_sync_scheduler.run_full_sync)
        
        return {
            "success": True,
            "message": "Full sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger full sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger full sync"
        )

@router.get("/sync/status")
async def get_sync_status(admin_user: dict = Depends(get_admin_user)):
    """Get current sync status"""
    try:
        status_data = await keka_sync_scheduler.get_sync_status()
        return status_data
    except Exception as e:
        logger.error(f"Failed to get sync status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sync status"
        )

@router.post("/sync/employees")
async def sync_employees(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync employees data"""
    try:
        background_tasks.add_task(keka_employee_sync_service.sync_all_employees)
        
        return {
            "success": True,
            "message": "Employee sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger employee sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger employee sync"
        )

@router.post("/sync/leave-balances")
async def sync_leave_balances(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync leave balances data"""
    try:
        background_tasks.add_task(keka_employee_sync_service.sync_employee_leave_balances)
        
        return {
            "success": True,
            "message": "Leave balances sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger leave balances sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger leave balances sync"
        )

@router.post("/sync/attendance")
async def sync_attendance(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    background_tasks: BackgroundTasks = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync attendance data"""
    try:
        if not from_date:
            from_date = date.today()
        if not to_date:
            to_date = date.today()
        
        background_tasks.add_task(
            keka_employee_sync_service.sync_employee_attendance,
            from_date,
            to_date
        )
        
        return {
            "success": True,
            "message": f"Attendance sync triggered for {from_date} to {to_date}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger attendance sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger attendance sync"
        )

@router.post("/sync/leave-history")
async def sync_leave_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    background_tasks: BackgroundTasks = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync leave history data"""
    try:
        if not from_date:
            from_date = date.today() - timedelta(days=90)
        if not to_date:
            to_date = date.today()
        
        background_tasks.add_task(
            keka_employee_sync_service.sync_employee_leave_history,
            from_date,
            to_date
        )
        
        return {
            "success": True,
            "message": f"Leave history sync triggered for {from_date} to {to_date}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger leave history sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger leave history sync"
        )

@router.post("/sync/holidays")
async def sync_holidays(
    year: Optional[int] = None,
    background_tasks: BackgroundTasks = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync holidays data"""
    try:
        if not year:
            year = datetime.now().year
        
        background_tasks.add_task(
            keka_employee_sync_service.sync_company_holidays,
            year
        )
        
        return {
            "success": True,
            "message": f"Holidays sync triggered for year {year}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger holidays sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger holidays sync"
        )

@router.post("/sync/holiday-calendars")
async def sync_holiday_calendars(
    background_tasks: BackgroundTasks = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Sync holiday calendars data"""
    try:
        background_tasks.add_task(keka_employee_sync_service.sync_holiday_calendars)
        
        return {
            "success": True,
            "message": "Holiday calendars sync triggered successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to trigger holiday calendars sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger holiday calendars sync"
        )

@router.get("/health")
async def sync_health():
    """Health check for sync service"""
    return {
        "status": "healthy",
        "service": "Keka Data Sync",
        "timestamp": datetime.now().isoformat()
    }
