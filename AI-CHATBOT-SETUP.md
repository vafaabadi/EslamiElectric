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

### `AI_GATEWAY_API_KEY` (required for chat)

Vercel AI Gateway API key. Create one in the [Vercel dashboard](https://vercel.com/docs/ai-gateway) (AI Gateway → API keys).

```bash
AI_GATEWAY_API_KEY=your_gateway_key
```

On Vercel: Project → Settings → Environment Variables → add for Production and Preview.

### `AI_CHAT_MODEL` (optional)

Gateway model string. List models:

```bash
curl https://ai-gateway.vercel.sh/v1/models
```

Default if unset:

```text
openai/gpt-4o-mini
```

Examples:

```bash
AI_CHAT_MODEL=openai/gpt-4o-mini
# AI_CHAT_MODEL=anthropic/claude-sonnet-4
```

## Local development

1. Copy `.env.example` → `.env` and set `AI_GATEWAY_API_KEY`.
2. Start the server:

   ```bash
   npm start
   ```

3. Open `http://localhost:3000` — amber chat button bottom-right (WhatsApp stays above it).
4. Check status:

   ```bash
   curl http://localhost:3000/api/chat/status
   ```

   Expect `{"enabled":true,"model":"openai/gpt-4o-mini"}` when configured.

5. Test a message (streaming):

   ```bash
   curl -N -X POST http://localhost:3000/api/chat ^
     -H "Content-Type: application/json" ^
     -d "{\"messages\":[{\"role\":\"user\",\"content\":\"What payment methods do you accept?\"}],\"locale\":\"en\"}"
   ```

## Vercel deployment

1. Add `AI_GATEWAY_API_KEY` to Vercel env (Production + Preview).
2. Optionally set `AI_CHAT_MODEL`.
3. Deploy — no extra build step; chat routes run in `server.js` like other API routes.
4. Verify: `https://your-domain.com/api/chat/status`

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

Includes `test/ai-chat.test.js` for prompt/catalog helpers.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `503` / “not configured” | Set `AI_GATEWAY_API_KEY` and redeploy |
| `429` | Rate limit — wait 15 minutes or reduce traffic |
| Empty stream | Check Vercel function logs; confirm model ID via gateway models URL |
| Widget missing | Ensure page includes `<script defer src="/js/chatbot.js"></script>` |

## Security notes

- Do not commit `.env` or gateway keys.
- Assistant system prompt forbids asking for passwords, card numbers, or seed phrases.
- Catalog snippet is a capped sample (48 products), not live stock.
