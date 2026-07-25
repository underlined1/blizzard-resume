-- 个人音乐档案与阅读书架。
-- 请在 Supabase Dashboard > SQL Editor 中完整执行一次。
-- 此脚本依赖 admin-access.sql 已经成功执行。

create extension if not exists pgcrypto;

create table if not exists public.site_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  collection_type text not null check (collection_type in ('music', 'reading')),
  title text not null check (char_length(title) between 1 and 120),
  creator text not null default '' check (char_length(creator) <= 100),
  category text not null default '' check (char_length(category) <= 80),
  note text not null default '' check (char_length(note) <= 800),
  quote text not null default '' check (char_length(quote) <= 300),
  external_url text check (external_url is null or external_url ~ '^https?://'),
  cover_path text,
  cover_name text check (cover_name is null or char_length(cover_name) <= 255),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists site_collections_type_updated_index
  on public.site_collections (collection_type, updated_at desc);

drop trigger if exists site_collections_set_updated_at on public.site_collections;
create trigger site_collections_set_updated_at
before update on public.site_collections
for each row execute function public.set_updated_at();

alter table public.site_collections enable row level security;
grant select on public.site_collections to anon, authenticated;
grant insert, update, delete on public.site_collections to authenticated;

drop policy if exists "Public can read collection archive" on public.site_collections;
create policy "Public can read collection archive"
on public.site_collections for select using (true);

drop policy if exists "Admin can add collection archive" on public.site_collections;
create policy "Admin can add collection archive"
on public.site_collections for insert to authenticated
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can update collection archive" on public.site_collections;
create policy "Admin can update collection archive"
on public.site_collections for update to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id)
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can delete collection archive" on public.site_collections;
create policy "Admin can delete collection archive"
on public.site_collections for delete to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-collection-covers',
  'site-collection-covers',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

drop policy if exists "Admin can upload collection covers" on storage.objects;
create policy "Admin can upload collection covers"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-collection-covers' and (select public.is_site_admin()));

drop policy if exists "Admin can view collection covers" on storage.objects;
create policy "Admin can view collection covers"
on storage.objects for select to authenticated
using (bucket_id = 'site-collection-covers' and (select public.is_site_admin()));

drop policy if exists "Admin can delete collection covers" on storage.objects;
create policy "Admin can delete collection covers"
on storage.objects for delete to authenticated
using (bucket_id = 'site-collection-covers' and (select public.is_site_admin()));
