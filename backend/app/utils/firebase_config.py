import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Your Firebase configuration
# For Firebase Admin SDK, we use service account credentials
firebase_config = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID")
}

def initialize_firebase():
    """Initialize Firebase with configuration."""
    try:
        # For server-side applications like this one, we typically use a service account
        # rather than the client-side config, but we'll support both approaches
        
        # First check for service account credentials file
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        
        if cred_path and os.path.exists(cred_path):
            # Initialize with service account credentials
            cred = credentials.Certificate(cred_path)
            firebase_app = firebase_admin.initialize_app(cred)
            print(f"Initialized Firebase with service account credentials")
        elif firebase_config["projectId"]:
            # Initialize with configuration dictionary
            firebase_app = firebase_admin.initialize_app(options={
                "projectId": firebase_config["projectId"],
                "storageBucket": firebase_config["storageBucket"]
            })
            print(f"Initialized Firebase with project ID: {firebase_config['projectId']}")
        else:
            # Fallback to local emulator
            os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
            firebase_app = firebase_admin.initialize_app()
            print("Using Firebase Local Emulator")
        
        # Get Firestore client
        db = firestore.client()
        return db
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

# Initialize Firestore database
db = initialize_firebase()