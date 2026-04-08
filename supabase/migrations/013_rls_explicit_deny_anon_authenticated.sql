-- Explicit deny for PostgREST roles (anon, authenticated) on sensitive public tables.
-- Migration 011 enabled RLS with no policies = default deny for these roles; this migration
-- adds named policies so intent is clear and Supabase Security Advisor lint 0008
-- (rls_enabled_no_policy) is satisfied.
--
-- App access uses Node with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). The browser only
-- receives the anon key for Supabase Auth (OAuth/magic link), not for unrestricted table access.

CREATE POLICY "no_direct_api_access"
  ON public.users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no_direct_api_access"
  ON public.orders
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "no_direct_api_access"
  ON public.account_claims
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
