-- Run in Supabase SQL Editor: stable Telegram account id for login after auth email is changed from synthetic tg_*@domain.
alter table public.users add column if not exists telegram_id text;
create unique index if not exists users_telegram_id_unique on public.users (telegram_id) where telegram_id is not null;
comment on column public.users.telegram_id is 'Telegram user id (string); set for Telegram sign-in; lookup when auth email no longer matches tg_*@domain.';
