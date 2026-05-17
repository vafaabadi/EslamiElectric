-- Strip catalog down to the five seeded storefront categories from 014_catalog_tables.sql.
-- Deletes Playwright/manual test categories (e.g. ids/names starting with e2e-) and any other
-- categories not in this allow-list. Products in removed categories are dropped via ON DELETE CASCADE.

delete from public.catalog_categories
where id not in (
  'cables',
  'light-bulbs',
  'lamps',
  'sockets',
  'extension-cables'
);
