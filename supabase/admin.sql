-- MTUK Nagar Ride admin dashboard: admin role, driver verification, audit log, admin read access,
-- and server-side reporting functions.
--
-- Run AFTER passengers.sql, providers.sql and rides.sql, in the Supabase SQL editor.
-- Safe to re-run. It does not change or remove any existing row, policy or column.
--
-- Effect on the mobile app and backend:
--   * Passengers and drivers keep exactly the access they have today. New policies only
--     add read access for users listed in public.admin_users.
--   * providers gets four verification columns. Existing drivers start as 'pending'.
--     Drivers cannot change these columns themselves (trigger below); only the
--     admin_set_driver_status function can.
--   * Nothing here blocks pending drivers from accepting rides. See README for the
--     optional enforcement step.

-- 1. Admin role ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users read own" on public.admin_users;
create policy "admin_users read own"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policy: admins are granted only from the SQL editor.
revoke insert, update, delete on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Driver verification ------------------------------------------------------------------

alter table public.providers
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_note text not null default '',
  add column if not exists verification_updated_at timestamptz,
  add column if not exists verification_updated_by uuid references auth.users (id) on delete set null;

do $$
begin
  alter table public.providers
    add constraint providers_verification_status_check
    check (verification_status in ('pending', 'approved', 'rejected', 'suspended'));
exception
  when duplicate_object then null;
end $$;

-- Drivers can upsert their own providers row (providers.sql), so without this a driver
-- could mark themselves approved. App roles always get the stored values back; the
-- security definer admin function below runs as the table owner and is not affected.
create or replace function public.providers_protect_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.verification_note := '';
      new.verification_updated_at := null;
      new.verification_updated_by := null;
    else
      new.verification_status := old.verification_status;
      new.verification_note := old.verification_note;
      new.verification_updated_at := old.verification_updated_at;
      new.verification_updated_by := old.verification_updated_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists providers_protect_verification on public.providers;
create trigger providers_protect_verification
  before insert or update on public.providers
  for each row execute function public.providers_protect_verification();

-- 3. Audit log ----------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  admin_email text not null default '',
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log admins read" on public.admin_audit_log;
create policy "admin_audit_log admins read"
  on public.admin_audit_log
  for select
  to authenticated
  using ((select public.is_admin()));

-- Rows are written only by the security definer functions below.
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

-- 4. Admin read access --------------------------------------------------------------------

drop policy if exists "passengers admins read" on public.passengers;
create policy "passengers admins read"
  on public.passengers
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "providers admins read" on public.providers;
create policy "providers admins read"
  on public.providers
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "rides admins read" on public.rides;
create policy "rides admins read"
  on public.rides
  for select
  to authenticated
  using ((select public.is_admin()));

-- Indexes for the admin list pages (newest first) and date-range reports.
create index if not exists rides_created_at_idx on public.rides (created_at desc);
create index if not exists passengers_created_at_idx on public.passengers (created_at desc);
create index if not exists providers_created_at_idx on public.providers (created_at desc);
create index if not exists providers_verification_status_idx
  on public.providers (verification_status, created_at desc);

-- 5. Admin actions ------------------------------------------------------------------------

create or replace function public.admin_set_driver_status(
  p_driver_id uuid,
  p_status text,
  p_note text default ''
)
returns public.providers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before text;
  v_note text := left(btrim(coalesce(p_note, '')), 500);
  v_row public.providers;
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved', 'rejected', 'suspended') then
    raise exception 'Choose a valid status.' using errcode = '22023';
  end if;
  if p_status in ('rejected', 'suspended') and v_note = '' then
    raise exception 'Give a reason for this change.' using errcode = '22023';
  end if;

  select verification_status into v_before
  from public.providers
  where id = p_driver_id
  for update;
  if not found then
    raise exception 'Driver not found.' using errcode = 'P0002';
  end if;
  if v_before = p_status then
    raise exception 'The driver is already %.', p_status using errcode = '55000';
  end if;

  update public.providers
  set verification_status = p_status,
      verification_note = v_note,
      verification_updated_at = now(),
      verification_updated_by = auth.uid()
  where id = p_driver_id
  returning * into v_row;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'driver.status_changed',
    'driver',
    p_driver_id::text,
    jsonb_build_object('from', v_before, 'to', p_status, 'note', v_note)
  );

  return v_row;
end;
$$;

-- Admins may cancel rides that have not started. Ongoing rides are finished by the driver.
create or replace function public.admin_cancel_ride(p_ride_id uuid, p_reason text)
returns public.rides
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before text;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
  v_row public.rides;
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if v_reason = '' then
    raise exception 'Give a reason for cancelling.' using errcode = '22023';
  end if;

  select status into v_before from public.rides where id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found.' using errcode = 'P0002';
  end if;
  if v_before not in ('requested', 'accepted', 'arriving') then
    raise exception 'This ride can no longer be cancelled.' using errcode = '55000';
  end if;

  update public.rides
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = p_ride_id
  returning * into v_row;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'ride.cancelled',
    'ride',
    p_ride_id::text,
    jsonb_build_object('from', v_before, 'reason', v_reason)
  );

  return v_row;
end;
$$;

-- 6. Reporting (aggregated in the database, never row dumps) -------------------------------

create or replace function public.admin_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'customers_total', (select count(*) from public.passengers),
    'customers_new', (select count(*) from public.passengers where created_at >= p_from and created_at < p_to),
    'drivers_total', (select count(*) from public.providers),
    'drivers_new', (select count(*) from public.providers where created_at >= p_from and created_at < p_to),
    'drivers_pending', (select count(*) from public.providers where verification_status = 'pending'),
    'drivers_approved', (select count(*) from public.providers where verification_status = 'approved'),
    'drivers_rejected', (select count(*) from public.providers where verification_status = 'rejected'),
    'drivers_suspended', (select count(*) from public.providers where verification_status = 'suspended'),
    'rides_all_time', (select count(*) from public.rides),
    'live_requested', (select count(*) from public.rides where status = 'requested'),
    'live_accepted', (select count(*) from public.rides where status = 'accepted'),
    'live_arriving', (select count(*) from public.rides where status = 'arriving'),
    'live_ongoing', (select count(*) from public.rides where status = 'ongoing'),
    'range', (
      select jsonb_build_object(
        'total', count(*),
        'requested', count(*) filter (where status = 'requested'),
        'accepted', count(*) filter (where status = 'accepted'),
        'arriving', count(*) filter (where status = 'arriving'),
        'ongoing', count(*) filter (where status = 'ongoing'),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'completed_quoted_fare', coalesce(sum(fare) filter (where status = 'completed'), 0),
        'completed_distance_km', coalesce(sum(distance_km) filter (where status = 'completed'), 0),
        'avg_quoted_fare', coalesce(round(avg(fare) filter (where status = 'completed'), 1), 0),
        'avg_distance_km', coalesce(round(avg(distance_km) filter (where status = 'completed'), 2), 0)
      )
      from public.rides
      where created_at >= p_from and created_at < p_to
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Buckets are calendar days/weeks/months in India Standard Time, zero-filled.
create or replace function public.admin_ride_trend(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket date, total bigint, completed bigint, cancelled bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'Choose a valid bucket.' using errcode = '22023';
  end if;

  return query
  with series as (
    select generate_series(
      date_trunc(p_bucket, p_from at time zone 'Asia/Kolkata'),
      date_trunc(p_bucket, (p_to - interval '1 microsecond') at time zone 'Asia/Kolkata'),
      ('1 ' || p_bucket)::interval
    )::date as bucket
  ),
  counts as (
    select
      date_trunc(p_bucket, r.created_at at time zone 'Asia/Kolkata')::date as bucket,
      count(*) as total,
      count(*) filter (where r.status = 'completed') as completed,
      count(*) filter (where r.status = 'cancelled') as cancelled
    from public.rides r
    where r.created_at >= p_from and r.created_at < p_to
    group by 1
  )
  select s.bucket, coalesce(c.total, 0), coalesce(c.completed, 0), coalesce(c.cancelled, 0)
  from series s
  left join counts c using (bucket)
  order by s.bucket;
end;
$$;

create or replace function public.admin_signup_trend(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table (bucket date, customers bigint, drivers bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'Choose a valid bucket.' using errcode = '22023';
  end if;

  return query
  with series as (
    select generate_series(
      date_trunc(p_bucket, p_from at time zone 'Asia/Kolkata'),
      date_trunc(p_bucket, (p_to - interval '1 microsecond') at time zone 'Asia/Kolkata'),
      ('1 ' || p_bucket)::interval
    )::date as bucket
  ),
  c as (
    select date_trunc(p_bucket, created_at at time zone 'Asia/Kolkata')::date as bucket, count(*) as n
    from public.passengers
    where created_at >= p_from and created_at < p_to
    group by 1
  ),
  d as (
    select date_trunc(p_bucket, created_at at time zone 'Asia/Kolkata')::date as bucket, count(*) as n
    from public.providers
    where created_at >= p_from and created_at < p_to
    group by 1
  )
  select s.bucket, coalesce(c.n, 0), coalesce(d.n, 0)
  from series s
  left join c using (bucket)
  left join d using (bucket)
  order by s.bucket;
end;
$$;

-- Where in the trip each cancellation happened, inferred from the ride timestamps.
create or replace function public.admin_cancellation_breakdown(p_from timestamptz, p_to timestamptz)
returns table (stage text, rides bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;

  return query
  select
    case
      when r.accepted_at is null then 'before_driver_assigned'
      when r.arrived_at is null then 'driver_on_the_way'
      else 'driver_at_pickup'
    end as stage,
    count(*) as rides
  from public.rides r
  where r.status = 'cancelled' and r.created_at >= p_from and r.created_at < p_to
  group by 1
  order by 2 desc;
end;
$$;

-- Ride counts for one page of customers or drivers (at most 200 ids).
create or replace function public.admin_ride_counts(p_user_ids uuid[], p_role text)
returns table (user_id uuid, total bigint, completed bigint, cancelled bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_role not in ('passenger', 'driver') then
    raise exception 'Choose a valid role.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_user_ids, 1), 0) > 200 then
    raise exception 'Too many ids.' using errcode = '22023';
  end if;

  return query
  select
    case when p_role = 'passenger' then r.passenger_id else r.driver_id end as user_id,
    count(*) as total,
    count(*) filter (where r.status = 'completed') as completed,
    count(*) filter (where r.status = 'cancelled') as cancelled
  from public.rides r
  where (p_role = 'passenger' and r.passenger_id = any (p_user_ids))
     or (p_role = 'driver' and r.driver_id = any (p_user_ids))
  group by 1;
end;
$$;

-- Only signed-in users may call these; each one re-checks is_admin() itself.
revoke all on function public.admin_set_driver_status(uuid, text, text) from public, anon;
revoke all on function public.admin_cancel_ride(uuid, text) from public, anon;
revoke all on function public.admin_overview(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_ride_trend(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_signup_trend(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_cancellation_breakdown(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_ride_counts(uuid[], text) from public, anon;

grant execute on function public.admin_set_driver_status(uuid, text, text) to authenticated;
grant execute on function public.admin_cancel_ride(uuid, text) to authenticated;
grant execute on function public.admin_overview(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_ride_trend(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_signup_trend(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_cancellation_breakdown(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_ride_counts(uuid[], text) to authenticated;
