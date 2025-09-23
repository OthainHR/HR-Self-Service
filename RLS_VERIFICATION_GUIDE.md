# RLS Verification Guide - Supabase CLI

This guide shows you how to verify Row Level Security (RLS) on your tickets table using the Supabase CLI.

## 🚀 Quick Start

### Option 1: Run the Full Verification Script (Recommended)
```bash
# Make sure you're in your project directory
cd /Users/sunhithreddy/Documents/Code/HR-Self-Service

# Run the comprehensive verification
./verify_rls_supabase_cli.sh
```

### Option 2: Quick SQL Check
```bash
# Run just the essential checks
supabase db shell < quick_rls_check.sql
```

### Option 3: Manual CLI Commands
```bash
# Check if Supabase CLI is working
supabase --version

# Check project status
supabase status

# Run a quick RLS check
supabase db shell --sql "
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'tickets' AND schemaname = 'public';
"
```

## 📋 Prerequisites

### 1. Install Supabase CLI
```bash
# If not already installed
npm install -g supabase
```

### 2. Link Your Project
```bash
# If not already linked
supabase link --project-ref YOUR_PROJECT_REF

# Or start local development
supabase start
```

### 3. Verify Connection
```bash
# Test database connection
supabase db shell --sql "SELECT current_database();"
```

## 🔍 What the Verification Checks

### ✅ Critical Checks
- **RLS Status**: Is RLS enabled on tickets, chat_sessions, chat_messages?
- **Policies**: Do SELECT, INSERT, UPDATE policies exist?
- **Permissions**: Can authenticated users access required tables?
- **Auth Access**: Can policies read auth.users for role checking?

### ⚠️ Warning Signs
- ❌ `RLS DISABLED` on core tables
- ❌ `NO POLICIES` for essential operations
- ❌ `Permission denied` errors
- ❌ Missing UPDATE policies (breaks assignee updates)

## 🚨 Common Issues & Fixes

### Issue: "RLS DISABLED on tickets"
**Fix:** Run the RLS setup first
```bash
supabase db shell < fix_tickets_rls_policies.sql
```

### Issue: "Permission denied for table auth.users"
**Fix:** Grant required permissions
```bash
supabase db shell < fix_auth_permissions.sql
```

### Issue: "No UPDATE policies - assignments fail"
**Fix:** Both files above address this issue

### Issue: "Cannot create tickets as non-admin"
**Fix:** The auth permissions fix resolves this

## 📊 Expected Output

### ✅ Healthy RLS Setup
```
🎉 SUCCESS: RLS is properly configured!
✅ RLS ENABLED on all critical tables
✅ Users can view tickets (SELECT policies exist)
✅ Users can create tickets (INSERT policies exist)  
✅ Users can update tickets (UPDATE policies exist)
✅ Can access auth.users table
```

### ❌ Problems Found
```
🚨 CRITICAL: Missing RLS on core tables
❌ RLS DISABLED - CRITICAL ISSUE on tickets
❌ NO POLICIES - Operations will fail
❌ Cannot access auth schema - RLS policies may fail
```

## 🧪 Testing After Fixes

### 1. Re-run Verification
```bash
./verify_rls_supabase_cli.sh
```

### 2. Test in Browser
- Try creating a ticket as regular user
- Try updating assignee as admin
- Check browser console for RLS errors

### 3. Test Different User Roles
- Login as regular user → should create tickets for themselves
- Login as admin → should create tickets for others
- Check that users can only see their own tickets (unless admin)

## 📁 Files Overview

| File | Purpose | Usage |
|------|---------|-------|
| `verify_rls_supabase_cli.sh` | Comprehensive RLS verification | `./verify_rls_supabase_cli.sh` |
| `quick_rls_check.sql` | Fast essential checks | `supabase db shell < quick_rls_check.sql` |
| `fix_tickets_rls_policies.sql` | Add missing UPDATE policies | `supabase db shell < fix_tickets_rls_policies.sql` |
| `fix_auth_permissions.sql` | Fix permission issues | `supabase db shell < fix_auth_permissions.sql` |

## 🎯 Success Criteria

### VAPT Ready Checklist
- [ ] RLS enabled on tickets, chat_sessions, chat_messages
- [ ] SELECT policies allow users to view appropriate tickets
- [ ] INSERT policies allow ticket creation
- [ ] UPDATE policies allow assignee changes
- [ ] Non-admin users can create tickets
- [ ] Admin users can create tickets "on behalf of others"
- [ ] No "permission denied" errors in browser console

### Performance Optimized
- [ ] Policies use JWT claims instead of database queries
- [ ] Fast policy evaluation (no complex EXISTS queries)
- [ ] Proper indexing on policy-checked columns

## 🆘 Troubleshooting

### CLI Connection Issues
```bash
# Check if logged in
supabase auth login

# Verify project linking
supabase projects list
supabase link --project-ref YOUR_PROJECT_REF
```

### Database Access Issues
```bash
# Check local development
supabase start
supabase status

# Test connection
supabase db shell --sql "SELECT version();"
```

### Permission Errors
```bash
# Reset local database
supabase db reset

# Push latest schema
supabase db push
```

## 📞 Support

If you encounter issues:
1. Check the verification script output for specific errors
2. Run the appropriate fix SQL file
3. Re-run verification to confirm fixes
4. Test in browser to ensure functionality works

The verification tools will guide you to the exact fixes needed! 🚀
