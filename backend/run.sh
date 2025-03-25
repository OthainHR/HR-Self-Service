#!/bin/bash

# This script provides an explicit entry point for running the application
# It will be used by Render if the service type is set to "web" with no start command

# Change to the correct directory first
cd "$(dirname "$0")"

# Run with Gunicorn using Uvicorn workers
exec gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 5 --log-level info 