-- Guest checkout and shipping: add columns to orders for guest orders and vendor use.
-- Run in Supabase SQL Editor if you already have the orders table.

alter table public.orders
  add column if not exists guest_access_token text unique,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists shipping_address jsonb,
  add column if not exists tracking_number text;

comment on column public.orders.guest_access_token is 'Secret token for guest order lookup (used in link and email)';
comment on column public.orders.customer_name is 'Full name for shipping label and receipt';
comment on column public.orders.customer_phone is 'Phone for delivery contact';
comment on column public.orders.shipping_address is 'Shipping address (e.g. street, city, postal_code, country)';
comment on column public.orders.tracking_number is 'Carrier tracking number once shipped';

create index if not exists orders_guest_access_token_idx on public.orders(guest_access_token) where guest_access_token is not null;
create index if not exists orders_customer_email_idx on public.orders(customer_email) where customer_email is not null;
