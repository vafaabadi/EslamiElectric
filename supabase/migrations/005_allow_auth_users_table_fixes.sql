-- Run this in Supabase SQL Editor if you get "Database error saving new user".
-- Makes public.users compatible with the Supabase Auth sync trigger.
-- Run each line; if one fails (e.g. column already nullable), skip that line.

-- Allow NULL password_hash (Supabase Auth users don't store password in public.users)
alter table public.users alter column password_hash drop not null;

-- Ensure created_at has a default so the trigger insert doesn't need to set it
alter table public.users alter column created_at set default now();
