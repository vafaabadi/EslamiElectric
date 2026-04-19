#!/usr/bin/env node
/**
 * Enables Have I Been Pwned (HIBP) leaked-password checks on one or more Supabase projects
 * via the Management API: PATCH /v1/projects/{ref}/config/auth { "password_hibp_enabled": true }
 * asdfasfasdasdasfasfasfasfasfasfasf!!!!!!!!!!!!!!!!!!!!!!!
 * Requires a personal access token (not the anon or service_role DB keys):
 *   https://supabase.com/dashboard/account/tokens
 * Scopes: needs permission to update project auth config (auth_config_write / project admin).
 *
 * Pro plan: Supabase documents leaked-password protection as Pro+; the API may reject on Free tier.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/enable-supabase-leaked-password-protection.mjs
 * Or add SUPABASE_ACCESS_TOKEN to .env (local only; never commit).
 *
 * Required (comma-separated Supabase project refs):
 *   SUPABASE_HIBP_PROJECT_REFS=ref1,ref2
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env'), override: false });

const TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_MANAGEMENT_TOKEN ||
  '';
const REFS = (process.env.SUPABASE_HIBP_PROJECT_REFS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const API = 'https://api.supabase.com/v1';

async function patchAuthConfig(ref) {
  const url = `${API}/projects/${ref}/config/auth`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password_hibp_enabled: true })
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.message || j.msg || JSON.stringify(j);
    } catch (_) {
      /* keep text */
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  try {
    const j = JSON.parse(text);
    const hibp = j.password_hibp_enabled;
    console.log(`[${ref}] OK — password_hibp_enabled=${hibp}`);
  } catch (_) {
    console.log(`[${ref}] OK`);
  }
}

async function main() {
  if (!TOKEN) {
    console.error(
      'Missing SUPABASE_ACCESS_TOKEN.\n' +
        'Create a personal access token: https://supabase.com/dashboard/account/tokens\n' +
        'Then run:\n' +
        '  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/enable-supabase-leaked-password-protection.mjs'
    );
    process.exit(1);
  }

  if (REFS.length === 0) {
    console.error(
      'Set SUPABASE_HIBP_PROJECT_REFS in .env to a comma-separated list of Supabase project refs (from Project Settings → General).'
    );
    process.exit(1);
  }

  let failed = false;
  for (const ref of REFS) {
    try {
      await patchAuthConfig(ref);
    } catch (e) {
      failed = true;
      console.error(`[${ref}] FAILED:`, e.message || e);
    }
  }
  if (failed) {
    console.error(
      '\nIf you see 403/402 or "Pro", leaked-password protection may require a paid plan. You can still enable it in Dashboard: Project → Authentication → Providers → Email → Password strength / Leaked password protection.'
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
