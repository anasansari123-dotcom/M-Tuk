-- MTUK Nagar Ride public website: partner applications, document storage, contact inbox.
--
-- Run AFTER supabase/admin.sql, in the Supabase SQL editor. Safe to re-run.
-- The website runtime still uses no service-role key. Anonymous visitors insert only
-- through the functions below. Admins review through is_admin() the same way as drivers.
--
-- After a partner is approved here, they sign in to the MTUK Nagar Ride app with the
-- same email. Pickup is allowed only when public.providers.verification_status = 'approved'.

-- 1. Partner applications -----------------------------------------------------------------

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text not null,
  email text not null,
  city text not null default '',
  vehicle_number text not null,
  vehicle_model text not null default 'E-Rickshaw',
  license_number text not null default '',
  message text not null default '',
  license_path text not null default '',
  rc_path text not null default '',
  photo_path text not null default '',
  id_path text not null default '',
  status text not null default 'pending',
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

do $$
begin
  alter table public.partner_applications
    add constraint partner_applications_status_check
    check (status in ('pending', 'approved', 'rejected'));
exception
  when duplicate_object then null;
end $$;

create unique index if not exists partner_applications_pending_email_idx
  on public.partner_applications (lower(email))
  where status = 'pending';

create index if not exists partner_applications_status_idx
  on public.partner_applications (status, created_at desc);

create index if not exists partner_applications_email_idx
  on public.partner_applications (lower(email), created_at desc);

create index if not exists partner_applications_user_id_idx
  on public.partner_applications (user_id)
  where user_id is not null;

alter table public.partner_applications enable row level security;

drop policy if exists "partner_applications admins read" on public.partner_applications;
create policy "partner_applications admins read"
  on public.partner_applications
  for select
  to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.partner_applications from anon, authenticated;
grant select on public.partner_applications to authenticated;

-- 2. Contact messages ---------------------------------------------------------------------

create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text not null default '',
  subject text not null default '',
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages admins read" on public.contact_messages;
create policy "contact_messages admins read"
  on public.contact_messages
  for select
  to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.contact_messages from anon, authenticated;
grant select on public.contact_messages to authenticated;

-- 3. Document bucket ----------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-documents',
  'partner-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    public = false;

create or replace function public.partner_upload_allowed(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_applications
    where id::text = split_part(p_object_name, '/', 1)
      and status = 'pending'
      and split_part(p_object_name, '/', 2) in (
        'license.jpg', 'license.jpeg', 'license.png', 'license.webp', 'license.pdf',
        'rc.jpg', 'rc.jpeg', 'rc.png', 'rc.webp', 'rc.pdf',
        'photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp',
        'id.jpg', 'id.jpeg', 'id.png', 'id.webp', 'id.pdf'
      )
  );
$$;

revoke all on function public.partner_upload_allowed(text) from public;
grant execute on function public.partner_upload_allowed(text) to anon, authenticated;

drop policy if exists "partner documents insert pending" on storage.objects;
create policy "partner documents insert pending"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'partner-documents'
    and public.partner_upload_allowed(name)
  );

drop policy if exists "partner documents admins read" on storage.objects;
create policy "partner documents admins read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-documents'
    and (select public.is_admin())
  );

-- 4. Public submit functions --------------------------------------------------------------

create or replace function public.submit_partner_application(
  p_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_vehicle_number text,
  p_vehicle_model text,
  p_license_number text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(coalesce(p_name, '')), 80);
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_email text := lower(left(btrim(coalesce(p_email, '')), 254));
  v_city text := left(btrim(coalesce(p_city, '')), 80);
  v_vehicle_number text := upper(left(btrim(coalesce(p_vehicle_number, '')), 20));
  v_vehicle_model text := left(btrim(coalesce(p_vehicle_model, '')), 80);
  v_license_number text := upper(left(btrim(coalesce(p_license_number, '')), 40));
  v_message text := left(btrim(coalesce(p_message, '')), 500);
  v_id uuid;
begin
  if length(v_phone) = 12 and v_phone like '91%' then
    v_phone := substr(v_phone, 3);
  elsif length(v_phone) = 11 and v_phone like '0%' then
    v_phone := substr(v_phone, 2);
  end if;

  if length(v_name) < 2 then
    raise exception 'Enter your full name.' using errcode = '22023';
  end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'Enter a valid 10-digit mobile number.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if length(v_city) < 2 then
    raise exception 'Enter the city or nagar you drive in.' using errcode = '22023';
  end if;
  if length(v_vehicle_number) < 4 then
    raise exception 'Enter the vehicle registration number.' using errcode = '22023';
  end if;
  if length(v_vehicle_model) < 2 then
    v_vehicle_model := 'E-Rickshaw';
  end if;
  if exists (
    select 1 from public.partner_applications
    where lower(email) = v_email and status = 'pending'
  ) then
    raise exception 'An application with this email is already waiting for review.' using errcode = '23505';
  end if;

  insert into public.partner_applications (
    name, phone, email, city, vehicle_number, vehicle_model, license_number, message, user_id
  )
  values (
    v_name, v_phone, v_email, v_city, v_vehicle_number, v_vehicle_model, v_license_number, v_message,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.attach_partner_documents(
  p_id uuid,
  p_license_path text,
  p_rc_path text,
  p_photo_path text,
  p_id_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_id is null
     or btrim(coalesce(p_license_path, '')) = ''
     or btrim(coalesce(p_rc_path, '')) = ''
     or btrim(coalesce(p_photo_path, '')) = ''
     or btrim(coalesce(p_id_path, '')) = '' then
    raise exception 'Upload the driving licence, RC, vehicle photo and ID.' using errcode = '22023';
  end if;
  if split_part(p_license_path, '/', 1) is distinct from p_id::text
     or split_part(p_rc_path, '/', 1) is distinct from p_id::text
     or split_part(p_photo_path, '/', 1) is distinct from p_id::text
     or split_part(p_id_path, '/', 1) is distinct from p_id::text then
    raise exception 'Document upload did not match this application.' using errcode = '22023';
  end if;

  select status into v_status
  from public.partner_applications
  where id = p_id
  for update;
  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if v_status is distinct from 'pending' then
    raise exception 'This application can no longer be updated.' using errcode = '55000';
  end if;

  update public.partner_applications
  set license_path = p_license_path,
      rc_path = p_rc_path,
      photo_path = p_photo_path,
      id_path = p_id_path
  where id = p_id;
end;
$$;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := left(btrim(coalesce(p_name, '')), 80);
  v_email text := lower(left(btrim(coalesce(p_email, '')), 254));
  v_phone text := left(btrim(coalesce(p_phone, '')), 20);
  v_subject text := left(btrim(coalesce(p_subject, '')), 120);
  v_message text := left(btrim(coalesce(p_message, '')), 2000);
begin
  if length(v_name) < 2 then
    raise exception 'Enter your name.' using errcode = '22023';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if length(v_message) < 10 then
    raise exception 'Write a short message so we know how to help.' using errcode = '22023';
  end if;
  if v_subject = '' then
    v_subject := 'Website enquiry';
  end if;

  insert into public.contact_messages (name, email, phone, subject, message)
  values (v_name, v_email, v_phone, v_subject, v_message);
end;
$$;

revoke all on function public.submit_partner_application(text, text, text, text, text, text, text, text) from public;
revoke all on function public.attach_partner_documents(uuid, text, text, text, text) from public;
revoke all on function public.submit_contact_message(text, text, text, text, text) from public;

grant execute on function public.submit_partner_application(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.attach_partner_documents(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;

-- 5. Admin review -------------------------------------------------------------------------

create or replace function public.admin_review_partner_application(
  p_application_id uuid,
  p_status text,
  p_note text default ''
)
returns public.partner_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before text;
  v_note text := left(btrim(coalesce(p_note, '')), 500);
  v_row public.partner_applications;
  v_provider_id uuid;
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'Choose a valid status.' using errcode = '22023';
  end if;
  if p_status = 'rejected' and v_note = '' then
    raise exception 'Give a reason for rejecting this application.' using errcode = '22023';
  end if;

  select status into v_before
  from public.partner_applications
  where id = p_application_id
  for update;
  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;
  if v_before = p_status then
    raise exception 'This application is already %.', p_status using errcode = '55000';
  end if;

  update public.partner_applications
  set status = p_status,
      note = v_note,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_application_id
  returning * into v_row;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'partner.status_changed',
    'partner_application',
    p_application_id::text,
    jsonb_build_object('from', v_before, 'to', p_status, 'note', v_note, 'email', v_row.email)
  );

  if p_status = 'approved' then
    select id into v_provider_id
    from public.providers
    where id = v_row.user_id
       or lower(email) = lower(v_row.email)
       or (v_row.phone <> '' and phone = v_row.phone)
    order by case when id = v_row.user_id then 0 else 1 end
    limit 1;

    if v_provider_id is not null then
      update public.partner_applications
      set user_id = coalesce(user_id, v_provider_id)
      where id = p_application_id;

      if (select verification_status from public.providers where id = v_provider_id) = 'pending' then
        perform public.admin_set_driver_status(
          v_provider_id,
          'approved',
          coalesce(nullif(v_note, ''), 'Approved from partner documents')
        );
      end if;
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_review_partner_application(uuid, text, text) from public, anon;
grant execute on function public.admin_review_partner_application(uuid, text, text) to authenticated;

-- 6. Link app sign-up to an already-approved website application --------------------------
-- When a driver later creates their providers row in the app, copy approval across.
-- Runs as the table owner, so providers_protect_verification does not pin the status.

create or replace function public.providers_apply_partner_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.partner_applications;
begin
  select * into v_app
  from public.partner_applications
  where (
      (new.email <> '' and lower(email) = lower(new.email))
      or (new.phone <> '' and phone = new.phone)
    )
  order by case status when 'approved' then 0 when 'pending' then 1 else 2 end, created_at desc
  limit 1;

  if not found then
    return new;
  end if;

  update public.partner_applications
  set user_id = new.id
  where id = v_app.id
    and user_id is null;

  if v_app.status = 'approved' then
    update public.providers
    set verification_status = 'approved',
        verification_note = coalesce(nullif(v_app.note, ''), 'Approved from partner application'),
        verification_updated_at = coalesce(v_app.reviewed_at, now()),
        verification_updated_by = v_app.reviewed_by
    where id = new.id
      and verification_status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists providers_apply_partner_approval on public.providers;
create trigger providers_apply_partner_approval
  after insert on public.providers
  for each row execute function public.providers_apply_partner_approval();
