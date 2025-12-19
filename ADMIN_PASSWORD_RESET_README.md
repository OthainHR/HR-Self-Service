# 🔐 Admin Password Reset Functionality

This implementation provides a secure way for administrators to reset user passwords without touching SQL directly. It uses Supabase Edge Functions with proper authentication and authorization.

## 🚀 Quick Start

### 1. Deploy the Edge Function

```bash
# Navigate to your project root
cd /path/to/your/project

# Deploy the function (make sure you have Supabase CLI installed)
supabase functions deploy reset-user-password --no-verify-jwt=false
```

### 2. Set Environment Variables

In your Supabase project dashboard:
1. Go to **Project Settings** → **Functions** → **Environment variables**
2. Add these variables:
   - `SUPABASE_URL` - Your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (keep secret!)
   - `SUPABASE_ANON_KEY` - Your anon key

### 3. Add to Your App

The functionality is now available in your `AuthContext`. You can:

```jsx
// Use the admin panel anywhere in your app
import { AdminPasswordResetPanel } from '../contexts/AuthContext';

// Or use the functions directly
import { useAuth } from '../contexts/AuthContext';

const { resetUserPasswordByEmail, resetUserPasswordById, isAdmin } = useAuth();
```

## 🏗️ Architecture

### Security Features
- ✅ **Admin-only access** - Domain-based + role-based checks
- ✅ **JWT verification** - Only authenticated users can call
- ✅ **Service role isolation** - Never exposed to browser
- ✅ **Input validation** - Proper error handling

### Admin Detection
Users are considered admins if they have:
1. **Domain access**: `@othainsoft.com`, `@jerseytechpartners.com`, `@markenzoworldwide.com`
2. **Role flag**: `user_metadata.role === 'admin'`

## 📱 Usage Examples

### Basic Password Reset
```jsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { resetUserPasswordByEmail, isAdmin } = useAuth();
  
  const handleReset = async () => {
    try {
      await resetUserPasswordByEmail('user@example.com', 'newPassword123');
      console.log('Password reset successful!');
    } catch (error) {
      console.error('Reset failed:', error.message);
    }
  };
  
  if (!isAdmin) return <div>Access denied</div>;
  
  return <button onClick={handleReset}>Reset Password</button>;
};
```

### Drop-in Admin Panel
```jsx
import { AdminPasswordResetPanel } from '../contexts/AuthContext';

const AdminPage = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <AdminPasswordResetPanel />
    </div>
  );
};
```

## 🔧 Configuration

### Customizing Admin Domains
Edit `supabase/functions/reset-user-password/index.ts`:

```typescript
const isAdminUser = (email?: string, role?: string) => {
  if (!email) return false;
  const adminDomains = [
    "@othainsoft.com", 
    "@jerseytechpartners.com", 
    "@markenzoworldwide.com",
    // Add your domains here
    "@yourcompany.com"
  ];
  const emailDomain = email.slice(email.lastIndexOf("@")).toLowerCase();
  return adminDomains.includes(emailDomain) || role === "admin";
};
```

### Adding Custom Admin Checks
You can extend the admin check to include:
- Database role checks
- Custom claims
- Time-based access
- IP restrictions

## 🚨 Security Notes

### Important
- **Never expose** `SERVICE_ROLE_KEY` in the browser
- **Keep JWT verification ON** (default setting)
- **Monitor function calls** in Supabase logs
- **Regularly audit** admin access

### Best Practices
1. **Log all password resets** for audit trails
2. **Implement rate limiting** if needed
3. **Consider 2FA** for admin accounts
4. **Regular security reviews** of admin access

## 🐛 Troubleshooting

### Common Issues

#### "Forbidden" Error
- Check if user email domain is in admin list
- Verify `user_metadata.role` is set to "admin"
- Ensure JWT verification is enabled

#### "User not found" Error
- Verify email spelling
- Check if user exists in Supabase Auth
- Ensure function has proper permissions

#### Function Deployment Issues
- Check Supabase CLI version
- Verify project linking: `supabase link --project-ref YOUR_REF`
- Check environment variables are set

### Debug Mode
Add logging to the Edge Function:

```typescript
console.log('Caller email:', caller.email);
console.log('Caller role:', (caller.user_metadata as any)?.role);
console.log('Is admin:', isAdminUser(caller.email, (caller.user_metadata as any)?.role));
```

## 📊 Monitoring

### Supabase Dashboard
- **Functions** → **Logs** - View function execution logs
- **Auth** → **Users** - Monitor user management
- **Database** → **Logs** - Check for related database activity

### Custom Metrics
Consider adding:
- Password reset success/failure rates
- Admin action logging
- User activity tracking

## 🔄 Updates & Maintenance

### Regular Tasks
1. **Review admin access** quarterly
2. **Update domain lists** as needed
3. **Monitor function performance**
4. **Security audit** of admin privileges

### Version Updates
```bash
# Update function
supabase functions deploy reset-user-password --no-verify-jwt=false

# Check function status
supabase functions list
```

## 📞 Support

If you encounter issues:
1. Check Supabase function logs
2. Verify environment variables
3. Test with known admin account
4. Review security policies

---

**Built with ❤️ for secure admin operations**
