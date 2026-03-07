# Supabase setup

## 1. Create the `users` table

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `migrations/001_create_users_table.sql` and run it.

## 2. Configure the app

1. In the project root, copy `.env.example` to `.env`.
2. In Supabase: **Settings** → **API**.
3. Set in `.env`:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key (secret; never expose in the frontend)

## 3. (Optional) Migrate existing users from `users.json`

From the project root:

```bash
node scripts/migrate-users-to-supabase.js
```

Then restart the server and use the app; new signups will go to Supabase.
