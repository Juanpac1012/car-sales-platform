# Suppliers

\-- =========================================================  
\-- Schema & helpers  
\-- =========================================================  
create schema if not exists api;  
create extension if not exists pgcrypto;

create or replace function api.set_updated_at()  
returns trigger language plpgsql as

$$
begin&lt;br&gt; new.updated_at = now();&lt;br&gt; return new;&lt;br&gt;end
$$

;

\-- =========================================================  
\-- TABLE: suppliers (core)  
\-- =========================================================  
create table if not exists api.suppliers (  
id uuid primary key default gen_random_uuid(),  
\-- keep owner_id optional; we're disabling RLS below so perms won't depend on it  
owner_id uuid,  
name text not null,  
phone text,  
email text,  
tax_id text, -- VAT / company id / national id  
kind text, -- individual | dealer | auction | trade_in | other  
notes text,  
created_at timestamptz not null default now(),  
updated_at timestamptz not null default now(),  
constraint suppliers_email_unique unique (email),  
constraint suppliers_phone_unique unique (phone)  
);

do

$$
begin&lt;br&gt; if not exists (select 1 from pg_trigger where tgname='trg_suppliers_updated_at') then&lt;br&gt; execute 'create trigger trg_suppliers_updated_at&lt;br&gt; before update on api.suppliers&lt;br&gt; for each row execute function api.set_updated_at()';&lt;br&gt; end if;&lt;br&gt;end
$$

;

create index if not exists idx_suppliers_name on api.suppliers (name);

\-- =========================================================  
\-- TABLE: supplier_addresses (optional)  
\-- =========================================================  
create table if not exists api.supplier_addresses (  
id uuid primary key default gen_random_uuid(),  
supplier_id uuid not null references api.suppliers(id) on delete cascade,  
label text, -- hq, branch, billing, etc.  
address_line text,  
city text,  
state text,  
postal_code text,  
country text,  
is_primary boolean default false,  
created_at timestamptz not null default now(),  
updated_at timestamptz not null default now()  
);

create index if not exists idx_supplier_addresses_supplier on api.supplier_addresses (supplier_id);

do

$$
BEGIN&lt;br&gt; IF NOT api.has_dealer_perm(\_dealer, \_perm) THEN&lt;br&gt; RAISE EXCEPTION 'permission denied for dealer % and perm %', \_dealer, \_perm&lt;br&gt; USING ERRCODE = '28000';&lt;br&gt; END IF;&lt;br&gt;END
$$

;

\-- =========================================================  
\-- TABLE: supplier_contacts (optional people at the supplier)  
\-- =========================================================  
create table if not exists api.supplier_contacts (  
id uuid primary key default gen_random_uuid(),  
supplier_id uuid not null references api.suppliers(id) on delete cascade,  
full_name text not null,  
position text, -- role at the supplier  
phone text,  
email text,  
is_primary boolean default false,  
created_at timestamptz not null default now(),  
updated_at timestamptz not null default now()  
);

create index if not exists idx_supplier_contacts_supplier on api.supplier_contacts (supplier_id);

do

$$
DECLARE \_row api.suppliers;&lt;br&gt;BEGIN&lt;br&gt; PERFORM api.assert_dealer_perm(\_dealer_id, 'vendor.write');&lt;br&gt; INSERT INTO api.suppliers(dealer_id,name,email,phone,tax_id,notes,slug)&lt;br&gt; VALUES (\_dealer_id,\_name,\_email,\_phone,\_tax_id,\_notes,\_slug)&lt;br&gt; RETURNING \* INTO \_row;&lt;br&gt; RETURN \_row;&lt;br&gt;END
$$

;

\-- =========================================================  
\-- CRUD FUNCTIONS (SECURITY INVOKER → use table perms)  
\-- =========================================================

\-- ---------- SUPPLIERS ----------  
create or replace function api.create_supplier(  
p_name text,  
p_phone text default null,  
p_email text default null,  
p_tax_id text default null,  
p_kind text default null,  
p_notes text default null,  
p_owner_id uuid default null  
) returns api.suppliers  
language plpgsql security invoker  
as

$$
DECLARE \_dealer UUID; \_row api.suppliers;&lt;br&gt;BEGIN&lt;br&gt; SELECT dealer_id INTO \_dealer FROM api.suppliers WHERE id=\_id;&lt;br&gt; IF \_dealer IS NULL THEN RAISE EXCEPTION 'supplier not found'; END IF;&lt;br&gt; PERFORM api.assert_dealer_perm(\_dealer, 'vendor.write'); UPDATE api.suppliers&lt;br&gt; SET name = COALESCE(\_name,name),&lt;br&gt; email = COALESCE(\_email,email),&lt;br&gt; phone = COALESCE(\_phone,phone),&lt;br&gt; tax_id= COALESCE(\_tax_id,tax_id),&lt;br&gt; notes = COALESCE(\_notes,notes),&lt;br&gt; slug = COALESCE(\_slug,slug),&lt;br&gt; updated_at = now()&lt;br&gt; WHERE id=\_id&lt;br&gt; RETURNING \* INTO \_row;&lt;br&gt; RETURN \_row;&lt;br&gt;END
$$

;

create or replace function api.get_supplier(p_id uuid)  
returns api.suppliers  
language sql security invoker  
as

$$
DECLARE \_dealer UUID;&lt;br&gt;BEGIN&lt;br&gt; SELECT dealer_id INTO \_dealer FROM api.suppliers WHERE id=\_id;&lt;br&gt; IF \_dealer IS NULL THEN RAISE EXCEPTION 'supplier not found'; END IF;&lt;br&gt; PERFORM api.assert_dealer_perm(\_dealer, 'vendor.write');&lt;br&gt; DELETE FROM api.suppliers WHERE id=\_id;&lt;br&gt;END
$$

;

create or replace function api.list_suppliers(  
p_search text default null, -- matches name/phone/email/tax_id  
p_limit int default 50,  
p_offset int default 0  
) returns setof api.suppliers  
language sql security invoker  
as

$$
SELECT s.\*&lt;br&gt; FROM api.suppliers s&lt;br&gt; WHERE s.dealer_id = \_dealer_id&lt;br&gt; AND api.has_dealer_perm(\_dealer_id, 'vendor.read')&lt;br&gt; AND (&lt;br&gt; \_search IS NULL OR&lt;br&gt; s.name ILIKE '%'||\_search||'%' OR&lt;br&gt; COALESCE(s.email,'') ILIKE '%'||\_search||'%' OR&lt;br&gt; COALESCE(s.phone,'') ILIKE '%'||\_search||'%'&lt;br&gt; )&lt;br&gt; ORDER BY s.created_at DESC&lt;br&gt; LIMIT \_limit OFFSET \_offset;
$$

;

create or replace function api.update_supplier(  
p_id uuid,  
p_name text default null,  
p_phone text default null,  
p_email text default null,  
p_tax_id text default null,  
p_kind text default null,  
p_notes text default null  
) returns api.suppliers  
language plpgsql security invoker  
as

$$
BEGIN&lt;br&gt; IF EXISTS (&lt;br&gt; SELECT 1&lt;br&gt; FROM pg_trigger t&lt;br&gt; JOIN pg_class c ON c.oid = t.tgrelid&lt;br&gt; JOIN pg_namespace n ON n.oid = c.relnamespace&lt;br&gt; WHERE n.nspname='api' AND c.relname='suppliers' AND t.tgname='trg_suppliers_updated'&lt;br&gt; ) THEN&lt;br&gt; EXECUTE 'DROP TRIGGER trg_suppliers_updated ON api.suppliers';&lt;br&gt; END IF;&lt;br&gt;END
$$

;

create or replace function api.delete_supplier(p_id uuid)  
returns void  
language sql security invoker  
as

$$
delete from api.suppliers where id = p_id
$$

;

\-- ---------- SUPPLIER ADDRESSES ----------  
create or replace function api.create_supplier_address(  
p_supplier_id uuid,  
p_label text default null,  
p_address text default null,  
p_city text default null,  
p_state text default null,  
p_postal_code text default null,  
p_country text default null,  
p_is_primary boolean default false  
) returns api.supplier_addresses  
language plpgsql security invoker  
as

$$
declare v_row api.supplier_addresses;&lt;br&gt;begin&lt;br&gt; if coalesce(p_is_primary,false) then&lt;br&gt; update api.supplier_addresses&lt;br&gt; set is_primary=false&lt;br&gt; where supplier_id=p_supplier_id and is_primary=true;&lt;br&gt; end if; insert into api.supplier_addresses(&lt;br&gt; supplier_id,label,address_line,city,state,postal_code,country,is_primary&lt;br&gt; ) values (&lt;br&gt; p_supplier_id,p_label,p_address,p_city,p_state,p_postal_code,p_country,coalesce(p_is_primary,false)&lt;br&gt; )&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

create or replace function api.get_supplier_address(p_id uuid)  
returns api.supplier_addresses  
language sql security invoker  
as

$$
select a.\* from api.supplier_addresses a where a.id = p_id
$$

;

create or replace function api.list_supplier_addresses(  
p_supplier_id uuid,  
p_only_primary boolean default false  
) returns setof api.supplier_addresses  
language sql security invoker  
as

$$
select a.\*&lt;br&gt; from api.supplier_addresses a&lt;br&gt; where a.supplier_id = p_supplier_id&lt;br&gt; and (p_only_primary=false or a.is_primary=true)&lt;br&gt; order by a.is_primary desc, a.created_at desc
$$

;

create or replace function api.update_supplier_address(  
p_id uuid,  
p_label text default null,  
p_address text default null,  
p_city text default null,  
p_state text default null,  
p_postal_code text default null,  
p_country text default null,  
p_is_primary boolean default null  
) returns api.supplier_addresses  
language plpgsql security invoker  
as

$$
declare&lt;br&gt; v_row api.supplier_addresses;&lt;br&gt; v_supplier uuid;&lt;br&gt;begin&lt;br&gt; select supplier_id into v_supplier&lt;br&gt; from api.supplier_addresses&lt;br&gt; where id = p_id;&lt;br&gt; if not found then&lt;br&gt; raise exception 'supplier_address % not found', p_id using errcode='NO_DATA_FOUND';&lt;br&gt; end if; if p_is_primary is true then&lt;br&gt; update api.supplier_addresses&lt;br&gt; set is_primary=false&lt;br&gt; where supplier_id=v_supplier and id&lt;&gt;p_id and is_primary=true;&lt;br&gt; end if; update api.supplier_addresses a&lt;br&gt; set label = coalesce(p_label, a.label),&lt;br&gt; address_line= coalesce(p_address, a.address_line),&lt;br&gt; city = coalesce(p_city, a.city),&lt;br&gt; state = coalesce(p_state, a.state),&lt;br&gt; postal_code = coalesce(p_postal_code, a.postal_code),&lt;br&gt; country = coalesce(p_country, a.country),&lt;br&gt; is_primary = coalesce(p_is_primary, a.is_primary),&lt;br&gt; updated_at = now()&lt;br&gt; where a.id = p_id&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

create or replace function api.delete_supplier_address(p_id uuid)  
returns void  
language sql security invoker  
as

$$
delete from api.supplier_addresses where id = p_id
$$

;

\-- ---------- SUPPLIER CONTACTS ----------  
create or replace function api.create_supplier_contact(  
p_supplier_id uuid,  
p_full_name text,  
p_position text default null,  
p_phone text default null,  
p_email text default null,  
p_is_primary boolean default false  
) returns api.supplier_contacts  
language plpgsql security invoker  
as

$$
declare v_row api.supplier_contacts;&lt;br&gt;begin&lt;br&gt; if coalesce(p_is_primary,false) then&lt;br&gt; update api.supplier_contacts&lt;br&gt; set is_primary=false&lt;br&gt; where supplier_id=p_supplier_id and is_primary=true;&lt;br&gt; end if; insert into api.supplier_contacts(&lt;br&gt; supplier_id, full_name, position, phone, email, is_primary&lt;br&gt; ) values (&lt;br&gt; p_supplier_id, p_full_name, p_position, p_phone, p_email, coalesce(p_is_primary,false)&lt;br&gt; )&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

create or replace function api.get_supplier_contact(p_id uuid)  
returns api.supplier_contacts  
language sql security invoker  
as

$$
select c.\* from api.supplier_contacts c where c.id = p_id
$$

;

create or replace function api.list_supplier_contacts(  
p_supplier_id uuid,  
p_only_primary boolean default false  
) returns setof api.supplier_contacts  
language sql security invoker  
as

$$
select c.\*&lt;br&gt; from api.supplier_contacts c&lt;br&gt; where c.supplier_id = p_supplier_id&lt;br&gt; and (p_only_primary=false or c.is_primary=true)&lt;br&gt; order by c.is_primary desc, c.created_at desc
$$

;

create or replace function api.update_supplier_contact(  
p_id uuid,  
p_full_name text default null,  
p_position text default null,  
p_phone text default null,  
p_email text default null,  
p_is_primary boolean default null  
) returns api.supplier_contacts  
language plpgsql security invoker  
as

$$
declare&lt;br&gt; v_row api.supplier_contacts;&lt;br&gt; v_supplier uuid;&lt;br&gt;begin&lt;br&gt; select supplier_id into v_supplier from api.supplier_contacts where id = p_id;&lt;br&gt; if not found then&lt;br&gt; raise exception 'supplier_contact % not found', p_id using errcode='NO_DATA_FOUND';&lt;br&gt; end if; if p_is_primary is true then&lt;br&gt; update api.supplier_contacts&lt;br&gt; set is_primary=false&lt;br&gt; where supplier_id=v_supplier and id&lt;&gt;p_id and is_primary=true;&lt;br&gt; end if; update api.supplier_contacts c&lt;br&gt; set full_name = coalesce(p_full_name, c.full_name),&lt;br&gt; position = coalesce(p_position, c.position),&lt;br&gt; phone = coalesce(p_phone, c.phone),&lt;br&gt; email = coalesce(p_email, c.email),&lt;br&gt; is_primary = coalesce(p_is_primary, c.is_primary),&lt;br&gt; updated_at = now()&lt;br&gt; where c.id = p_id&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

create or replace function api.delete_supplier_contact(p_id uuid)  
returns void  
language sql security invoker  
as

$$
delete from api.supplier_contacts where id = p_id
$$

;

\-- =========================================================  
\-- PERMISSIONS: remove blockers and open access  
\-- =========================================================  
\-- Disable RLS and drop any policies on these tables  
do

$$
declare t text;&lt;br&gt;begin&lt;br&gt; foreach t in array array\['suppliers','supplier_addresses','supplier_contacts'\] loop&lt;br&gt; -- disable RLS (no error if already disabled)&lt;br&gt; execute format('alter table api.%I disable row level security', t); &lt;pre&gt;&lt;code&gt;-- drop all policies by name dynamically for t in select policyname from pg_policies where schemaname='api' and tablename in ('suppliers','supplier_addresses','supplier_contacts') loop execute format('drop policy if exists %I on api.suppliers', t); execute format('drop policy if exists %I on api.supplier_addresses', t); execute format('drop policy if exists %I on api.supplier_contacts', t); end loop; -- Open grants begin execute format('revoke all on table api.%I from public', t); exception when others then -- ignore end; execute format('grant select, insert, update, delete on table api.%I to public', t); &lt;/code&gt;&lt;/pre&gt; end loop;&lt;br&gt;end
$$

;

\-- grant on sequences in schema api (needed if any serial/identity used in the future)  
do

$$
declare s record;&lt;br&gt;begin&lt;br&gt; for s in&lt;br&gt; select sequence_schema, sequence_name&lt;br&gt; from information_schema.sequences&lt;br&gt; where sequence_schema='api'&lt;br&gt; loop&lt;br&gt; execute format('grant usage, select, update on sequence %I.%I to public', s.sequence_schema, s.sequence_name);&lt;br&gt; end loop;&lt;br&gt;end
$$

;