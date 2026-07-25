-- 执行一次后，站长可从后台上传音乐，访客可在首页播放。
create table if not exists public.site_music (
  id smallint primary key default 1 check (id = 1),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '暴风雪的歌单' check (char_length(title) <= 80),
  audio_path text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_music enable row level security;
grant select on public.site_music to anon, authenticated;
grant insert, update, delete on public.site_music to authenticated;
drop policy if exists "Public can read site music" on public.site_music;
create policy "Public can read site music" on public.site_music for select using (true);
drop policy if exists "Owner can add site music" on public.site_music;
drop policy if exists "Admin can add site music" on public.site_music;
create policy "Admin can add site music" on public.site_music for insert to authenticated
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);
drop policy if exists "Owner can update site music" on public.site_music;
drop policy if exists "Admin can update site music" on public.site_music;
create policy "Admin can update site music" on public.site_music for update to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id)
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);
drop policy if exists "Admin can delete site music" on public.site_music;
create policy "Admin can delete site music" on public.site_music for delete to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public)
values ('site-audio', 'site-audio', true)
on conflict (id) do update set public = true;

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
