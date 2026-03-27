-- Password reset tokens for forgot-password flow
-- Run in Supabase SQL Editor

alter table public.users
  add column if not exists reset_token text,
  add column if not exists reset_token_expires timestamptz;

comment on column public.users.reset_token is 'One-time token for password reset';
comment on column public.users.reset_token_expires is 'When the reset token expires';
