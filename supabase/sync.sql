-- CRM data sync: profile rows for every finished sign-up, driver/partner status kept in step,
-- and Realtime for the tables the admin desk shows live.
--
-- Run AFTER supabase/admin.sql and supabase/public.sql, in the Supabase SQL editor. Safe to re-run.
-- It never overwrites an existing profile row, so names and phones edited in the app stay as they are.

-- 1. Create the passengers / providers row from the Auth sign-up ---------------------------
-- The app saves the profile through the backend after sign-up. When that call fails (slow
-- backend, app closed early) the account exists in Auth but never shows up in the CRM.

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := v_meta ->> 'role';
  v_name text := btrim(coalesce(v_meta ->> 'name', ''));
begin
  -- OTP sign-up creates the Auth user first and fills in the profile later.
  if coalesce((v_meta ->> 'signup_incomplete')::boolean, false) or v_name = '' then
    return new;
  end if;

  begin
    if v_role = 'passenger' then
      insert into public.passengers (id, name, phone, email)
      values (new.id, v_name, coalesce(v_meta ->> 'phone', ''), coalesce(new.email, ''))
      on conflict (id) do nothing;
    elsif v_role = 'driver' then
      insert into public.providers (id, name, phone, email, vehicle_number, vehicle_model)
      values (
        new.id,
        v_name,
        coalesce(v_meta ->> 'phone', ''),
        coalesce(new.email, ''),
        upper(coalesce(v_meta ->> 'vehicle_number', '')),
        coalesce(nullif(v_meta ->> 'vehicle_model', ''), 'E-Rickshaw')
      )
      on conflict (id) do nothing;
    end if;
  exception
    when others then
      -- Never block a sign-in because the CRM copy could not be written.
      raise warning 'sync_profile_from_auth failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;

drop trigger if exists sync_profile_from_auth on auth.users;
create trigger sync_profile_from_auth
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth();

-- Backfill accounts that signed up before this trigger existed.
insert into public.passengers (id, name, phone, email)
select u.id, btrim(u.raw_user_meta_data ->> 'name'), coalesce(u.raw_user_meta_data ->> 'phone', ''), coalesce(u.email, '')
from auth.users u
where u.raw_user_meta_data ->> 'role' = 'passenger'
  and btrim(coalesce(u.raw_user_meta_data ->> 'name', '')) <> ''
  and not coalesce((u.raw_user_meta_data ->> 'signup_incomplete')::boolean, false)
on conflict (id) do nothing;

insert into public.providers (id, name, phone, email, vehicle_number, vehicle_model)
select
  u.id,
  btrim(u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.email, ''),
  upper(coalesce(u.raw_user_meta_data ->> 'vehicle_number', '')),
  coalesce(nullif(u.raw_user_meta_data ->> 'vehicle_model', ''), 'E-Rickshaw')
from auth.users u
where u.raw_user_meta_data ->> 'role' = 'driver'
  and btrim(coalesce(u.raw_user_meta_data ->> 'name', '')) <> ''
  and not coalesce((u.raw_user_meta_data ->> 'signup_incomplete')::boolean, false)
on conflict (id) do nothing;

-- 2. Approving a driver also closes their pending website application ----------------------
-- Without this, a driver approved from the Drivers page stays in the Partners queue forever.

create or replace function public.providers_close_partner_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verification_status = 'approved' and old.verification_status is distinct from 'approved' then
    update public.partner_applications
    set status = 'approved',
        note = coalesce(nullif(note, ''), 'Approved from the driver profile'),
        reviewed_at = now(),
        reviewed_by = coalesce(auth.uid(), new.verification_updated_by),
        user_id = coalesce(user_id, new.id)
    where status = 'pending'
      and (
        user_id = new.id
        or (new.email <> '' and lower(email) = lower(new.email))
        or (new.phone <> '' and phone = new.phone)
      );
  end if;
  return new;
end;
$$;

revoke all on function public.providers_close_partner_application() from public, anon, authenticated;

drop trigger if exists providers_close_partner_application on public.providers;
create trigger providers_close_partner_application
  after update of verification_status on public.providers
  for each row execute function public.providers_close_partner_application();

-- 3. Realtime for the live admin desk -----------------------------------------------------
-- Change events still respect RLS: admins see all rows, app users only their own.

do $$
declare
  v_table text;
begin
  foreach v_table in array array['passengers', 'providers', 'partner_applications', 'contact_messages', 'admin_audit_log'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;
