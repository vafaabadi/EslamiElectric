# AI Chatbot Setup — Eslami Electric

Floating AI assistant on public shop pages (home, products, basket, orders, etc.). Guests and logged-in users can ask about products, checkout, delivery/collection, orders, and account help.

## Architecture

| Layer | Files |
|-------|--------|
| Backend | `lib/ai-chat.js`, `lib/routes/chat-routes.js` |
| API | `GET /api/chat/status`, `POST /api/chat` (streaming plain text) |
| Frontend | `public/js/chatbot.js`, `public/css/chatbot.css` |
| Rate limit | `chatLimiter` in `lib/rate-limits.js` (40 req / 15 min per IP) |

Chat history is stored in the browser (`sessionStorage`) for v1 — the server is stateless.

## Required environment variables

### `GOOGLE_GENERATIVE_AI_API_KEY` (recommended — free tier)

Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey). No credit card required for the free tier.

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_key
```

On Vercel: Project → Settings → Environment Variables → add for **Production** and **Preview**.

**Free tier limits** (subject to change — see [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)):

- Rate limits apply per model (requests per minute/day and tokens per minute).
- Free-tier input and output tokens are free of charge for supported models.
- Content may be used to improve Google products on the free tier.
- If you see `429` / quota errors, check your limits in AI Studio or upgrade to a paid tier.

**Alias:** `GEMINI_API_KEY` is also accepted if `GOOGLE_GENERATIVE_AI_API_KEY` is not set.

### `AI_CHAT_MODEL` (optional)

Model ID passed to the active provider. Defaults depend on which key is configured:

| Provider | Default model |
|----------|----------------|
| Google (direct) | `gemini-2.5-flash-lite` |
| Vercel AI Gateway | `openai/gpt-4o-mini` |

Examples:

```bash
AI_CHAT_MODEL=gemini-2.5-flash-lite
# AI_CHAT_MODEL=gemini-2.5-flash
```

Other Google models available on the free tier may include `gemini-2.5-flash`, `gemini-2.0-flash-lite`, etc. — check [Google AI Studio](https://aistudio.google.com/) for current model IDs.

### `AI_GATEWAY_API_KEY` (optional fallback)

If **no** Google key is set, chat falls back to [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) when this key is present (backward compatible).

```bash
AI_GATEWAY_API_KEY=your_gateway_key
```

List gateway models:

```bash
curl https://ai-gateway.vercel.sh/v1/models
```

Gateway examples (paid after Vercel’s $5/month credits; list models with `curl https://ai-gateway.vercel.sh/v1/models`):

```bash
AI_CHAT_MODEL=openai/gpt-4o-mini
# AI_CHAT_MODEL=google/gemini-2.5-flash-lite   # cheaper Gemini via gateway
# AI_CHAT_MODEL=google/gemini-2.5-flash
# AI_CHAT_MODEL=anthropic/claude-sonnet-4.6
```

**Priority:** Google direct (`GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY`) → AI Gateway (`AI_GATEWAY_API_KEY`). You do not need both; **Google direct is the free path** for a low-traffic shop.

| Path | Cost (typical) | Best for |
|------|----------------|----------|
| Google direct + Flash / Flash-Lite | **Free** within AI Studio quotas | Production chatbot at shop traffic |
| Vercel AI Gateway + any model | **$5/mo credits**, then pay-as-you-go (no markup) | One key, many providers, no Google account |
| Gateway + `google/gemini-*` | Same as gateway (not Google’s free tier) | Staying on gateway but switching to Gemini |

## Local development

1. Copy `.env.example` → `.env` and set `GOOGLE_GENERATIVE_AI_API_KEY` (get key at https://aistudio.google.com/apikey).
2. Start the server:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000` — amber chat button bottom-right (WhatsApp stays above it).
4. Check status:

   ```bash
   curl http://localhost:3000/api/chat/status
   ```

   Expect `{"enabled":true,"provider":"google","model":"gemini-2.5-flash-lite"}` when configured.

5. Test a message (streaming):

   ```bash
   curl -N -X POST http://localhost:3000/api/chat ^
     -H "Content-Type: application/json" ^
     -d "{\"messages\":[{\"role\":\"user\",\"content\":\"What payment methods do you accept?\"}],\"locale\":\"en\"}"
   ```

## Vercel deployment

1. Add `GOOGLE_GENERATIVE_AI_API_KEY` to Vercel env (Production + Preview).
2. Optionally set `AI_CHAT_MODEL`.
3. Deploy — no extra build step; chat routes run in `server.js` like other API routes.
4. Verify: `https://your-domain.com/api/chat/status`

Until the Google key is set on Vercel, `/api/chat` returns **503** and the widget shows that the assistant is unavailable.

## Frontend behaviour

- **Locale**: reads `localStorage.lang` or `/en/` / `/fa/` path; UI and system prompt follow EN/FA.
- **Auth**: sends `Authorization: Bearer <token>` when logged in so the assistant can reference My Orders.
- **Position**: chat toggle at `bottom: 1.25rem`; WhatsApp FAB at `bottom: 5rem` — no overlap.
- **Accessibility**: dialog role, `aria-expanded`, Escape to close, Enter to send.

## Pages with the widget

Included on public shop pages (same set as WhatsApp FAB): home, products, basket, orders, profile, login, account, checkout success, etc. Not on admin pages.

## Tests

```bash
npm test
```

Includes `test/ai-chat.test.js` for prompt/catalog helpers and provider config.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `503` / “not configured” | Set `GOOGLE_GENERATIVE_AI_API_KEY` on Vercel (or `AI_GATEWAY_API_KEY` as fallback) and redeploy |
| `429` (Google) | Free-tier rate limit — wait or check quotas in AI Studio |
| `429` (Gateway) | Rate limit — wait 15 minutes or reduce traffic |
| Empty stream / generic error | Often quota on `gemini-2.0-flash` (free tier limit 0). Default is now `gemini-2.5-flash-lite`. Check Vercel logs for `RetryError` / `429`. |
| Wrong key type | Use a **Google AI Studio** key from https://aistudio.google.com/apikey. Keys often start with `AIzaSy`; some newer keys use other prefixes but must be from AI Studio, not Vertex. |
| Widget missing | Ensure page includes `<script defer src="/js/chatbot.js"></script>` |

## Security notes

- Do not commit `.env` or API keys.
- Assistant system prompt forbids asking for passwords, card numbers, or seed phrases.
- Catalog snippet is a capped sample (48 products), not live stock.
