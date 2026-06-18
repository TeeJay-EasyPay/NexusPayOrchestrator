-- NexusPay Orchestrator rollback script
-- Target migrations:
--   20260616000000_external_rail_readiness_tables.sql
--   20260617000100_multi_entity_value_orchestration.sql
--   20260618020100_participants_update_policy.sql
--
-- Purpose:
--   Reverse the two pending Supabase migrations if they are applied and need
--   to be backed out.
--
-- Important:
--   Review before execution. This script drops tables and therefore deletes
--   data stored in those tables.
--
-- Deliberately not rolled back:
--   - pgcrypto extension, because it may be used by other database objects.
--   - auth.users or any existing core NexusPay tables.

begin;

-- ---------------------------------------------------------------------------
-- Roll back 20260617000100_multi_entity_value_orchestration.sql
-- and 20260618020100_participants_update_policy.sql
-- ---------------------------------------------------------------------------

drop policy if exists "notifications updatable" on public.notifications;
drop policy if exists "notifications writable" on public.notifications;
drop policy if exists "notifications readable" on public.notifications;

drop policy if exists "batch transfers updatable" on public.batch_transfers;
drop policy if exists "batch transfers writable" on public.batch_transfers;
drop policy if exists "batch transfers readable" on public.batch_transfers;

drop policy if exists "batches updatable" on public.payout_batches;
drop policy if exists "batches writable" on public.payout_batches;
drop policy if exists "batches readable" on public.payout_batches;

drop policy if exists "participants writable" on public.participants;
drop policy if exists "participants readable" on public.participants;
drop policy if exists "participants updatable" on public.participants;

drop table if exists public.notifications;
drop table if exists public.batch_transfers;
drop table if exists public.payout_batches;
drop table if exists public.participants;

-- ---------------------------------------------------------------------------
-- Roll back 20260616000000_external_rail_readiness_tables.sql
-- ---------------------------------------------------------------------------

drop trigger if exists update_route_certifications_updated_at on public.route_certifications;

drop policy if exists "Authenticated users can view route certifications" on public.route_certifications;
drop policy if exists "Users can view their own provider events" on public.provider_events;
drop policy if exists "Users can view their own provider sessions" on public.provider_execution_sessions;

drop table if exists public.sandbox_test_results;
drop table if exists public.route_certifications;
drop table if exists public.provider_webhooks;
drop table if exists public.provider_events;
drop table if exists public.provider_execution_sessions;

-- The migration created this generic function with CREATE OR REPLACE.
-- Drop only if it is not referenced by any remaining trigger.
do $$
begin
  if not exists (
    select 1
    from pg_trigger trigger_row
    join pg_proc proc_row
      on trigger_row.tgfoid = proc_row.oid
    join pg_namespace namespace_row
      on proc_row.pronamespace = namespace_row.oid
    where proc_row.proname = 'update_updated_at_column'
      and namespace_row.nspname = 'public'
      and not trigger_row.tgisinternal
  ) then
    drop function if exists public.update_updated_at_column();
  end if;
end $$;

-- Optional cleanup if the migrations were recorded through Supabase CLI.
-- Leave commented unless you explicitly need to reconcile migration history
-- after manually rolling back objects.
--
-- delete from supabase_migrations.schema_migrations
-- where version in ('20260616000000', '20260617000100');

commit;
