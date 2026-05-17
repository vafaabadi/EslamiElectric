-- Bilingual descriptions + image alt text for catalog products (admin + storefront payloads).

alter table public.catalog_products
  add column if not exists description_fa text not null default '';

alter table public.catalog_products
  add column if not exists image_alt_en text;

alter table public.catalog_products
  add column if not exists image_alt_fa text;
