-- Run in Supabase SQL Editor (once) to enable login lockout after failed password attempts.
-- Defaults: 5 failures → lock for 60 minutes (see LOGIN_LOCKOUT_* env vars on the server).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS login_failed_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS locked_until timestamptz NULL;

COMMENT ON COLUMN public.users.login_failed_count IS 'Failed password attempts since last success; reset on success or password reset.';
COMMENT ON COLUMN public.users.locked_until IS 'If set and in the future, password login is blocked until this time (auto-unlock).';
