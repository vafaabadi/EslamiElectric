-- WalletConnect Pay: crypto checkout alongside Stripe.
-- Run in Supabase SQL Editor or via supabase db push.

-- Stripe session is optional when paying with WalletConnect.
alter table public.orders alter column stripe_session_id drop not null;

alter table public.orders add column if not exists payment_method text not null default 'stripe';
alter table public.orders add column if not exists walletconnect_payment_id text;
alter table public.orders add column if not exists walletconnect_payment_url text;
alter table public.orders add column if not exists walletconnect_status text;
alter table public.orders add column if not exists walletconnect_tx_hash text;
alter table public.orders add column if not exists walletconnect_token_amount text;
alter table public.orders add column if not exists walletconnect_asset text;

create unique index if not exists orders_walletconnect_payment_id_uidx
  on public.orders (walletconnect_payment_id)
  where walletconnect_payment_id is not null;

create index if not exists orders_payment_method_idx on public.orders (payment_method);

comment on column public.orders.payment_method is 'stripe | walletconnect';
comment on column public.orders.walletconnect_payment_id is 'WalletConnect Pay payment id (pay_…)';
comment on column public.orders.walletconnect_payment_url is 'WCP gatewayUrl shown as QR / deep link';
comment on column public.orders.walletconnect_status is 'Last WCP status: requires_action, processing, succeeded, failed, expired, cancelled';
comment on column public.orders.walletconnect_tx_hash is 'On-chain tx hash when paid via crypto';
comment on column public.orders.walletconnect_token_amount is 'Settled token amount (minor units string)';
comment on column public.orders.walletconnect_asset is 'CAIP-19 asset identifier (e.g. USDC on Base)';

-- Audit / webhook-ready log of crypto payment lifecycle.
create table if not exists public.crypto_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  payment_id text not null unique,
  reference_id text not null,
  status text not null default 'requires_action',
  amount integer not null,
  currency text not null default 'usd',
  asset text,
  tx_hash text,
  payment_url text,
  payment_method text not null default 'walletconnect',
  raw_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crypto_payments_order_id_idx on public.crypto_payments (order_id);
create index if not exists crypto_payments_reference_id_idx on public.crypto_payments (reference_id);
create index if not exists crypto_payments_status_idx on public.crypto_payments (status);

comment on table public.crypto_payments is 'WalletConnect Pay payment attempts linked to orders';

alter table public.crypto_payments enable row level security;

CREATE POLICY "no_direct_api_access"
  ON public.crypto_payments
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
