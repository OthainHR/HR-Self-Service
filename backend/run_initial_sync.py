#!/usr/bin/env python3
"""
Initial Keka Data Sync Script
Run this script to perform the initial sync of all employee data from Keka
"""

import asyncio
import os
import sys
import logging
from datetime import datetime

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.keka_sync_scheduler import keka_sync_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def main():
    """Run the initial sync"""
    logger.info("Starting initial Keka data sync...")
    
    try:
        # Check if required environment variables are set
        required_vars = ["KEKA_CLIENT_ID", "KEKA_CLIENT_SECRET", "KEKA_COMPANY_NAME"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {missing_vars}")
            logger.error("Please set the following environment variables:")
            logger.error("  KEKA_CLIENT_ID - Your Keka API client ID")
            logger.error("  KEKA_CLIENT_SECRET - Your Keka API client secret")
            logger.error("  KEKA_COMPANY_NAME - Your Keka company name (e.g., othainsoft)")
            sys.exit(1)
        
        # Run full sync
        logger.info("Running full sync...")
        result = await keka_sync_scheduler.run_full_sync()
        
        if result["overall_success"]:
            logger.info("Initial sync completed successfully!")
            logger.info(f"Results: {result}")
        else:
            logger.error("Initial sync failed!")
            logger.error(f"Error: {result.get('error', 'Unknown error')}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Initial sync failed with exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
