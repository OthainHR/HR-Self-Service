from server import application

# This file provides a standard WSGI entry point for Gunicorn

if __name__ == "__main__":
    import os
    import uvicorn
    uvicorn.run("wsgi:application", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), log_level="info") 