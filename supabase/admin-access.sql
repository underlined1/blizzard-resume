-- Private admin access. This file never contains the owner email.
-- In Supabase Dashboard > SQL Editor, replace only the placeholder below
-- with your own login email before running this script.
-- Run this file before (or re-run it after) site-music.sql.

begin;

create table if not exists public.site_admins (
  id boolean primary key default true check (id),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

do $$
declare
  owner_user_id uuid;
begin
  select id into owner_user_id
  from auth.users
  where lower(email) = lower('REPLACE_WITH_YOUR_SUPABASE_LOGIN_EMAIL')
  limit 1;

  if owner_user_id is null then
    raise exception 'No Supabase Auth user matches the supplied email. Sign in to the website once first, then run this script again.';
  end if;

  insert into public.site_admins (id, user_id)
  values (true, owner_user_id)
  on conflict (id) do nothing;
end;
$$;

alter table public.study_checkins enable row level security;
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

do $$
begin
  if to_regclass('public.site_music') is not null then
    execute 'drop policy if exists "Owner can add site music" on public.site_music';
    execute 'drop policy if exists "Admin can add site music" on public.site_music';
    execute 'create policy "Admin can add site music" on public.site_music for insert to authenticated with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id)';
    execute 'drop policy if exists "Owner can update site music" on public.site_music';
    execute 'drop policy if exists "Admin can update site music" on public.site_music';
    execute 'create policy "Admin can update site music" on public.site_music for update to authenticated using ((select public.is_site_admin()) and (select auth.uid()) = owner_id) with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id)';
    execute 'drop policy if exists "Admin can delete site music" on public.site_music';
    execute 'create policy "Admin can delete site music" on public.site_music for delete to authenticated using ((select public.is_site_admin()) and (select auth.uid()) = owner_id)';
  end if;
end;
$$;

drop policy if exists "Music owner can upload audio" on storage.objects;
drop policy if exists "Admin can upload audio" on storage.objects;
create policy "Admin can upload audio" on storage.objects for insert to authenticated
with check (bucket_id = 'site-audio' and (select public.is_site_admin()));
drop policy if exists "Music owner can view audio objects" on storage.objects;
drop policy if exists "Admin can view audio objects" on storage.objects;
create policy "Admin can view audio objects" on storage.objects for select to authenticated
using (bucket_id = 'site-audio' and (select public.is_site_admin()));
drop policy if exists "Music owner can delete audio" on storage.objects;
drop policy if exists "Admin can delete audio" on storage.objects;
create policy "Admin can delete audio" on storage.objects for delete to authenticated
using (bucket_id = 'site-audio' and (select public.is_site_admin()));

commit;
