# Keka ESS Integration Configuration Template

## Required Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Keka API Configuration for ESS Integration
# Get these from your Keka admin panel under API settings
KEKA_CLIENT_ID=your_keka_client_id_here
KEKA_CLIENT_SECRET=your_keka_client_secret_here
KEKA_REDIRECT_URI=https://your-domain.com/api/keka-auth/callback
KEKA_COMPANY_NAME=your_company_name
KEKA_ENVIRONMENT=keka
# Optional: Holiday calendar ID (if you want to fetch holidays)
KEKA_CALENDAR_ID=default
```

## How to Get Keka API Credentials

1. **Login to Keka Admin Panel**
   - Go to your Keka instance admin panel
   - Navigate to Settings > Integrations > API

2. **Create API Application**
   - Click "Create New Application"
   - Give it a name like "ESS Chatbot Integration"
   - Set permissions for employee data access

3. **Get Credentials**
   - Copy the `Client ID` and `Client Secret`
   - Generate a `Refresh Token` for server-to-server authentication

4. **Set Environment Variables**
   - `KEKA_COMPANY_NAME`: Your Keka instance name (e.g., "yourcompany" for yourcompany.keka.com)
   - `KEKA_ENVIRONMENT`: Use "keka" for production or "kekademo" for sandbox
   - Your API base URL will be automatically constructed as: `https://{KEKA_COMPANY_NAME}.{KEKA_ENVIRONMENT}.com/api/v1`
   - OAuth URLs will be: `https://login.keka.com/connect/token` (production) or `https://login.kekademo.com/connect/token` (sandbox)

## Testing the Configuration

Once configured, you can test the integration by:

1. Starting the backend server: `uvicorn main:app --reload`
2. Going to `http://localhost:8000/docs`
3. Using the HR endpoints under the "HR" section
4. Check the health endpoint: `GET /api/hr/health`

## Security Notes

- Keep your Keka credentials secure and never commit them to git
- Use environment-specific configurations for development/staging/production
- Implement IP whitelisting in Keka if available
- Monitor API usage and set up alerts for unusual activity

## Rate Limiting

The integration includes built-in rate limiting:
- 50 requests per minute per user
- Caching for employee ID lookups
- Automatic token refresh

## Available HR Features

Once configured, employees can access:
- **Profile**: View personal information, designation, department
- **Leave Management**: Check balances, apply for leave, view history
- **Attendance**: View attendance records, current month data
- **Payslips**: Access salary information and download payslips
- **Holidays**: View company holidays and upcoming events

All features are email-based - employees automatically access their own data based on their login email.
