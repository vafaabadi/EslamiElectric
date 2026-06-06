-- Server-side basket snapshots for abandoned-basket push reminders (v2).
-- Logged-in users: keyed by user_id. Guests: keyed by session_id (X-Basket-Session header).
-- Only rows with user_id can receive FCM reminders (guests have no push tokens).

create table if not exists public.basket_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  session_id uuid,
  items_json jsonb not null default '[]'::jsonb,
  item_count int not null default 0,
  updated_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  constraint basket_activity_user_or_session check (
    (user_id is not null and session_id is null)
    or (user_id is null and session_id is not null)
  )
);

create unique index if not exists basket_activity_user_id_uniq
  on public.basket_activity (user_id)
  where user_id is not null;

create unique index if not exists basket_activity_session_id_uniq
  on public.basket_activity (session_id)
  where session_id is not null;

create index if not exists basket_activity_reminder_idx
  on public.basket_activity (updated_at)
  where item_count > 0 and reminder_sent_at is null and user_id is not null;

alter table public.basket_activity enable row level security;
-- Server-only access (service_role bypasses RLS). No anon/authenticated direct policies.
