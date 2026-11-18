-- MTUK Nagar Ride: live e-rickshaw positions for the operations desk and traffic police.
--
-- Run AFTER admin.sql, accounts.sql, public.sql, partner-kyc.sql, in the Supabase SQL editor.
-- Safe to re-run. Additive only.
--
-- How it works
--   * The driver app sends its GPS position only while the driver is approved AND online.
--     Going offline marks the row offline; positions older than 10 minutes are not shown.
--   * Admins and traffic police accounts read positions only through functions below.
--     Nobody else (passengers, other drivers, the public) can read them.
--   * Every time a traffic officer opens a driver's details it is written to the audit log.

-- 1. Traffic police accounts --------------------------------------------------------------

create table if not exists public.traffic_officers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  badge_number text not null default '',
  station text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

alter table public.traffic_officers enable row level security;

drop policy if exists "traffic_officers read own" on public.traffic_officers;
create policy "traffic_officers read own"
  on public.traffic_officers
  for select
  to authenticated
  using (user_id = auth.uid() or (select public.is_admin()));

revoke insert, update, delete on public.traffic_officers from anon, authenticated;
grant select on public.traffic_officers to authenticated;

create or replace function public.is_traffic_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.traffic_officers where user_id = auth.uid());
$$;

-- Admins and traffic officers can open the traffic map.
create or replace function public.can_view_traffic()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or public.is_traffic_officer();
$$;

revoke all on function public.is_traffic_officer() from public, anon;
revoke all on function public.can_view_traffic() from public, anon;
grant execute on function public.is_traffic_officer() to authenticated;
grant execute on function public.can_view_traffic() to authenticated;

-- 2. Driver positions ---------------------------------------------------------------------

create table if not exists public.driver_locations (
  provider_id uuid primary key references auth.users (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading real,
  speed real,
  accuracy real,
  is_online boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists driver_locations_updated_idx
  on public.driver_locations (updated_at desc)
  where is_online;

alter table public.driver_locations enable row level security;
-- No policies: all reads and writes go through the functions below.
revoke all on public.driver_locations from anon, authenticated;

-- Called by the driver app every ~15 s while online.
create or replace function public.driver_update_location(
  p_lat double precision,
  p_lng double precision,
  p_heading real default null,
  p_speed real default null,
  p_accuracy real default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required.' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid location.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.providers
    where id = auth.uid() and verification_status = 'approved'
  ) then
    raise exception 'Only approved drivers share their location.' using errcode = '42501';
  end if;

  insert into public.driver_locations (provider_id, lat, lng, heading, speed, accuracy, is_online, updated_at)
  values (auth.uid(), p_lat, p_lng, p_heading, p_speed, p_accuracy, true, now())
  on conflict (provider_id) do update
  set lat = excluded.lat,
      lng = excluded.lng,
      heading = excluded.heading,
      speed = excluded.speed,
      accuracy = excluded.accuracy,
      is_online = true,
      updated_at = now();
end;
$$;

-- Called when the driver goes offline or signs out.
create or replace function public.driver_go_offline()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.driver_locations
  set is_online = false, updated_at = now()
  where provider_id = auth.uid();
$$;

revoke all on function public.driver_update_location(double precision, double precision, real, real, real) from public, anon;
revoke all on function public.driver_go_offline() from public, anon;
grant execute on function public.driver_update_location(double precision, double precision, real, real, real) to authenticated;
grant execute on function public.driver_go_offline() to authenticated;

-- 3. Read side for admins and traffic police ---------------------------------------------

-- Map markers: only what the map needs. Full details come from traffic_driver_details.
create or replace function public.traffic_live_drivers()
returns table (
  provider_id uuid,
  name text,
  vehicle_number text,
  vehicle_model text,
  lat double precision,
  lng double precision,
  heading real,
  speed real,
  updated_at timestamptz,
  on_trip boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_view_traffic() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;

  return query
  select
    l.provider_id,
    p.name,
    p.vehicle_number,
    p.vehicle_model,
    l.lat,
    l.lng,
    l.heading,
    l.speed,
    l.updated_at,
    exists (
      select 1 from public.rides r
      where r.driver_id = l.provider_id
        and r.status in ('accepted', 'arriving', 'ongoing')
    ) as on_trip
  from public.driver_locations l
  join public.providers p on p.id = l.provider_id
  where l.is_online
    and l.updated_at > now() - interval '10 minutes'
  order by l.updated_at desc
  limit 1000;
end;
$$;

-- Details panel. Logged in the audit trail for every officer view.
create or replace function public.traffic_driver_details(p_provider_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider public.providers;
  v_app public.partner_applications;
  v_location public.driver_locations;
  v_ride record;
begin
  if not public.can_view_traffic() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;

  select * into v_provider from public.providers where id = p_provider_id;
  if not found then
    raise exception 'Driver not found.' using errcode = 'P0002';
  end if;

  select * into v_app
  from public.partner_applications
  where user_id = p_provider_id
     or (v_provider.email <> '' and lower(email) = lower(v_provider.email))
  order by case status when 'approved' then 0 when 'pending' then 1 else 2 end, created_at desc
  limit 1;

  select * into v_location from public.driver_locations where provider_id = p_provider_id;

  select r.id, r.status, r.pickup, r.dropoff into v_ride
  from public.rides r
  where r.driver_id = p_provider_id
    and r.status in ('accepted', 'arriving', 'ongoing')
  order by r.created_at desc
  limit 1;

  if public.is_traffic_officer() and not public.is_admin() then
    insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
    values (
      auth.uid(),
      coalesce(auth.jwt() ->> 'email', ''),
      'traffic.driver_viewed',
      'driver',
      p_provider_id::text,
      jsonb_build_object('vehicle_number', v_provider.vehicle_number, 'name', v_provider.name)
    );
  end if;

  return jsonb_build_object(
    'provider_id', v_provider.id,
    'name', v_provider.name,
    'phone', v_provider.phone,
    'vehicle_number', v_provider.vehicle_number,
    'vehicle_model', v_provider.vehicle_model,
    'verification_status', v_provider.verification_status,
    'verified_at', v_provider.verification_updated_at,
    'license_number', coalesce(v_app.license_number, ''),
    'license_expiry', v_app.license_expiry,
    'city', coalesce(v_app.city, ''),
    'selfie_path', coalesce(v_app.selfie_path, ''),
    'lat', v_location.lat,
    'lng', v_location.lng,
    'speed', v_location.speed,
    'updated_at', v_location.updated_at,
    'is_online', coalesce(v_location.is_online, false),
    'ride', case when v_ride.id is null then null else jsonb_build_object(
      'id', v_ride.id, 'status', v_ride.status, 'pickup', v_ride.pickup, 'dropoff', v_ride.dropoff
    ) end
  );
end;
$$;

revoke all on function public.traffic_live_drivers() from public, anon;
revoke all on function public.traffic_driver_details(uuid) from public, anon;
grant execute on function public.traffic_live_drivers() to authenticated;
grant execute on function public.traffic_driver_details(uuid) to authenticated;

-- Traffic officers may open driver selfies (not Aadhaar, PAN, licence or RC images).
drop policy if exists "partner documents traffic selfie read" on storage.objects;
create policy "partner documents traffic selfie read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-documents'
    and split_part(name, '/', 2) like 'selfie.%'
    and (select public.is_traffic_officer())
  );

-- 4. Admins manage traffic police accounts -----------------------------------------------

create or replace function public.admin_list_traffic_officers()
returns table (user_id uuid, email text, name text, badge_number text, station text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  return query
  select t.user_id, coalesce(u.email, '')::text, t.name, t.badge_number, t.station, t.created_at
  from public.traffic_officers t
  left join auth.users u on u.id = t.user_id
  order by t.created_at desc;
end;
$$;

create or replace function public.admin_grant_traffic_officer(
  p_user_id uuid,
  p_name text,
  p_badge_number text,
  p_station text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := '';
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  select coalesce(email, '') into v_email from auth.users where id = p_user_id;
  if not found then
    raise exception 'That login does not exist.' using errcode = 'P0002';
  end if;

  insert into public.traffic_officers (user_id, name, badge_number, station, created_by)
  values (
    p_user_id,
    left(btrim(coalesce(p_name, '')), 80),
    upper(left(btrim(coalesce(p_badge_number, '')), 40)),
    left(btrim(coalesce(p_station, '')), 120),
    auth.uid()
  )
  on conflict (user_id) do update
  set name = excluded.name,
      badge_number = excluded.badge_number,
      station = excluded.station;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'traffic.officer_granted',
    'admin',
    p_user_id::text,
    jsonb_build_object('email', v_email, 'name', p_name, 'badge', p_badge_number, 'station', p_station)
  );
end;
$$;

create or replace function public.admin_revoke_traffic_officer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := '';
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  select coalesce(email, '') into v_email from auth.users where id = p_user_id;
  delete from public.traffic_officers where user_id = p_user_id;
  if not found then
    raise exception 'That account is not a traffic officer.' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'traffic.officer_revoked',
    'admin',
    p_user_id::text,
    jsonb_build_object('email', v_email)
  );
end;
$$;

revoke all on function public.admin_list_traffic_officers() from public, anon;
revoke all on function public.admin_grant_traffic_officer(uuid, text, text, text) from public, anon;
revoke all on function public.admin_revoke_traffic_officer(uuid) from public, anon;
grant execute on function public.admin_list_traffic_officers() to authenticated;
grant execute on function public.admin_grant_traffic_officer(uuid, text, text, text) to authenticated;
grant execute on function public.admin_revoke_traffic_officer(uuid) to authenticated;
