-- MTUK Nagar Ride: full partner KYC (PAN, Aadhaar back, live selfie, personal details)
-- and admin -> applicant messages.
--
-- Run AFTER supabase/admin.sql and supabase/public.sql, in the Supabase SQL editor.
-- Safe to re-run. Additive only: existing applications keep working.
--
-- Privacy: only the last 4 digits of the Aadhaar number are stored (UIDAI guidance).
-- The Aadhaar card images stay in the private partner-documents bucket, readable by admins only.

-- 1. New application columns ---------------------------------------------------------------

alter table public.partner_applications
  add column if not exists dob date,
  add column if not exists address text not null default '',
  add column if not exists pincode text not null default '',
  add column if not exists aadhaar_last4 text not null default '',
  add column if not exists pan_number text not null default '',
  add column if not exists license_expiry date,
  add column if not exists aadhaar_back_path text not null default '',
  add column if not exists pan_path text not null default '',
  add column if not exists selfie_path text not null default '';

-- 2. Admin -> applicant messages ------------------------------------------------------------

create table if not exists public.partner_application_messages (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.partner_applications (id) on delete cascade,
  body text not null,
  admin_id uuid references auth.users (id) on delete set null,
  admin_email text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists partner_application_messages_app_idx
  on public.partner_application_messages (application_id, created_at desc);

alter table public.partner_application_messages enable row level security;

drop policy if exists "partner messages admins read" on public.partner_application_messages;
create policy "partner messages admins read"
  on public.partner_application_messages
  for select
  to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.partner_application_messages from anon, authenticated;
grant select on public.partner_application_messages to authenticated;

-- 3. Allow the new document names in storage -----------------------------------------------

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
        'id.jpg', 'id.jpeg', 'id.png', 'id.webp', 'id.pdf',
        'aadhaar_back.jpg', 'aadhaar_back.jpeg', 'aadhaar_back.png', 'aadhaar_back.webp', 'aadhaar_back.pdf',
        'pan.jpg', 'pan.jpeg', 'pan.png', 'pan.webp', 'pan.pdf',
        'selfie.jpg', 'selfie.jpeg', 'selfie.png', 'selfie.webp'
      )
  );
$$;

-- 4. Public submit (full KYC) ---------------------------------------------------------------
-- Reuses submit_partner_application for the shared checks, then stores the extra details.

create or replace function public.submit_partner_kyc(
  p_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_address text,
  p_pincode text,
  p_dob date,
  p_aadhaar_last4 text,
  p_pan_number text,
  p_vehicle_number text,
  p_vehicle_model text,
  p_license_number text,
  p_license_expiry date,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_address text := left(btrim(coalesce(p_address, '')), 300);
  v_pincode text := regexp_replace(coalesce(p_pincode, ''), '\D', '', 'g');
  v_aadhaar text := regexp_replace(coalesce(p_aadhaar_last4, ''), '\D', '', 'g');
  v_pan text := upper(btrim(coalesce(p_pan_number, '')));
begin
  if length(v_address) < 10 then
    raise exception 'Enter your full address.' using errcode = '22023';
  end if;
  if v_pincode !~ '^[1-9][0-9]{5}$' then
    raise exception 'Enter a valid 6-digit pincode.' using errcode = '22023';
  end if;
  if p_dob is null or p_dob > (current_date - interval '18 years')::date or p_dob < date '1940-01-01' then
    raise exception 'You must be at least 18 years old.' using errcode = '22023';
  end if;
  if v_aadhaar !~ '^[0-9]{4}$' then
    raise exception 'Enter a valid Aadhaar number.' using errcode = '22023';
  end if;
  if v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    raise exception 'Enter a valid PAN number (e.g. ABCDE1234F).' using errcode = '22023';
  end if;
  if p_license_expiry is null or p_license_expiry < current_date then
    raise exception 'Your driving licence has expired. Renew it before applying.' using errcode = '22023';
  end if;

  v_id := public.submit_partner_application(
    p_name, p_phone, p_email, p_city, p_vehicle_number, p_vehicle_model, p_license_number, p_message
  );

  update public.partner_applications
  set dob = p_dob,
      address = v_address,
      pincode = v_pincode,
      aadhaar_last4 = v_aadhaar,
      pan_number = v_pan,
      license_expiry = p_license_expiry
  where id = v_id;

  return v_id;
end;
$$;

create or replace function public.attach_partner_kyc_documents(
  p_id uuid,
  p_license_path text,
  p_rc_path text,
  p_photo_path text,
  p_id_path text,
  p_aadhaar_back_path text,
  p_pan_path text,
  p_selfie_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(coalesce(p_aadhaar_back_path, '')) = ''
     or btrim(coalesce(p_pan_path, '')) = ''
     or btrim(coalesce(p_selfie_path, '')) = '' then
    raise exception 'Upload the Aadhaar back side, PAN card and live photo.' using errcode = '22023';
  end if;
  if split_part(p_aadhaar_back_path, '/', 1) is distinct from p_id::text
     or split_part(p_pan_path, '/', 1) is distinct from p_id::text
     or split_part(p_selfie_path, '/', 1) is distinct from p_id::text then
    raise exception 'Document upload did not match this application.' using errcode = '22023';
  end if;

  -- Checks the four original documents and that the application is still pending.
  perform public.attach_partner_documents(p_id, p_license_path, p_rc_path, p_photo_path, p_id_path);

  update public.partner_applications
  set aadhaar_back_path = p_aadhaar_back_path,
      pan_path = p_pan_path,
      selfie_path = p_selfie_path
  where id = p_id;
end;
$$;

revoke all on function public.submit_partner_kyc(text, text, text, text, text, text, date, text, text, text, text, text, date, text) from public;
revoke all on function public.attach_partner_kyc_documents(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_partner_kyc(text, text, text, text, text, text, date, text, text, text, text, text, date, text) to anon, authenticated;
grant execute on function public.attach_partner_kyc_documents(uuid, text, text, text, text, text, text, text) to anon, authenticated;

-- 5. Admin sends a message to the applicant -----------------------------------------------

create or replace function public.admin_send_partner_message(
  p_application_id uuid,
  p_body text
)
returns public.partner_application_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text := left(btrim(coalesce(p_body, '')), 1000);
  v_row public.partner_application_messages;
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if length(v_body) < 2 then
    raise exception 'Write a message first.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.partner_applications where id = p_application_id) then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;

  insert into public.partner_application_messages (application_id, body, admin_id, admin_email)
  values (p_application_id, v_body, auth.uid(), coalesce(auth.jwt() ->> 'email', ''))
  returning * into v_row;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'partner.message_sent',
    'partner_application',
    p_application_id::text,
    jsonb_build_object('message', v_body)
  );

  return v_row;
end;
$$;

revoke all on function public.admin_send_partner_message(uuid, text) from public, anon;
grant execute on function public.admin_send_partner_message(uuid, text) to authenticated;

-- 6. The signed-in driver reads their own application status + admin messages (app) ------

create or replace function public.my_partner_application()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_app public.partner_applications;
begin
  if auth.uid() is null then
    return null;
  end if;

  select * into v_app
  from public.partner_applications
  where user_id = auth.uid()
     or (v_email <> '' and lower(email) = v_email)
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_app.id,
    'status', v_app.status,
    'note', v_app.note,
    'created_at', v_app.created_at,
    'reviewed_at', v_app.reviewed_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'body', m.body, 'created_at', m.created_at) order by m.created_at desc)
      from (
        select id, body, created_at
        from public.partner_application_messages
        where application_id = v_app.id
        order by created_at desc
        limit 20
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_partner_application() from public, anon;
grant execute on function public.my_partner_application() to authenticated;
