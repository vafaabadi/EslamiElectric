# Eslami Electric App

A local web app showcasing electrical lighting products with bilingual support (English/Farsi).

## Features

- Product catalog with categories (Cables, Light Bulbs, Lamps, Sockets, Extension Cables, Fuse, Fuse Box)
- Bilingual support (English and Farsi) with RTL layout
- User account creation (Person or Company)
- Responsive design with Tailwind CSS

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

- **Public Supabase settings** (URL + anon key + site base URL) are **embedded in HTML** on the few pages that need the Supabase browser client. There is **no** `GET /api/config` JSON endpoint (avoids trivial key scraping).

- `GET /api/products` - Get all products (flattened list)
- `GET /api/categories` - Get all categories with nested products
- `POST /api/users` - Create a new user account

## Project Structure

```
cursor-my-web-app/
├── server.js           # Express backend
├── categories.json     # Product categories and items
├── users.example.json  # Sample shape for one-off migration (copy to users.json locally; users.json is gitignored)
├── package.json        # Project dependencies
├── README.md           # This file
└── public/
    ├── index.html      # Homepage with featured products
    ├── products.html   # Products page with category filter
    └── account.html    # User account creation page
```

## Open-source / public repo

- **Never commit** `.env` — only `.env.example` (placeholders) belongs in git.
- **`users.json`** is gitignored; use **`users.example.json`** as a template for `scripts/migrate-users-to-supabase.js`.
- If this repo was ever public with real data in `users.json`, remove the file from **git history** (e.g. [GitHub docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)) and treat any exposed rows as a data incident.

## Cursor: Vercel MCP (optional)

This repo can use [Vercel’s official MCP](https://vercel.com/docs/mcp/vercel-mcp) so the AI can read deployment logs, manage projects, and search Vercel docs.

1. **Config:** `.cursor/mcp.json` includes a `vercel` entry pointing at `https://mcp.vercel.com`.
2. **Authorize:** In Cursor, open **Settings → MCP**, find **Vercel**, and complete **Needs login** / OAuth in the browser.
3. **Alternative install:** From the project folder you can run `npx add-mcp https://mcp.vercel.com` (adds or updates MCP config for detected agents).

If `.cursor/` is gitignored, copy the `vercel` block from [Vercel’s Cursor docs](https://vercel.com/docs/mcp/vercel-mcp#cursor) into your local `.cursor/mcp.json` on another machine.

**Project-specific URL (optional):** `https://mcp.vercel.com/<team-slug>/<project-slug>` for automatic team/project context—see Vercel docs.
