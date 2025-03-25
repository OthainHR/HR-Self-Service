import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.abspath("backend"))

# Import the app from the main module in the backend directory
try:
    from backend.main import app as application
except ImportError as e:
    print(f"Error importing backend.main: {e}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in current directory: {os.listdir('.')}")
    print(f"Files in backend directory: {os.listdir('backend')}")
    raise

# For WSGI compatibility
app = application

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), log_level="info") 