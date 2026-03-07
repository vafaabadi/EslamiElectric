-- Create users table matching the structure of users.json
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('person', 'company')),
  first_name text not null,
  surname text not null,
  dob date,
  mobile text not null,
  landline text,
  email text not null,
  bank_details text,
  address text not null,
  company_name text,
  company_number text,
  company_contact_number text,
  company_principal_contact text,
  created_at timestamptz not null default now()
);

-- Optional: enable Row Level Security (RLS) and add policy for service role
alter table public.users enable row level security;

-- Allow service role full access (used by your backend with service_role key)
create policy "Service role has full access to users"
  on public.users
  for all
  to service_role
  using (true)
  with check (true);

-- Optional: allow anon/authenticated read if you need client-side access later
-- create policy "Allow read for authenticated" on public.users for select to authenticated using (true);

comment on table public.users is 'User accounts from the create account form';
