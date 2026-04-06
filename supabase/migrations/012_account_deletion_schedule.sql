-- Two-phase account deletion: immediate PII strip + auth removal; full row removal after retention window.
-- Run in Supabase SQL Editor (production/staging) after deployment.

alter table public.users
  add column if not exists account_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_for timestamptz,
  add column if not exists pii_deleted_at timestamptz;

comment on column public.users.account_status is 'active | pending_deletion — pending after user requests deletion; row removed later by cron.';
comment on column public.users.deletion_requested_at is 'When the user requested deletion (immediate phase).';
comment on column public.users.deletion_scheduled_for is 'When the server may permanently delete this profile row (default +1 year).';
comment on column public.users.pii_deleted_at is 'When immediate anonymization completed.';

alter table public.users drop constraint if exists users_account_status_check;
alter table public.users add constraint users_account_status_check
  check (account_status in ('active', 'pending_deletion'));

create index if not exists users_deletion_scheduled_idx
  on public.users (deletion_scheduled_for)
  where account_status = 'pending_deletion';

update public.users set account_status = 'active' where account_status is null;
