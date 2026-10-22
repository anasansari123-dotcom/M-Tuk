-- Admin desk: list / grant / revoke administrators.
-- Run AFTER supabase/admin.sql. Safe to re-run.
-- Creating Auth users still needs the service-role key on the website server
-- (SUPABASE_SERVICE_ROLE_KEY, never NEXT_PUBLIC_). These functions only
-- manage public.admin_users and the audit log.

create or replace function public.admin_list_admins()
returns table (user_id uuid, email text, note text, created_at timestamptz)
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
  select
    a.user_id,
    coalesce(u.email, '')::text,
    a.note::text,
    a.created_at
  from public.admin_users a
  left join auth.users u on u.id = a.user_id
  order by a.created_at;
end;
$$;

create or replace function public.admin_grant_admin(p_user_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := left(btrim(coalesce(p_note, '')), 200);
  v_email text := '';
begin
  if not public.is_admin() then
    raise exception 'You are not authorized.' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Choose a user.' using errcode = '22023';
  end if;
  if exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'That account is already an admin.' using errcode = '23505';
  end if;

  select coalesce(email, '') into v_email from auth.users where id = p_user_id;
  if not found then
    raise exception 'That login does not exist.' using errcode = 'P0002';
  end if;

  insert into public.admin_users (user_id, note) values (p_user_id, v_note);

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'admin.granted',
    'admin',
    p_user_id::text,
    jsonb_build_object('email', v_email, 'note', v_note)
  );
end;
$$;

create or replace function public.admin_revoke_admin(p_user_id uuid)
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
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own admin access.' using errcode = '22023';
  end if;

  select coalesce(u.email, '') into v_email
  from public.admin_users a
  left join auth.users u on u.id = a.user_id
  where a.user_id = p_user_id;
  if not found then
    raise exception 'That account is not an admin.' using errcode = 'P0002';
  end if;

  delete from public.admin_users where user_id = p_user_id;

  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, details)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    'admin.revoked',
    'admin',
    p_user_id::text,
    jsonb_build_object('email', v_email)
  );
end;
$$;

revoke all on function public.admin_list_admins() from public, anon;
revoke all on function public.admin_grant_admin(uuid, text) from public, anon;
revoke all on function public.admin_revoke_admin(uuid) from public, anon;

grant execute on function public.admin_list_admins() to authenticated;
grant execute on function public.admin_grant_admin(uuid, text) to authenticated;
grant execute on function public.admin_revoke_admin(uuid) to authenticated;
