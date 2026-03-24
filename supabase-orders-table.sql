-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) to create the orders table.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  stripe_session_id text unique not null,
  amount_total integer not null,
  currency text not null default 'usd',
  status text not null default 'paid',
  line_items jsonb not null default '[]',
  customer_email text,
  fulfillment_type text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_stripe_session_id_idx on public.orders(stripe_session_id);

comment on table public.orders is 'Orders created after successful Stripe Checkout (filled by webhook).';
