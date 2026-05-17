-- Catalogue admin access is gated by public.users.is_admin (see server adminMiddleware).
-- Set is_admin = true in the Supabase Dashboard (Table Editor) or with UPDATE … for trusted accounts.
-- Backfill from ADMIN_ALLOWED_EMAILS is not possible in SQL alone (that env list exists only on the app server);
-- use a manual UPDATE public.users SET is_admin = true WHERE lower(trim(email)) = 'ops@example.com'; as needed.

alter table public.users add column if not exists is_admin boolean not null default false;

comment on column public.users.is_admin is 'If true, user may access /api/admin/* and the product admin UI after normal login.';
