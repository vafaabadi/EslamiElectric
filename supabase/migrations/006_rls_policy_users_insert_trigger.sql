-- Run this in Supabase SQL Editor.
-- RLS is enabled on public.users, so the auth trigger's INSERT can be blocked.
-- These policies allow the trigger (running as postgres / service_role) to insert new user rows.

-- Allow postgres (dashboard / migrations) to insert (e.g. when trigger runs as definer owned by postgres)
create policy "Allow insert for auth sync trigger (postgres)"
  on public.users
  for insert
  to postgres
  with check (true);

-- Allow service_role to insert (Supabase auth may run trigger in this context)
create policy "Allow insert for auth sync trigger (service_role)"
  on public.users
  for insert
  to service_role
  with check (true);

-- If your trigger still fails, try also (Supabase sometimes uses this role):
-- create policy "Allow insert for auth sync trigger (supabase_admin)"
--   on public.users for insert to supabase_admin with check (true);
