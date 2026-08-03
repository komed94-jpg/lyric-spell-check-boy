create extension if not exists pgcrypto;

create table if not exists public.executor_runs (
  id text primary key,
  task_id text not null check (task_id = 'EXE-012'),
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued','launching','running','completed','failed','cancelled')),
  current_sequence integer not null default 0 check (current_sequence >= 0),
  metadata jsonb not null default '{}'::jsonb,
  sandbox_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.executor_events (
  event_id text primary key,
  run_id text not null references public.executor_runs(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('started','heartbeat','completed','failed')),
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create table if not exists public.executor_outbox (
  id uuid primary key default gen_random_uuid(),
  run_id text not null references public.executor_runs(id) on delete cascade,
  event_id text not null references public.executor_events(event_id) on delete cascade,
  destination text not null check (destination in ('google_sheets','owner_site')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, destination)
);

-- Neon is accessed only through the server-side DATABASE_URL.
-- Do not expose DATABASE_URL to browser code or enable a public Data API for these tables.

create or replace function public.executor_create_run(
  p_run_id text,
  p_task_id text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  id text,
  task_id text,
  status text,
  duplicate boolean,
  current_sequence integer,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing public.executor_runs%rowtype;
begin
  if p_task_id <> 'EXE-012' then
    raise exception 'Only EXE-012 is allowed';
  end if;

  select * into existing
  from public.executor_runs r
  where r.idempotency_key = p_idempotency_key;

  if found then
    return query select existing.id, existing.task_id, existing.status, true, existing.current_sequence, existing.created_at;
    return;
  end if;

  insert into public.executor_runs (id, task_id, idempotency_key, metadata, status)
  values (p_run_id, p_task_id, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb), 'queued');

  return query
    select r.id, r.task_id, r.status, false, r.current_sequence, r.created_at
    from public.executor_runs r
    where r.id = p_run_id;
exception
  when unique_violation then
    select * into existing
    from public.executor_runs r
    where r.idempotency_key = p_idempotency_key;
    return query select existing.id, existing.task_id, existing.status, true, existing.current_sequence, existing.created_at;
end;
$$;

create or replace function public.executor_append_event(
  p_run_id text,
  p_event_id text,
  p_sequence integer,
  p_event_type text,
  p_status text,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  run_id text,
  event_id text,
  sequence integer,
  status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  locked_run public.executor_runs%rowtype;
  existing_event public.executor_events%rowtype;
  terminal boolean;
begin
  select * into existing_event
  from public.executor_events e
  where e.event_id = p_event_id;

  if found then
    return query select existing_event.run_id, existing_event.event_id, existing_event.sequence, existing_event.status, true;
    return;
  end if;

  select * into locked_run
  from public.executor_runs r
  where r.id = p_run_id
  for update;

  if not found then
    raise exception 'Run not found';
  end if;

  terminal := locked_run.status in ('completed','failed','cancelled');
  if terminal then
    raise exception 'Run is already terminal';
  end if;

  if p_sequence <> locked_run.current_sequence + 1 then
    raise exception 'Out-of-order event: expected %, received %', locked_run.current_sequence + 1, p_sequence;
  end if;

  insert into public.executor_events (event_id, run_id, sequence, event_type, status, payload)
  values (p_event_id, p_run_id, p_sequence, p_event_type, p_status, coalesce(p_payload, '{}'::jsonb));

  update public.executor_runs
  set current_sequence = p_sequence,
      status = p_status,
      started_at = case when p_sequence = 1 then coalesce(started_at, now()) else started_at end,
      completed_at = case when p_status in ('completed','failed','cancelled') then now() else completed_at end,
      updated_at = now()
  where id = p_run_id;

  insert into public.executor_outbox (run_id, event_id, destination, payload)
  values
    (p_run_id, p_event_id, 'google_sheets', jsonb_build_object('runId', p_run_id, 'eventId', p_event_id, 'sequence', p_sequence, 'status', p_status)),
    (p_run_id, p_event_id, 'owner_site', jsonb_build_object('runId', p_run_id, 'eventId', p_event_id, 'sequence', p_sequence, 'status', p_status))
  on conflict do nothing;

  return query select p_run_id, p_event_id, p_sequence, p_status, false;
end;
$$;

create or replace function public.executor_mark_launch_failure(
  p_run_id text,
  p_message text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.executor_runs
  set status = 'failed',
      last_error = left(p_message, 2000),
      completed_at = now(),
      updated_at = now()
  where id = p_run_id
    and status not in ('completed','failed','cancelled');
end;
$$;
