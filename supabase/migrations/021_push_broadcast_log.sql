-- Audit log for admin promotional push broadcasts.

create table if not exists public.push_broadcast_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  channel text not null default 'promotions',
  title_en text not null,
  title_fa text not null,
  body_en text not null,
  body_fa text not null,
  recipients_targeted int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists push_broadcast_log_created_at_idx
  on public.push_broadcast_log (created_at desc);

alter table public.push_broadcast_log enable row level security;
-- Server-only access (service_role bypasses RLS).
