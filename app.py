import sys
import os

# Add the backend directory to the path
backend_dir = os.path.abspath("backend")
sys.path.insert(0, backend_dir)

# Create a special Python path configuration to handle the app directory
# This is important to avoid namespace conflicts
sys.path.insert(0, os.path.join(backend_dir, "app"))

# Debug information
print(f"Python path: {sys.path}")
print(f"Current directory: {os.getcwd()}")
print(f"Files in current directory: {os.listdir('.')}")
print(f"Files in backend directory: {os.listdir('backend')}")
print(f"Files in backend/app directory: {os.listdir('backend/app')}")

# Now import the FastAPI app
try:
    import main
    application = main.app
except ImportError as e:
    print(f"Error importing main: {e}")
    raise

# For WSGI compatibility
app = application

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), log_level="info") 