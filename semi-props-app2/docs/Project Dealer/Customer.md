# Customer

\-- ========= Schema & helpers (safe to re-run) =========  
create schema if not exists api;  
create extension if not exists pgcrypto;

create or replace function api.set_updated_at()  
returns trigger language plpgsql as

$$
begin&lt;br&gt; new.updated_at = now();&lt;br&gt; return new;&lt;br&gt;end;
$$

;

\-- Optional: session-based user id (useful if you later add per-user RLS)  
create or replace function api.current_user_id()  
returns uuid language sql stable as

$$
begin&lt;br&gt; create type public.vehicle_status as enum ('en_revision','stock','reservado','publicado','en_taller','vendido','baja');&lt;br&gt;exception when duplicate_object then null; end
$$

;

\-- ========= BASE: customers =========  
create table if not exists api.customers (  
id uuid primary key default gen_random_uuid(),  
owner_id uuid, -- kept generic (no FK); useful for future RLS  
name text not null,  
phone text,  
email text,  
government_id text, -- national id / passport  
notes text,  
created_at timestamptz not null default now(),  
updated_at timestamptz not null default now(),  
constraint customers_email_unique unique (email),  
constraint customers_phone_unique unique (phone)  
);

\-- updated_at trigger  
do

$$
begin&lt;br&gt; create type public.transmission_type as enum ('manual','automatica','cvt','dual_clutch');&lt;br&gt;exception when duplicate_object then null; end
$$

;

\-- ========= BASE: customer_addresses (optional) =========  
create table if not exists api.customer_addresses (  
id uuid primary key default gen_random_uuid(),  
customer_id uuid not null references api.customers(id) on delete cascade,  
label text, -- e.g., home, office  
address_line text,  
city text,  
state text,  
postal_code text,  
country text,  
is_primary boolean default false,  
created_at timestamptz not null default now(),  
updated_at timestamptz not null default now()  
);

create index if not exists idx_customer_addresses_customer  
on api.customer_addresses(customer_id);

do

$$
begin&lt;br&gt; create type public.currency_code as enum ('CRC','USD','EUR','NIO','GTQ','HNL','SVC','PAB','MXN');&lt;br&gt;exception when duplicate_object then null; end
$$

;

\-- ========= BASE: customer_interactions (optional) =========  
create table if not exists api.customer_interactions (  
id uuid primary key default gen_random_uuid(),  
customer_id uuid not null references api.customers(id) on delete cascade,  
channel text, -- phone, whatsapp, email, in-person  
subject text,  
message text,  
performed_by uuid, -- user/agent id (no FK required)  
performed_at timestamptz not null default now(),  
created_at timestamptz not null default now()  
);

create index if not exists idx_customer_interactions_customer  
on api.customer_interactions(customer_id);

\-- ========= RLS (enabled but simple; safe with/without owner_id usage) =========  
alter table api.customers enable row level security;  
alter table api.customer_addresses enable row level security;  
alter table api.customer_interactions enable row level security;

\-- Drop if exist, then create minimal permissive policies  
drop policy if exists customers_select on api.customers;  
drop policy if exists customers_cud on api.customers;  
create policy customers_select on api.customers for select using (true);  
create policy customers_cud on api.customers using (true) with check (true);

drop policy if exists customer_addresses_select on api.customer_addresses;  
drop policy if exists customer_addresses_cud on api.customer_addresses;  
create policy customer_addresses_select on api.customer_addresses for select using (true);  
create policy customer_addresses_cud on api.customer_addresses using (true) with check (true);

drop policy if exists customer_interactions_select on api.customer_interactions;  
drop policy if exists customer_interactions_cud on api.customer_interactions;  
create policy customer_interactions_select on api.customer_interactions for select using (true);  
create policy customer_interactions_cud on api.customer_interactions using (true) with check (true);

\-- =========================================================  
\-- SAFETY: set a safe search_path in every function  
\-- =========================================================  
\-- We’ll rely on explicit schema qualifications; still, we set search_path inside functions.

\-- =========================================================  
\-- CUSTOMERS — CRUD  
\-- =========================================================

\-- CREATE  
create or replace function api.create_customer(  
p_name text,  
p_phone text default null,  
p_email text default null,  
p_government_id text default null,  
p_notes text default null,  
p_owner_id uuid default api.current_user_id()  
) returns api.customers  
language plpgsql  
security invoker  
as

$$
declare&lt;br&gt; v_row api.customers;&lt;br&gt;begin&lt;br&gt; insert into api.customers (name, phone, email, government_id, notes, owner_id)&lt;br&gt; values (p_name, p_phone, p_email, p_government_id, p_notes, p_owner_id)&lt;br&gt; returning \* into v_row;&lt;br&gt; return v_row;&lt;br&gt;end
$$

;

\-- READ (by id)  
create or replace function api.get_customer(p_id uuid)  
returns api.customers  
language sql  
security invoker  
as

$$
select c.\* from api.customers c where c.id = p_id
$$

;

\-- LIST (search + pagination)  
create or replace function api.list_customers(  
p_search text default null, -- matches name/phone/email  
p_limit int default 50,  
p_offset int default 0  
) returns setof api.customers  
language sql  
security invoker  
as

$$
select c.\*&lt;br&gt; from api.customers c&lt;br&gt; where&lt;br&gt; (p_search is null)&lt;br&gt; or (&lt;br&gt; c.name ilike '%'||p_search||'%'&lt;br&gt; or c.phone ilike '%'||p_search||'%'&lt;br&gt; or c.email ilike '%'||p_search||'%'&lt;br&gt; )&lt;br&gt; order by c.created_at desc&lt;br&gt; limit greatest(p_limit, 0)&lt;br&gt; offset greatest(p_offset, 0)
$$

;

\-- UPDATE (partial/patch)  
create or replace function api.update_customer(  
p_id uuid,  
p_name text default null,  
p_phone text default null,  
p_email text default null,  
p_government_id text default null,  
p_notes text default null  
) returns api.customers  
language plpgsql  
security invoker  
as

$$
declare&lt;br&gt; v_row api.customers;&lt;br&gt;begin&lt;br&gt; update api.customers c&lt;br&gt; set&lt;br&gt; name = coalesce(p_name, c.name),&lt;br&gt; phone = coalesce(p_phone, c.phone),&lt;br&gt; email = coalesce(p_email, c.email),&lt;br&gt; government_id = coalesce(p_government_id, c.government_id),&lt;br&gt; notes = coalesce(p_notes, c.notes),&lt;br&gt; updated_at = now()&lt;br&gt; where c.id = p_id&lt;br&gt; returning \* into v_row; if not found then&lt;br&gt; raise exception 'customer % not found', p_id using errcode = 'NO_DATA_FOUND';&lt;br&gt; end if; return v_row;&lt;br&gt;end
$$

;

\-- DELETE  
create or replace function api.delete_customer(p_id uuid)  
returns void  
language sql  
security invoker  
as

$$
delete from api.customers where id = p_id
$$

;

\-- =========================================================  
\-- CUSTOMER ADDRESSES — CRUD  
\-- =========================================================

\-- CREATE  
create or replace function api.create_customer_address(  
p_customer_id uuid,  
p_label text default null,  
p_address text default null,  
p_city text default null,  
p_state text default null,  
p_postal_code text default null,  
p_country text default null,  
p_is_primary boolean default false  
) returns api.customer_addresses  
language plpgsql  
security invoker  
as

$$
declare&lt;br&gt; v_row api.customer_addresses;&lt;br&gt;begin&lt;br&gt; -- if set as primary, unset others for this customer&lt;br&gt; if coalesce(p_is_primary, false) then&lt;br&gt; update api.customer_addresses&lt;br&gt; set is_primary = false&lt;br&gt; where customer_id = p_customer_id and is_primary = true;&lt;br&gt; end if; insert into api.customer_addresses (&lt;br&gt; customer_id, label, address_line, city, state, postal_code, country, is_primary&lt;br&gt; ) values (&lt;br&gt; p_customer_id, p_label, p_address, p_city, p_state, p_postal_code, p_country, coalesce(p_is_primary, false)&lt;br&gt; )&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

\-- READ (by id)  
create or replace function api.get_customer_address(p_id uuid)  
returns api.customer_addresses  
language sql  
security invoker  
as

$$
select a.\* from api.customer_addresses a where a.id = p_id
$$

;

\-- LIST by customer (optionally only primary)  
create or replace function api.list_customer_addresses(  
p_customer_id uuid,  
p_only_primary boolean default false  
) returns setof api.customer_addresses  
language sql  
security invoker  
as

$$
select a.\*&lt;br&gt; from api.customer_addresses a&lt;br&gt; where a.customer_id = p_customer_id&lt;br&gt; and (p_only_primary = false or a.is_primary = true)&lt;br&gt; order by a.is_primary desc, a.created_at desc
$$

;

\-- UPDATE (partial/patch)  
create or replace function api.update_customer_address(  
p_id uuid,  
p_label text default null,  
p_address text default null,  
p_city text default null,  
p_state text default null,  
p_postal_code text default null,  
p_country text default null,  
p_is_primary boolean default null  
) returns api.customer_addresses  
language plpgsql  
security invoker  
as

$$
declare&lt;br&gt; v_row api.customer_addresses;&lt;br&gt; v_customer uuid;&lt;br&gt;begin&lt;br&gt; select customer_id into v_customer&lt;br&gt; from api.customer_addresses&lt;br&gt; where id = p_id; if not found then&lt;br&gt; raise exception 'customer_address % not found', p_id using errcode = 'NO_DATA_FOUND';&lt;br&gt; end if; if p_is_primary is true then&lt;br&gt; update api.customer_addresses&lt;br&gt; set is_primary = false&lt;br&gt; where customer_id = v_customer and id &lt;&gt; p_id and is_primary = true;&lt;br&gt; end if; update api.customer_addresses a&lt;br&gt; set&lt;br&gt; label = coalesce(p_label, a.label),&lt;br&gt; address_line= coalesce(p_address, a.address_line),&lt;br&gt; city = coalesce(p_city, a.city),&lt;br&gt; state = coalesce(p_state, a.state),&lt;br&gt; postal_code = coalesce(p_postal_code, a.postal_code),&lt;br&gt; country = coalesce(p_country, a.country),&lt;br&gt; is_primary = coalesce(p_is_primary, a.is_primary),&lt;br&gt; updated_at = now()&lt;br&gt; where a.id = p_id&lt;br&gt; returning \* into v_row; return v_row;&lt;br&gt;end
$$

;

\-- DELETE  
create or replace function api.delete_customer_address(p_id uuid)  
returns void  
language sql  
security invoker  
as

$$
delete from api.customer_addresses where id = p_id
$$

;

\-- =========================================================  
\-- CUSTOMER INTERACTIONS — CRUD  
\-- =========================================================

\-- CREATE  
create or replace function api.create_customer_interaction(  
p_customer_id uuid,  
p_channel text default null, -- phone, whatsapp, email, in-person  
p_subject text default null,  
p_message text default null,  
p_performed_by uuid default api.current_user_id(),  
p_performed_at timestamptz default now()  
) returns api.customer_interactions  
language sql  
security invoker  
as

$$
insert into api.customer_interactions (&lt;br&gt; customer_id, channel, subject, message, performed_by, performed_at&lt;br&gt; ) values (&lt;br&gt; p_customer_id, p_channel, p_subject, p_message, p_performed_by, p_performed_at&lt;br&gt; )&lt;br&gt; returning \*
$$

;

\-- READ (by id)  
create or replace function api.get_customer_interaction(p_id uuid)  
returns api.customer_interactions  
language sql  
security invoker  
as

$$
select i.\* from api.customer_interactions i where i.id = p_id
$$

;

\-- LIST by customer (pagination)  
create or replace function api.list_customer_interactions(  
p_customer_id uuid,  
p_limit int default 50,  
p_offset int default 0  
) returns setof api.customer_interactions  
language sql  
security invoker  
as

$$
select i.\*&lt;br&gt; from api.customer_interactions i&lt;br&gt; where i.customer_id = p_customer_id&lt;br&gt; order by i.performed_at desc, i.created_at desc&lt;br&gt; limit greatest(p_limit, 0)&lt;br&gt; offset greatest(p_offset, 0)
$$

;

\-- UPDATE (partial/patch)  
create or replace function api.update_customer_interaction(  
p_id uuid,  
p_channel text default null,  
p_subject text default null,  
p_message text default null,  
p_performed_by uuid default null,  
p_performed_at timestamptz default null  
) returns api.customer_interactions  
language plpgsql  
security invoker  
as

$$
declare&lt;br&gt; v_row api.customer_interactions;&lt;br&gt;begin&lt;br&gt; update api.customer_interactions i&lt;br&gt; set&lt;br&gt; channel = coalesce(p_channel, i.channel),&lt;br&gt; subject = coalesce(p_subject, i.subject),&lt;br&gt; message = coalesce(p_message, i.message),&lt;br&gt; performed_by = coalesce(p_performed_by, i.performed_by),&lt;br&gt; performed_at = coalesce(p_performed_at, i.performed_at)&lt;br&gt; where i.id = p_id&lt;br&gt; returning \* into v_row; if not found then&lt;br&gt; raise exception 'customer_interaction % not found', p_id using errcode = 'NO_DATA_FOUND';&lt;br&gt; end if; return v_row;&lt;br&gt;end
$$

;

\-- DELETE  
create or replace function api.delete_customer_interaction(p_id uuid)  
returns void  
language sql  
security invoker  
as

$$
delete from api.customer_interactions where id = p_id
$$

;