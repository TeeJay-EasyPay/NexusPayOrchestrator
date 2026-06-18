-- NexusPay Orchestrator
-- Correct participant seed upsert policy for multi-account/persona flows.
--
-- The app calls supabase.from("participants").upsert(...) during persona
-- workspace entry. The base multi-entity migration allowed insert/select, but
-- existing rows require an update policy for repeat upserts to succeed.

drop policy if exists "participants updatable" on public.participants;

create policy "participants updatable"
  on public.participants for update to authenticated
  using (true)
  with check (true);
