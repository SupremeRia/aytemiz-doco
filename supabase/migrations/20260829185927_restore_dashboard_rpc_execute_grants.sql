-- Restores `authenticated` EXECUTE on private-schema helpers that the dashboard's
-- read path depends on. Earlier hardening migrations revoked (or let a default
-- grant lapse on) these functions without a matching re-grant, even though the
-- calling public.* wrappers are SECURITY INVOKER and therefore require the
-- authenticated caller itself to hold EXECUTE on the private function:
--   - private.get_my_profile(): revoked from authenticated in
--     20260828155228_advisor_profile_rpc_cleanup.sql (line 12), used by
--     public.get_my_profile() (security invoker).
--   - private.can_view_announcement(uuid,uuid): revoked from authenticated in
--     20260828152922_operations_announcements_notifications_directory.sql
--     (line 134). This function is also the RLS USING() predicate on
--     public.announcements/announcement_media, so the revoke broke row-level
--     security evaluation for every authenticated SELECT against those tables,
--     not only the RPC path.
--   - private.list_news(...): never had an explicit grant and relied on the
--     Postgres default PUBLIC execute grant; that default was removed by the
--     blanket "revoke all on all functions in schema private from public,anon"
--     in 20260828222156_phase6_rpc_security_hardening.sql (line 16), leaving
--     authenticated with no grant of its own.
-- Confirmed against dwniplcslvfuifwymhlo edge_logs: repeated 403s on
-- POST rpc/get_my_profile, GET announcements, and POST rpc/list_news during
-- authenticated dashboard loads on 2026-08-29.
revoke all on function private.get_my_profile() from anon;
grant execute on function private.get_my_profile() to authenticated;

revoke all on function private.can_view_announcement(uuid,uuid) from anon;
grant execute on function private.can_view_announcement(uuid,uuid) to authenticated;

revoke all on function private.list_news(uuid,text,text,boolean,timestamptz,uuid,integer) from anon;
grant execute on function private.list_news(uuid,text,text,boolean,timestamptz,uuid,integer) to authenticated;
