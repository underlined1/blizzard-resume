-- “关于”页面的音乐 / 阅读介绍内容。
-- 请在 Supabase Dashboard > SQL Editor 中完整执行一次。
-- 此脚本依赖 admin-access.sql 已经成功执行。

create table if not exists public.site_interest_profiles (
  section_key text primary key check (section_key in ('music', 'reading')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 1000),
  highlight text not null default '' check (char_length(highlight) <= 160),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists site_interest_profiles_set_updated_at on public.site_interest_profiles;
create trigger site_interest_profiles_set_updated_at
before update on public.site_interest_profiles
for each row execute function public.set_updated_at();

alter table public.site_interest_profiles enable row level security;
grant select on public.site_interest_profiles to anon, authenticated;
grant insert, update, delete on public.site_interest_profiles to authenticated;

drop policy if exists "Public can read interest profiles" on public.site_interest_profiles;
create policy "Public can read interest profiles"
on public.site_interest_profiles for select using (true);

drop policy if exists "Admin can add interest profiles" on public.site_interest_profiles;
create policy "Admin can add interest profiles"
on public.site_interest_profiles for insert to authenticated
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can update interest profiles" on public.site_interest_profiles;
create policy "Admin can update interest profiles"
on public.site_interest_profiles for update to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id)
with check ((select public.is_site_admin()) and (select auth.uid()) = owner_id);

drop policy if exists "Admin can delete interest profiles" on public.site_interest_profiles;
create policy "Admin can delete interest profiles"
on public.site_interest_profiles for delete to authenticated
using ((select public.is_site_admin()) and (select auth.uid()) = owner_id);
