# Manual SQL Fixes for Supabase RLS and Schema Issues

## Overview
Due to CLI permission issues and network connectivity problems, here are the manual steps to fix the schema and RLS issues.

## Database Connection Details
- **Host**: db.sethhceiojxrevvpzupf.supabase.co
- **Port**: 5432
- **Database**: postgres
- **Username**: postgres
- **Password**: cisvoq-qevRax-1nuwpu

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/sethhceiojxrevvpzupf
2. Navigate to SQL Editor
3. Run the following SQL files in order:

### Step 1: Fix Tickets Table Schema
Run the contents of `tickets_schema_fix.sql`:

```sql
-- Ensure tickets table has all required columns
DO $$
BEGIN
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'priority') THEN
        ALTER TABLE public.tickets ADD COLUMN priority VARCHAR(20) DEFAULT 'MEDIUM';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'status') THEN
        ALTER TABLE public.tickets ADD COLUMN status VARCHAR(20) DEFAULT 'OPEN';
    END IF;
    
    -- Add due_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'due_at') THEN
        ALTER TABLE public.tickets ADD COLUMN due_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'resolved_at') THEN
        ALTER TABLE public.tickets ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add admin_comment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'admin_comment') THEN
        ALTER TABLE public.tickets ADD COLUMN admin_comment TEXT;
    END IF;
    
    -- Add expense_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'expense_amount') THEN
        ALTER TABLE public.tickets ADD COLUMN expense_amount DECIMAL(10,2);
    END IF;
    
    -- Add payment_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'payment_type') THEN
        ALTER TABLE public.tickets ADD COLUMN payment_type VARCHAR(50);
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tickets' AND column_name = 'updated_at') THEN
        ALTER TABLE public.tickets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add constraints
ALTER TABLE public.tickets 
ADD CONSTRAINT IF NOT EXISTS tickets_priority_check 
CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

ALTER TABLE public.tickets 
ADD CONSTRAINT IF NOT EXISTS tickets_status_check 
CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_due_at ON public.tickets(due_at);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON public.tickets(updated_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
```

### Step 2: Fix Authentication Permissions
Run the contents of `fix_auth_permissions.sql`:

```sql
-- Grant SELECT on auth.users to authenticated role
GRANT SELECT ON auth.users TO authenticated;

-- Recreate v_user_emails view with proper security definer and permissions
CREATE OR REPLACE VIEW public.v_user_emails AS
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users;

ALTER VIEW public.v_user_emails OWNER TO postgres;
GRANT SELECT ON public.v_user_emails TO authenticated;

-- Grant usage on auth schema to authenticated role
GRANT USAGE ON SCHEMA auth TO authenticated;
```

### Step 3: Fix RLS Policies for Tickets
Run the contents of `fix_tickets_rls_policies.sql`:

```sql
-- Enable RLS on tickets table (if not already)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow users to view relevant tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to insert their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to update their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow users to delete their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow admins to manage all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow role-based agents to update assigned tickets" ON public.tickets;

-- SELECT Policy: Allow users to view relevant tickets
CREATE POLICY "Allow users to view relevant tickets" ON public.tickets
FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'role') = 'it_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests')
    OR (auth.jwt() ->> 'role') = 'hr_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'HR Requests')
    OR (auth.jwt() ->> 'role') = 'payroll_admin' AND category_id IN (SELECT id FROM public.ticket_categories WHERE name IN ('Payroll Requests', 'Expense Management'))
    OR (auth.jwt() ->> 'role') = 'operations_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Operations')
    OR (auth.jwt() ->> 'role') = 'ai_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'AI Requests')
    OR requested_by = auth.uid()
    OR assignee = auth.uid()
    OR EXISTS (SELECT 1 FROM public.ticket_additional_emails tae WHERE tae.ticket_id = tickets.id AND tae.user_id = auth.uid())
);

-- INSERT Policy: Allow users to insert tickets
CREATE POLICY "Allow users to insert tickets" ON public.tickets
FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR requested_by = auth.uid()
    OR (auth.jwt() ->> 'role') = 'it_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests')
    OR (auth.jwt() ->> 'role') = 'hr_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'HR Requests')
    OR (auth.jwt() ->> 'role') = 'payroll_admin' AND category_id IN (SELECT id FROM public.ticket_categories WHERE name IN ('Payroll Requests', 'Expense Management'))
    OR (auth.jwt() ->> 'role') = 'operations_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Operations')
    OR (auth.jwt() ->> 'role') = 'ai_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'AI Requests')
);

-- UPDATE Policy: Allow requesters to update their own tickets (if not closed)
CREATE POLICY "Allow requesters to update their own tickets" ON public.tickets
FOR UPDATE USING (
    requested_by = auth.uid() AND status <> 'CLOSED'
) WITH CHECK (
    requested_by = auth.uid() AND status <> 'CLOSED'
);

-- UPDATE Policy: Allow assignees to update their assigned tickets (if not closed)
CREATE POLICY "Allow assignees to update assigned tickets" ON public.tickets
FOR UPDATE USING (
    assignee = auth.uid() AND status <> 'CLOSED'
) WITH CHECK (
    assignee = auth.uid() AND status <> 'CLOSED'
);

-- UPDATE Policy: Allow admins to update any ticket
CREATE POLICY "Allow admins to update all tickets" ON public.tickets
FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin'
) WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
);

-- UPDATE Policy: Allow role-based agents to update relevant tickets
CREATE POLICY "Allow role-based agents to update relevant tickets" ON public.tickets
FOR UPDATE USING (
    ((auth.jwt() ->> 'role') = 'it_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests'))
    OR ((auth.jwt() ->> 'role') = 'hr_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'HR Requests'))
    OR ((auth.jwt() ->> 'role') = 'payroll_admin' AND category_id IN (SELECT id FROM public.ticket_categories WHERE name IN ('Payroll Requests', 'Expense Management')))
    OR ((auth.jwt() ->> 'role') = 'operations_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Operations'))
    OR ((auth.jwt() ->> 'role') = 'ai_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'AI Requests'))
) WITH CHECK (
    ((auth.jwt() ->> 'role') = 'it_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'IT Requests'))
    OR ((auth.jwt() ->> 'role') = 'hr_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'HR Requests'))
    OR ((auth.jwt() ->> 'role') = 'payroll_admin' AND category_id IN (SELECT id FROM public.ticket_categories WHERE name IN ('Payroll Requests', 'Expense Management')))
    OR ((auth.jwt() ->> 'role') = 'operations_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'Operations'))
    OR ((auth.jwt() ->> 'role') = 'ai_admin' AND category_id = (SELECT id FROM public.ticket_categories WHERE name = 'AI Requests'))
);

-- UPDATE Policy: Allow additional email users to update tickets (if not closed)
CREATE POLICY "Allow additional email users to update tickets" ON public.tickets
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.ticket_additional_emails tae WHERE tae.ticket_id = tickets.id AND tae.user_id = auth.uid()) AND status <> 'CLOSED'
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ticket_additional_emails tae WHERE tae.ticket_id = tickets.id AND tae.user_id = auth.uid()) AND status <> 'CLOSED'
);
```

### Step 4: Verify the Fixes
Run the contents of `quick_rls_check.sql`:

```sql
-- Quick RLS verification
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'tickets';

-- Check if tickets table has all required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Method 2: Using psql (if network issues are resolved)

```bash
# Set the database password
export DATABASE_PASSWORD="cisvoq-qevRax-1nuwpu"

# Run the SQL fixes
psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f tickets_schema_fix.sql
psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f fix_auth_permissions.sql
psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f fix_tickets_rls_policies.sql
psql "postgresql://postgres:$DATABASE_PASSWORD@db.sethhceiojxrevvpzupf.supabase.co:5432/postgres" -f quick_rls_check.sql
```

## Verification Steps

After running the fixes:

1. **Check RLS is enabled**: The `quick_rls_check.sql` should show `rls_enabled = true` and `policy_count > 0`
2. **Test ticket creation**: Try creating a ticket as a non-admin user
3. **Test ticket assignment**: Try assigning tickets to users
4. **Test ticket updates**: Try updating ticket status and assignee

## Expected Results

- ✅ Tickets table has all required columns (priority, status, due_at, etc.)
- ✅ RLS is enabled on tickets table
- ✅ Multiple RLS policies are created for different user roles
- ✅ Users can create tickets
- ✅ Users can view relevant tickets based on their role
- ✅ Users can update their own tickets
- ✅ Admins can manage all tickets
- ✅ Role-based agents can update relevant tickets

## Troubleshooting

If you encounter issues:

1. **Permission denied errors**: Make sure the `fix_auth_permissions.sql` was run first
2. **Column doesn't exist errors**: Make sure the `tickets_schema_fix.sql` was run first
3. **RLS policy errors**: Make sure the `fix_tickets_rls_policies.sql` was run after the schema fix

## Next Steps

After running these fixes:
1. Test the ticket creation and assignment functionality
2. Verify that users can only see tickets they should have access to
3. Test the role-based access controls
4. Monitor for any remaining issues
