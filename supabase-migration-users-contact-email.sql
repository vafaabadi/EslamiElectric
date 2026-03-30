-- Run in Supabase SQL Editor: optional inbox for receipts when auth email is synthetic (e.g. Telegram tg_*@domain).
alter table public.users add column if not exists contact_email text;
comment on column public.users.contact_email is 'Optional real email for orders/receipts; auth email may be synthetic (Telegram).';
