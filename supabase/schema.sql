-- 暴风雪个人简历网站：每日学习 / 工作打卡
-- 在 Supabase Dashboard > SQL Editor 中完整执行一次。

create extension if not exists pgcrypto;

create table if not exists public.study_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  note text not null default '' check (char_length(note) <= 1000),
  checked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, checkin_date)
);

create index if not exists study_checkins_user_date_index
  on public.study_checkins (user_id, checkin_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists study_checkins_set_updated_at on public.study_checkins;
create trigger study_checkins_set_updated_at
before update on public.study_checkins
for each row execute function public.set_updated_at();

alter table public.study_checkins enable row level security;

revoke all on public.study_checkins from anon;
grant select, insert, update, delete on public.study_checkins to authenticated;

drop policy if exists "Users can view their own study checkins" on public.study_checkins;
create policy "Users can view their own study checkins"
on public.study_checkins for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own study checkins" on public.study_checkins;
create policy "Users can create their own study checkins"
on public.study_checkins for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own study checkins" on public.study_checkins;
create policy "Users can update their own study checkins"
on public.study_checkins for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own study checkins" on public.study_checkins;
create policy "Users can delete their own study checkins"
on public.study_checkins for delete
to authenticated
using ((select auth.uid()) = user_id);
