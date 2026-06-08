# Mobile API contract (customer v1)

Customer-facing HTTP API for the **Eslami Electric** native Android app (v1). Admin routes (`/api/admin/*`) are out of scope.

**Source of truth:** `server.js`, `lib/schemas/api.js`, `lib/schemas/auth.js`, `public/js/basket-page.js`.

---

## Base URL

All paths are relative to the site origin (no `/api` prefix on the host—paths below include `/api`).

| Environment | Typical `API_BASE_URL` | Notes |
|-------------|------------------------|--------|
| Local dev | `http://10.0.2.2:3000` (emulator) or `http://localhost:3000` | Match `PORT` / `BASE_URL` in web `.env` |
| Staging / Preview | Vercel preview URL, e.g. `https://your-app-*.vercel.app` | Same Supabase project as staging; Stripe test keys |
| Production | `https://www.eslamielectric.com` (or `PUBLIC_SITE_URL` / `PUBLIC_BASE_URL`) | See `config/environment.js` — `resolvePublicBaseUrl()` |

Server resolves public URL from (first non-empty): `PUBLIC_SITE_URL`, `PUBLIC_BASE_URL`, `NEXT_PUBLIC_BASE_URL`, `BASE_URL`, then `https://VERCEL_URL`, else `http://localhost:PORT`.

**Content-Type:** `application/json` on POST/PATCH bodies unless noted.

**Basket:** Primary storage is client-side (web: `localStorage` key `basket`; Android: DataStore). **v2:** clients debounce-sync snapshots to `PUT /api/me/basket-activity` (logged-in) or `PUT /api/basket-activity` (guests, `X-Basket-Session` UUID) for abandoned-basket push reminders. Logged-in users editing a **pending order** can load line items via `GET /api/orders/:orderId/basket-draft`.

**Out of scope for mobile v1:** `POST /api/auth/telegram`, Telegram widget login, admin catalog/orders APIs.

---

## Authentication

Protected routes require:

```http
Authorization: Bearer <app_jwt>
```

The app JWT is issued by `POST /api/login`, `POST /api/users`, or `POST /api/auth/token`. Payload: `{ userId }`, signed with server `JWT_SECRET`, **7-day** expiry (`server.js`).

### Common auth errors

| HTTP | Body | When |
|------|------|------|
| **401** | `{ "error": "Not authenticated" }` | Missing/invalid Bearer on protected routes |
| **401** | `{ "error": "Session expired. Please log in again.", "code": "SESSION_EXPIRED" }` | Expired/invalid JWT on `POST /api/create-checkout-session` when `Authorization` is sent |
| **401** | `{ "error": "Invalid email or password" }` | Failed login |
| **401** | `{ "error": "Invalid or expired token" }` | Bad Supabase `accessToken` on `/api/auth/token` |
| **403** | `{ "error": "Account is no longer active", "code": "ACCOUNT_INACTIVE" }` | `users.account_status` ≠ `active` |
| **403** | `{ "error": "…", "code": "PROFILE_INCOMPLETE", "missing": ["firstName", …] }` | Logged-in checkout/resume-checkout when profile incomplete |
| **423** | `{ "error": "…", "lockedUntil": "<iso>" }` | Login lockout after failed attempts |

`PROFILE_INCOMPLETE` `missing` values (camelCase): `firstName`, `surname`, `mobile`, `email`, `contactEmail`, `companyName`, `companyContactNumber` — see `computeMissingCheckoutProfileFields` in `server.js`.

Other errors usually return `{ "error": "<message>" }` (optional `code`). Validation failures: **400** `{ "error": "Invalid request" }` or a specific message.

---

## Catalog (public)

### `GET /api/categories`

Returns nested categories with products (non-deleted catalog only).

**Response:** `200` — JSON **array** of category objects:

```json
[
  {
    "id": "lighting",
    "name": "Lighting",
    "name_fa": "روشنایی",
    "products": [
      {
        "id": "product-slug",
        "name": "LED Panel",
        "name_fa": "",
        "price": 12.5,
        "image_url": "https://…",
        "description": "",
        "description_fa": "",
        "image_alt_en": "",
        "image_alt_fa": ""
      }
    ]
  }
]
```

`extra_json` columns from DB are merged into each product object (keys vary).

**Errors:** `500` `{ "error": "Failed to load categories" }`

---

### `GET /api/products`

Flattened product list for grids/search.

**Response:** `200` — JSON **array**. Each item is the product fields above plus:

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | English category name |
| `category_fa` | string | Persian category name |
| `categoryId` | string | Category id |

**Errors:** `500` `{ "error": "Failed to load products" }`

---

### `GET /api/locale-hint` (optional)

IP/geo hint for default language and currency display.

**Response:** `200`

```json
{
  "country": "IR",
  "inIran": true,
  "defaultLang": "fa",
  "defaultCurrency": "toman",
  "usdToToman": 42000
}
```

`Cache-Control: private, no-store`. Fallback on error: `country: "US"`, `defaultLang: "en"`, `defaultCurrency: "usd"`.

---

## Auth & account

### `POST /api/login`

**Body** (`loginBodySchema`):

```json
{ "email": "user@example.com", "password": "secret" }
```

**Response:** `200`

```json
{
  "ok": true,
  "token": "<jwt>",
  "user": {
    "id": "<uuid>",
    "email": "user@example.com",
    "firstName": "…",
    "surname": "…"
  }
}
```

**Errors:** `400` validation; `401` invalid credentials; `423` lockout; `500` login failed.

---

### `POST /api/users` (signup)

**Body** (`signupUsersBodySchema` — all required unless noted):

| Field | Type | Notes |
|-------|------|--------|
| `type` | `"person"` \| `"company"` | |
| `firstName`, `surname` | string | 2–50 letters (EN/FA) |
| `dob` | string \| null | optional, `YYYY-MM-DD` |
| `mobile` | string | validated format |
| `landline` | string \| null | optional |
| `email` | string | normalized to lowercase |
| `address` | string | 10–200 chars |
| `bankDetails` | string \| null | optional |
| `companyName`, `companyNumber` | string \| null | required when `type` is `company` |
| `companyContactNumber`, `companyPrincipalContact` | string \| null | optional |
| `password` | string | min 8 chars |

**Response:** `201`

```json
{ "ok": true, "userId": "<uuid>", "token": "<jwt>" }
```

**Errors:** `400` (duplicate email, validation); `500`.

---

### `POST /api/auth/token`

Exchange a **Supabase Auth** session `access_token` (e.g. after email confirmation / OAuth in a WebView or browser) for the app JWT. Upserts `public.users` and may attach guest orders by email.

**Body:**

```json
{ "accessToken": "<supabase_jwt>" }
```

**Response:** `200`

```json
{
  "ok": true,
  "token": "<app_jwt>",
  "user": {
    "id": "<uuid>",
    "email": "…",
    "firstName": "…",
    "surname": "…"
  }
}
```

**Errors:** `401` invalid/expired Supabase token; `500` failed to issue token.

Mobile v1 typically uses email/password via `/api/login`; keep this endpoint if you add Supabase-hosted flows later.

---

### `POST /api/forgot-password`

**Body:** `{ "email": "user@example.com" }`

**Response:** `200` (always generic if email might exist)

```json
{
  "ok": true,
  "message": "If that email is registered, you will receive a reset link. Check your inbox and spam folder."
}
```

Reset links point to the **web** app (`/reset-password.html?token=…` or Supabase recovery). Mobile should open the link in a browser or deep-link handler.

**Errors:** `400`, `503` (email not configured), `500`.

---

### `POST /api/reset-password`

App-managed token from email (not Supabase recovery page).

**Body:**

```json
{
  "token": "<hex from email>",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}
```

`confirmPassword` optional in schema but must match when provided.

**Response:** `200`

```json
{ "ok": true, "message": "Password has been reset. You can now log in." }
```

**Errors:** `400` invalid/expired token or password rules.

---

### `GET /api/claim-account/:token`

Validate a guest **claim account** link token (from the order confirmation email). Used before showing the set-password form.

**Auth:** None.

**Response:** `200`

```json
{ "valid": true, "email": "us***@example.com" }
```

`email` is masked for display. Mobile may deep-link `eslamielectric://claim-account?token=…` or accept a pasted token.

**Errors:** `400` link already used or expired; `404` invalid token; `500`.

---

### `POST /api/claim-account`

Create a password-backed account from a guest claim token and attach guest orders with the same email.

**Body** (`claimAccountBodySchema`):

```json
{
  "token": "<hex from email or deep link>",
  "password": "newpass123",
  "confirmPassword": "newpass123"
}
```

`confirmPassword` optional in schema but must match when provided. Password min 8 characters.

**Response:** `200`

```json
{
  "ok": true,
  "token": "<app_jwt>",
  "message": "Account claimed. You can now view your orders."
}
```

Store the returned JWT like `POST /api/login`. Guest orders with matching `customer_email` are linked to the new user.

**Errors:** `400` invalid/expired token, password rules, or email already registered; `429` rate limit; `500`.

---

### `GET /api/me`

**Auth:** Bearer required.

**Response:** `200` — profile (`profileRowToJson`) plus checkout flags:

```json
{
  "id": "<uuid>",
  "type": "person",
  "firstName": "…",
  "surname": "…",
  "dob": "1990-01-01",
  "mobile": "…",
  "landline": null,
  "email": "…",
  "contactEmail": null,
  "canLinkEmail": false,
  "hasPassword": true,
  "address": "…",
  "bankDetails": null,
  "companyName": null,
  "companyNumber": null,
  "companyContactNumber": null,
  "companyPrincipalContact": null,
  "createdAt": "…",
  "checkoutProfileComplete": true,
  "checkoutProfileMissing": [],
  "checkoutProfileRequired": true
}
```

**Errors:** `401`, `404`, `500`.

---

### `POST /api/me/push-tokens` (FCM)

Register or upsert a Firebase Cloud Messaging registration token for the current user. Idempotent on `token`. Call after login, after signup, on `onNewToken`, and whenever the client app starts.

**Auth:** Bearer required.

**Body** (`pushTokenPostBodySchema`):

| Field | Type | Notes |
|-------|------|-------|
| `token` | string | FCM registration token (20–4096 chars) |
| `platform` | `"android"` \| `"ios"` \| `"web"` | optional; default `"android"` |
| `appVersion` | string | optional; from `BuildConfig.VERSION_NAME` |
| `locale` | `"en"` \| `"fa"` | optional; used to localise outgoing pushes |

**Response:** `200`

```json
{ "ok": true, "pushConfigured": true }
```

`pushConfigured` is `false` when the server has no Firebase service account configured. Tokens still persist; sends are skipped server-side until the secret is added.

**Errors:** `400` validation; `401`; `503` `push_tokens` table missing — run migration `019_push_tokens_and_preferences.sql`; `500`.

---

### `DELETE /api/me/push-tokens`

Remove a token (logout). Only deletes rows owned by the current user.

**Auth:** Bearer required.

**Body:** `{ "token": "<fcm token>" }`

**Response:** `200` `{ "ok": true }`

---

### `GET /api/me/push-preferences`

Returns the user's push channel preferences. If no row exists yet, returns the defaults (everything enabled).

**Auth:** Bearer required.

**Response:** `200`

```json
{
  "master_enabled": true,
  "channels": { "orders": true, "promotions": true, "account": true, "general": true },
  "updated_at": null
}
```

---

### `PATCH /api/me/push-preferences`

Update master toggle or per-channel toggles. Channels are merged (omit a key to leave it unchanged).

**Auth:** Bearer required.

**Body** (at least one field required):

```json
{
  "master_enabled": true,
  "channels": { "promotions": false }
}
```

**Response:** `200` — same shape as GET.

**Errors:** `400` validation; `401`; `500`.

---

### `PUT /api/me/basket-activity` (v2)

Upsert a basket snapshot for the current user (debounced on the client). Used by the abandoned-basket cron after 24h inactivity.

**Auth:** Bearer required.

**Body** (`basketActivityPutBodySchema`):

```json
{
  "items": [
    {
      "id": "product-id",
      "categoryId": "lighting",
      "name": "LED Panel",
      "name_fa": "",
      "image_url": "https://…",
      "price": 12.5,
      "quantity": 2
    }
  ]
}
```

**Response:** `200` `{ "ok": true, "itemCount": 2 }`

**Errors:** `400` validation; `401`; `503` `basket_activity` table missing — run migration `020_basket_activity.sql`; `500`.

---

### `PUT /api/basket-activity` (v2, guest)

Upsert a guest basket snapshot. Guests do not receive push reminders (no `user_id` / FCM token), but snapshots are stored for analytics and future flows.

**Auth:** none — requires header `X-Basket-Session: <uuid>` (stable per install; Android DataStore).

**Body / response:** same as `PUT /api/me/basket-activity`.

**Errors:** `400` missing/invalid session header; `503` migration missing; `500`.

---

### `PATCH /api/me`

**Auth:** Bearer required.

**Body** (at least one field; `profilePatchBodySchema`):

`firstName`, `surname`, `dob`, `mobile`, `landline`, `contactEmail`, `address`, `bankDetails`, `companyName`, `companyNumber`, `companyContactNumber`, `companyPrincipalContact` — same semantics as signup; company fields only if `type === "company"`.

**Response:** `200` — updated profile object (same shape as GET without checkout extras recomputed on every field).

**Errors:** `400`, `401`, `404`, `500`.

---

## Checkout (Stripe)

### Client basket → `lineItems`

Web basket item shape (`localStorage` key `basket`):

```json
{
  "id": "product-id",
  "categoryId": "category-id",
  "name": "English name",
  "name_fa": "Persian name",
  "image_url": "https://…",
  "price": 12.5,
  "quantity": 2
}
```

Checkout maps to API (`basket-page.js`):

```json
{
  "name": "<locale display name>",
  "price": 12.5,
  "quantity": 2,
  "productId": "<id>"
}
```

`price` is **USD dollars** (not cents). Server converts to Stripe `unit_amount` cents: `Math.round(Number(item.price) * 100)`.

---

### `POST /api/create-checkout-session`

**Auth:** Optional Bearer (logged-in). Guest checkout supported without token.

**Body** (`createCheckoutSessionBodySchema`):

| Field | Type | Notes |
|-------|------|--------|
| `lineItems` | array | Preferred for basket checkout (max 200) |
| `priceId` | string | Stripe Price id (single item; alternative to lineItems) |
| `amount` | number \| string | Total cents (alternative) |
| `guestEmail`, `guestName`, `guestPhone` | string | Required for guest when `lineItems` present |
| `shippingAddress` | object | Delivery: `line1`, `city`, `postal_code`, `line2`, `state`, `country`, `additional_info` |
| `locale` | `"en"` \| `"fa"` | Affects Stripe success/cancel URLs |
| `fulfillmentType` | `"collection"` \| `"delivery"` | Default effective: `delivery` if omitted |
| `pendingOrderId` | string | UUID — logged-in only; update pending order |

Each `lineItems[]` entry: `name`, `price`, `quantity`, optional `id` / `productId` (passthrough allowed).

**Response:** `200`

```json
{
  "url": "https://checkout.stripe.com/c/pay/…",
  "sessionId": "cs_…"
}
```

Open `url` in **Chrome Custom Tab** (or external browser). Success redirect is on the **web** host: `/{locale}/checkout-success?session_id={CHECKOUT_SESSION_ID}`.

**Errors:** `400` validation; `401` + `SESSION_EXPIRED`; `403` + `PROFILE_INCOMPLETE`; `503` Stripe not configured; `500`.

Logged-in **delivery** requires `shippingAddress.line1` (≥ 5 chars). Guest requires valid `guestEmail` + `guestName`; delivery needs shipping address.

---

### `POST /api/create-crypto-payment`

**Auth:** Optional Bearer (logged-in). Guest checkout supported without token.

**Body:** Same schema as `POST /api/create-checkout-session` (`createCheckoutSessionBodySchema`), plus optional `payCurrency` (NOWPayments ticker, e.g. `usdc`, `usdcsol`, `usdtsol`, `usdcbsc`, `usdtbsc`). Must be in `NOWPAYMENTS_ALLOWED_PAY_CURRENCIES`. Sui USDC/USDT is not supported by NOWPayments.

**Response:** `200`

```json
{
  "paymentId": "5077125051",
  "payAddress": "0xd1cDE08A07cD25adEbEd35c3867a59228C09B606",
  "payAmount": "24.98",
  "payCurrency": "usdcbase",
  "networkLabel": "Base",
  "network": "base",
  "invoiceUrl": "https://nowpayments.io/payment/?iid=…",
  "gatewayUrl": "https://nowpayments.io/payment/?iid=…",
  "orderId": "<uuid>",
  "orderNumber": "ORD-…",
  "guestAccessToken": "<hex>",
  "status": "waiting",
  "isFinal": false,
  "pollInMs": 3000,
  "amountTotal": 2500,
  "currency": "usd",
  "successUrl": "https://…/en/checkout-success?crypto_payment_id=5077125051",
  "payment_method": "nowpayments"
}
```

Show `networkLabel` prominently (wrong-chain sends lose funds). Show `payAddress` + `payAmount` on web; open `invoiceUrl` / `gatewayUrl` in **Chrome Custom Tab** when present. Poll **`GET /api/crypto-payments/:paymentId/status`** until `status` is `finished` (or use confirm endpoint on resume). `guestAccessToken` only for guest checkout.

**Errors:** Same as Stripe checkout (`400`, `401`, `403`, `429`); `400` + `INVALID_PAY_CURRENCY` if ticker not allowed; `503` if NOWPayments env not configured; `502` upstream NOWPayments errors.

---

### `GET /api/crypto-pay-currencies`

**Auth:** None.

**Response:** `200`

```json
{
  "defaultPayCurrency": "usdc",
  "currencies": [
    { "payCurrency": "usdc", "networkLabel": "Ethereum (ERC-20)", "network": "eth", "label": "Ethereum (ERC-20) (USDC)" },
    { "payCurrency": "usdcsol", "networkLabel": "Solana", "network": "sol", "label": "Solana (USDC)" },
    { "payCurrency": "usdtsol", "networkLabel": "Solana", "network": "sol", "label": "Solana (USDT)" },
    { "payCurrency": "usdcbsc", "networkLabel": "BNB Smart Chain", "network": "bsc", "label": "BNB Smart Chain (USDC)" },
    { "payCurrency": "usdtbsc", "networkLabel": "BNB Smart Chain", "network": "bsc", "label": "BNB Smart Chain (USDT)" }
  ]
}
```

Use for web/Android network selector before `POST /api/create-crypto-payment`.

---

### `GET /api/crypto-payments/:id/status`

**Auth:** None (payment id is unguessable). Rate-limited.

**Response:** `200`

```json
{
  "ok": true,
  "status": "confirming",
  "isFinal": false,
  "pollInMs": 3000,
  "payAddress": "0xd1cDE08A07cD25adEbEd35c3867a59228C09B606",
  "payAmount": "24.98",
  "payCurrency": "usdcbase",
  "networkLabel": "Base",
  "network": "base",
  "invoiceUrl": null,
  "txHash": null,
  "orderStatus": "pending",
  "updated": false,
  "terminalFailure": false
}
```

When `status === "finished"`, server transitions matching order `pending` → `paid` (idempotent) and sends receipt/Telegram/push.

### `POST /api/webhooks/nowpayments`

**Auth:** `x-nowpayments-sig` HMAC-SHA512 (IPN secret). Called by NOWPayments on status changes.

---

### `GET /api/orders/by-crypto-payment/:paymentId`

**Auth:** None.

**Response:** `200` — same order shape as `by-session`, plus `payment_method`, `crypto_payment_id`.

---

### `POST /api/orders/confirm-by-crypto/:paymentId`

**Auth:** None. Idempotent fallback when polling/webhook lag (Android resume, success page).

**Body:** empty JSON `{}` or no body.

**Response:** `200` — `{ "updated": true, "status": "paid", "paymentStatus": "finished" }`

**Errors:** `400` if NOWPayments status not `finished`; `404` order not found.

---

## Orders

### `GET /api/orders`

**Auth:** Bearer required.

**Response:** `200` — array of orders (newest first):

```json
[
  {
    "id": "<uuid>",
    "order_number": "ORD-ABC123",
    "stripe_session_id": "cs_…",
    "amount_total": 2500,
    "currency": "usd",
    "status": "pending",
    "line_items": [
      {
        "name": "Item",
        "quantity": 1,
        "unit_amount": 1250,
        "amount_total": 1250,
        "product_id": "optional"
      }
    ],
    "tracking_number": null,
    "created_at": "…",
    "fulfillment_type": "delivery",
    "shipping_address": { "line1": "…", "city": "…", "postal_code": "…" }
  }
]
```

`amount_total` / `unit_amount` are **cents**. `status`: `pending`, `paid`, `cancelled`, etc.

Side effect: guest orders with matching `customer_email` may be linked to the user.

---

### `GET /api/orders/:orderId/basket-draft`

**Auth:** Bearer. Pending order only.

**Response:** `200`

```json
{
  "orderId": "<uuid>",
  "orderNumber": "ORD-…",
  "basket": [
    {
      "id": "product-id",
      "name": "Item",
      "name_fa": "",
      "price": 12.5,
      "quantity": 1,
      "image_url": "",
      "categoryId": null
    }
  ],
  "fulfillmentType": "collection",
  "shippingAddress": null
}
```

`price` in basket draft is **dollars** (converted from stored cents).

---

### `POST /api/orders/:orderId/resume-checkout`

**Auth:** Bearer.

**Body:** `{ "locale": "en" }` optional (empty body allowed).

**Response:** `200`

```json
{ "url": "https://checkout.stripe.com/…", "recreated": true }
```

Guest open session may return `url` without `recreated`. Open Custom Tab with `url`.

**Errors:** `403` `PROFILE_INCOMPLETE`; `404`; `400` / `409` not pending or already paid.

---

### `POST /api/orders/:orderId/cancel`

**Auth:** Bearer. Pending orders only.

**Response:** `200` `{ "ok": true }`

---

### Guest order access (no Bearer)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/orders/guest/:token` | Order detail by `guest_access_token` |
| `GET` | `/api/orders/guest-lookup?email=…&order_id=…` | Lookup by email + UUID or `order_number` |
| `POST` | `/api/orders/guest-cancel` | Body: `{ "token": "…", "locale": "en" }` |
| `POST` | `/api/orders/guest-resume-checkout` | Body: `{ "token": "…", "locale": "en" }` → `{ "url", "recreated"? }` |

Guest order JSON includes: `id`, `order_number`, `amount_total`, `currency`, `status`, `line_items`, `customer_email`, `customer_name`, `shipping_address`, `tracking_number`, `created_at`, `fulfillment_type`.

`guest-lookup` does **not** return `guest_access_token` (by design). Guest **cancel** / **resume-checkout** require the token from the confirmation email link (`GET /api/orders/guest/:token` or paste token in the app).

---

### Post-payment (web success page; optional on mobile)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/orders/by-session/:sessionId` | `sessionId` must start with `cs_` |
| `POST` | `/api/orders/confirm-by-session/:sessionId` | Idempotent mark paid if webhook delayed; body `{}` |

**confirm-by-session** `200`: `{ "updated": true, "status": "paid" }` or `{ "updated": false, "status": "paid" }`.

---

## Rate limiting

Several routes use express rate limiters (`lib/rate-limits.js`). Expect **429** with `{ "error": "…" }` when exceeded (login, checkout, guest lookup, etc.).

---

## Related repository

- **Web app:** `cursor-my-web-app` (this repo) — Express + Supabase + Stripe.
- **Android app:** `eslami-electric-android` — consumes this contract; local basket mirrors web `basket` key structure.
