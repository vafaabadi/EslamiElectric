-- Soft-delete for catalog, admin audit trail, fulfillment fields on orders.

alter table public.catalog_categories add column if not exists deleted_at timestamptz null;
alter table public.catalog_products add column if not exists deleted_at timestamptz null;

create index if not exists catalog_categories_deleted_at_idx
  on public.catalog_categories (deleted_at) where deleted_at is not null;
create index if not exists catalog_products_deleted_at_idx
  on public.catalog_products (deleted_at) where deleted_at is not null;

alter table public.orders add column if not exists fulfillment_status text not null default 'unfulfilled';
alter table public.orders add column if not exists admin_notes text not null default '';

comment on column public.orders.fulfillment_status is 'Staff: unfulfilled | processing | shipped | delivered | cancelled';

create table if not exists public.catalog_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists catalog_admin_audit_created_at_idx on public.catalog_admin_audit (created_at desc);
create index if not exists catalog_admin_audit_entity_idx on public.catalog_admin_audit (entity_type, entity_id);

alter table public.catalog_admin_audit enable row level security;
