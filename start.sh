#!/bin/bash

# Top-level startup script for Render
echo "Starting application..."

# Navigate to the backend directory
cd backend

# Run the application with Gunicorn
exec gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 5 --log-level info 