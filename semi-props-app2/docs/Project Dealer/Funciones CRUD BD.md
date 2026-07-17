# Funciones CRUD BD

# Funciones CRUD Creadas en Postgres

\-- ===================================================================== -- CRUD FUNCTIONS (RPC) PARA POSTGREST — ESQUEMA api -- Requisitos previos: -- - Tablas: vehicles, vehicle_listings, photos, price_history, leads, favorites, ... -- - Helpers: api.has_dealer_perm(uuid, text), api.jwt_sub() -- =====================================================================

\-- Por claridad podemos fijar el search_path (opcional): -- SELECT set_config('search_path','api, public', true);

---

\-- 1) VEHICLE: CREATE

---

CREATE OR REPLACE FUNCTION api.create_vehicle( p_make_id bigint, p_model_id bigint, p_trim_id bigint DEFAULT NULL, p_year int DEFAULT NULL, p_odometer_km int DEFAULT NULL, p_transmission transmission DEFAULT NULL, p_fuel_type fuel_type DEFAULT NULL, p_color_ext text DEFAULT NULL, p_color_int text DEFAULT NULL, p_engine text DEFAULT NULL, p_drive_type text DEFAULT NULL, p_doors int DEFAULT NULL, p_seats int DEFAULT NULL, p_vin text DEFAULT NULL ) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE v_vehicle_id uuid; BEGIN INSERT INTO api.vehicles( make_id, model_id, trim_id, year, odometer_km, transmission, fuel_type, color_ext, color_int, engine, drive_type, doors, seats, vin ) VALUES ( p_make_id, p_model_id, p_trim_id, p_year, p_odometer_km, p_transmission, p_fuel_type, p_color_ext, p_color_int, p_engine, p_drive_type, p_doors, p_seats, p_vin ) RETURNING id INTO v_vehicle_id;

RETURN v_vehicle_id; END$$;

---

\-- 2) VEHICLE: UPDATE (parcial con COALESCE)

---

CREATE OR REPLACE FUNCTION api.update_vehicle( p_vehicle_id uuid, p_trim_id bigint DEFAULT NULL, p_year int DEFAULT NULL, p_odometer_km int DEFAULT NULL, p_transmission transmission DEFAULT NULL, p_fuel_type fuel_type DEFAULT NULL, p_color_ext text DEFAULT NULL, p_color_int text DEFAULT NULL, p_engine text DEFAULT NULL, p_drive_type text DEFAULT NULL, p_doors int DEFAULT NULL, p_seats int DEFAULT NULL, p_vin text DEFAULT NULL ) RETURNS void LANGUAGE plpgsql AS $$ BEGIN UPDATE api.vehicles v SET trim_id = COALESCE(p_trim_id, v.trim_id), year = COALESCE(p_year, v.year), odometer_km = COALESCE(p_odometer_km, v.odometer_km), transmission = COALESCE(p_transmission, v.transmission), fuel_type = COALESCE(p_fuel_type, v.fuel_type), color_ext = COALESCE(p_color_ext, v.color_ext), color_int = COALESCE(p_color_int, v.color_int), engine = COALESCE(p_engine, v.engine), drive_type = COALESCE(p_drive_type, [v.drive](http://v.drive)\_type), doors = COALESCE(p_doors, v.doors), seats = COALESCE(p_seats, v.seats), vin = COALESCE(p_vin, [v.vin](http://v.vin)) WHERE [v.id](http://v.id) = p_vehicle_id; END$$;

---

\-- 3) VEHICLE: DELETE (solo si lo permite algún dealer que lo usa)

---

CREATE OR REPLACE FUNCTION api.delete_vehicle(p_vehicle_id uuid) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN -- Tomamos un dealer asociado a un listing del vehículo SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE vehicle_id = p_vehicle_id LIMIT 1;

IF v_dealer IS NOT NULL AND NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to delete vehicle %', p_vehicle_id USING ERRCODE = '42501'; END IF;

DELETE FROM api.vehicles WHERE id = p_vehicle_id; END$$;

---

\-- 4) LISTING: CREATE (permiso listing.write sobre dealer)

---

CREATE OR REPLACE FUNCTION api.create_listing( p_vehicle_id uuid, p_dealer_id uuid, p_title text, p_description text DEFAULT NULL, p_price numeric(12,2) DEFAULT NULL, p_currency text DEFAULT 'USD', p_visibility listing_visibility DEFAULT 'public', p_featured boolean DEFAULT false, p_status listing_status DEFAULT 'draft' ) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE v_listing_id uuid; BEGIN IF NOT api.has_dealer_perm(p_dealer_id, 'listing.write') THEN RAISE EXCEPTION 'No permission to write listings for dealer %', p_dealer_id USING ERRCODE = '42501'; END IF;

INSERT INTO api.vehicle_listings( vehicle_id, dealer_id, title, description, price, currency, visibility, featured, status, created_at ) VALUES ( p_vehicle_id, p_dealer_id, p_title, p_description, p_price, p_currency, p_visibility, p_featured, p_status, now() ) RETURNING id INTO v_listing_id;

RETURN v_listing_id; END$$;

---

\-- 5) LISTING: CREATE VEHICLE + LISTING (atajo)

---

DROP FUNCTION IF EXISTS api.create_vehicle_and_listing( bigint, bigint, uuid, text, bigint, int, int, transmission, fuel_type, text, text, text, text, int, int, text, text, numeric, text, listing_visibility, boolean, listing_status );

CREATE OR REPLACE FUNCTION api.create_vehicle_and_listing( -- Obligatorios p_make_id bigint, p_model_id bigint, p_dealer_id uuid, p_title text, -- Opcionales p_trim_id bigint DEFAULT NULL, p_year int DEFAULT NULL, p_odometer_km int DEFAULT NULL, p_transmission transmission DEFAULT NULL, p_fuel_type fuel_type DEFAULT NULL, p_color_ext text DEFAULT NULL, p_color_int text DEFAULT NULL, p_engine text DEFAULT NULL, p_drive_type text DEFAULT NULL, p_doors int DEFAULT NULL, p_seats int DEFAULT NULL, p_vin text DEFAULT NULL, p_description text DEFAULT NULL, p_price numeric(12,2) DEFAULT NULL, p_currency text DEFAULT 'USD', p_visibility listing_visibility DEFAULT 'public', p_featured boolean DEFAULT false, p_status listing_status DEFAULT 'draft' ) RETURNS TABLE(listing_id uuid, vehicle_id uuid) LANGUAGE plpgsql AS $$ DECLARE v_vehicle_id uuid; v_listing_id uuid; BEGIN v_vehicle_id := api.create_vehicle( p_make_id, p_model_id, p_trim_id, p_year, p_odometer_km, p_transmission, p_fuel_type, p_color_ext, p_color_int, p_engine, p_drive_type, p_doors, p_seats, p_vin ); v_listing_id := api.create_listing( v_vehicle_id, p_dealer_id, p_title, p_description, p_price, p_currency, p_visibility, p_featured, p_status ); RETURN QUERY SELECT v_listing_id, v_vehicle_id; END$$;

---

\-- 6) LISTING: UPDATE (parcial)

---

CREATE OR REPLACE FUNCTION api.update_listing( p_listing_id uuid, p_title text DEFAULT NULL, p_description text DEFAULT NULL, p_visibility listing_visibility DEFAULT NULL, p_featured boolean DEFAULT NULL, p_status listing_status DEFAULT NULL ) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing % not found', p_listing_id USING ERRCODE = '22P02'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to update listing %', p_listing_id USING ERRCODE = '42501'; END IF;

UPDATE api.vehicle_listings l SET title = COALESCE(p_title, l.title), description = COALESCE(p_description, l.description), visibility = COALESCE(p_visibility, l.visibility), featured = COALESCE(p_featured, l.featured), status = COALESCE(p_status, l.status) WHERE [l.id](http://l.id) = p_listing_id; END$$;

---

\-- 7) LISTING: UPDATE PRICE (dispara price_history)

---

CREATE OR REPLACE FUNCTION api.update_listing_price( p_listing_id uuid, p_price numeric(12,2), p_currency text DEFAULT NULL ) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing % not found', p_listing_id USING ERRCODE = '22P02'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to update listing %', p_listing_id USING ERRCODE = '42501'; END IF;

UPDATE api.vehicle_listings SET price = p_price, currency = COALESCE(p_currency, currency) WHERE id = p_listing_id; END$$;

---

\-- 8) LISTING: PUBLISH / ARCHIVE / DELETE

---

CREATE OR REPLACE FUNCTION api.publish_listing(p_listing_id uuid) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to publish listing %', p_listing_id USING ERRCODE = '42501'; END IF;

UPDATE api.vehicle_listings SET status = 'published', published_at = now() WHERE id = p_listing_id; END$$;

CREATE OR REPLACE FUNCTION api.archive_listing(p_listing_id uuid) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to archive listing %', p_listing_id USING ERRCODE = '42501'; END IF;

UPDATE api.vehicle_listings SET status = 'archived' WHERE id = p_listing_id; END$$;

CREATE OR REPLACE FUNCTION api.delete_listing(p_listing_id uuid) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RETURN; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to delete listing %', p_listing_id USING ERRCODE = '42501'; END IF;

DELETE FROM api.vehicle_listings WHERE id = p_listing_id; END$$;

---

\-- 9) PHOTOS: ADD / REORDER / DELETE

---

CREATE OR REPLACE FUNCTION api.add_photo( p_listing_id uuid, p_url text, p_position int DEFAULT NULL, p_alt text DEFAULT NULL, p_width int DEFAULT NULL, p_height int DEFAULT NULL ) RETURNS bigint LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; v_next int; v_photo_id bigint; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to modify photos' USING ERRCODE = '42501'; END IF;

IF p_position IS NULL THEN SELECT COALESCE(MAX(position),0)+1 INTO v_next FROM [api.photos](http://api.photos) WHERE listing_id = p_listing_id; ELSE v_next := p_position; END IF;

INSERT INTO [api.photos](http://api.photos)(listing_id, url, position, alt, width, height) VALUES (p_listing_id, p_url, v_next, p_alt, p_width, p_height) RETURNING id INTO v_photo_id;

RETURN v_photo_id; END$$;

CREATE OR REPLACE FUNCTION api.reorder_photos( p_listing_id uuid, p_photo_ids bigint\[\] -- orden final; 1=cover ) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_dealer uuid; i int := 1; pid bigint; BEGIN SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = p_listing_id; IF v_dealer IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to reorder photos' USING ERRCODE = '42501'; END IF;

FOREACH pid IN ARRAY p_photo_ids LOOP UPDATE [api.photos](http://api.photos) SET position = i WHERE id = pid AND listing_id = p_listing_id; i := i + 1; END LOOP; END$$;

CREATE OR REPLACE FUNCTION api.delete_photo(p_photo_id bigint) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_listing uuid; v_dealer uuid; BEGIN SELECT listing_id INTO v_listing FROM [api.photos](http://api.photos) WHERE id = p_photo_id; IF v_listing IS NULL THEN RETURN; END IF;

SELECT dealer_id INTO v_dealer FROM api.vehicle_listings WHERE id = v_listing; IF NOT api.has_dealer_perm(v_dealer, 'listing.write') THEN RAISE EXCEPTION 'No permission to delete photo' USING ERRCODE = '42501'; END IF;

DELETE FROM [api.photos](http://api.photos) WHERE id = p_photo_id; END$$;

---

\-- 10) LEADS: CREATE (público o autenticado)

---

CREATE OR REPLACE FUNCTION api.create_lead( p_listing_id uuid DEFAULT NULL, p_dealer_id uuid DEFAULT NULL, p_name text DEFAULT NULL, p_email text DEFAULT NULL, p_phone text DEFAULT NULL, p_message text DEFAULT NULL, p_source text DEFAULT 'web' ) RETURNS uuid LANGUAGE plpgsql AS $$ DECLARE v_id uuid; BEGIN INSERT INTO api.leads(listing_id, dealer_id, user_sub, name, email, phone, message, source) VALUES (p_listing_id, p_dealer_id, api.jwt_sub(), p_name, p_email, p_phone, p_message, p_source) RETURNING id INTO v_id; RETURN v_id; END$$;

---

\-- 11) FAVORITES: ADD / REMOVE (usa jwt_sub)

---

CREATE OR REPLACE FUNCTION api.add_favorite(p_listing_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN INSERT INTO api.favorites(user_sub, listing_id) VALUES (api.jwt_sub(), p_listing_id) ON CONFLICT (user_sub, listing_id) DO NOTHING; END$$;

CREATE OR REPLACE FUNCTION api.remove_favorite(p_listing_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN DELETE FROM api.favorites WHERE user_sub = api.jwt_sub() AND listing_id = p_listing_id; END$$;

---

\-- 12) ROLES: asignación global y por dealer (requiere dealer.manage)

---

CREATE OR REPLACE FUNCTION api.assign_user_role( p_user_sub text, p_role_code text ) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_user_id uuid; v_role_id bigint; BEGIN IF NOT api.has_global_perm('dealer.manage') THEN RAISE EXCEPTION 'No permission to assign roles' USING ERRCODE = '42501'; END IF;

SELECT id INTO v_user_id FROM [api.app](http://api.app)\_users WHERE sub = p_user_sub; IF v_user_id IS NULL THEN INSERT INTO [api.app](http://api.app)\_users(sub) VALUES (p_user_sub) RETURNING id INTO v_user_id; END IF;

SELECT id INTO v_role_id FROM [api.app](http://api.app)\_roles WHERE code = p_role_code; IF v_role_id IS NULL THEN RAISE EXCEPTION 'Role % not found', p_role_code; END IF;

INSERT INTO [api.app](http://api.app)\_user_roles(user_id, role_id) VALUES (v_user_id, v_role_id) ON CONFLICT DO NOTHING; END$$;

CREATE OR REPLACE FUNCTION api.assign_user_dealer_role( p_dealer_id uuid, p_user_sub text, p_role_code text ) RETURNS void LANGUAGE plpgsql AS $$ DECLARE v_user_id uuid; v_role_id bigint; BEGIN IF NOT api.has_global_perm('dealer.manage') THEN RAISE EXCEPTION 'No permission to assign dealer roles' USING ERRCODE = '42501'; END IF;

SELECT id INTO v_user_id FROM [api.app](http://api.app)\_users WHERE sub = p_user_sub; IF v_user_id IS NULL THEN INSERT INTO [api.app](http://api.app)\_users(sub) VALUES (p_user_sub) RETURNING id INTO v_user_id; END IF;

SELECT id INTO v_role_id FROM [api.app](http://api.app)\_roles WHERE code = p_role_code; IF v_role_id IS NULL THEN RAISE EXCEPTION 'Role % not found', p_role_code; END IF;

INSERT INTO [api.app](http://api.app)\_user_dealer_roles(dealer_id, user_id, role_id) VALUES (p_dealer_id, v_user_id, v_role_id) ON CONFLICT DO NOTHING; END$$;