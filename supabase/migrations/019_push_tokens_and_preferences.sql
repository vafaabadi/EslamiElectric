-- Push notification tokens + per-user channel preferences.
-- Used by the Eslami Electric Android app via Firebase Cloud Messaging (FCM).
-- Run in Supabase SQL Editor (or via `supabase db push` if you use the CLI).

-- 1) Device tokens. One row per (token); unique on token so re-installs/refresh overwrite cleanly.
--    user_id is nullable to allow advance-of-login registration in the future; today we only insert
--    rows when a logged-in user calls POST /api/me/push-tokens.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  token text not null,
  platform text not null default 'android',     -- 'android' | 'ios' | 'web'
  app_version text,                             -- optional: BuildConfig.VERSION_NAME
  locale text,                                  -- 'en' | 'fa' | null
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz                        -- non-null = token rejected by FCM (UNREGISTERED / INVALID)
);

create unique index if not exists push_tokens_token_uniq on public.push_tokens (token);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists push_tokens_active_idx on public.push_tokens (user_id) where disabled_at is null;

alter table public.push_tokens enable row level security;
-- Server-only access (service_role bypasses RLS). No anon/authenticated direct policies.

-- 2) Per-user channel preferences. Stored as jsonb so we can add new channels without migrations.
--    Channels match the Android client: orders | promotions | account | general (+ master).
--    Default = all enabled; absence of a row also means all enabled.
create table if not exists public.push_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  master_enabled boolean not null default true,
  channels jsonb not null default '{
    "orders": true,
    "promotions": true,
    "account": true,
    "general": true
  }'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.push_preferences enable row level security;

create or replace function public.push_preferences_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_preferences_updated_at on public.push_preferences;
create trigger push_preferences_updated_at
  before update on public.push_preferences
  for each row execute function public.push_preferences_set_updated_at();
