-- Run this in Supabase SQL Editor after enabling Email auth.
-- When a user signs up via Supabase Auth (e.g. signUp from frontend), this trigger
-- creates a matching row in public.users so /api/me and the rest of the app work.
--
-- If you get "Database error saving new user", ensure:
-- 1. public.users.password_hash allows NULL:  ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
-- 2. public.users has default for created_at:  ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb;
  dob_val date;
begin
  meta := coalesce(NEW.raw_user_metadata, '{}'::jsonb);
  begin
    if meta->>'dob' is not null and trim( coalesce(meta->>'dob', '') ) <> '' then
      dob_val := (meta->>'dob')::date;
    else
      dob_val := null;
    end if;
  exception when others then
    dob_val := null;
  end;
  insert into public.users (
    id,
    email,
    first_name,
    surname,
    type,
    dob,
    mobile,
    landline,
    address,
    bank_details,
    company_name,
    company_number,
    company_contact_number,
    company_principal_contact
  ) values (
    NEW.id,
    coalesce( trim( coalesce(NEW.email::text, '') ), ''),
    coalesce( nullif( trim( coalesce(meta->>'first_name', '') ), '' ), ''),
    coalesce( nullif( trim( coalesce(meta->>'surname', '') ), '' ), ''),
    coalesce( nullif( trim( coalesce(meta->>'type', '') ), '' ), 'person'),
    dob_val,
    coalesce( nullif( trim( coalesce(meta->>'mobile', '') ), '' ), ''),
    nullif( trim( coalesce(meta->>'landline', '') ), '' ),
    coalesce( nullif( trim( coalesce(meta->>'address', '') ), '' ), ''),
    nullif( trim( coalesce(meta->>'bank_details', '') ), '' ),
    nullif( trim( coalesce(meta->>'company_name', '') ), '' ),
    nullif( trim( coalesce(meta->>'company_number', '') ), '' ),
    nullif( trim( coalesce(meta->>'company_contact_number', '') ), '' ),
    nullif( trim( coalesce(meta->>'company_principal_contact', '') ), '' )
  );
  return NEW;
exception
  when unique_violation then
    -- id already exists (e.g. profile created elsewhere); update profile from metadata
    update public.users set
      email = coalesce(NEW.email, users.email),
      first_name = coalesce(meta->>'first_name', users.first_name),
      surname = coalesce(meta->>'surname', users.surname),
      type = coalesce(meta->>'type', users.type),
      dob = coalesce(nullif(meta->>'dob', '')::date, users.dob),
      mobile = coalesce(meta->>'mobile', users.mobile),
      landline = coalesce(nullif(meta->>'landline', ''), users.landline),
      address = coalesce(meta->>'address', users.address),
      bank_details = coalesce(nullif(meta->>'bank_details', ''), users.bank_details),
      company_name = coalesce(nullif(meta->>'company_name', ''), users.company_name),
      company_number = coalesce(nullif(meta->>'company_number', ''), users.company_number),
      company_contact_number = coalesce(nullif(meta->>'company_contact_number', ''), users.company_contact_number),
      company_principal_contact = coalesce(nullif(meta->>'company_principal_contact', ''), users.company_principal_contact)
    where id = NEW.id;
    return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
