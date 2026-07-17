# Documentacion RPC Postgress

# Background

# 0) Chequeo rápido de salud

**GET** `/<schema>/` o cualquier vista pública para validar CORS y conectividad:

```
GET /v_listings_cards?limit=1
```

---

# 1) Vehículos

## 1.1 Crear vehículo

**POST** `/rpc/create_vehicle`

**Auth**: requerida si la tabla `vehicles` queda protegida por RLS (recomendado).

**Body**

```json
{
  "p_make_id": 1,
  "p_model_id": 10,
  "p_trim_id": null,
  "p_year": 2019,
  "p_odometer_km": 45000,
  "p_transmission": "automatic",
  "p_fuel_type": "gasoline",
  "p_color_ext": "Blanco",
  "p_color_int": "Negro",
  "p_engine": "1.6",
  "p_drive_type": "FWD",
  "p_doors": 4,
  "p_seats": 5,
"p_price1" : 1000,
"p_price2" : 2000,
  "p_license":"abp-456",
  "p_notes":"le falta el marchamo"
  "p_vin": null}
```

**200** → `"uuid-del-vehículo"`

## 1.2 Actualizar vehículo

**POST** `/rpc/update_vehicle`

**Auth**: requerida (mismo criterio).

**Body** (todos opcionales excepto `p_vehicle_id`)

```json
{
  "p_vehicle_id": "UUID_VEHICULO",
  "p_year": 2020,
  "p_odometer_km": 48000
}
```

**204** sin contenido.

## 1.3 Borrar vehículo

**POST** `/rpc/delete_vehicle`

**Auth**: requerida; necesita permiso `listing.write` en algún dealer que lo use.

**Body**

```json
{ "p_vehicle_id": "UUID_VEHICULO" }
```

**204** sin contenido.

---

# 2) Listings (anuncios)

## 2.1 Crear listing

**POST** `/rpc/create_listing`

**Auth**: requerida; necesita `listing.write` en ese `dealer_id`.

**Body**

```json
{
  "p_vehicle_id": "UUID_VEHICULO",
  "p_dealer_id": "UUID_DEALER",
  "p_title": "Toyota Corolla 2019",
  "p_description": "Único dueño",
  "p_price": 12990,
  "p_currency": "USD",
  "p_visibility": "public",
  "p_featured": false,
  "p_status": "draft"
}
```

**200** → `"uuid-del-listing"`

## 2.2 Crear _vehículo + listing_ (atajo)

**POST** `/rpc/create_vehicle_and_listing`

**Auth**: requerida; valida permiso en `p_dealer_id`.

**Body** (obligatorios primero)

```json
{
  "p_make_id": 1,
  "p_model_id": 10,
  "p_dealer_id": "UUID_DEALER",
  "p_title": "Toyota Corolla 2019",
  "p_year": 2019,
  "p_price": 12990
}
```

**200** → `[{ "listing_id": "UUID", "vehicle_id": "UUID" }]`

## 2.3 Actualizar (parcial)

**POST** `/rpc/update_listing`

**Auth**: requerida (`listing.write`).

**Body**

```json
{
  "p_listing_id": "UUID_LISTING",
  "p_title": "Corolla 2019 LE",
  "p_featured": true}
```

**204**.

## 2.4 Cambiar precio (crea histórico)

**POST** `/rpc/update_listing_price`

**Auth**: requerida (`listing.write`).

**Body**

```json
{
  "p_listing_id": "UUID_LISTING",
  "p_price": 12490,
  "p_currency": "USD"
}
```

**204**.

## 2.5 Publicar

**POST** `/rpc/publish_listing`

**Auth**: requerida (`listing.write`).

**Body**

```json
{ "p_listing_id": "UUID_LISTING" }
```

**204**.

## 2.6 Archivar

**POST** `/rpc/archive_listing`

**Auth**: requerida (`listing.write`).

**Body**

```json
{ "p_listing_id": "UUID_LISTING" }
```

**204**.

## 2.7 Eliminar listing

**POST** `/rpc/delete_listing`

**Auth**: requerida (`listing.write`).

**Body**

```json
{ "p_listing_id": "UUID_LISTING" }
```

**204**.

---

# 3) Fotos

## 3.1 Agregar foto

**POST** `/rpc/add_photo`

**Auth**: requerida (`listing.write`).

**Body**

```json
{
  "p_listing_id": "UUID_LISTING",
  "p_url": "<https://cdn.tuapp.com/fotos/auto1.jpg>",
  "p_position": 1,
  "p_alt": "Frente",
  "p_width": 1600,
  "p_height": 1067
}
```

**200** → `photo_id` (bigint)

## 3.2 Reordenar fotos

**POST** `/rpc/reorder_photos`

**Auth**: requerida (`listing.write`).

**Body**

```json
{
  "p_listing_id": "UUID_LISTING",
  "p_photo_ids": [12, 9, 15]   // 12 queda cover (position=1)
}
```

**204**.

## 3.3 Eliminar foto

**POST** `/rpc/delete_photo`

**Auth**: requerida (`listing.write`).

**Body**

```json
{ "p_photo_id": 12 }
```

**204**.

---

# 4) Leads y favoritos

## 4.1 Crear lead

**POST** `/rpc/create_lead`

**Auth**: **opcional** (si hay token, se asocia `user_sub`).

**Body**

```json
{
  "p_listing_id": "UUID_LISTING",
  "p_dealer_id": "UUID_DEALER",
  "p_name": "Ana",
  "p_email": "ana@correo.com",
  "p_phone": "+506 8888-8888",
  "p_message": "¿Sigue disponible?",
  "p_source": "web"
}
```

**200** → `"uuid-del-lead"`

## 4.2 Añadir favorito

**POST** `/rpc/add_favorite`

**Auth**: **obligatoria** (usa `jwt_sub`).

**Body**

```json
{ "p_listing_id": "UUID_LISTING" }
```

**204**.

## 4.3 Quitar favorito

**POST** `/rpc/remove_favorite`

**Auth**: **obligatoria**.

**Body**

```json
{ "p_listing_id": "UUID_LISTING" }
```

**204**.

---

# 5) Asignación de roles (RBAC por datos)

> Requiere permiso global dealer.manage (ej. usuario admin). Úsalo desde tu panel interno, no desde el público.

## 5.1 Rol global para un usuario

**POST** `/rpc/assign_user_role`

**Auth**: admin (`dealer.manage`).

**Body**

```json
{ "p_user_sub": "user_123", "p_role_code": "viewer" }
```

**204**.

## 5.2 Rol dentro de un dealer

**POST** `/rpc/assign_user_dealer_role`

**Auth**: admin (`dealer.manage`).

**Body**

```json
{
  "p_dealer_id": "UUID_DEALER",
  "p_user_sub": "user_123",
  "p_role_code": "dealer_editor"
}
```

**204**.

---

# 6) Endpoints REST públicos útiles para el frontend (no RPC)

- **Cards** (home):`GET /v_listings_cards?order=created_at.desc&limit=12`
- **Búsqueda normalizada**:`GET /vehicle_listings?status=eq.published&visibility=eq.public&select=*,vehicles(*),photos(url,position)&price=lte.20000&order=price.asc`
- **Detalle**:`GET /vehicle_listings?id=eq.{UUID}&select=*,vehicles(*),photos(*),price_history(*)`

---

# 7) Ejemplos con `curl`

```bash
# Crear vehículo + listing
curl -X POST "$API/rpc/create_vehicle_and_listing" \\
 -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \\
 -d '{"p_make_id":1,"p_model_id":10,"p_dealer_id":"UUID_DEALER","p_title":"Corolla 2019","p_year":2019,"p_price":12990}'

# Publicar
curl -X POST "$API/rpc/publish_listing" \\
 -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \\
 -d '{"p_listing_id":"UUID_LISTING"}'

# Añadir foto
curl -X POST "$API/rpc/add_photo" \\
 -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \\
 -d '{"p_listing_id":"UUID_LISTING","p_url":"<https://cdn/app/foto1.jpg>"}'

# Lead (público, sin token)
curl -X POST "$API/rpc/create_lead" \\
 -H "Content-Type: application/json" \\
 -d '{"p_listing_id":"UUID_LISTING","p_name":"Ana","p_email":"ana@correo.com"}'

# Cards públicas
curl "$API/v_listings_cards?order=created_at.desc&limit=4"
```

---

## 8) Errores comunes y cómo leerlos

- `401 Unauthorized`: falta `Authorization: Bearer <JWT>` o token inválido/expirado.
- `403 Forbidden` **/** `42501 permission denied`: RLS bloqueó la acción (falta permiso `listing.write`, `lead.read`, etc.).
- `42883 function does not exist`: nombre de función mal escrito o no está en el **schema** publicado en `db-schemas`.
- `23503 foreign_key_violation`: `vehicle_id`/`dealer_id` inexistente.
- `22P02 invalid_text_representation`: UUID/num en formato inválido.

---

## 9) Requisitos de backend (PostgREST)

- `db-schemas = "api"`
- `db-anon-role = "web_anon"`
- `jwt-secret = "<tu_secreto_largo>"`
- Roles `web_anon`/`web_user` y **RLS** ya configurados (como definimos).

Context, objectives, and scope of the document

## 10) Matriz rápida de endpoints

| Módulo | RPC/Vista | Método | Ruta | Auth |
| --- | --- | --- | --- | --- |
| Auth | `register_local_user` | POST | `/rpc/register_local_user` | ❌   |
| Auth | `login_local` | POST | `/rpc/login_local` | ❌   |
| Roles | `assign_user_role` | POST | `/rpc/assign_user_role` | ✅   |
| Roles | `assign_user_dealer_role` | POST | `/rpc/assign_user_dealer_role` | ✅   |
| Vehículos | `create_vehicle` | POST | `/rpc/create_vehicle` | ✅   |
| Vehículos | `update_vehicle` | POST | `/rpc/update_vehicle` | ✅   |
| Vehículos | `delete_vehicle` | POST | `/rpc/delete_vehicle` | ✅   |
| Listings | `create_listing` | POST | `/rpc/create_listing` | ✅   |
| Listings | `create_vehicle_and_listing` | POST | `/rpc/create_vehicle_and_listing` | ✅   |
| Listings | `update_listing` | POST | `/rpc/update_listing` | ✅   |
| Listings | `update_listing_price` | POST | `/rpc/update_listing_price` | ✅   |
| Listings | `publish_listing` | POST | `/rpc/publish_listing` | ✅   |
| Listings | `archive_listing` | POST | `/rpc/archive_listing` | ✅   |
| Listings | `delete_listing` | POST | `/rpc/delete_listing` | ✅   |
| Fotos | `add_photo` | POST | `/rpc/add_photo` | ✅   |
| Fotos | `reorder_photos` | POST | `/rpc/reorder_photos` | ✅   |
| Fotos | `delete_photo` | POST | `/rpc/delete_photo` | ✅   |
| Leads | `create_lead` | POST | `/rpc/create_lead` | ❌/✅ |
| Favoritos | `add_favorite` | POST | `/rpc/add_favorite` | ✅   |
| Favoritos | `remove_favorite` | POST | `/rpc/remove_favorite` | ✅   |
| Operación | `create_work_order` | POST | `/rpc/create_work_order` | ✅   |
| Operación | `advance_work_order` | POST | `/rpc/advance_work_order` | ✅   |
| Operación | `attach_work_photo` | POST | `/rpc/attach_work_photo` | ✅   |
| Operación | `reorder_work_photos` | POST | `/rpc/reorder_work_photos` | ✅   |
| Operación | `delete_work_photo` | POST | `/rpc/delete_work_photo` | ✅   |
| UI  | `v_counts_operations` | GET | `/v_counts_operations` | ✅   |
| UI  | `v_kpi_dealer_daily` | GET | `/v_kpi_dealer_daily` | ✅   |
| Catálogos | tablas | GET/POST/PATCH/DELETE | `/makes`, `/models`, … | ✅/❌ según RLS |