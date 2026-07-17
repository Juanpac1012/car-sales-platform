## Security and Role Restrictions

- Only the `team_admin` role is allowed to create, update, or delete offers via the RPC functions (`create_offer`, `update_offer`, `delete_offer`).
- Each function checks the current role using the JWT claim or session user. If the role is not `team_admin`, the function raises a `Permission denied` error.
- Make sure to grant EXECUTE permission only to `team_admin` for these functions:
  ```sql
  GRANT EXECUTE ON FUNCTION api.create_offer(...) TO team_admin;
  GRANT EXECUTE ON FUNCTION api.update_offer(...) TO team_admin;
  GRANT EXECUTE ON FUNCTION api.delete_offer(uuid) TO team_admin;
  ```
- Do not grant EXECUTE to PUBLIC or other roles for these functions.

## Final recommendations

- Always test endpoints in Postman with a valid `team_admin` token before integrating in the frontend.
- Keep this documentation updated if you add new fields or business rules.
- If you add more roles or permissions, update the security logic in the functions accordingly.
- For any error, check both the API response and the database logs for detailed diagnostics.

---

# API Documentation: Offer Management (Create, Update, Delete)

## Tables involved
- **api.offers**: Main table for offers.
- **api.vehicles**: Vehicle being offered (vehicle_id foreign key).
- **api.customers**: Customer (cliente_id).
- **api.suppliers**: Supplier (proveedor_id).
- **api.app_users**: Seller (vendedor_id).

## Required fields to create an offer
- cliente_id (uuid, must exist in api.customers)
- vendedor_id (uuid, must exist in api.app_users)
- vehicle_id (uuid, must exist in api.vehicles)
- proveedor_id (uuid, must exist in api.suppliers)
- precio_ofertado (number)
- validez_desde (date, optional)
- validez_hasta (date, optional)
- notas (text, optional)

---

## Creating an offer via RPC (recommended)

**Function:** `api.create_offer`

**Definition:**
```sql
CREATE OR REPLACE FUNCTION api.create_offer(
  p_cliente_id uuid,
  p_vendedor_id uuid,
  p_vehicle_id uuid,
  p_proveedor_id uuid,
  p_offered_price numeric,
  p_valid_from date DEFAULT NULL,
  p_valid_until date DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS SETOF api.offers AS $$
BEGIN
  RETURN QUERY
  INSERT INTO api.offers (
    cliente_id, vendedor_id, vehicle_id, proveedor_id,
    precio_ofertado, validez_desde, validez_hasta, notas
  )
  VALUES (
    p_cliente_id, p_vendedor_id, p_vehicle_id, p_proveedor_id,
    p_offered_price, p_valid_from, p_valid_until, p_notes
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**POST Example (Postman):**
```
POST https://postrest-dealercar-postrest.kwu5pq.easypanel.host/rpc/create_offer
Content-Type: application/json
Prefer: return=representation

{
  "p_cliente_id": "813fa385-b233-4395-932a-212e33866483",
  "p_vendedor_id": "7bd18d69-42ca-4b3e-a3dd-c54ecbcaae6c",
  "p_vehicle_id": "4213101b-d51b-48a1-802a-a2c3dab8db9c",
  "p_proveedor_id": "2a3630c7-7a7d-4dcb-b2f3-93bdf774f7e9",
  "p_offered_price": 10000000,
  "p_valid_from": "2025-12-21",
  "p_valid_until": "2025-12-31",
  "p_notes": "Additional notes..."
}
```

---

## Update offer via RPC

**Function:** `api.update_offer`

**Definition:**
```sql
CREATE OR REPLACE FUNCTION api.update_offer(
  p_id uuid,
  p_offered_price numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE api.offers
  SET
    precio_ofertado = COALESCE(p_offered_price, precio_ofertado),
    notas = COALESCE(p_notes, notas)
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**POST Example (Postman):**
```
POST https://postrest-dealercar-postrest.kwu5pq.easypanel.host/rpc/update_offer
Content-Type: application/json

{
  "p_id": "<offer_id>",
  "p_offered_price": 9500000,
  "p_notes": "Price update"
}
```

---

## Delete offer via RPC

**Function:** `api.delete_offer`

**Definition:**
```sql
CREATE OR REPLACE FUNCTION api.delete_offer(
  p_id uuid
)
RETURNS void AS $$
BEGIN
  DELETE FROM api.offers WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**POST Example (Postman):**
```
POST https://postrest-dealercar-postrest.kwu5pq.easypanel.host/rpc/delete_offer
Content-Type: application/json

{
  "p_id": "<offer_id>"
}
```

---

## Important validations
- All ids must exist in their respective tables.
- If any id is missing or invalid, a foreign key error will be returned.
- If the POST is successful, the created/updated/deleted record is affected as expected.

## Frontend recommendations
- Validate that selected ids exist before sending the POST.
- Use Prefer: return=representation to get the created offer id.
- Handle foreign key errors with clear user messages.
- Use the RPC endpoints for create, update, and delete for a unified POST-based workflow.

---

**Last update:** 2025-12-21
