-- MTUK Nagar Ride: show the partner's live KYC photo as their profile picture in the app.
--
-- Run AFTER supabase/partner-kyc.sql, in the Supabase SQL editor. Safe to re-run.
--
-- A signed-in driver can read ONLY their own selfie file. Aadhaar, PAN, licence and RC
-- stay admin-only.

-- Path of the signed-in user's selfie (prefers the approved application, else the latest).
create or replace function public.my_partner_selfie_path()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select selfie_path
  from public.partner_applications
  where selfie_path <> ''
    and auth.uid() is not null
    and (
      user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  order by case status when 'approved' then 0 when 'pending' then 1 else 2 end, created_at desc
  limit 1;
$$;

revoke all on function public.my_partner_selfie_path() from public, anon;
grant execute on function public.my_partner_selfie_path() to authenticated;

drop policy if exists "partner documents owner selfie read" on storage.objects;
create policy "partner documents owner selfie read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'partner-documents'
    and split_part(name, '/', 2) like 'selfie.%'
    and name = (select public.my_partner_selfie_path())
  );
