# Production vs development environments

This app runs in three common contexts:

| Context | Typical use | Where variables live |
|--------|-------------|----------------------|
| **Local** | Day-to-day coding | `.env` (copy from `.env.example`, never commit `.env`) |
| **Vercel Preview** | Branch/PR deploys, staging, safe testing | Vercel → Project → Settings → **Environment Variables** → **Preview** |
| **Vercel Production** | Real customers, live payments | Same → **Production** |

The server logs a one-line summary on startup (`[env] deployment=…`) using `VERCEL_ENV` on Vercel and `config/environment.js`.

## 1. Vercel (recommended path)

1. Open [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add each variable from `.env.example` **twice** where values should differ:
   - **Production**: live site URL, **Stripe live** keys (`sk_live_` / `whsec_` for production endpoint), production Supabase project (if you split databases), production Resend domain, production Telegram chat IDs, etc.
   - **Preview**: test URL behavior, **Stripe test** keys (`sk_test_`), optional **separate** Supabase project for staging, or the same Supabase as dev if you accept shared test data.
3. Optionally add **Development** in Vercel for `vercel dev` — same idea as Preview for local parity.

### Public URL (`BASE_URL` / `NEXT_PUBLIC_BASE_URL`)

- **Preview** deploys get `VERCEL_URL` (e.g. `*.vercel.app`). The server falls back to `https://` + that host if you do **not** set `BASE_URL`, so Stripe redirects and emails usually work.
- **Production** with a **custom domain** should set `BASE_URL` (or `NEXT_PUBLIC_BASE_URL`) to `https://yourdomain.com` so links in emails and Stripe success/cancel URLs use the real domain, not only `*.vercel.app`.

### Stripe webhooks

Create **two** webhook endpoints in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) (or one test + one live):

- **Test mode**: URL points at your Preview URL or `localhost` via [Stripe CLI](https://stripe.com/docs/stripe-cli) for local dev; use the **signing secret** as `STRIPE_WEBHOOK_SECRET` in Preview/local.
- **Live mode**: URL points at `https://yourdomain.com/api/stripe-webhook` (or your production path); use that signing secret **only** in Vercel **Production**.

### Supabase Auth redirect URLs

In Supabase → **Authentication** → **URL Configuration**, add every URL users hit after auth:

- Local: `http://localhost:3000/auth-callback.html`
- Preview: `https://your-preview.vercel.app/auth-callback.html` (wildcard `https://*.vercel.app/**` is convenient)
- Production: `https://yourdomain.com/auth-callback.html`

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

- **Production** + Stripe **test** keys → server warns at startup.
- **Preview/local** + Stripe **live** keys → server warns at startup.

Use test keys anywhere except the live production deployment you use for real business.
