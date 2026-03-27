-- Add a short, human-friendly order number for display and customer reference.
-- Run in Supabase SQL Editor.

alter table public.orders
  add column if not exists order_number text unique;

comment on column public.orders.order_number is 'Short display order number (e.g. ORD-A3X9K2) for emails and customer reference';

create index if not exists orders_order_number_idx on public.orders(order_number) where order_number is not null;

-- Optional: backfill existing rows with a generated value (run once)
-- update public.orders set order_number = 'ORD-' || upper(substring(md5(id::text) from 1 for 6)) where order_number is null;
