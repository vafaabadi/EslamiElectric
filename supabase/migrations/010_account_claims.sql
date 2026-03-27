-- Account claim tokens: allow guests who purchased to set a password and claim their order history.
-- Run in Supabase SQL Editor after orders and users tables exist.

create table if not exists public.account_claims (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_claims_token_idx on public.account_claims(token) where used_at is null;
create index if not exists account_claims_email_idx on public.account_claims(email);

comment on table public.account_claims is 'One-time tokens for guest buyers to claim an account (set password and attach orders to new user)';
