# Roles de Seguridad

## 🎯Definición funcional por rol

| Rol | Ámbito | Propósito |
| --- | --- | --- |
| **Admin** | **Global** | Administra el sistema: gestiona dealers, catálogos, usuarios y roles. Ve toda la data de todos los dealers. No está atado a un dealer específico. |
| **Dueño** | **Por dealer** | Máxima autoridad dentro de un dealer. Puede hacer todo en su dealer: inventario, listings (precio/publicar/fotos), flujo de Operación (Ingreso/Inspección/Retoques) y asignar/remover roles en su dealer. |
| **Vendedor** | **Por dealer** | Gestiona la venta: crea/edita listings, actualiza precio, publica/archiva, maneja fotos, ve leads del dealer. **No** cambia catálogos ni permisos del dealer. |
| **Operaciones** | **Por dealer** | Gestiona el workflow interno: Ingreso, Inspección, Retoques. Puede crear/avanzar órdenes y adjuntar fotos. **No** publica listings ni cambia precios. |

Nota: la lectura “básica” (ver listados e inventario de su dealer) se asume para Dueño, Vendedor y Operaciones. Admin ve todo.

## 🔧 Matriz de permisos → capacidades (mapeo a RLS/RPC existentes)

Tu backend ya usa helpers:

- `api.has_global_perm('…')`
- `api.has_dealer_perm(dealer_id, '…')`

Y políticas/RPC que miran permisos como `listing.write`, `work.write`, `work.read`, `dealer.manage` (y opcionalmente `catalog.write`, `leads.read`, etc.). Esta es la **propuesta de mapeo**:

| Permiso | Qué habilita (en tu app hoy) | Admin | Dueño | Vendedor | Operaciones |
| --- | --- | --- | --- | --- | --- |
| `dealer.manage` | Asignar roles a usuarios dentro del dealer | ✅ (global) | ✅ (solo su dealer) | ❌   | ❌   |
| `listing.write` | Crear/editar/publish/archive/delete listings, **actualizar precio**, **gestionar fotos** | ✅   | ✅   | ✅   | ❌   |
| `work.write` | Crear/avanzar **work_orders**, adjuntar/reordenar/borrar fotos de operación | ✅   | ✅   | ❌   | ✅   |
| `work.read` | Ver work_orders y sus pasos/fotos | ✅   | ✅   | ✅ _(solo lectura si quieres)_ | ✅   |
| `catalog.write` _(opcional)_ | ABM de catálogos (makes, models, trims, features, locations, dealers) | ✅   | ✅ _(si decides)_ | ❌   | ❌   |
| `leads.read` _(opcional)_ | Ver bandeja de leads del dealer | ✅   | ✅   | ✅   | ❌   |

**Cómo impacta en las RPC y RLS actuales:**

- **Listings / Fotos de listing**: exigen `listing.write` en el dealer → **Dueño**, **Vendedor**, **Admin**.
- **Operación (work_orders/steps/photos)**: exigen `work.write` para modificar y `work.read` para ver → **Dueño**, **Operaciones**, **Admin** (Vendedor puede tener solo `work.read` si deseas).
- **Asignación de roles**: usa `dealer.manage` → **Dueño** en su dealer, **Admin** global.
- **Leads**: `create_lead` es público; lectura puede condicionarse a `leads.read` o, si no lo implementas aún, a `listing.write` como fallback (actual).

## ⚡ Asignación de roles con tus RPC (PostgREST)

Tienes estas dos funciones:

- `POST /rpc/assign_user_role` → **rol global** (solo Admin debería poder usarla)
- `POST /rpc/assign_user_dealer_role` → **rol por dealer**

## 3.1 Asignar Admin (global)

```bash
curl -X POST "$API/rpc/assign_user_role" \\
  -H "Authorization: Bearer <JWT-ADMIN>" \\
  -H "Content-Type: application/json" \\
  -d '{ "p_user_sub": "local:<UUID_USUARIO>", "p_role_code": "admin" }'
```

## 3.2 Asignar Dueño / Vendedor / Operaciones a un dealer

```bash
# Dueño de dealer
curl -X POST "$API/rpc/assign_user_dealer_role" \\
  -H "Authorization: Bearer <JWT-ADMIN_O_DUENO>" \\
  -H "Content-Type: application/json" \\
  -d '{ "p_dealer_id":"<UUID_DEALER>", "p_user_sub":"local:<UUID_USUARIO>", "p_role_code":"dealer_owner" }'

# Vendedor
curl -X POST "$API/rpc/assign_user_dealer_role" \\
  -H "Authorization: Bearer <JWT-ADMIN_O_DUENO>" \\
  -H "Content-Type: application/json" \\
  -d '{ "p_dealer_id":"<UUID_DEALER>", "p_user_sub":"local:<UUID_USUARIO>", "p_role_code":"vendedor" }'

# Operaciones
curl -X POST "$API/rpc/assign_user_dealer_role" \\
  -H "Authorization: Bearer <JWT-ADMIN_O_DUENO>" \\
  -H "Content-Type: application/json" \\
  -d '{ "p_dealer_id":"<UUID_DEALER>", "p_user_sub":"local:<UUID_USUARIO>", "p_role_code":"operaciones" }'
```

> En UI: Dueño puede ver un panel simple “Usuarios del dealer” con agregar/quitar roles; Admin tiene un panel global.

## 🧪 Semántica de UI por rol (qué ve y qué puede tocar)

| Área | Admin | Dueño | Vendedor | Operaciones |
| --- | --- | --- | --- | --- |
| **Operación** (Ingreso/Inspección/Retoques) | Ve todo, **edita** | **Edita** su dealer | Ve (opcional), no edita | **Edita** |
| **Inventario Interno** | Ve todo, **edita** | **Edita** su dealer | **Edita** su dealer | Solo ver (opcional) |
| **Venta/Listings** | Ve todo, **edita** | **Edita** su dealer | **Edita** su dealer | No edita |
| **Precio / Publicar** | Sí  | Sí  | Sí  | No  |
| **Fotos de listing** | Sí  | Sí  | Sí  | No  |
| **Leads** | Ve todo | Ve su dealer | Ve su dealer | No  |
| **Catálogos** | **Edita** | (Opcional) Edita | No  | No  |
| **Gestión de roles** | **Global** | **Solo su dealer** | No  | No  |
| **Dashboard/Reportes** | Global | Dealer | Dealer | Dealer (solo operación) |

## 📋 Seed SQL para roles y permisos

Si manejas tablas `api.app_roles` y `api.app_role_perms` (o equivalente), aquí un **ejemplo** para poblar los cuatro roles y sus permisos. **Ajusta nombres** si tu esquema difiere.

```sql
-- Roles lógicos de la app
INSERT INTO api.app_roles(code, name) VALUES
  ('admin','Admin global'),
  ('dealer_owner','Dueño'),
  ('vendedor','Vendedor'),
  ('operaciones','Operaciones')
ON CONFLICT (code) DO NOTHING;

-- Permisos (catálogo)
INSERT INTO api.app_perms(code, name) VALUES
  ('dealer.manage','Gestionar roles del dealer'),
  ('listing.write','CRUD de listings/precio/fotos'),
  ('work.write','Modificar operación (work_orders)'),
  ('work.read','Leer operación'),
  ('catalog.write','ABM catálogos'),
  ('leads.read','Leer leads del dealer')
ON CONFLICT (code) DO NOTHING;

-- Mapeo rol → permisos
-- Admin (global)
INSERT INTO api.app_role_perms(role_code, perm_code, scope)
VALUES
 ('admin','dealer.manage','global'),
 ('admin','listing.write','global'),
 ('admin','work.write','global'),
 ('admin','work.read','global'),
 ('admin','catalog.write','global'),
 ('admin','leads.read','global')
ON CONFLICT DO NOTHING;

-- Dueño (por dealer)
INSERT INTO api.app_role_perms(role_code, perm_code, scope)
VALUES
 ('dealer_owner','dealer.manage','dealer'),
 ('dealer_owner','listing.write','dealer'),
 ('dealer_owner','work.write','dealer'),
 ('dealer_owner','work.read','dealer'),
 ('dealer_owner','leads.read','dealer'),
 ('dealer_owner','catalog.write','dealer')  -- opcional
ON CONFLICT DO NOTHING;

-- Vendedor (por dealer)
INSERT INTO api.app_role_perms(role_code, perm_code, scope)
VALUES
 ('vendedor','listing.write','dealer'),
 ('vendedor','work.read','dealer'),
 ('vendedor','leads.read','dealer')
ON CONFLICT DO NOTHING;

-- Operaciones (por dealer)
INSERT INTO api.app_role_perms(role_code, perm_code, scope)
VALUES
 ('operaciones','work.write','dealer'),
 ('operaciones','work.read','dealer')
ON CONFLICT DO NOTHING;
```

> Tus funciones api.has_dealer_perm / api.has_global_perm deben resolver contra estas tablas; si ya lo hacen, este seed activa la matriz descrita.

## 📋 Checklist para QA por rol

- **Admin**
    - Asignar/retirar roles a usuarios y dealers.
    - Acceder a catálogos y modificarlos.
    - Ver dashboard global y data de todos los dealers.
- **Dueño**
    - Crear vehículo + listing, publicar, cambiar precio, fotos.
    - Crear y avanzar órdenes (Ingreso → Inspección → Retoques → Listo).
    - Asignar rol de Vendedor/Operaciones en su dealer.
    - Ver leads y dashboard del dealer.
- **Vendedor**
    - Editar listings, publicar/archivar, actualizar precio, fotos.
    - Ver leads del dealer.
    - **No** puede avanzar órdenes ni cambiar roles.
- **Operaciones**
    - Crear/avanzar órdenes, adjuntar fotos.
    - **No** puede publicar ni cambiar precio.
    - **No** puede asignar roles.