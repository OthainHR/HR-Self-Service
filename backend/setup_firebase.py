#!/usr/bin/env python
"""
Firebase Setup Script for HR Chatbot

This script guides you through setting up Firebase for the HR Chatbot application.
It helps you set up the necessary environment variables and checks your configuration.
"""

import os
import json
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key, find_dotenv

def main():
    """Guide the user through setting up Firebase credentials."""
    print("=" * 80)
    print("HR Chatbot - Firebase Setup")
    print("=" * 80)
    print("\nThis script will help you configure Firebase for storing vector embeddings.")
    print("\nBefore proceeding, make sure you have:")
    print("1. Created a Firebase project at https://console.firebase.google.com/")
    print("2. Set up Firestore in your project")
    print("3. Generated a service account key (Project Settings > Service accounts > Generate new private key)")
    
    proceed = input("\nDo you want to proceed? (y/n): ")
    
    if proceed.lower() != 'y':
        print("Setup aborted. You can run this script again when ready.")
        return
    
    # Check for existing .env file
    env_file = find_dotenv()
    if not env_file:
        env_file = '.env'
        print(f"Creating new .env file at {os.path.abspath(env_file)}")
        with open(env_file, 'w') as f:
            f.write("# Environment variables for HR Chatbot\n")
    else:
        print(f"Found existing .env file at {env_file}")
        load_dotenv(env_file)
    
    # Ask for service account key path
    while True:
        key_path = input("\nEnter the path to your Firebase service account key JSON file: ")
        
        if not key_path:
            print("Please provide a valid path.")
            continue
        
        key_path = os.path.expanduser(key_path)
        
        if not os.path.exists(key_path):
            print(f"File not found: {key_path}")
            continue
        
        try:
            with open(key_path, 'r') as f:
                credentials = json.load(f)
            
            # Verify this is a Firebase service account key
            if 'type' in credentials and credentials['type'] == 'service_account':
                print(f"Valid service account key found for project: {credentials.get('project_id', 'Unknown')}")
                break
            else:
                print("The file does not appear to be a Firebase service account key.")
        except json.JSONDecodeError:
            print("The file is not a valid JSON file.")
        except Exception as e:
            print(f"Error reading file: {e}")
    
    # Copy the key to a secure location
    app_dir = Path(__file__).parent
    keys_dir = app_dir / 'keys'
    keys_dir.mkdir(exist_ok=True)
    
    dest_file = keys_dir / 'firebase-credentials.json'
    import shutil
    shutil.copy(key_path, dest_file)
    print(f"\nCopied credentials to {dest_file}")
    
    # Update .env file
    set_key(env_file, "FIREBASE_CREDENTIALS_PATH", str(dest_file))
    print(f"Updated {env_file} with FIREBASE_CREDENTIALS_PATH")
    
    print("\n" + "=" * 80)
    print("Firebase setup complete!")
    print("=" * 80)
    print("\nYour application will now use Firebase Firestore to store vector embeddings.")
    print("\nTo test your setup, run the backend application and try adding a document to the knowledge base.")
    print("\nIf you encounter any issues, check:")
    print("1. The Firestore rules in your Firebase console")
    print("2. Your service account key permissions")
    print("3. The application logs for detailed error messages")

if __name__ == "__main__":
    main() 