from main import app as application

# This file provides a standard WSGI interface which Gunicorn might look for by default.
# The 'application' object is what a WSGI server expects to find.

# For direct execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000) 