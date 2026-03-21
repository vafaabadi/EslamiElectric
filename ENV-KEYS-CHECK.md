# Check your .env keys (Supabase)

If sign-up or login fails, verify each key below. **No spaces** before/after the `=` and **no quotes** around values unless the key itself contains spaces.

---

## 1. SUPABASE_URL

- **Where:** Supabase Dashboard → **Project Settings** (gear) → **API** → **Project URL**
- **Looks like:** `https://xxxxxxxxxxxxx.supabase.co`
- **Check:** Must start with `https://` and end with `.supabase.co` (no trailing slash).

---

## 2. SUPABASE_SERVICE_ROLE_KEY

- **Where:** Same page → **Project API keys** → **service_role** (click "Reveal" / copy)
- **Looks like:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...` (long JWT, 200+ chars)
- **Check:** Must start with `eyJ`. This is **not** the anon key. Label says **service_role** (secret).

---

## 3. SUPABASE_ANON_KEY

- **Where:** Same page → **Project API keys** → **anon** / **public**
- **Looks like:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...` (long JWT, different from service_role)
- **Check:** Must start with `eyJ`. Use the key labeled **anon** (public), not service_role.

---

## 4. SUPABASE_JWT_SECRET

- **Where:** Supabase Dashboard → **Project Settings** → **JWT** (or **API** → scroll to **JWT Settings**) → **JWT Secret**  
  Or: **Project settings** → **JWT keys** → **JWT signing keys** → **current key** (the secret, not the public key).
- **Looks like:** A long random string (e.g. 32+ chars), often hex. **Not** a JWT (does not start with `eyJ`).
- **Check:** Used to **verify** Supabase access tokens. If it is wrong, the **email confirmation link** will show "Something went wrong. Invalid or expired token" when the user clicks it. Fix: copy the **JWT Secret** again from Supabase (Project Settings → **API** → scroll to **JWT Settings** → **JWT Secret**; use the secret, not the public key).

---

## Quick test

1. Restart the server after any .env change.
2. In the browser: try **sign-up** with a **new email**.
3. Watch the **Node server terminal**:
   - "Auth admin getUserById error" → service role key or URL wrong, or user not in auth.
   - "Users upsert error" → service role key/URL or DB permissions.
   - No log but frontend says "Invalid or expired token" → **SUPABASE_JWT_SECRET** is wrong.

If sign-up still shows **"Database error saving new user"**, run **migration 007** (drop the trigger) in Supabase SQL Editor so the server can do the sync instead.

---

## Email confirmation redirect (so `public.users` gets a row)

Supabase does not have a separate "Confirm email redirect URL" setting. The app sends the redirect in code when the user signs up.

**In Supabase:** **Authentication** → **URL Configuration** → under **Redirect URLs** add `http://localhost:3000/auth-callback.html` (and your production URL). Save.

**In the app:** On sign-up the frontend sends `emailRedirectTo: baseUrl + '/auth-callback.html'`, so the confirmation email link sends users to **auth-callback.html**, which calls **`/api/auth/token`** and syncs them to **public.users**.

If a user already confirmed and has no row in **public.users**, have them **log in once** with the same email/password; that will create the row.

---

## Login lockout (optional)

1. Run **`supabase/users-login-lockout.sql`** in the SQL Editor (adds `login_failed_count` and `locked_until` on `public.users`).
2. **`SUPABASE_ANON_KEY`** must be set in **server** `.env` (same anon key as the frontend). The server uses it for `POST /api/login` (Supabase password sign-in + lockout).
3. Optional tuning (defaults): **`LOGIN_LOCKOUT_MAX_ATTEMPTS`** (default `5`), **`LOGIN_LOCKOUT_MINUTES`** (default `30`).

**Unlock:** wait until the lock time passes (auto-clear), use **Forgot password** (clears lockout on reset), or in SQL: `UPDATE public.users SET login_failed_count = 0, locked_until = NULL WHERE email = 'user@example.com';`
