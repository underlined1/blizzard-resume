-- Run once in Supabase Dashboard > SQL Editor.
-- Adds a separate read-only gate for records.html. The website never receives
-- study records until the supplied username and password have been verified.

begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

do $$
begin
  if to_regclass('public.study_checkins') is null then
    raise exception 'Run supabase/schema.sql first so study_checkins exists.';
  end if;
  if to_regclass('public.site_admins') is null then
    raise exception 'Run supabase/admin-access.sql first so site_admins exists.';
  end if;
end;
$$;

create table if not exists private.records_access_gate (
  singleton boolean primary key default true check (singleton),
  username text not null,
  password_salt text not null,
  password_hash text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.records_access_gate from public, anon, authenticated;

-- The requested username is stored with a salted password digest. The clear-text
-- password is intentionally absent from the website and this migration file.
insert into private.records_access_gate (
  singleton,
  username,
  password_salt,
  password_hash,
  updated_at
)
values (
  true,
  'admin',
  '2210c4b8bd8b4809b8ba810ee350231f',
  '6f3c2b13201d5252e2eeaef9e0af212613fe809ead6c6c5683eee106f481f425',
  timezone('utc', now())
)
on conflict (singleton) do update
set username = excluded.username,
    password_salt = excluded.password_salt,
    password_hash = excluded.password_hash,
    updated_at = excluded.updated_at;

drop function if exists public.get_public_checkins();
drop function if exists public.unlock_private_records(text, text);

create function public.unlock_private_records(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  credentials_are_valid boolean := false;
  records jsonb := '[]'::jsonb;
begin
  select exists (
    select 1
    from private.records_access_gate as gate
    where gate.singleton
      and gate.username = p_username
      and gate.password_hash = encode(
        extensions.digest(
          convert_to(gate.password_salt || ':' || coalesce(p_password, ''), 'UTF8'),
          'sha256'
        ),
        'hex'
      )
  ) into credentials_are_valid;

  if not credentials_are_valid then
    perform pg_sleep(0.35);
    return jsonb_build_object('ok', false, 'records', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'checkin_date', checkin.checkin_date,
        'note', checkin.note,
        'checked', checkin.checked,
        'is_hidden', checkin.is_hidden,
        'updated_at', checkin.updated_at
      ) order by checkin.checkin_date
    ),
    '[]'::jsonb
  )
  into records
  from public.study_checkins as checkin
  where exists (
    select 1
    from public.site_admins as admin
    where admin.user_id = checkin.user_id
  );

  return jsonb_build_object('ok', true, 'records', records);
end;
$$;

revoke all on function public.unlock_private_records(text, text) from public;
grant execute on function public.unlock_private_records(text, text) to anon, authenticated;

alter table public.study_checkins enable row level security;
revoke all on table public.study_checkins from anon;
grant select, insert, update, delete on table public.study_checkins to authenticated;

drop policy if exists "Users can view their own study checkins" on public.study_checkins;
drop policy if exists "Only the site admin can view study checkins" on public.study_checkins;
create policy "Only the site admin can view study checkins"
on public.study_checkins for select to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = user_id);

drop policy if exists "Users can create their own study checkins" on public.study_checkins;
drop policy if exists "Only the site admin can create study checkins" on public.study_checkins;
create policy "Only the site admin can create study checkins"
on public.study_checkins for insert to authenticated
with check ((select public.is_site_admin()) and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own study checkins" on public.study_checkins;
drop policy if exists "Only the site admin can update study checkins" on public.study_checkins;
create policy "Only the site admin can update study checkins"
on public.study_checkins for update to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = user_id)
with check ((select public.is_site_admin()) and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own study checkins" on public.study_checkins;
drop policy if exists "Only the site admin can delete study checkins" on public.study_checkins;
create policy "Only the site admin can delete study checkins"
on public.study_checkins for delete to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = user_id);

commit;
