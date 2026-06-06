# Supabase setup

## 1. Create the `users` table

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `migrations/001_create_users_table.sql` and run it (creates `public.users`).
4. Run `migrations/002_add_password_and_unique_email.sql` to add login (password hash + unique email).
5. Run `migrations/003_add_password_reset.sql` to add forgot-password (reset_token, reset_token_expires).
6. **For Supabase Auth (sign-up/sign-in):** Run `migrations/004_supabase_auth_sync_trigger.sql` so new auth users get a row in `public.users`. Ensure `public.users.id` is UUID and matches `auth.users.id`. If `password_hash` is NOT NULL, alter it to allow NULL: `ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;`
7. **Login lockout (failed password attempts):** Run `users-login-lockout.sql` in the SQL Editor. This adds `login_failed_count` and `locked_until` on `public.users`. The server uses `SUPABASE_ANON_KEY` for `POST /api/login` (password sign-in with lockout). Optional env: `LOGIN_LOCKOUT_MAX_ATTEMPTS` (default `5`), `LOGIN_LOCKOUT_MINUTES` (default `60`).

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

For **delivery vs collection** at checkout, run **`supabase-orders-fulfillment-type.sql`** in the SQL Editor to add `fulfillment_type` (`delivery` | `collection`). New installs using `supabase-orders-table.sql` already include this column.

## 5. (Optional) Migrate existing users from `users.json`

From the project root:

```bash
node scripts/migrate-users-to-supabase.js
```

Then restart the server and use the app; new signups will go to Supabase.

## 6. Push notifications (Firebase Cloud Messaging)

For the Android push-notification feature (FCM tokens + per-user channel preferences), run **migration `019_push_tokens_and_preferences.sql`** in the SQL Editor. It creates:

- `public.push_tokens` — one row per device token. `user_id` FK → `public.users` with `ON DELETE CASCADE` (account deletion cleans up devices automatically). Unique index on `token`.
- `public.push_preferences` — per-user master toggle + channel toggles (`orders`, `promotions`, `account`, `general`). Default: all on.

Both tables enable RLS with no policies (server uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS). The application talks to these tables only via the `/api/me/push-tokens` and `/api/me/push-preferences` endpoints, which require a Bearer JWT.

Set `FIREBASE_SERVICE_ACCOUNT_JSON` (or `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`) in `.env` + Vercel env to enable actual sends. Without it, tokens still register and preferences still persist, but `firebase-admin` returns `skipped: true` and no push is delivered. See `.env.example`.

## 7. Basket activity + broadcast log (v2 engagement)

Run after migration 019:

- **`020_basket_activity.sql`** — `public.basket_activity` stores debounced basket snapshots (`user_id` for logged-in, `session_id` for guests). Used by `PUT /api/me/basket-activity`, `PUT /api/basket-activity`, and the abandoned-basket cron.
- **`021_push_broadcast_log.sql`** — `public.push_broadcast_log` records admin promotional broadcasts from `POST /api/admin/push/broadcast`.

Both tables enable RLS with no policies (server-only via service role).

## 8. Row Level Security (RLS)

- Migrations **`011_enable_rls_public_tables.sql`** enable RLS on `public.users`, `public.orders`, and `public.account_claims`.
- **`013_rls_explicit_deny_anon_authenticated.sql`** adds policies so `anon` and `authenticated` (PostgREST) have **no** direct access to those tables. The app uses **`SUPABASE_SERVICE_ROLE_KEY` only on the server** (bypasses RLS for trusted operations).
- Do **not** put the service role key in the browser; the frontend only needs **`SUPABASE_ANON_KEY`** for Supabase Auth (OAuth, magic links, password flows).
- **Leaked password protection (HIBP)** is not a SQL migration; enable it per project:
  - **Dashboard:** **Authentication** → **Providers** → **Email** (or **Password** / strength section) → enable **Leaked password protection** (Pro+ per [Supabase docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
  - **CLI script (repo):** create a [personal access token](https://supabase.com/dashboard/account/tokens), add `SUPABASE_ACCESS_TOKEN` to local `.env` (never commit), then run `npm run supabase:auth-hibp` (PATCHes `password_hibp_enabled` via Management API for both default project refs).
