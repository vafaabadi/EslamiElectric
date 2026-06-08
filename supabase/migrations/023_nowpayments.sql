-- NOWPayments: rename WalletConnect Pay columns to provider-agnostic crypto checkout fields.

alter table public.orders rename column walletconnect_payment_id to crypto_payment_id;
alter table public.orders rename column walletconnect_payment_url to crypto_payment_url;
alter table public.orders rename column walletconnect_status to crypto_payment_status;
alter table public.orders rename column walletconnect_tx_hash to crypto_tx_hash;
alter table public.orders rename column walletconnect_token_amount to crypto_pay_amount;
alter table public.orders rename column walletconnect_asset to crypto_pay_currency;

drop index if exists public.orders_walletconnect_payment_id_uidx;

create unique index if not exists orders_crypto_payment_id_uidx
  on public.orders (crypto_payment_id)
  where crypto_payment_id is not null;

update public.orders
set payment_method = 'nowpayments'
where payment_method = 'walletconnect';

comment on column public.orders.payment_method is 'stripe | nowpayments';
comment on column public.orders.crypto_payment_id is 'External crypto payment id (NOWPayments payment_id)';
comment on column public.orders.crypto_payment_url is 'Invoice URL or pay address link';
comment on column public.orders.crypto_payment_status is 'NOWPayments status: waiting, confirming, confirmed, finished, failed, expired, refunded';
comment on column public.orders.crypto_tx_hash is 'On-chain tx hash when paid via crypto';
comment on column public.orders.crypto_pay_amount is 'Crypto amount to pay (decimal string)';
comment on column public.orders.crypto_pay_currency is 'Crypto currency code (e.g. usdc, btc)';

alter table public.crypto_payments rename column payment_method to payment_provider;

update public.crypto_payments
set payment_provider = 'nowpayments'
where payment_provider = 'walletconnect';

comment on table public.crypto_payments is 'Crypto payment attempts (NOWPayments etc.) linked to orders';
comment on column public.crypto_payments.payment_provider is 'Payment provider: nowpayments';
