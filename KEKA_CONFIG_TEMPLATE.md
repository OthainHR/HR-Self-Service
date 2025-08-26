# Keka ESS Integration Configuration Template

## Required Environment Variables

Add these to your `.env` file in the backend directory:

```env
# Keka API Configuration for ESS Integration
# Get these from your Keka admin panel under API settings
KEKA_CLIENT_ID=your_keka_client_id_here
KEKA_CLIENT_SECRET=your_keka_client_secret_here
KEKA_REFRESH_TOKEN=your_keka_refresh_token_here
KEKA_API_BASE_URL=https://your-keka-instance.keka.com/api/v1
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

4. **Set Base URL**
   - Your API base URL will be: `https://your-company-name.keka.com/api/v1`
   - Replace `your-company-name` with your actual Keka instance name

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
