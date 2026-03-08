# Supabase setup

## 1. Create the `users` table

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `migrations/001_create_users_table.sql` and run it.
4. Run `migrations/002_add_password_and_unique_email.sql` to add login (password hash + unique email).
5. Run `migrations/003_add_password_reset.sql` to add forgot-password (reset_token, reset_token_expires).

## 2. Configure the app

1. In the project root, copy `.env.example` to `.env`.
2. In Supabase: **Settings** → **API**.
3. Set in `.env`:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key (secret; never expose in the frontend)
   - `JWT_SECRET` = a long random string for login sessions (e.g. `openssl rand -hex 32`)

## 3. (Optional) Migrate existing users from `users.json`

From the project root:

```bash
node scripts/migrate-users-to-supabase.js
```

Then restart the server and use the app; new signups will go to Supabase.
