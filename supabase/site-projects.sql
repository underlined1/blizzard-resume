-- 后台“发布简单作品”功能。
-- 请在 Supabase Dashboard > SQL Editor 中完整执行一次。
-- 此脚本依赖 admin-access.sql 已经成功执行。

create extension if not exists pgcrypto;

create table if not exists public.site_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  summary text not null default '' check (char_length(summary) <= 500),
  project_url text check (project_url is null or project_url ~ '^https?://'),
  file_path text,
  file_name text check (file_name is null or char_length(file_name) <= 255),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_projects
  drop constraint if exists site_projects_project_url_check;
alter table public.site_projects
  add constraint site_projects_project_url_check
  check (project_url is null or project_url ~ '^https?://');

alter table public.site_projects
  drop constraint if exists site_projects_file_name_check;
alter table public.site_projects
  add constraint site_projects_file_name_check
  check (file_name is null or char_length(file_name) <= 255);

create index if not exists site_projects_created_at_index
  on public.site_projects (created_at desc);

drop trigger if exists site_projects_set_updated_at on public.site_projects;
create trigger site_projects_set_updated_at
before update on public.site_projects
for each row execute function public.set_updated_at();

alter table public.site_projects enable row level security;
grant select on public.site_projects to anon, authenticated;
grant insert, update, delete on public.site_projects to authenticated;

drop policy if exists "Public can read published projects" on public.site_projects;
create policy "Public can read published projects"
on public.site_projects for select using (true);

drop policy if exists "Admin can add site projects" on public.site_projects;
create policy "Admin can add site projects"
on public.site_projects for insert to authenticated
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can update site projects" on public.site_projects;
create policy "Admin can update site projects"
on public.site_projects for update to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id)
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can delete site projects" on public.site_projects;
create policy "Admin can delete site projects"
on public.site_projects for delete to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-project-files',
  'site-project-files',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

drop policy if exists "Admin can upload project files" on storage.objects;
create policy "Admin can upload project files"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-project-files' and (select public.is_site_admin()));

drop policy if exists "Admin can view project files" on storage.objects;
create policy "Admin can view project files"
on storage.objects for select to authenticated
using (bucket_id = 'site-project-files' and (select public.is_site_admin()));

drop policy if exists "Admin can delete project files" on storage.objects;
create policy "Admin can delete project files"
on storage.objects for delete to authenticated
using (bucket_id = 'site-project-files' and (select public.is_site_admin()));
