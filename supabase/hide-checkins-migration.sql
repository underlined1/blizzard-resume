-- Run once in Supabase SQL Editor for an existing site.
-- Hidden check-ins remain visible to the site admin, but the public RPC returns
-- only the fixed text "已隐藏" so the original note is never sent to visitors.
begin;

alter table public.study_checkins
  add column if not exists is_hidden boolean not null default false;

drop function if exists public.get_public_checkins();

create function public.get_public_checkins()
returns table (
  checkin_date date,
  note text,
  checked boolean,
  is_hidden boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.checkin_date,
    case when c.is_hidden then '已隐藏' else c.note end,
    c.checked,
    c.is_hidden,
    c.updated_at
  from public.study_checkins as c
  where exists (
    select 1
    from public.site_admins as a
    where a.user_id = c.user_id
  )
  order by c.checkin_date desc;
$$;

revoke all on function public.get_public_checkins() from public;
grant execute on function public.get_public_checkins() to anon, authenticated;

commit;
