# CustomerRCP

# 0) Base y headers

**Base URL (ejemplo):**

```
https://<tu-host-postgrest>/
```

**Esquema:** usamos `api`, así que PostgREST requiere los headers de _profile_:

- Lectura (GET / POST de funciones “read”): `Accept-Profile: api`
- Escritura (POST/PATCH/DELETE y RPC que escriben): `Content-Profile: api`

**Auth:** normalmente JWT Bearer

```
Authorization: Bearer <token>
```

**JSON:**

```
Content-Type: application/json
Prefer: return=representation           # devuelve el row insertado/actualizado
Prefer: count=exact                     # cuenta exacta en listados
```

> **RLS/tenant**: si usas RLS por usuario con la GUC `app.user_id`, configúralo en el servidor PostgREST (p.ej. vía `db-pre-request` o `jwt`\->`db-claims`) para que `api.current_user_id()` tenga el valor correcto.

---

# 1) Customers (tabla: `api.customers`)

## 1.1 Crear

**Ruta:** `POST /rpc/create_customer`  
**Body:**

```
{
  "p_name": "John Smith",
  "p_phone": "+505 555 1234",
  "p_email": "john@smith.com",
  "p_government_id": "AB123456",
  "p_notes": "VIP lead",
  "p_owner_id": "00000000-0000-0000-0000-000000000001"  // opcional
}
```

**cURL**

```
curl -X POST https://<host>/rpc/create_customer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Content-Profile: api" \
  -H "Prefer: return=representation" \
  -d '{"p_name":"John Smith","p_email":"john@smith.com"}'
```

## 1.2 Obtener por id

**Ruta:** `POST /rpc/get_customer`  
**Body:**

```
{ "p_id": "UUID_DEL_CUSTOMER" }
```

> Si marcas la función como `STABLE`, PostgREST permite también `GET` con querystring (opcional). Con nuestra definición actual, usa `POST`.

## 1.3 Listar (búsqueda/paginación)

**Ruta:** `POST /rpc/list_customers`  
**Body (opcional):**

```
{ "p_search": "john", "p_limit": 50, "p_offset": 0 }
```

**Rango con headers (opcional):**

```
Range-Unit: items
Range: 0-49
Prefer: count=exact
```

## 1.4 Actualizar (patch)

**Ruta:** `POST /rpc/update_customer`  
**Body:** (envía solo los campos a cambiar)

```
{
  "p_id": "UUID_DEL_CUSTOMER",
  "p_phone": "+505 555 9999",
  "p_notes": "Updated note"
}
```

## 1.5 Borrar

**Ruta:** `POST /rpc/delete_customer`  
**Body:**

```
{ "p_id": "UUID_DEL_CUSTOMER" }
```

---

# 2) Customer Addresses (tabla: `api.customer_addresses`)

## 2.1 Crear

**Ruta:** `POST /rpc/create_customer_address`  
**Body:**

```
{
  "p_customer_id": "UUID_DEL_CUSTOMER",
  "p_label": "home",
  "p_address": "123 Main St",
  "p_city": "Managua",
  "p_state": "MN",
  "p_postal_code": "11001",
  "p_country": "NI",
  "p_is_primary": true
}
```

> Si `p_is_primary = true`, la función desmarca otras direcciones primarias del mismo cliente.

## 2.2 Obtener por id

**Ruta:** `POST /rpc/get_customer_address`  
**Body:** `{ "p_id": "UUID_ADDRESS" }`

## 2.3 Listar por cliente

**Ruta:** `POST /rpc/list_customer_addresses`  
**Body:** `{ "p_customer_id": "UUID_DEL_CUSTOMER", "p_only_primary": false }`

## 2.4 Actualizar (patch)

**Ruta:** `POST /rpc/update_customer_address`  
**Body:** (envía solo lo que cambie)

```
{
  "p_id": "UUID_ADDRESS",
  "p_city": "Granada",
  "p_is_primary": true
}
```

## 2.5 Borrar

**Ruta:** `POST /rpc/delete_customer_address`  
**Body:** `{ "p_id": "UUID_ADDRESS" }`

---

# 3) Customer Interactions (tabla: `api.customer_interactions`)

## 3.1 Crear

**Ruta:** `POST /rpc/create_customer_interaction`  
**Body:**

```
{
  "p_customer_id": "UUID_DEL_CUSTOMER",
  "p_channel": "whatsapp",
  "p_subject": "First contact",
  "p_message": "Customer asked for availability",
  "p_performed_by": "00000000-0000-0000-0000-000000000001",   // opcional
  "p_performed_at": "2025-10-26T12:00:00Z"                    // opcional
}
```

## 3.2 Obtener por id

**Ruta:** `POST /rpc/get_customer_interaction`  
**Body:** `{ "p_id": "UUID_INTERACTION" }`

## 3.3 Listar por cliente

**Ruta:** `POST /rpc/list_customer_interactions`  
**Body:** `{ "p_customer_id": "UUID_DEL_CUSTOMER", "p_limit": 50, "p_offset": 0 }`

## 3.4 Actualizar (patch)

**Ruta:** `POST /rpc/update_customer_interaction`  
**Body:** (solo lo que cambie)

```
{
  "p_id": "UUID_INTERACTION",
  "p_subject": "Follow-up",
  "p_message": "Shared financing options"
}
```

## 3.5 Borrar

**Ruta:** `POST /rpc/delete_customer_interaction`  
**Body:** `{ "p_id": "UUID_INTERACTION" }`

---

# 4) Ejemplos rápidos

## 4.1 cURL — crear cliente y listar

```
# Crear
curl -X POST https://<host>/rpc/create_customer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -H "Content-Profile: api" \
  -H "Prefer: return=representation" \
  -d '{"p_name":"Jane Doe","p_email":"jane@doe.com"}'

# Listar (búsqueda)
curl -X POST https://<host>/rpc/list_customers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -H "Accept-Profile: api" \
  -H "Prefer: count=exact" \
  -d '{"p_search":"jane","p_limit":20,"p_offset":0}'
```

## 4.2 fetch — crear dirección primaria

```
await fetch('https://<host>/rpc/create_customer_address', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
    'Content-Profile': 'api',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    p_customer_id: 'UUID_DEL_CUSTOMER',
    p_label: 'home',
    p_address: '123 Main St',
    p_city: 'Managua',
    p_country: 'NI',
    p_is_primary: true
  })
});
```

---

# 5) Tablas vs RPC (nota útil)

- También puedes usar endpoints directos de tabla (ej. `GET /customers?name=ilike.*john*`) con headers `Accept-Profile: api`.
- Las **funciones RPC** te dan validaciones/lógica (ej. “solo una dirección primaria”) y devuelven exactamente lo que necesitas.

---

# 6) Errores comunes

- **415/406**: falta `Content-Type` o `Accept-Profile`/`Content-Profile`.
- **404** en `/rpc/...`: nombre de función distinto al creado.
- **401/403**: token inválido o RLS bloquea la fila.
- **409** por `unique` (email/phone): revisa duplicados.