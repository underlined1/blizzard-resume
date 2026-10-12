-- Deprecated: records are private now. Kept only so an old setup checklist
-- cannot accidentally recreate the anonymous public feed.
begin;

drop function if exists public.get_public_checkins();

commit;
