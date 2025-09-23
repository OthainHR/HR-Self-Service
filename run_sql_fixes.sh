#!/bin/bash

# Script to run SQL fixes for Supabase RLS and schema issues
# This script provides multiple methods to execute the SQL fixes

echo "=== Supabase RLS and Schema Fix Script ==="
echo ""

# Method 1: Using psql with database URL (requires password)
echo "Method 1: Using psql with database URL"
echo "You'll need the database password from your Supabase dashboard"
echo "Run these commands with your database password:"
echo ""
echo "psql 'postgresql://postgres:[YOUR_PASSWORD]@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres' -f tickets_schema_fix.sql"
echo "psql 'postgresql://postgres:[YOUR_PASSWORD]@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres' -f fix_auth_permissions.sql"
echo "psql 'postgresql://postgres:[YOUR_PASSWORD]@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres' -f fix_tickets_rls_policies.sql"
echo "psql 'postgresql://postgres:[YOUR_PASSWORD]@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres' -f quick_rls_check.sql"
echo ""

# Method 2: Using Supabase Dashboard
echo "Method 2: Using Supabase Dashboard (Recommended)"
echo "1. Go to https://supabase.com/dashboard/project/sethhceiojxrevvpzupf"
echo "2. Navigate to SQL Editor"
echo "3. Run these files in order:"
echo "   - tickets_schema_fix.sql"
echo "   - fix_auth_permissions.sql"
echo "   - fix_tickets_rls_policies.sql"
echo "   - quick_rls_check.sql"
echo ""

# Method 3: Using Supabase CLI with proper authentication
echo "Method 3: Using Supabase CLI (if you have access token)"
echo "1. Get access token from https://supabase.com/dashboard/account/tokens"
echo "2. Set environment variable: export SUPABASE_ACCESS_TOKEN=your_token_here"
echo "3. Link project: supabase link --project-ref sethhceiojxrevvpzupf"
echo "4. Run SQL files: supabase db shell < tickets_schema_fix.sql"
echo ""

# Check if files exist
echo "Checking if SQL files exist:"
for file in tickets_schema_fix.sql fix_auth_permissions.sql fix_tickets_rls_policies.sql quick_rls_check.sql; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file missing"
    fi
done

echo ""
echo "=== Next Steps ==="
echo "1. Choose one of the methods above"
echo "2. Execute the SQL files in the correct order"
echo "3. Verify the fixes using the quick_rls_check.sql"
echo "4. Test ticket creation and assignment"
echo ""

# Method 4: Try to get database password from environment
echo "Method 4: Checking for database password in environment..."
if [ -n "$DATABASE_PASSWORD" ]; then
    echo "Found DATABASE_PASSWORD environment variable"
    echo "Attempting to run SQL fixes with psql..."
    
    # Try to run the fixes
    psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f tickets_schema_fix.sql
    psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f fix_auth_permissions.sql
    psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f fix_tickets_rls_policies.sql
    psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f quick_rls_check.sql
else
    echo "DATABASE_PASSWORD environment variable not set"
    echo "Set it with: export DATABASE_PASSWORD=your_password_here"
fi
