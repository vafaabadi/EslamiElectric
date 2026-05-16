-- Storefront catalog in Postgres (admin-editable). Server reads via service role; RLS denies anon/auth direct access.
-- Seed matches repo categories.json for first deploy.

create table if not exists public.catalog_categories (
  id text primary key,
  name text not null,
  name_fa text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_products (
  id text primary key,
  category_id text not null references public.catalog_categories (id) on delete cascade,
  name text not null,
  name_fa text not null default '',
  price numeric(12, 2) not null,
  image_url text not null default '',
  description text not null default '',
  extra_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_products_category_id_idx on public.catalog_products (category_id);

alter table public.catalog_categories enable row level security;
alter table public.catalog_products enable row level security;

-- Public read bucket for product photos (uploads go via Express + service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Seed categories
insert into public.catalog_categories (id, name, name_fa, sort_order) values
  ('cables', 'Cables', 'کابل‌ها', 0),
  ('light-bulbs', 'Light Bulbs', 'لامپ‌ها', 1),
  ('lamps', 'Lamps', 'چراغ‌ها', 2),
  ('sockets', 'Sockets', 'پریزها', 3),
  ('extension-cables', 'Extension Cables', 'سیم‌های رابط', 4)
on conflict (id) do nothing;

-- Seed products (extra_json holds fields like wattage)
insert into public.catalog_products (id, category_id, name, name_fa, price, image_url, description, extra_json) values
  ('c1', 'cables', '2.5mm Twin & Earth Cable 100m', 'کابل دو هسته ۲.۵ میلی‌متر ۱۰۰ متر', 85.00, '/images/products/cables/cable001.jpg', 'Standard building wire', '{}'),
  ('c2', 'cables', '1.5mm Single Core Cable 50m', 'کابل تک هسته ۱.۵ میلی‌متر ۵۰ متر', 32.00, '/images/products/cables/cable002.jpg', 'Flexible single core wire', '{}'),
  ('c3', 'cables', '6mm Armoured Cable 25m', 'کابل زره‌دار ۶ میلی‌متر ۲۵ متر', 120.00, '/images/products/cables/cable003.jpg', 'Heavy-duty armoured cable for outdoor use', '{}'),
  ('lb1', 'light-bulbs', 'LED Bulb E27 9W Warm White', 'لامپ LED پایه E27 ۹ وات سفید گرم', 4.50, '/images/products/light bulbs/LightBulb001.jpg', 'Energy efficient LED bulb', '{"wattage": 9}'),
  ('lb2', 'light-bulbs', 'LED Bulb E27 15W Daylight', 'لامپ LED پایه E27 ۱۵ وات نور روز', 6.00, '/images/products/light bulbs/LightBulb002.jpg', 'Bright daylight LED bulb', '{"wattage": 15}'),
  ('lb3', 'light-bulbs', 'Halogen Spotlight GU10 50W', 'لامپ هالوژن اسپات GU10 ۵۰ وات', 3.00, '/images/products/light bulbs/LightBulb003.jpg', 'Classic halogen spotlight', '{"wattage": 50}'),
  ('lm1', 'lamps', 'Modern Desk Lamp LED', 'چراغ مطالعه مدرن LED', 45.00, '/images/products/lamps/lamp001.jpg', 'Adjustable desk lamp with LED', '{"wattage": 12}'),
  ('lm2', 'lamps', 'Floor Standing Lamp', 'چراغ ایستاده پایه‌دار', 89.00, '/images/products/lamps/lamp002.jpg', 'Elegant floor lamp for living room', '{}'),
  ('lm3', 'lamps', 'Bedside Table Lamp', 'چراغ خواب رومیزی', 35.00, '/images/products/lamps/lamp003.jpg', 'Compact lamp for nightstands', '{}'),
  ('s1', 'sockets', 'Double Socket 13A White', 'پریز دوتایی ۱۳ آمپر سفید', 8.00, '/images/products/sockets/socket001.jpg', 'Standard UK double socket', '{}'),
  ('s2', 'sockets', 'Single Socket 13A with USB', 'پریز تکی ۱۳ آمپر با USB', 12.00, '/images/products/sockets/socket002.jpg', 'Socket with built-in USB charging', '{}'),
  ('s3', 'sockets', 'Outdoor Weatherproof Socket', 'پریز ضد آب فضای باز', 18.00, '/images/products/sockets/socket003.jpg', 'IP66 rated outdoor socket', '{}'),
  ('ec1', 'extension-cables', '4-Way Extension Lead 2m', 'چندراهی ۴ خانه ۲ متری', 14.00, '/images/products/extensioncables/extensioncable001.jpg', '4 socket extension with surge protection', '{}'),
  ('ec2', 'extension-cables', '6-Way Extension Lead 5m', 'چندراهی ۶ خانه ۵ متری', 22.00, '/images/products/extensioncables/extensioncable002.jpg', '6 socket extension with individual switches', '{}'),
  ('ec3', 'extension-cables', 'Cable Reel 25m Heavy Duty', 'قرقره کابل ۲۵ متری صنعتی', 45.00, '/images/products/extensioncables/extensioncable003.jpg', 'Industrial cable reel with thermal cutout', '{}')
on conflict (id) do nothing;
