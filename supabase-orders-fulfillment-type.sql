-- Run once in Supabase SQL Editor if your `orders` table exists without this column.
alter table public.orders add column if not exists fulfillment_type text;

comment on column public.orders.fulfillment_type is 'delivery | collection — how the customer receives the order.';
