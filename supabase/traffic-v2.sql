-- MTUK Nagar Ride: traffic panel v2 — every registered e-rickshaw (live + offline) and photos.
--
-- Run AFTER traffic.sql, in the Supabase SQL editor. Safe to re-run. Additive only.
--
--   * traffic_all_drivers(): every service provider with their last known position.
--     is_live = online and position younger than 10 minutes.
--   * traffic_driver_details(): adds vehicle photo, trip count, email; admins also get
--     licence and RC image paths. Officer views are still written to the audit log.
--   * Traffic officers may open the live selfie and the vehicle photo (never Aadhaar, PAN,
--     licence or RC images).

-- 1. Every provider with last known position ---------------------------------------------

create or replace function public.traffic_all_drivers()
returns table (
  provider_id uuid,
  name text,
  phone text,
  vehicle_number text,
  vehicle_model text,
  verification_status text,
  lat double precision,
  lng double precision,
  heading real,
  speed real,
  updated_at timestamptz,
  is_live boolean,
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
    p.id,
    p.name,
    p.phone,
    p.vehicle_number,
    p.vehicle_model,
    p.verification_status::text,
    l.lat,
    l.lng,
    l.heading,
    l.speed,
    l.updated_at,
    coalesce(l.is_online and l.updated_at > now() - interval '10 minutes', false) as is_live,
    exists (
      select 1 from public.rides r
      where r.driver_id = p.id
        and r.status in ('accepted', 'arriving', 'ongoing')
    ) as on_trip
  from public.providers p
  left join public.driver_locations l on l.provider_id = p.id
  order by
    coalesce(l.is_online and l.updated_at > now() - interval '10 minutes', false) desc,
    l.updated_at desc nulls last,
    p.name
  limit 2000;
end;
$$;

revoke all on function public.traffic_all_drivers() from public, anon;
grant execute on function public.traffic_all_drivers() to authenticated;

-- 2. Details with photos ------------------------------------------------------------------

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
  v_trips integer := 0;
  v_admin boolean := public.is_admin();
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

  select r.id, r.status, r.pickup, r.dropoff, r.passenger_name into v_ride
  from public.rides r
  where r.driver_id = p_provider_id
    and r.status in ('accepted', 'arriving', 'ongoing')
  order by r.created_at desc
  limit 1;

  select count(*) into v_trips
  from public.rides r
  where r.driver_id = p_provider_id and r.status = 'completed';

  if public.is_traffic_officer() and not v_admin then
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
    'email', case when v_admin then v_provider.email else '' end,
    'vehicle_number', v_provider.vehicle_number,
    'vehicle_model', v_provider.vehicle_model,
    'verification_status', v_provider.verification_status,
    'verified_at', v_provider.verification_updated_at,
    'joined_at', v_provider.created_at,
    'license_number', coalesce(v_app.license_number, ''),
    'license_expiry', v_app.license_expiry,
    'city', coalesce(v_app.city, ''),
    'selfie_path', coalesce(v_app.selfie_path, ''),
    'vehicle_photo_path', coalesce(v_app.photo_path, ''),
    'license_photo_path', case when v_admin then coalesce(v_app.license_path, '') else '' end,
    'rc_photo_path', case when v_admin then coalesce(v_app.rc_path, '') else '' end,
    'completed_trips', v_trips,
    'lat', v_location.lat,
    'lng', v_location.lng,
    'speed', v_location.speed,
    'accuracy', v_location.accuracy,
    'updated_at', v_location.updated_at,
    'is_online', coalesce(v_location.is_online and v_location.updated_at > now() - interval '10 minutes', false),
    'ride', case when v_ride.id is null then null else jsonb_build_object(
      'id', v_ride.id, 'status', v_ride.status, 'pickup', v_ride.pickup,
      'dropoff', v_ride.dropoff, 'passenger_name', v_ride.passenger_name
    ) end
  );
end;
$$;

revoke all on function public.traffic_driver_details(uuid) from public, anon;
grant execute on function public.traffic_driver_details(uuid) to authenticated;

-- 3. Officers may also open the vehicle photo ---------------------------------------------

drop policy if exists "partner documents traffic selfie read" on storage.objects;
create policy "partner documents traffic selfie read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-documents'
    and (split_part(name, '/', 2) like 'selfie.%' or split_part(name, '/', 2) like 'photo.%')
    and (select public.is_traffic_officer())
  );
