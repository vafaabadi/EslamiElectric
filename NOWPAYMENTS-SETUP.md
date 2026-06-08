# NOWPayments Setup (step-by-step)

Eslami Electric supports **Pay with card (Stripe)** and **Pay with crypto (NOWPayments)**. This guide covers merchant onboarding, env vars, IPN webhooks, and sandbox testing.

Server routes live in `lib/routes/crypto-checkout-routes.js` and `lib/nowpayments.js`. Fulfillment (receipt email, Telegram, push) reuses the same path as Stripe via `lib/fulfill-paid-order.js`.

---

## Step 1: Database migration

1. Run `supabase/migrations/023_nowpayments.sql` (renames WalletConnect columns to provider-agnostic `crypto_*` fields).
2. Migration `022_walletconnect_payments.sql` must already be applied.

---

## Step 2: NOWPayments merchant onboarding

| Item | URL |
|------|-----|
| Production dashboard | [account.nowpayments.io](https://account.nowpayments.io/) |
| Sandbox dashboard | [account-sandbox.nowpayments.io](https://account-sandbox.nowpayments.io/) |
| API docs | [documenter.getpostman.com/view/7907941/S1a32n38](https://documenter.getpostman.com/view/7907941/S1a32n38) |

1. Sign up at [account-sandbox.nowpayments.io](https://account-sandbox.nowpayments.io/) for integration testing.
2. Add your **outcome wallet** (where settled crypto is sent).
3. Generate an **API key** (Settings → API keys).
4. Generate an **IPN secret** (Settings → Payment / IPN settings).

---

## Step 3: Environment variables

Add to `.env` (local) and Vercel project settings (Preview / Production):

| Variable | Required | Description |
|----------|----------|-------------|
| `NOWPAYMENTS_API_KEY` | Yes | API key (`x-api-key` header) |
| `NOWPAYMENTS_IPN_SECRET` | Yes (prod) | HMAC-SHA512 secret for `x-nowpayments-sig` webhook verification |
| `NOWPAYMENTS_API_BASE` | No | Default: sandbox `https://api-sandbox.nowpayments.io/v1`; production `https://api.nowpayments.io/v1` |
| `NOWPAYMENTS_SANDBOX` | No | `true` (default) or `false` — picks API base when `NOWPAYMENTS_API_BASE` is unset |
| `NOWPAYMENTS_DEFAULT_PAY_CURRENCY` | No | Default crypto ticker when the customer does not choose a network (default: `usdc`) |
| `NOWPAYMENTS_ALLOWED_PAY_CURRENCIES` | No | Comma-separated pay tickers offered in checkout, e.g. `usdc,usdcbase,usdcmatic`. Defaults to the default ticker only. Each must be enabled in your NOWPayments dashboard. |
| `NOWPAYMENTS_PRICE_CURRENCY` | No | Fiat quote currency (default: `usd`, matches Stripe in this shop) |
| `NOWPAYMENTS_SANDBOX_CASE` | No | Sandbox only: `success`, `failed`, `partially_paid` to simulate outcomes |
| `NOWPAYMENTS_USE_INVOICE` | No | `true` to also create a hosted invoice URL (useful for Android Custom Tab) |

**Example `.env` for sandbox:**

```env
NOWPAYMENTS_API_KEY=your_sandbox_api_key
NOWPAYMENTS_IPN_SECRET=your_ipn_secret
NOWPAYMENTS_API_BASE=https://api-sandbox.nowpayments.io/v1
NOWPAYMENTS_SANDBOX=true
NOWPAYMENTS_DEFAULT_PAY_CURRENCY=usdc
NOWPAYMENTS_ALLOWED_PAY_CURRENCIES=usdc,usdcbase,usdcmatic,usdcsol,usdcbsc,usdtsol,usdtbsc
NOWPAYMENTS_PRICE_CURRENCY=usd
NOWPAYMENTS_SANDBOX_CASE=success
```

**Example `.env` for production:**

```env
NOWPAYMENTS_API_KEY=your_live_api_key
NOWPAYMENTS_IPN_SECRET=your_live_ipn_secret
NOWPAYMENTS_API_BASE=https://api.nowpayments.io/v1
NOWPAYMENTS_SANDBOX=false
NOWPAYMENTS_DEFAULT_PAY_CURRENCY=usdc
NOWPAYMENTS_ALLOWED_PAY_CURRENCIES=usdc,usdcbase,usdcmatic,usdcsol,usdcbsc,usdtsol,usdtbsc
```

> **Vercel Production (eslamielectric):** Uses **sandbox** (NOWPAYMENTS_SANDBOX=true, NOWPAYMENTS_SANDBOX_CASE=success, NOWPAYMENTS_ALLOWED_PAY_CURRENCIES=usdc,usdcmatic,usdtsol,usdtbsc). Leave NOWPAYMENTS_API_BASE unset so the default sandbox URL applies. Re-verified 2026-06-07 after prod deploy.

### Multi-network USDC / USDT

NOWPayments uses different **pay_currency** tickers per chain and token (not a separate `network` request field on create). Verify tickers with `GET /v1/currencies` or `/v1/full-currencies` and enable each coin in your NOWPayments dashboard.

| Ticker | Token | Network | Supported by NOWPayments |
|--------|-------|---------|------------------------|
| `usdc` | USDC | Ethereum (ERC-20) | Yes |
| `usdcbase` | USDC | Base | Yes |
| `usdcmatic` | USDC | Polygon | Yes |
| `usdcarb` | USDC | Arbitrum | Merchant-dependent — enable in dashboard |
| `usdcsol` | USDC | Solana | Yes |
| `usdcbsc` | USDC | BNB Smart Chain (BSC) | Yes |
| `usdcopt` | USDC | Optimism | Merchant-dependent — **not in sandbox** `/v1/currencies` |
| `usdtsol` | USDT | Solana | Yes |
| `usdtbsc` | USDT | BNB Smart Chain (BSC) | Yes |
| `usdtmatic` | USDT | Polygon | Merchant-dependent |
| `usdtarb` | USDT | Arbitrum | Merchant-dependent |
| — | USDC / USDT | **Sui** | **No** — not listed in NOWPayments `/v1/currencies` or [supported coins](https://nowpayments.io/supported-coins) as of 2026-06 |

Pass the chosen ticker as `payCurrency` in `POST /api/create-crypto-payment`. The payment response may also include a `network` field; the server maps tickers to human-readable `networkLabel` for the UI.

List enabled options: `GET /api/crypto-pay-currencies` (intersects env allowlist with NOWPayments `GET /v1/currencies` for your API key).

**Recommended Vercel allowlist (sandbox API key, verified 2026-06):**  
`usdc,usdcmatic,usdtsol,usdtbsc` — these are returned by sandbox `GET /v1/currencies`. Tickers such as `usdcbase`, `usdcsol`, `usdcbsc`, `usdcopt`, `usdcarb`, `usdtmatic`, and `usdtarb` are **not** in sandbox and will fail until you switch to the live API and enable them in the NOWPayments dashboard.

---

## Step 4: Checkout flow

1. Customer chooses **Pay with crypto** on basket (web) or Android.
2. Customer selects payment network (USDC/USDT per chain) when multiple are configured (`NOWPAYMENTS_ALLOWED_PAY_CURRENCIES`).
3. Server creates a **pending** order (`payment_method = nowpayments`) and calls `POST /v1/payment` with `pay_currency` set to the selected ticker.
4. Response includes `pay_address`, `pay_amount`, `pay_currency`, `network` / `networkLabel`, and `payment_id`.
5. Web shows network warning + address + QR + amount; polls `GET /api/crypto-payments/:id/status`.
5. NOWPayments sends IPN to `POST /api/webhooks/nowpayments` on status changes.
6. When status is `finished`, server transitions order `pending` → `paid` (idempotent) and sends receipt/Telegram/push.

---

## Step 5: IPN webhook

Configure in NOWPayments dashboard **and** via `ipn_callback_url` on each payment:

```
https://www.eslamielectric.com/api/webhooks/nowpayments
```

**Vercel (configured):** Production IPN URL above. **Production** (`eslamielectric`) currently runs **sandbox mode** (`NOWPAYMENTS_SANDBOX=true`, `NOWPAYMENTS_SANDBOX_CASE=success`, `NOWPAYMENTS_ALLOWED_PAY_CURRENCIES=usdc,usdcmatic,usdtsol,usdtbsc`) because only a sandbox API key from [account-sandbox.nowpayments.io](https://account-sandbox.nowpayments.io/) is configured. **Development** / **Preview** use the same sandbox key. Sensitive vars are omitted from `vercel env pull`; confirm runtime via `GET /api/crypto-pay-currencies` and a test `POST /api/create-crypto-payment`.

**Going live:** Create a separate merchant account at [account.nowpayments.io](https://account.nowpayments.io/), generate a **live** API key + IPN secret, then on Vercel Production set `NOWPAYMENTS_SANDBOX=false`, update `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` to the live values, remove `NOWPAYMENTS_SANDBOX_CASE`, and redeploy.

The server verifies `x-nowpayments-sig` using HMAC-SHA512 of the alphabetically-sorted JSON body and your `NOWPAYMENTS_IPN_SECRET`.

**Local testing:** NOWPayments cannot POST to `localhost` unless it has a public IP. Use a tunnel (ngrok, Cloudflare Tunnel) or rely on status polling / `confirm-by-crypto` for dev.

Whitelist NOWPayments IPs in Cloudflare if you use a firewall (see their IPN docs).

---

## Step 6: Sandbox testing

1. Use sandbox API base and sandbox API key.
2. Set `NOWPAYMENTS_SANDBOX_CASE=success` (default) to auto-complete payments in sandbox.
3. Other sandbox cases: `failed`, `partially_paid`.
4. Poll `GET /api/crypto-payments/:paymentId/status` or call `POST /api/orders/confirm-by-crypto/:paymentId` after payment.

**Web:** Basket → **Pay with crypto** → send to displayed address (sandbox simulates completion with `case=success`).

**Android:** If `NOWPAYMENTS_USE_INVOICE=true`, the app opens the hosted invoice in a Chrome Custom Tab; otherwise it stores `paymentId` and confirms on return.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `503 Crypto checkout is not configured` | Set `NOWPAYMENTS_API_KEY`; restart server |
| `503 NOWPayments IPN is not configured` | Set `NOWPAYMENTS_IPN_SECRET` for webhook route |
| `NOWPayments: invalid API key` on checkout | **Sandbox vs live mismatch.** Keys from [account-sandbox.nowpayments.io](https://account-sandbox.nowpayments.io/) only work when `NOWPAYMENTS_SANDBOX=true` (or `NOWPAYMENTS_API_BASE=https://api-sandbox.nowpayments.io/v1`). Keys from [account.nowpayments.io](https://account.nowpayments.io/) require `NOWPAYMENTS_SANDBOX=false`. `GET /v1/status` and `GET /v1/currencies` may succeed on both hosts even with the wrong key; **`POST /v1/payment` is the reliable test.** Quick check: `curl -H "x-api-key: YOUR_KEY" https://api.nowpayments.io/v1/status` vs `https://api-sandbox.nowpayments.io/v1/status`, then try `POST /v1/payment`. |
| `400 Invalid IPN signature` | IPN secret mismatch; check dashboard vs env |
| `502` on create payment | Invalid pay currency, API key, or amount below minimum — check NOWPayments dashboard logs |
| Order stays pending | Poll status endpoint; verify IPN URL is reachable from NOWPayments |

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Apply `023_nowpayments.sql` |
| 2 | Create NOWPayments sandbox account + API key + IPN secret |
| 3 | Set env vars on local + Vercel |
| 4 | Configure IPN URL in dashboard |
| 5 | Test basket crypto checkout with `NOWPAYMENTS_SANDBOX_CASE=success` |

Currency note: checkout totals are **USD** (same as Stripe). NOWPayments receives `price_currency: usd` and quotes crypto via `pay_currency` (per-network ticker, default `usdc`).
