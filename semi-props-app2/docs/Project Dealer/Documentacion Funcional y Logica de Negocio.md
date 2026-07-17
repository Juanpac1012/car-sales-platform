# Documentacion Funcional y Logica de Negocio

## 1) Contexto del proyecto (FE / BE)

- **Frontend**: Vite + React + TypeScript + Tailwind + shadcn-ui. [GitHub](https://github.com/eatorres510/semi-props-app2)
- **Backend**: PostgreSQL + PostgREST (JWT HS256).
- **Dominio**: gestión de seminuevos por **dealer**; flujo operativo **Ingreso → Inspección → Retoques → Listo**, inventario, venta (listings), leads, favoritos y analítica.

**Convención API**

- Base URL (ej.): https://postrest-dealercar-postrest.kwu5pq.easypanel.host/
- **Auth**: `Authorization: Bearer <JWT>`
- **RPC**: `POST /rpc/<función>` con JSON
- **Lectura**: `GET /<tabla|vista>?select=...&filters...`
- **Códigos**: `200/201` (JSON), `204` (sin cuerpo), `401` (no auth), `403/42501` (RLS), `23503/23505` (FK/unique), `22P02` (UUID inválido)

---

# 2) Roles y modelo de permisos (qué puede ver/hacer cada uno)

| Rol | Alcance | Puede |
| --- | --- | --- |
| **Admin** | Global | Todo el sistema; asignar roles, catálogos, todos los dealers |
| **Dueño** | Dealer | CRUD de listings/precios/fotos; operar órdenes; leer leads; asignar roles **de su dealer** |
| **Vendedor** | Dealer | CRUD de listings/precios/fotos; leer leads |
| **Operaciones** | Dealer | Operar órdenes (Ingreso/Inspección/Retoques; cerrar en “Listo”) |

> RLS valida sub + dealer y permisos: listing.write, work.read, work.write, dealer.manage, leads.read, catalog.write.

---

# 3) Autenticación (lógica FE)

1.  **Login local** (QA/dev): `POST /rpc/login_local` → `{ access_token, user }`
2.  Guardar `access_token` (storage seguro) + `user.sub`.
3.  Todas las peticiones protegidas deben incluir `Authorization: Bearer <JWT>`.
4.  Si un `GET` devuelve `401`, redirigir a login. Si `403/42501`, ocultar acciones restringidas y mostrar toast de permisos.

---

# 4) Módulo **Operación** (Ingreso, Inspección, Retoques)

## 4.1 Bandejas (listas por estado)

**Objetivo:** mostrar órdenes por **dealer** y **status** con paginación, abrir detalle y realizar acciones.

- **Lista**:`GET /work_orders?dealer_id=eq.<UUID_DEALER>&status=eq.ingreso&order=created_at.desc&limit=20&offset=0`**Permiso:** `work.read` (o fallback desde helpers si aplica).
- **Badges (contador menú)**:`GET /v_counts_operations?dealer_id=eq.<UUID_DEALER>` → `{ ingreso, inspeccion, retoques }`**Lógica FE:** consultar al montar el layout y también al **mutar** (advance, create, delete) para refrescar.

## 4.2 Crear orden (Ingreso)

**Objetivo:** abrir orden para un **vehicle** en un **dealer**, crear step inicial.

- **Endpoint:** `POST /rpc/create_work_order`**Body:**
    
    ```json
    { "p_vehicle_id":"<UUID_VEHICLE>", "p_dealer_id":"<UUID_DEALER>" }
    ```
    
    **Res:** `"UUID_WORK_ORDER"`**Esperado FE:** navegar al detalle de la orden; actualizar badge **Ingreso**.

## 4.3 Avanzar orden (a Inspección, Retoques o Listo)

**Objetivo:** registrar notas y mover el estado.

- **Endpoint:** `POST /rpc/advance_work_order`**Body:**
    
    ```json
    {
      "p_work_order_id":"<UUID_ORDER>",
      "p_next_status":"inspeccion",   // ingreso|inspeccion|retoques|listo
      "p_notes":"Checklist OK"
    }
    ```
    
    **Res:** `204 No Content`**Lógica:** inserta `step` si el nuevo estado es `ingreso/inspeccion/retoques`; si `listo`, setea `closed_at`.**Esperado FE:**
    - Optimistic update del estado para UX fluida.
    - Refrescar lista origen (badge) y, si procede, navegar a la bandeja destino.

## 4.4 Fotos de operación (evidencias)

**Agregar:** `POST /rpc/attach_work_photo`

```json
{
  "p_work_order_id":"<UUID_ORDER>",
  "p_url":"<https://cdn/app/foto.jpg>",
  "p_step_id": null,        // opcional
  "p_position": null        // si null, se autoincrementa
}
```

**Reordenar:** `POST /rpc/reorder_work_photos` → `{ "p_work_order_id":"<UUID>", "p_photo_ids":[12,7,5] }`

**Eliminar:** `POST /rpc/delete_work_photo` → `{ "p_photo_id": 12 }`

**Permiso:** `work.write`

**Esperado FE:**

- Vista tipo galería con “portada” = `position = 1`.
- Reordenar por drag&drop → enviar `photo_ids` en orden final.

---

# 5) Módulo **Inventario interno** (Vehículos)

## 5.1 Listado y detalle

- **Lista**: `GET /vehicles?order=created_at.desc&limit=20&offset=0`
- **Detalle**: `GET /vehicles?id=eq.<UUID>&select=*`

## 5.2 Crear / editar / eliminar

**Crear** — `POST /rpc/create_vehicle`

```json
{
  "p_make_id": 1, "p_model_id": 10, "p_trim_id": null,
  "p_year": 2019, "p_odometer_km": 56000,
  "p_transmission": "A", "p_fuel_type": "GAS",
  "p_color_ext": "blanco", "p_color_int": "negro",
  "p_engine": "1.6", "p_drive_type": "FWD",
  "p_doors": 4, "p_seats": 5, "p_vin": "XXXX..."
}
```

**Editar** — `POST /rpc/update_vehicle` (parcial, solo campos a cambiar)

```json
{ "p_vehicle_id":"<UUID>", "p_year":2020 }
```

**Eliminar** — `POST /rpc/delete_vehicle` → `{ "p_vehicle_id":"<UUID>" }`

**Lógica/validaciones:** FK a `makes/models/trims`; enums `transmission/fuel_type`. Delete exige permiso en un dealer que lo liste.

**Lo que espera el FE:**

- En el **wizard** de venta, usar **Opción B** (crear vehículo + listing) para reducir pasos.

---

# 6) Módulo **Venta** (Listings, precios, fotos)

## 6.1 Listado

- **Dealer**:`GET /vehicle_listings?dealer_id=eq.<UUID_DEALER>&select=*,vehicles(*),photos(url,position)&order=created_at.desc`
- **Públicos (web)**:`GET /vehicle_listings?status=eq.published&visibility=eq.public&select=*,vehicles(*),photos(url,position)&order=published_at.desc`

## 6.2 Crear listing (sobre vehículo)

**Endpoint:** `POST /rpc/create_listing`

```json
{
  "p_vehicle_id":"<UUID_VEHICLE>",
  "p_dealer_id":"<UUID_DEALER>",
  "p_title":"Toyota Yaris 2019",
  "p_description":"Muy buen estado",
  "p_price": 10990.00,
  "p_currency":"USD",
  "p_visibility":"public",
  "p_featured": false,
  "p_status":"draft"
}
```

**Res:** `"UUID_LISTING"`

**Permiso:** `listing.write`

## 6.3 Crear **vehículo + listing** (atajo)

**Endpoint:** `POST /rpc/create_vehicle_and_listing`

```json
{
  "p_make_id":1, "p_model_id":10, "p_dealer_id":"<UUID_DEALER>",
  "p_title":"Yaris 2019", "p_year":2019, "p_price":10990,
  "p_currency":"USD", "p_visibility":"public", "p_featured": false, "p_status":"draft"
}
```

**Res:** `{ "listing_id":"...", "vehicle_id":"..." }`

## 6.4 Editar metadata

**Endpoint:** `POST /rpc/update_listing`

```json
{
  "p_listing_id":"<UUID>",
  "p_title":"Yaris SD 2019",
  "p_description":"Único dueño",
  "p_visibility":"public",
  "p_featured": true,
  "p_status":"draft"
}
```

**Res:** `204`

## 6.5 Precio (con histórico)

**Endpoint:** `POST /rpc/update_listing_price`

```json
{ "p_listing_id":"<UUID>", "p_price": 10490.00, "p_currency":"USD" }
```

**Res:** `204`

**Lógica:** se registra en `price_history` por trigger.

**Lectura histórico:**

`GET /price_history?listing_id=eq.<UUID>&order=recorded_at.desc`

## 6.6 Publicar/Archivar/Eliminar

- `POST /rpc/publish_listing` → `{ "p_listing_id":"<UUID>" }`
- `POST /rpc/archive_listing` → `{ "p_listing_id":"<UUID>" }`
- `POST /rpc/delete_listing` → `{ "p_listing_id":"<UUID>" }`**Lógica:** publicar setea `published_at = now()` y `status='published'`.**UX esperada:** confirmación previa; refrescar lista y **contadores** del dealer si se muestran.

## 6.7 Fotos del listing

**Agregar** — `POST /rpc/add_photo`

```json
{
  "p_listing_id":"<UUID_LISTING>",
  "p_url":"<https://cdn/app/foto1.jpg>",
  "p_position": null,
  "p_alt":"frontal",
  "p_width":1280,
  "p_height":720
}
```

**Reordenar** — `POST /rpc/reorder_photos` → `{ "p_listing_id":"<UUID>", "p_photo_ids":[10,7,5,3] }`

**Eliminar** — `POST /rpc/delete_photo` → `{ "p_photo_id": 10 }`

**Regla:** `position = 1` es **portada**.

---

# 7) Módulo **Leads** y **Favoritos**

## 7.1 Lead (público o autenticado)

**Crear** — `POST /rpc/create_lead`

```json
{
  "p_listing_id":"<UUID_LISTING>",
  "p_dealer_id":"<UUID_DEALER>",
  "p_name":"Ana",
  "p_email":"ana@correo.com",
  "p_phone":"+506...",
  "p_message":"¿Está disponible?",
  "p_source":"web"
}
```

**Res:** `"UUID_LEAD"`

**Lógica:** si hay JWT, el backend rellena `user_sub`.

**Bandeja dealer:** `GET /leads?dealer_id=eq.<UUID_DEALER>&order=created_at.desc` (RLS con `leads.read`).

## 7.2 Favoritos (requiere JWT)

- **Agregar** — `POST /rpc/add_favorite` → `{ "p_listing_id":"<UUID>" }`
- **Quitar** — `POST /rpc/remove_favorite` → `{ "p_listing_id":"<UUID>" }`**Lectura “Mis favoritos”**:`GET /favorites?user_sub=eq.<SUB>&select=listing_id,vehicle_listings(*,photos(url,position),vehicles(*))`**UX:** toggle idempotente; pintar estado local sin esperar (optimista).

---

# 8) Módulo **Catálogos** (según rol)

- **Tablas**: `makes`, `models`, `trims`, `features`, `locations`, `dealers`
- **Lecturas**: `GET /makes?order=name.asc` (análogas para las demás)
- **ABM (opcional)**: `catalog.write` (Admin y, si se decide, Dueño)

---

# 9) Dashboard & Reportes (Inteligencia)

## 9.1 KPIs (últimos 30 días)

**Vista** `v_kpi_dealer_daily`

`GET /v_kpi_dealer_daily?dealer_id=eq.<UUID_DEALER>&order=day.asc`

**KPIs sugeridos:** publicados/día, leads/día, precio promedio/día.

## 9.2 Reportes

- Inventario/listings filtrados; leads por rango.
- Exportar CSV en cliente o endpoint dedicado si el volumen crece.

---

# 10) Flujo de navegación + estados (qué se espera del FE)

1.  **Login** → guarda JWT y `sub`; redirige a Home (por rol).
2.  **Menú con badges** (Operación): hit a `v_counts_operations` y refrescar tras cada mutación.
3.  **Inventario**: alta/edición vehículo; botón “Publicar” abre **wizard**:
    - Opción rápida: **create_vehicle_and_listing**.
    - Opción separada: **create_vehicle** y luego **create_listing**.
4.  **Listings**:
    - Editar metadata (título/desc/visibilidad/destacado).
    - Precio con histórico (cargar al abrir el modal).
    - Fotos: drag&drop para reordenar y POST `reorder_photos`.
    - Publicar/archivar con confirmación.
5.  **Operación**:
    - Crear orden desde vehículo/listing (o menú Operación).
    - Tarjeta detalle muestra timeline (steps) + adjuntos.
    - Acción “Avanzar” pide notas (opcional); si **Listo**, bloquea más avances.
6.  **Leads**:
    - Formulario público en detalle del listing.
    - Bandeja interna por dealer (paginación + búsqueda simple).
7.  **Favoritos**:
    - Cards/Detalle con icono ♥; requiere JWT; actualizar lista local al vuelo.

**Manejo de errores**

- `401`: limpiar token y enviar a login.
- `403/42501`: ocultar acciones y mostrar “No tienes permisos”.
- `23503/23505`: mostrar mensaje “Dato inválido / duplicado”.
- `22P02`: revisar UUID en ruta/params.

**Rendimiento**

- Paginación server-side siempre (`limit/offset`).
- Cache de lecturas con React Query/SWR (recomendado).
- Mutaciones optimistas en **status**, **precio** y **favoritos**; invalidar queries.

**Subidas de archivos**

- Las funciones RPC esperan **URL**; el FE debe subir a un storage (S3/Supabase Storage/Cloudinary) y, con el URL resultante, invocar `add_photo` / `attach_work_photo`.

---

# 11) Tabla–Campo (resumen de contratos)

**vehicles**

`id(uuid), make_id(bigint), model_id(bigint), trim_id(bigint?), year(int?), odometer_km(int?), transmission(enum?), fuel_type(enum?), color_ext(text?), color_int(text?), engine(text?), drive_type(text?), doors(int?), seats(int?), vin(text?), created_at(timestamptz)`

**vehicle_listings**

`id(uuid), vehicle_id(uuid), dealer_id(uuid), title(text), description(text?), price(numeric?), currency(text), visibility(enum), featured(bool), status(enum), created_at(ts), published_at(ts?)`

**photos**

`id(bigserial), listing_id(uuid), url(text), position(int), alt(text?), width(int?), height(int?), created_at(ts)`

**work_orders**

`id(uuid), vehicle_id(uuid), dealer_id(uuid), status(enum), created_by(text), created_at(ts), updated_at(ts), closed_at(ts?)`

**work_order_steps**

`id(bigserial), work_order_id(uuid), step_type(enum), notes(text?), created_by(text), created_at(ts)`

**work_photos**

`id(bigserial), work_order_id(uuid), step_id(bigint?), url(text), position(int?), created_at(ts)`

**leads**

`id(uuid), listing_id(uuid?), dealer_id(uuid?), user_sub(text?), name(text?), email(text?), phone(text?), message(text?), source(text), created_at(ts)`

**favorites**

`(PK user_sub,text + listing_id,uuid), created_at(ts)`

---

# 12) Snippets de integración (ejemplos FE)

**RPC helper**

```tsx
async function rpc<T>(name: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API}/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? (undefined as T) : await res.json();
}
```

**Crear vehículo + listing**

```tsx
await rpc<{ listing_id: string; vehicle_id: string }>('create_vehicle_and_listing', {
  p_make_id: 1, p_model_id: 10, p_dealer_id, p_title: 'Yaris 2019', p_price: 10990
}, token);
```

**Publicar**

```tsx
await rpc<void>('publish_listing', { p_listing_id }, token);
```

**Avanzar orden**

```tsx
await rpc<void>('advance_work_order', { p_work_order_id, p_next_status: 'inspeccion', p_notes }, token);
```

**Agregar favorito**

```tsx
await rpc<void>('add_favorite', { p_listing_id }, token);
```

---

## 13) Qué revisar del repo (FE) al iniciar

- **Ruta y Layout**: Sidebar con badges (Operación) + rutas: _Ingreso_, _Inspección_, _Retoques_, _Inventario Interno_, _Venta_, _Clientes_, _Proveedores_, _Dashboard_, _Reportes_.
- **Estado global**: si no hay store, introducir React Query para cache y **loading/error** homogéneos.
- **Componentes comunes**: tablas paginadas, modales de confirmación, uploader externo (S3/Supabase/Cloudinary), galería (drag&drop).
- **Tema**: Tailwind/shadcn (respetar diseño atómico). [GitHub](https://github.com/eatorres510/semi-props-app2)