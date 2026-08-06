-- Restore authenticated, owner-scoped persistence for execution snapshots.
-- Rollback: drop the four policies below and revoke the table grants.

alter table public.execution_sessions enable row level security;

grant select, insert, update, delete on table public.execution_sessions to authenticated;

drop policy if exists "execution sessions select own" on public.execution_sessions;
create policy "execution sessions select own"
  on public.execution_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "execution sessions insert own" on public.execution_sessions;
create policy "execution sessions insert own"
  on public.execution_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "execution sessions update own" on public.execution_sessions;
create policy "execution sessions update own"
  on public.execution_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "execution sessions delete own" on public.execution_sessions;
create policy "execution sessions delete own"
  on public.execution_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);
