# Quick Start Guide - Keka Direct API Integration

## 🚀 Get Started in 5 Minutes

### Step 1: Backend Environment Setup

Create/update `backend/.env`:

```bash
# Required Keka Credentials
KEKA_API_KEY=your_api_key_here
KEKA_CLIENT_ID=your_client_id_here
KEKA_CLIENT_SECRET=your_client_secret_here
KEKA_COMPANY_NAME=othainsoft
KEKA_ENVIRONMENT=keka
```

### Step 2: Test Token Generation

Run this test to verify credentials:

```python
# test_keka_token.py
import requests

url = "https://login.keka.com/connect/token"

payload = {
    "grant_type": "kekaapi",
    "scope": "kekaapi",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "api_key": "your_api_key"
}

headers = {
    "accept": "application/json",
    "content-type": "application/x-www-form-urlencoded"
}

response = requests.post(url, data=payload, headers=headers)
print(response.json())

# Expected output:
# {
#   "access_token": "eyJhbG...",
#   "expires_in": 86400,
#   "token_type": "Bearer",
#   "scope": "kekaapi"
# }
```

### Step 3: Start Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Step 4: Start Frontend

```bash
cd frontend
npm install
npm start
```

### Step 5: Test HR Service

1. Login to your application
2. Navigate to HR Self Service
3. Check if data loads automatically

## ✅ Verification Checklist

Test these endpoints:

```bash
# Replace {token} with your Supabase auth token

# Health check
curl http://localhost:8000/api/hr/health \
  -H "Authorization: Bearer {token}"

# Profile
curl http://localhost:8000/api/hr/profile \
  -H "Authorization: Bearer {token}"

# Leave balances
curl http://localhost:8000/api/hr/leave/balances \
  -H "Authorization: Bearer {token}"
```

## 🔧 Common Issues

### Backend won't start
```bash
# Check Python version (3.8+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### "Failed to generate token"
- ✅ Check `.env` file exists in backend folder
- ✅ Verify all Keka credentials are correct
- ✅ Make sure no trailing spaces in credentials

### "Employee not found"
- ✅ Verify user email exists in Keka
- ✅ Check email format matches exactly

## 📞 Need Help?

Check these files:
- `KEKA_DIRECT_API_IMPLEMENTATION.md` - Full documentation
- `OAUTH_REMOVED_SUMMARY.md` - Change summary
- Backend logs: `backend/logs/app.log`

## 🎯 Key Files

**Backend:**
- `backend/app/services/keka_api_service.py` - API integration
- `backend/app/services/hr_data_service_direct.py` - Data service
- `backend/app/routers/hr.py` - API endpoints

**Frontend:**
- `frontend/src/services/hrService.js` - HR service
- `frontend/src/pages/HRSelfService.js` - Main page
- `frontend/src/components/hr/*` - HR components

That's it! You're ready to go! 🎉

