import os

# Bind to the port provided by Render
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Worker configuration
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5

# Logging
loglevel = "info"

# Application path - this is key!
wsgi_app = "main:app" 