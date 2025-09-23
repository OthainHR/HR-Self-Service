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
