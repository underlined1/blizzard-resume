-- Run once in Supabase SQL Editor. This keeps study_checkins private while
-- publishing only the date, check-in status and note of site-admin accounts.
begin;

create or replace function public.get_public_checkins()
returns table (
  checkin_date date,
  note text,
  checked boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.checkin_date,
    c.note,
    c.checked,
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
