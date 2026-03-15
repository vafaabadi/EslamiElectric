# Supabase setup

## 1. Create the `users` table

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `migrations/001_create_users_table.sql` and run it.
4. Run `migrations/002_add_password_and_unique_email.sql` to add login (password hash + unique email).
5. Run `migrations/003_add_password_reset.sql` to add forgot-password (reset_token, reset_token_expires).
6. **For Supabase Auth (sign-up/sign-in):** Run `migrations/004_supabase_auth_sync_trigger.sql` so new auth users get a row in `public.users`. Ensure `public.users.id` is UUID and matches `auth.users.id`. If `password_hash` is NOT NULL, alter it to allow NULL: `ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;`

## 2. Enable Supabase Auth (Email)

1. In Supabase: **Authentication** → **Providers** → **Email** → enable and save.
2. Under **Authentication** → **URL Configuration**, add **Redirect URLs**:
   - `http://localhost:3000/auth-callback.html` (and `https://your-domain.com/auth-callback.html` for production)
   - `http://localhost:3000/update-password.html` (for forgot-password links)
   There is no separate "Confirm email redirect" setting; the app passes `emailRedirectTo: baseUrl + '/auth-callback.html'` when the user signs up, so the confirmation email link sends them to `auth-callback.html`, which syncs them to `public.users` and logs them in.
3. To skip email confirmation so users are signed in immediately after sign-up: **Authentication** → **Providers** → **Email** → disable "Confirm email".

## 3. Configure the app

1. In the project root, copy `.env.example` to `.env`.
2. In Supabase: **Settings** → **API**.
3. Set in `.env`:
   - `SUPABASE_URL` = Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` key (secret; never expose in the frontend)
   - `SUPABASE_ANON_KEY` = `anon` key (public; used by frontend for sign-in, sign-up, forgot/update password)
   - `SUPABASE_JWT_SECRET` = **JWT signing key** (Project settings → JWT keys → JWT signing keys → current key; used to verify Supabase auth tokens)
   - `JWT_SECRET` = a long random string for app sessions (e.g. `openssl rand -hex 32`)

## 4. Orders table and guest checkout

If you use Stripe checkout, ensure the `orders` table exists (see project root `supabase-orders-table.sql`). For **guest checkout** (shipping address, order tracking link), run **migration `008_orders_guest_shipping.sql`** in the SQL Editor to add columns: `guest_access_token`, `customer_name`, `customer_phone`, `shipping_address`, `tracking_number`.

## 5. (Optional) Migrate existing users from `users.json`

From the project root:

```bash
node scripts/migrate-users-to-supabase.js
```

Then restart the server and use the app; new signups will go to Supabase.
