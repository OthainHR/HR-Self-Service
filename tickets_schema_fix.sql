create extension if not exists pgcrypto;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id integer,
  sub_category_id integer,
  priority text not null default 'Medium',
  status text not null default 'WAITING FOR SUPPORT',
  client text,
  requested_by uuid not null,
  assignee uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  due_at timestamptz,
  resolved_at timestamptz,
  admin_comment text,
  expense_amount numeric(12,2),
  payment_type text
);

alter table public.tickets add column if not exists title text;
alter table public.tickets alter column title set not null;

alter table public.tickets add column if not exists description text;
alter table public.tickets add column if not exists category_id integer;
alter table public.tickets add column if not exists sub_category_id integer;

alter table public.tickets add column if not exists priority text;
alter table public.tickets alter column priority set default 'Medium';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_priority_chk'
  ) then
    alter table public.tickets
      add constraint tickets_priority_chk
      check (priority in ('Low','Medium','High','Urgent'));
  end if;
end$$;

alter table public.tickets add column if not exists status text;
alter table public.tickets alter column status set default 'WAITING FOR SUPPORT';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tickets_status_chk'
  ) then
    alter table public.tickets
      add constraint tickets_status_chk
      check (status in ('WAITING FOR SUPPORT','WAITING FOR APPROVAL','IN_PROGRESS','RESOLVED','CLOSED'));
  end if;
end$$;

alter table public.tickets add column if not exists client text;
alter table public.tickets add column if not exists requested_by uuid;
alter table public.tickets alter column requested_by set not null;
alter table public.tickets add column if not exists assignee uuid;

alter table public.tickets add column if not exists created_at timestamptz;
alter table public.tickets alter column created_at set default now();
alter table public.tickets add column if not exists updated_at timestamptz;
alter table public.tickets alter column updated_at set default now();

alter table public.tickets add column if not exists due_at timestamptz;
alter table public.tickets add column if not exists resolved_at timestamptz;
alter table public.tickets add column if not exists admin_comment text;

alter table public.tickets add column if not exists expense_amount numeric(12,2);
alter table public.tickets add column if not exists payment_type text;

create index if not exists idx_tickets_category_id on public.tickets(category_id);
create index if not exists idx_tickets_sub_category_id on public.tickets(sub_category_id);
create index if not exists idx_tickets_requested_by on public.tickets(requested_by);
create index if not exists idx_tickets_assignee on public.tickets(assignee);
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_created_at on public.tickets(created_at);
create index if not exists idx_tickets_due_at on public.tickets(due_at);

-- Enable RLS
alter table public.tickets enable row level security;

-- Create function to check if user is in additional emails for a ticket
create or replace function user_in_additional_emails(ticket_uuid uuid, user_uuid uuid)
returns boolean as $$
begin
    return exists (
        select 1 from ticket_additional_emails 
        where ticket_id = ticket_uuid and user_id = user_uuid
    );
end;
$$ language plpgsql security definer;

-- Grant execute permission
grant execute on function user_in_additional_emails(uuid, uuid) to authenticated;

do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at_tickets') then
    create or replace function public.set_updated_at_tickets()
    returns trigger language plpgsql as $fn$
    begin
      new.updated_at := now();
      return new;
    end
    $fn$;
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_set_updated_at_tickets'
  ) then
    create trigger trg_set_updated_at_tickets
      before update on public.tickets
      for each row
      execute function public.set_updated_at_tickets();
  end if;
end$$;

-- Drop any existing policies that give blanket admin access
drop policy if exists "tickets_select_policy" on public.tickets;
drop policy if exists "tickets_insert_policy" on public.tickets;
drop policy if exists "tickets_update_policy" on public.tickets;
drop policy if exists "Allow users to view relevant tickets" on public.tickets;

-- Create restrictive SELECT policy - admins can only see tickets they're involved with
create policy "tickets_select_restricted" on public.tickets
for select using (
    -- Ticket requester can see their own tickets
    requested_by = auth.uid() 
    
    -- Assigned user can see tickets assigned to them
    or assignee = auth.uid()
    
    -- Functional mailboxes can see relevant tickets (these are service accounts)
    or lower(auth.jwt()->>'email') in (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- HR admin can see HR tickets they're involved with (requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'hr_admin'
        and (requested_by = auth.uid() or assignee = auth.uid())
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'HR Requests'
        )
    )
    
    -- IT admin can see IT tickets they're involved with (requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'it_admin'
        and (requested_by = auth.uid() or assignee = auth.uid())
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can see payroll/expense tickets they're involved with
    or (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        and (requested_by = auth.uid() or assignee = auth.uid())
        and exists (
            select 1 from public.categories c
            where c.id = category_id 
            and c.name in ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can see operations tickets they're involved with
    or (
        (auth.jwt() ->> 'role') = 'operations_admin'
        and (requested_by = auth.uid() or assignee = auth.uid())
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'Operations'
        )
    )
    
    -- AI admin can see AI tickets they're involved with
    or (
        (auth.jwt() ->> 'role') = 'ai_admin'
        and (requested_by = auth.uid() or assignee = auth.uid())
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list for this ticket
    or user_in_additional_emails(id, auth.uid())
    
    -- ONLY global admin (not role-based admins) can see all tickets
    or (auth.jwt() ->> 'role') = 'admin'
);

-- Create INSERT policy - allow users to create tickets
create policy "tickets_insert_restricted" on public.tickets
for insert with check (
    -- Users can create tickets for themselves
    requested_by = auth.uid()
    
    -- Functional mailboxes can create tickets
    or lower(auth.jwt()->>'email') in (
        'tickets@othainsoft.com',
        'it@othainsoft.com', 
        'hr@othainsoft.com',
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- Global admin can create tickets for anyone
    or (auth.jwt() ->> 'role') = 'admin'
);

-- Create UPDATE policy - restrict who can update tickets
create policy "tickets_update_restricted" on public.tickets
for update using (
    -- Ticket requester can update their own tickets
    requested_by = auth.uid()
    
    -- Assigned user can update tickets assigned to them
    or assignee = auth.uid()
    
    -- Functional mailboxes can update tickets in their domain
    or lower(auth.jwt()->>'email') in (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com', 
        'accounts@othainsoft.com',
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    
    -- HR admin can update HR tickets (regardless of requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'hr_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'HR Requests'
        )
    )
    
    -- IT admin can update IT tickets (regardless of requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'it_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'IT Requests'
        )
    )
    
    -- Payroll admin can update payroll/expense tickets (regardless of requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id 
            and c.name in ('Payroll Requests', 'Expense Management')
        )
    )
    
    -- Operations admin can update operations tickets (regardless of requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'operations_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'Operations'
        )
    )
    
    -- AI admin can update AI tickets (regardless of requester/assignee)
    or (
        (auth.jwt() ->> 'role') = 'ai_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'AI Requests'
        )
    )
    
    -- Users in additional emails list
    or user_in_additional_emails(id, auth.uid())
    
    -- Global admin can update any ticket
    or (auth.jwt() ->> 'role') = 'admin'
) with check (
    -- Allow the same users to make changes
    requested_by = auth.uid()
    or assignee = auth.uid()
    or lower(auth.jwt()->>'email') in (
        'tickets@othainsoft.com',
        'it@othainsoft.com',
        'hr@othainsoft.com',
        'accounts@othainsoft.com', 
        'operations@othainsoft.com',
        'ai@othainsoft.com'
    )
    or (
        (auth.jwt() ->> 'role') = 'hr_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'HR Requests'
        )
    )
    or (
        (auth.jwt() ->> 'role') = 'it_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'IT Requests'
        )
    )
    or (
        (auth.jwt() ->> 'role') = 'payroll_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id 
            and c.name in ('Payroll Requests', 'Expense Management')
        )
    )
    or (
        (auth.jwt() ->> 'role') = 'operations_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'Operations'
        )
    )
    or (
        (auth.jwt() ->> 'role') = 'ai_admin'
        and exists (
            select 1 from public.categories c
            where c.id = category_id and c.name = 'AI Requests'
        )
    )
    or user_in_additional_emails(id, auth.uid())
    or (auth.jwt() ->> 'role') = 'admin'
);
