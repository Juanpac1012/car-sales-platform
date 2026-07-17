# Documentacion para ClickUp

## Convenciones

Puntos: Fibonacci (1–2–3–5–8–13). 1 punto ≈ 0.5–1 día efectivo, según seniority.

Estado: 🟢 listo, 🟡 revisar/pequeño gap, 🔴 depende de backend nuevo.

RPC/Vistas: las que ya definimos (arriba en la conversación).

## 🧱 Setup & Fundaciones (Sprint 0)

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| S0-1 | Configurar entorno y cliente `rpc()` | `POST /rpc/*` y `GET /v_listings_cards` | `.env` con `VITE_API_URL`; cliente `rpc(name, body, token?)`; manejo 401/403; prueba a `/v_listings_cards?limit=1` | 2   | 🟢  |
| S0-2 | Auth (Login/Registro) | `/rpc/register_local_user`, `/rpc/login_local` | Registro/login funcionan; guarda `token` y `user.sub`; redirige a Home | 5   | 🟢  |
| S0-3 | Guards y RBAC UI | (claims `sub`, roles desde RPC de asignación) | Rutas privadas protegidas; acciones sensibles ocultas/deshabilitadas según permisos | 3   | 🟢  |
| S0-4 | Layout y componentes base | —   | Sidebar, Breadcrumbs, DataTable, EmptyState, toasts; estilo consistente | 5   | 🟢  |

## 📦 Inventario & Catálogos

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| A1  | Listado de inventario con filtros | `GET /vehicle_listings?select=*,vehicles(*),photos(url,position)&status=eq.published&visibility=eq.public&order=created_at.desc` | Tabla con filtros (marca/modelo/año/precio/estado), paginación, miniatura | 5   | 🟢  |
| A2  | Wizard Crear Vehículo + Listing | `POST /rpc/create_vehicle_and_listing` | Paso 1 (vehículo), Paso 2 (listing); validaciones; muestra `listing_id` | 8   | 🟢  |
| A3  | Publicar/Archivar/Eliminar | `/rpc/publish_listing`, `/rpc/archive_listing`, `/rpc/delete_listing` | Acciones con confirm; reflejo inmediato en listado | 3   | 🟢  |
| A4  | Precio + Histórico | `/rpc/update_listing_price`, `GET /price_history?listing_id=eq.{id}&order=recorded_at.desc` | Form de precio; timeline de cambios; trigger escribe histórico | 5   | 🟢  |
| A5  | Gestor de fotos (D&D) | `/rpc/add_photo`, `/rpc/reorder_photos`, `/rpc/delete_photo` | Subir, ordenar (portada=1), borrar; preview | 5   | 🟢  |

## 🛠 Operación (Ingreso, Inspección, Retoques)

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| B1  | CRUD catálogos (makes/models/trims/features/locations/dealers) | `GET/POST/PATCH/DELETE /<tabla>` (RLS según rol) | Listar/crear/editar/borrar con validaciones; control de permisos | 6   | 🟢  |

| ID  | Tarea | Endpoint/RPC (propuestos) | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| O0  | **Backend**: modelo y RPC de Operación | Tablas: `work_orders`, `work_order_steps`; Vistas: `v_counts_operations`; RPC: `create_work_order`, `advance_work_order`, `attach_work_photo` | SQL + RLS + RPC listos; contadores por dealer | 8   | 🔴  |
| O1  | Bandejas por estado | `GET /work_orders?status=eq.ingreso/inspeccion/retoques&dealer_id=eq.{dealer}` | Listas separadas con filtros (fecha/dealer) | 8   | 🔴  |
| O2  | Formulario Ingreso | `/rpc/advance_work_order(...,'ingreso')` | Guardado de checklist/notas/fotos, cambio de estado | 5   | 🔴  |
| O3  | Formulario Inspección | `/rpc/advance_work_order(...,'inspeccion')` | Registro técnico + adjuntos | 5   | 🔴  |
| O4  | Formulario Retoques | `/rpc/advance_work_order(...,'retoques')` | Mano de obra/partes + fotos A/B | 5   | 🔴  |
| O5  | Badges Sidebar (conteos) | `GET /v_counts_operations?dealer_id=eq.{dealer}` | Números de menú coinciden con BD y cambian en tiempo real (poll o SWR) | 3   | 🔴  |

## 🛒 Venta

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| V1  | Listado de oportunidades del dealer | `GET /vehicle_listings?dealer_id=eq.{dealer}&select=*,vehicles(*),photos(url,position)` | Lista filtrable por status/featured/rango precio | 5   | 🟢  |
| V2  | Acciones masivas (publicar/archivar/featured) | RPC anteriores + PATCH featured | Selección múltiple; feedback por lote | 5   | 🟢  |
| V3  | Leads (bandeja) | `POST /rpc/create_lead` (público), `GET /v_leads_secure?dealer_id=eq.{dealer}` | Alta lead pública; lectura filtrada por dealer; si no hay `v_leads_secure`, usar `/leads` con RLS | 7   | 🟡  |

## 👥 Clientes

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| C1  | Favoritos del usuario | `/rpc/add_favorite`, `/rpc/remove_favorite`, `GET /favorites?user_sub=eq.{sub}&select=vehicle_listings(...)` | Añadir/quitar; listado propio del usuario | 3   | 🟢  |
| C2  | Perfil básico | `GET /app_users?sub=eq.{sub}` (+ PATCH si aplica) | Ver sub/email; editar campos básicos si existen | 3   | 🟢  |

## 📊 Inteligencia (Dashboard & Reportes)

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| I1  | Dashboard (KPIs + 1 gráfica) | KPIs: `count` de `vehicle_listings` / `leads` últimos 7d; `avg(price)` o vista agregada | 4 KPIs + 1 chart de tendencia, filtros por dealer/rango | 8   | 🟡  |
| I2  | Reportes exportables (CSV) | Mismas vistas con filtros `created_at`/`price` | Export CSV en inventario/leads/precios | 8   | 🟡  |

## 🔐 Seguridad y DevOps

| ID  | Tarea | Endpoint/RPC | Criterios de aceptación | Pts | Estado |
| --- | --- | --- | --- | --- | --- |
| S1  | RLS en UI (botones/acciones) | —   | No se muestran acciones sin permiso; errores 403/42501 con mensaje claro | 3   | 🟢  |
| S2  | Gestión de roles | `/rpc/assign_user_role`, `/rpc/assign_user_dealer_role` | Panel mínimo para asignar/remover roles; logs | 5   | 🟢  |
| S3  | Manejo de errores global | —   | Toasts/alerts, retry 5xx, logging básico | 2   | 🟢  |