-- 将旧版“仅 1 首公开音乐”升级为最多 10 首公开歌曲。
-- 在 Supabase Dashboard > SQL Editor 中完整执行一次。
-- 已有的第一首歌会保留，不会被删除。

begin;

alter table public.site_music drop constraint if exists site_music_id_check;

create sequence if not exists public.site_music_id_seq;
select setval(
  'public.site_music_id_seq',
  greatest(coalesce((select max(id) from public.site_music), 0), 1),
  true
);
alter table public.site_music
  alter column id set default nextval('public.site_music_id_seq');
grant usage, select on sequence public.site_music_id_seq to authenticated;

alter table public.site_music
  add column if not exists sort_order smallint;

update public.site_music
set sort_order = id
where sort_order is null;

alter table public.site_music
  alter column sort_order set not null;

alter table public.site_music
  drop constraint if exists site_music_sort_order_range,
  drop constraint if exists site_music_sort_order_key;

alter table public.site_music
  add constraint site_music_sort_order_range check (sort_order between 1 and 10),
  add constraint site_music_sort_order_key unique (sort_order);

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a',
      'audio/aac', 'audio/x-aac', 'audio/ogg', 'audio/wav',
      'audio/x-wav', 'audio/flac', 'audio/x-flac'
    ]
where id = 'site-audio';

commit;
