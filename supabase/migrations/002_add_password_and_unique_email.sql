-- Add password hash and unique email for login
-- Run this in the Supabase SQL Editor after 001_create_users_table.sql

alter table public.users
  add column if not exists password_hash text;

-- Ensure one account per email (needed for login)
create unique index if not exists users_email_key on public.users (lower(email));

comment on column public.users.password_hash is 'bcrypt hash of user password for login';
