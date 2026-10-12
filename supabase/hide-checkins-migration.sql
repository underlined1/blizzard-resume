-- Legacy compatibility for sites that already use the is_hidden column.
-- Records are private now, so this migration removes rather than recreates the
-- former anonymous public feed.
begin;

alter table public.study_checkins
  add column if not exists is_hidden boolean not null default false;

drop function if exists public.get_public_checkins();

commit;
