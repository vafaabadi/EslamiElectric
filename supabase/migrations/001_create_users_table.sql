-- Initial public.users table (legacy + Supabase Auth sync via server).
-- id defaults for guest-claim / legacy signup; OAuth uses explicit auth.users id on upsert.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  surname text not null,
  type text not null default 'person',
  dob date,
  mobile text not null default '',
  landline text,
  address text not null default '',
  bank_details text,
  company_name text,
  company_number text,
  company_contact_number text,
  company_principal_contact text,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Customer accounts; id may match auth.users when using Supabase Auth.';
