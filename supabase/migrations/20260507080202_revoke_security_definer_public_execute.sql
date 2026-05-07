-- Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated/public.
-- These functions are only intended to be called by:
--   - claim_poop_job:    edge function via service_role
--   - reset_stuck_jobs:  pg_cron via postgres superuser
--   - handle_new_user:   trigger on auth.users (not RPC)
--   - rls_auto_enable:   DDL event trigger (not RPC)

revoke execute on function public.claim_poop_job()    from anon, authenticated, public;
revoke execute on function public.handle_new_user()   from anon, authenticated, public;
revoke execute on function public.reset_stuck_jobs()  from anon, authenticated, public;
revoke execute on function public.rls_auto_enable()   from anon, authenticated, public;

-- Re-grant to service_role explicitly (idempotent safety net for re-runs).
grant execute on function public.claim_poop_job()   to service_role;
grant execute on function public.reset_stuck_jobs() to service_role;
