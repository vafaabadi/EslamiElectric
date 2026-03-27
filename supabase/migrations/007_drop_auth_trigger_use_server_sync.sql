-- Run this in Supabase SQL Editor.
-- The trigger was failing (e.g. due to RLS), which rolled back the whole sign-up.
-- We now sync profiles in the server (POST /api/auth/token) instead, so drop the trigger.
-- After this, sign-up creates the auth user only; the app server syncs to public.users when
-- the frontend calls /api/auth/token.

drop trigger if exists on_auth_user_created on auth.users;
