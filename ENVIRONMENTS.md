# Production vs development environments

This app runs in three common contexts:

| Context | Typical use | Where variables live | Supabase |
|--------|-------------|----------------------|----------|
| **Local** | Day-to-day coding | `.env` (copy from `.env.example`, never commit `.env`) | **Staging** project |
| **Vercel Preview** | Branch/PR deploys, staging, testing | Vercel → **Environment Variables** → **Preview** | **Staging** project (same keys as local) |
| **Vercel Production** | Live site, real users | Vercel → **Environment Variables** → **Production** | **Production** project (different keys) |

The server logs a one-line summary on startup (`[env] deployment=…`) using `VERCEL_ENV` on Vercel and `config/environment.js`.

## 1. Vercel (recommended path)



1. Open [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add each variable from `.env.example`. **Supabase:** use your **staging** project’s `SUPABASE_*` values for **Preview** (and match local `.env`). Use your **production** project’s `SUPABASE_*` values **only** for **Production**. Same Stripe account is fine; keys can still be test mode on both until you go live.
   - **Stripe (Preview + Production):** you can use the **same Stripe test keys** (`sk_test_`, matching `whsec_` from **Test mode** webhooks) on both while you are not taking real payments. Set **`STRIPE_ALLOW_TEST_IN_PRODUCTION=1`** on **Production** so the server does not warn about `sk_test_` on the live deployment.
   - When you move to real charges: switch **Production** to **Stripe live** keys (`sk_live_`), a **Live mode** webhook signing secret, remove `STRIPE_ALLOW_TEST_IN_PRODUCTION`, and keep **Preview** on test keys.
   - **`BASE_URL`:** set your custom domain on **Production**; Preview can rely on `VERCEL_URL` or set explicitly.
3. Optionally add **Development** in Vercel for `vercel dev` — same idea as Preview for local parity.

### Public URL (`BASE_URL` / `NEXT_PUBLIC_BASE_URL`)

- **Preview** deploys get `VERCEL_URL` (e.g. `*.vercel.app`). The server falls back to `https://` + that host if you do **not** set `BASE_URL`, so Stripe redirects and emails usually work.
- **Production** with a **custom domain** should set `BASE_URL` (or `NEXT_PUBLIC_BASE_URL`) to `https://yourdomain.com` so links in emails and Stripe success/cancel URLs use the real domain, not only `*.vercel.app`.

### Stripe webhooks

While using **Stripe test keys everywhere**, stay in [Stripe Dashboard](https://dashboard.stripe.com/webhooks) **Test mode** and add endpoints as needed, for example:

- Local: use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks, or a tunnel URL.
- Preview: `https://your-preview.vercel.app/api/webhooks/stripe`
- Production (custom domain): `https://yourdomain.com/api/webhooks/stripe` — use the **Test mode** signing secret in Vercel **Production** if you use the same `sk_test_` key there.


When you switch Production to **live** Stripe keys, add a **Live mode** webhook for `https://yourdomain.com/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET` to that endpoint’s signing secret for Production only.

### Supabase: two projects (staging + production)

Use **one Supabase organization** and create **two projects**, for example `yourapp-staging` and `yourapp-production`.

| Project | Used for | Keys go in |
|---------|----------|------------|
| **Staging** | Local `.env` + Vercel **Preview** | Same `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` |
| **Production** | Vercel **Production** only | A different set of the same variable names |

Apply **database migrations / SQL** to **both** projects when you change schema (staging first to verify, then production). Auth users and rows do **not** sync between projects.

Use a **different** `JWT_SECRET` for Production than for Preview/local (each environment’s Vercel variables / `.env` should have its own long random secret).

**Staging project (Supabase):** create a project (e.g. `yourapp-staging`), note its **project ref** from the dashboard URL and **Project URL** (`https://YOUR_PROJECT_REF.supabase.co`). Apply migrations from `supabase/migrations/` there first. Copy **Project URL**, **anon**, **service_role**, and **JWT signing secret** from **Project Settings → API** into local `.env` and Vercel **Preview** only.

**Production** stays on your existing Supabase project (separate ref and keys in Vercel **Production**). If that database was set up manually, it does not need to be recreated—just keep using it and ensure schema matches when you add new migrations (apply the same SQL to production when you ship changes).

### Supabase Auth redirect URLs

Configure **each** project separately — **Authentication** → **URL Configuration** → **Redirect URLs**:

**Staging project** (local + Preview):

- `http://localhost:3000/auth-callback.html`
- `https://*.vercel.app/**` (or specific preview URLs)

**Production project:**

- `https://yourdomain.com/auth-callback.html`

Supabase key checks are documented in `ENV-KEYS-CHECK.md`.

## 2. GitHub

- **No secrets are required on GitHub** for “connect repo → Vercel deploys” by itself. Vercel stores build/runtime secrets.
- Add **GitHub Actions secrets** only if you add workflows (tests, migrations) that call APIs — not needed for default Vercel integration.
- A `GITHUB_PERSONAL_ACCESS_TOKEN` in local `.env` is for Cursor MCP / local tools; keep it out of Vercel unless a workflow needs it.

## 3. Optional: `APP_ENV`

If you must override automatic detection:

- `APP_ENV=production` | `preview` | `development`

Normally leave this unset; `VERCEL_ENV` is authoritative on Vercel.

## 4. Sanity checks

- **Production** + Stripe **test** keys (`sk_test_`) → server warns unless **`STRIPE_ALLOW_TEST_IN_PRODUCTION=1`** is set.
- **Preview/local** + Stripe **live** keys → server warns at startup (risk of real charges).
