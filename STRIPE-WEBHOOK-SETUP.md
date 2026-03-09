# Stripe Webhook Setup (step-by-step)

The app already has the webhook **route** in `server.js` (`POST /api/webhooks/stripe`). You only need to create the endpoint in Stripe and add the signing secret to your env.

---

## Step 1: Create the `orders` table in Supabase (if not done)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Open `supabase-orders-table.sql` in this project, copy its contents, paste into the editor, and run it.

---

## Step 2: Choose your webhook URL

- **Production:** `https://your-domain.com/api/webhooks/stripe`  
  (Replace `your-domain.com` with your real domain.)
- **Local testing:** You don’t need a URL in the Dashboard. Use **Step 5** (Stripe CLI): the CLI forwards events to `localhost` and gives you a **signing secret** to put in `.env`.

---

## Step 3: Add the webhook in Stripe Dashboard (production) or use CLI (local)

**If you’re testing locally:** skip to **Step 5**. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; the CLI will print a **webhook signing secret**—use that in `.env`. You do **not** need to add an endpoint URL in the Dashboard for local testing.

**If you’re setting up production (or want a Dashboard endpoint now):**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Click **Add endpoint**.
3. **Endpoint URL:** `https://your-domain.com/api/webhooks/stripe` (use your real domain).
4. Under **Select events to listen to**, click **Select events** and choose:
   - **checkout.session.completed**
5. Click **Add endpoint**.
6. On the new endpoint’s page, open **Signing secret** and click **Reveal**.
7. Copy the value (starts with `whsec_`). You’ll add it to `.env` in the next step.

---

## Step 4: Add the secret to your `.env`

1. In your project root, open `.env` (create from `.env.example` if needed).
2. Add or set:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
   ```
   Use the exact value you copied from the Stripe Dashboard.
3. Save the file and **restart your Node server** so it loads the new variable.

---

## Step 5: Get the URL and secret from Stripe CLI (local testing)

When you run the Stripe CLI listener, it gives you **two things**:

1. A **forwarding URL** (your local server exposed to the internet).
2. A **webhook signing secret** (`whsec_...`) to put in `.env` for local testing.

### 5a. Install and log in

1. Install the CLI: [Stripe CLI](https://stripe.com/docs/stripe-cli) (or `winget install Stripe.StripeCLI` on Windows).
   - **Windows:** If `stripe` is not recognized after install, add the Stripe folder to your user PATH (it’s often under `%LOCALAPPDATA%\Microsoft\WinGet\Packages\...\Stripe.StripeCli_*`). Or open a **new** terminal after installing.
2. In a terminal, run:
   ```bash
   stripe login
   ```
   Complete the browser login if prompted.

### 5b. Start the listener (your app must be running)

1. Start your Node server (e.g. `node server.js` or `npm start`) so it’s listening on port 3000.
2. In **another** terminal, run:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. The CLI will print something like:
   ```text
   Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
   ```
   And often a line like:
   ```text
   Forwarding to http://localhost:3000/api/webhooks/stripe
   ```
   The **URL Stripe uses** is the CLI’s own tunnel (e.g. `https://xxxx-xx-xx-xx-xx.ngrok-free.app`). You don’t type that URL into the Dashboard for local testing—the CLI is already forwarding to your app.

### 5c. Use the CLI secret in `.env`

- Copy the **webhook signing secret** from the CLI output (`whsec_...`).
- Put it in your **`.env`**:
  ```env
  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Restart your Node server so it loads this secret.
- Leave `stripe listen` running while you test.

### 5d. (Optional) Add the endpoint in the Dashboard for local CLI URL

You don’t have to add an endpoint in the Stripe Dashboard for local testing. The CLI forwards events directly to your app and gives you the signing secret. If you still want to see the endpoint in the Dashboard:

- While `stripe listen` is running, the CLI sometimes shows a “Webhook endpoint” or similar; that’s the tunnel URL. You could add that URL in Dashboard → Webhooks, but for local testing it’s easier to **only** use the CLI secret in `.env` and not create a Dashboard endpoint for localhost.

### 5e. Trigger a test event

In a **third** terminal:

```bash
stripe trigger checkout.session.completed
```

Then check your server logs and the Supabase `orders` table for a new row.

---

For **production**, add an endpoint in the Dashboard with your real domain URL and use the **Dashboard** signing secret in your production `.env`.

---

## Summary

| Step | What |
|------|------|
| 1 | Run `supabase-orders-table.sql` in Supabase SQL Editor |
| 2 | Decide webhook URL (production domain or Stripe CLI URL for local) |
| 3 | Stripe Dashboard → Webhooks → Add endpoint → URL + event `checkout.session.completed` → copy Signing secret |
| 4 | Put `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env` and restart the server |
| 5 | (Optional) Use Stripe CLI to test locally |

After this, when a customer completes Stripe Checkout, Stripe calls your `/api/webhooks/stripe` route and your server inserts a row into the Supabase `orders` table.
