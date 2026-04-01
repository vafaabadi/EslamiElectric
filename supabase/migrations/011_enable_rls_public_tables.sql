-- Row Level Security for public schema tables that store credentials, tokens, PII, and orders.
-- Fixes Security Advisor: rls_disabled_in_public, sensitive_columns_exposed.
--
-- PostgREST (anon / authenticated JWT) has no policies here, so direct API access to these
-- tables is denied. The app server uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
--
-- If you later need client-side Supabase queries on these tables, add explicit policies
-- (e.g. FOR SELECT USING (auth.uid() = user_id)) — do not expose password_hash or tokens.

alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.account_claims enable row level security;
