# Documentacion RPC Postgress v2

## `POST /rpc/_grant_new_permission_to_admin`

**Function:** api.\_grant_new_permission_to_admin  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/_grant_new_permission_to_admin"
```

## `POST /rpc/_has_work_read`

**Function:** api.\_has_work_read  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"p_dealer": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_dealer": null}' \\
  "$PGRST/rpc/_has_work_read"
```

## `POST /rpc/_has_work_write`

**Function:** api.\_has_work_write  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"p_dealer": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_dealer": null}' \\
  "$PGRST/rpc/_has_work_write"
```

## `POST /rpc/add_favorite`

**Function:** api.add_favorite  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_listing_id": null}' \\
  "$PGRST/rpc/add_favorite"
```

## `POST /rpc/add_photo`

**Function:** api.add_photo  
**Returns:** bigint  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_alt": null, "p_url": null, "p_width": null, "p_height": null, "p_position": null, "p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_alt": null, "p_url": null, "p_width": null, "p_height": null, "p_position": null, "p_listing_id": null}' \\
  "$PGRST/rpc/add_photo"
```

## `POST /rpc/advance_work_order`

**Function:** api.advance_work_order  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_notes": null, "p_next_status": null, "p_work_order_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_notes": null, "p_next_status": null, "p_work_order_id": null}' \\
  "$PGRST/rpc/advance_work_order"
```

## `POST /rpc/archive_listing`

**Function:** api.archive_listing  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_listing_id": null}' \\
  "$PGRST/rpc/archive_listing"
```

## `POST /rpc/assert_dealer_perm`

**Function:** api.assert_dealer_perm  
**Returns:** void  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"_perm": null, "_dealer": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"_perm": null, "_dealer": null}' \\
  "$PGRST/rpc/assert_dealer_perm"
```

## `POST /rpc/assign_user_dealer_role`

**Function:** api.assign_user_dealer_role  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_user_sub": null, "p_dealer_id": null, "p_role_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_user_sub": null, "p_dealer_id": null, "p_role_code": null}' \\
  "$PGRST/rpc/assign_user_dealer_role"
```

## `POST /rpc/assign_user_role`

**Function:** api.assign_user_role  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_user_sub": null, "p_role_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_user_sub": null, "p_role_code": null}' \\
  "$PGRST/rpc/assign_user_role"
```

## `POST /rpc/attach_work_photo`

**Function:** api.attach_work_photo  
**Returns:** bigint  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_url": null, "p_step_id": null, "p_position": null, "p_work_order_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_url": null, "p_step_id": null, "p_position": null, "p_work_order_id": null}' \\
  "$PGRST/rpc/attach_work_photo"
```

## `POST /rpc/column_exists`

**Function:** api.column_exists  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"p_table": null, "p_column": null, "p_schema": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_table": null, "p_column": null, "p_schema": null}' \\
  "$PGRST/rpc/column_exists"
```

## `POST /rpc/create_customer`

**Function:** api.create_customer  
**Returns:** api.customers  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_name": null, "p_email": null, "p_notes": null, "p_phone": null, "p_owner_id": null, "p_government_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_name": null, "p_email": null, "p_notes": null, "p_phone": null, "p_owner_id": null, "p_government_id": null}' \\
  "$PGRST/rpc/create_customer"
```

## `POST /rpc/create_customer_address`

**Function:** api.create_customer_address  
**Returns:** api.customer_addresses  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_city": null, "p_label": null, "p_state": null, "p_address": null, "p_country": null, "p_is_primary": null, "p_customer_id": null, "p_postal_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_city": null, "p_label": null, "p_state": null, "p_address": null, "p_country": null, "p_is_primary": null, "p_customer_id": null, "p_postal_code": null}' \\
  "$PGRST/rpc/create_customer_address"
```

## `POST /rpc/create_customer_interaction`

**Function:** api.create_customer_interaction  
**Returns:** api.customer_interactions  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_channel": null, "p_message": null, "p_subject": null, "p_customer_id": null, "p_performed_at": null, "p_performed_by": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_channel": null, "p_message": null, "p_subject": null, "p_customer_id": null, "p_performed_at": null, "p_performed_by": null}' \\
  "$PGRST/rpc/create_customer_interaction"
```

## `POST /rpc/create_lead`

**Function:** api.create_lead  
**Returns:** uuid  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_name": null, "p_email": null, "p_phone": null, "p_source": null, "p_message": null, "p_dealer_id": null, "p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_name": null, "p_email": null, "p_phone": null, "p_source": null, "p_message": null, "p_dealer_id": null, "p_listing_id": null}' \\
  "$PGRST/rpc/create_lead"
```

## `POST /rpc/create_listing`

**Function:** api.create_listing  
**Returns:** uuid  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_price": null, "p_title": null, "p_status": null, "p_currency": null, "p_featured": null, "p_dealer_id": null, "p_vehicle_id": null, "p_visibility": null, "p_description": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_price": null, "p_title": null, "p_status": null, "p_currency": null, "p_featured": null, "p_dealer_id": null, "p_vehicle_id": null, "p_visibility": null, "p_description": null}' \\
  "$PGRST/rpc/create_listing"
```

## `POST /rpc/create_make`

**Function:** api.create_make  
**Returns:** TABLE(id bigint, name text)  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_name": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_name": null}' \\
  "$PGRST/rpc/create_make"
```

## `POST /rpc/create_supplier`

**Function:** api.create_supplier  
**Returns:** uuid  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_name": null, "p_slug": null, "p_email": null, "p_notes": null, "p_phone": null, "p_tax_id": null, "p_dealer_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_name": null, "p_slug": null, "p_email": null, "p_notes": null, "p_phone": null, "p_tax_id": null, "p_dealer_id": null}' \\
  "$PGRST/rpc/create_supplier"
```

## `POST /rpc/create_vehicle`

**Function:** api.create_vehicle  
**Returns:** uuid  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_vin": null, "p_year": null, "p_doors": null, "p_notes": null, "p_seats": null, "p_engine": null, "p_price1": null, "p_price2": null, "p_license": null, "p_make_id": null, "p_trim_id": null, "p_model_id": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_odometer_km": null, "p_transmission": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_vin": null, "p_year": null, "p_doors": null, "p_notes": null, "p_seats": null, "p_engine": null, "p_price1": null, "p_price2": null, "p_license": null, "p_make_id": null, "p_trim_id": null, "p_model_id": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_odometer_km": null, "p_transmission": null}' \\
  "$PGRST/rpc/create_vehicle"
```

## `POST /rpc/create_vehicle_and_listing`

**Function:** api.create_vehicle_and_listing  
**Returns:** TABLE(listing_id uuid, vehicle_id uuid)  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_vin": null, "p_year": null, "p_doors": null, "p_price": null, "p_seats": null, "p_title": null, "p_engine": null, "p_status": null, "p_make_id": null, "p_trim_id": null, "p_currency": null, "p_featured": null, "p_model_id": null, "p_color_ext": null, "p_color_int": null, "p_dealer_id": null, "p_fuel_type": null, "p_drive_type": null, "p_visibility": null, "p_description": null, "p_odometer_km": null, "p_transmission": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_vin": null, "p_year": null, "p_doors": null, "p_price": null, "p_seats": null, "p_title": null, "p_engine": null, "p_status": null, "p_make_id": null, "p_trim_id": null, "p_currency": null, "p_featured": null, "p_model_id": null, "p_color_ext": null, "p_color_int": null, "p_dealer_id": null, "p_fuel_type": null, "p_drive_type": null, "p_visibility": null, "p_description": null, "p_odometer_km": null, "p_transmission": null}' \\
  "$PGRST/rpc/create_vehicle_and_listing"
```

## `POST /rpc/create_work_order`

**Function:** api.create_work_order  
**Returns:** uuid  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_dealer_id": null, "p_vehicle_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_dealer_id": null, "p_vehicle_id": null}' \\
  "$PGRST/rpc/create_work_order"
```

## `POST /rpc/current_user_id`

**Function:** api.current_user_id  
**Returns:** uuid  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/current_user_id"
```

## `POST /rpc/delete_customer`

**Function:** api.delete_customer  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/delete_customer"
```

## `POST /rpc/delete_customer_address`

**Function:** api.delete_customer_address  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/delete_customer_address"
```

## `POST /rpc/delete_customer_interaction`

**Function:** api.delete_customer_interaction  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/delete_customer_interaction"
```

## `POST /rpc/delete_listing`

**Function:** api.delete_listing  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_listing_id": null}' \\
  "$PGRST/rpc/delete_listing"
```

## `POST /rpc/delete_photo`

**Function:** api.delete_photo  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_photo_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_photo_id": null}' \\
  "$PGRST/rpc/delete_photo"
```

## `POST /rpc/delete_supplier`

**Function:** api.delete_supplier  
**Returns:** boolean  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/delete_supplier"
```

## `POST /rpc/delete_vehicle`

**Function:** api.delete_vehicle  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_vehicle_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_vehicle_id": null}' \\
  "$PGRST/rpc/delete_vehicle"
```

## `POST /rpc/delete_work_photo`

**Function:** api.delete_work_photo  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_photo_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_photo_id": null}' \\
  "$PGRST/rpc/delete_work_photo"
```

## `POST /rpc/get_customer`

**Function:** api.get_customer  
**Returns:** api.customers  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/get_customer"
```

## `POST /rpc/get_customer_address`

**Function:** api.get_customer_address  
**Returns:** api.customer_addresses  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/get_customer_address"
```

## `POST /rpc/get_customer_interaction`

**Function:** api.get_customer_interaction  
**Returns:** api.customer_interactions  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/get_customer_interaction"
```

## `POST /rpc/handle_updated_at`

**Function:** api.handle_updated_at  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/handle_updated_at"
```

## `POST /rpc/has_dealer_perm`

**Function:** api.has_dealer_perm  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"dealer": null, "perm_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"dealer": null, "perm_code": null}' \\
  "$PGRST/rpc/has_dealer_perm"
```

## `POST /rpc/has_global_perm`

**Function:** api.has_global_perm  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"perm_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"perm_code": null}' \\
  "$PGRST/rpc/has_global_perm"
```

## `POST /rpc/inspection_activity_entry_create`

**Function:** api.inspection_activity_entry_create  
**Returns:** api.inspection_activity_entries  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_notes": null, "p_score": null, "p_status": null, "p_photo_url": null, "p_created_by": null, "p_inspection_id": null, "p_measured_value": null, "p_activity_type_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_notes": null, "p_score": null, "p_status": null, "p_photo_url": null, "p_created_by": null, "p_inspection_id": null, "p_measured_value": null, "p_activity_type_id": null}' \\
  "$PGRST/rpc/inspection_activity_entry_create"
```

## `POST /rpc/inspection_activity_entry_delete`

**Function:** api.inspection_activity_entry_delete  
**Returns:** boolean  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/inspection_activity_entry_delete"
```

## `POST /rpc/inspection_activity_entry_get`

**Function:** api.inspection_activity_entry_get  
**Returns:** api.inspection_activity_entries  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/inspection_activity_entry_get"
```

## `POST /rpc/inspection_activity_entry_list`

**Function:** api.inspection_activity_entry_list  
**Returns:** SETOF api.inspection_activity_entries  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_q": null, "p_limit": null, "p_offset": null, "p_status": null, "p_order_by": null, "p_order_dir": null, "p_inspection_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_q": null, "p_limit": null, "p_offset": null, "p_status": null, "p_order_by": null, "p_order_dir": null, "p_inspection_id": null}' \\
  "$PGRST/rpc/inspection_activity_entry_list"
```

## `POST /rpc/inspection_activity_entry_update`

**Function:** api.inspection_activity_entry_update  
**Returns:** api.inspection_activity_entries  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_notes": null, "p_score": null, "p_status": null, "p_photo_url": null, "p_measured_value": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_notes": null, "p_score": null, "p_status": null, "p_photo_url": null, "p_measured_value": null}' \\
  "$PGRST/rpc/inspection_activity_entry_update"
```

## `POST /rpc/inspection_activity_summary_get`

**Function:** api.inspection_activity_summary_get  
**Returns:** SETOF api.v_inspection_activity_summary  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_inspection_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_inspection_id": null}' \\
  "$PGRST/rpc/inspection_activity_summary_get"
```

## `POST /rpc/inspection_activity_type_create`

**Function:** api.inspection_activity_type_create  
**Returns:** api.inspection_activity_types  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_code": null, "p_name": null, "p_enabled": null, "p_category": null, "p_description": null, "p_default_weight": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_code": null, "p_name": null, "p_enabled": null, "p_category": null, "p_description": null, "p_default_weight": null}' \\
  "$PGRST/rpc/inspection_activity_type_create"
```

## `POST /rpc/inspection_activity_type_delete`

**Function:** api.inspection_activity_type_delete  
**Returns:** boolean  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/inspection_activity_type_delete"
```

## `POST /rpc/inspection_activity_type_get`

**Function:** api.inspection_activity_type_get  
**Returns:** api.inspection_activity_types  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null}' \\
  "$PGRST/rpc/inspection_activity_type_get"
```

## `POST /rpc/inspection_activity_type_list`

**Function:** api.inspection_activity_type_list  
**Returns:** SETOF api.inspection_activity_types  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_q": null, "p_limit": null, "p_offset": null, "p_enabled": null, "p_order_by": null, "p_order_dir": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_q": null, "p_limit": null, "p_offset": null, "p_enabled": null, "p_order_by": null, "p_order_dir": null}' \\
  "$PGRST/rpc/inspection_activity_type_list"
```

## `POST /rpc/inspection_activity_type_update`

**Function:** api.inspection_activity_type_update  
**Returns:** api.inspection_activity_types  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_code": null, "p_name": null, "p_enabled": null, "p_category": null, "p_description": null, "p_default_weight": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_code": null, "p_name": null, "p_enabled": null, "p_category": null, "p_description": null, "p_default_weight": null}' \\
  "$PGRST/rpc/inspection_activity_type_update"
```

## `POST /rpc/issue_jwt`

**Function:** api.issue_jwt  
**Returns:** text  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_sub": null, "p_role": null, "p_minutes_valid": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_sub": null, "p_role": null, "p_minutes_valid": null}' \\
  "$PGRST/rpc/issue_jwt"
```

## `POST /rpc/issue_token`

**Function:** api.issue_token  
**Returns:** text  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_ttl": null, "p_user_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_ttl": null, "p_user_id": null}' \\
  "$PGRST/rpc/issue_token"
```

## `POST /rpc/jwt_claim`

**Function:** api.jwt_claim  
**Returns:** text  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"path": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"path": null}' \\
  "$PGRST/rpc/jwt_claim"
```

## `POST /rpc/jwt_sub`

**Function:** api.jwt_sub  
**Returns:** text  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/jwt_sub"
```

## `POST /rpc/list_customer_addresses`

**Function:** api.list_customer_addresses  
**Returns:** SETOF api.customer_addresses  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_customer_id": null, "p_only_primary": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_customer_id": null, "p_only_primary": null}' \\
  "$PGRST/rpc/list_customer_addresses"
```

## `POST /rpc/list_customer_interactions`

**Function:** api.list_customer_interactions  
**Returns:** SETOF api.customer_interactions  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_limit": null, "p_offset": null, "p_customer_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_limit": null, "p_offset": null, "p_customer_id": null}' \\
  "$PGRST/rpc/list_customer_interactions"
```

## `POST /rpc/list_customers`

**Function:** api.list_customers  
**Returns:** SETOF api.customers  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_limit": null, "p_offset": null, "p_search": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_limit": null, "p_offset": null, "p_search": null}' \\
  "$PGRST/rpc/list_customers"
```

## `POST /rpc/list_suppliers`

**Function:** api.list_suppliers  
**Returns:** SETOF api.suppliers  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_dealer_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_dealer_id": null}' \\
  "$PGRST/rpc/list_suppliers"
```

## `POST /rpc/list_suppliers`

**Function:** api.list_suppliers  
**Returns:** SETOF api.suppliers  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"_limit": null, "_offset": null, "_search": null, "_dealer_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"_limit": null, "_offset": null, "_search": null, "_dealer_id": null}' \\
  "$PGRST/rpc/list_suppliers"
```

## `POST /rpc/login_local`

**Function:** api.login_local  
**Returns:** json  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_email": null, "p_password": null, "p_minutes_valid": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_email": null, "p_password": null, "p_minutes_valid": null}' \\
  "$PGRST/rpc/login_local"
```

## `POST /rpc/publish_listing`

**Function:** api.publish_listing  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_listing_id": null}' \\
  "$PGRST/rpc/publish_listing"
```

## `POST /rpc/register_local_user`

**Function:** api.register_local_user  
**Returns:** uuid  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_email": null, "p_password": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_email": null, "p_password": null}' \\
  "$PGRST/rpc/register_local_user"
```

## `POST /rpc/remove_favorite`

**Function:** api.remove_favorite  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_listing_id": null}' \\
  "$PGRST/rpc/remove_favorite"
```

## `POST /rpc/reorder_photos`

**Function:** api.reorder_photos  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_photo_ids": null, "p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_photo_ids": null, "p_listing_id": null}' \\
  "$PGRST/rpc/reorder_photos"
```

## `POST /rpc/reorder_work_photos`

**Function:** api.reorder_work_photos  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_photo_ids": null, "p_work_order_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_photo_ids": null, "p_work_order_id": null}' \\
  "$PGRST/rpc/reorder_work_photos"
```

## `POST /rpc/set_updated_at`

**Function:** api.set_updated_at  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/set_updated_at"
```

## `POST /rpc/set_updated_at_tg`

**Function:** api.set_updated_at_tg  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/set_updated_at_tg"
```

## `POST /rpc/table_exists`

**Function:** api.table_exists  
**Returns:** boolean  
**Security:** invoker · STABLE  
**Body (JSON ejemplo):**

```json
{"p_table": null, "p_schema": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_table": null, "p_schema": null}' \\
  "$PGRST/rpc/table_exists"
```

## `POST /rpc/track_price_history`

**Function:** api.track_price_history  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/track_price_history"
```

## `POST /rpc/track_price_history_external`

**Function:** api.track_price_history_external  
**Returns:** trigger  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{}' \\
  "$PGRST/rpc/track_price_history_external"
```

## `POST /rpc/update_customer`

**Function:** api.update_customer  
**Returns:** api.customers  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_name": null, "p_email": null, "p_notes": null, "p_phone": null, "p_government_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_name": null, "p_email": null, "p_notes": null, "p_phone": null, "p_government_id": null}' \\
  "$PGRST/rpc/update_customer"
```

## `POST /rpc/update_customer_address`

**Function:** api.update_customer_address  
**Returns:** api.customer_addresses  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_city": null, "p_label": null, "p_state": null, "p_address": null, "p_country": null, "p_is_primary": null, "p_postal_code": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_city": null, "p_label": null, "p_state": null, "p_address": null, "p_country": null, "p_is_primary": null, "p_postal_code": null}' \\
  "$PGRST/rpc/update_customer_address"
```

## `POST /rpc/update_customer_interaction`

**Function:** api.update_customer_interaction  
**Returns:** api.customer_interactions  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_channel": null, "p_message": null, "p_subject": null, "p_performed_at": null, "p_performed_by": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_channel": null, "p_message": null, "p_subject": null, "p_performed_at": null, "p_performed_by": null}' \\
  "$PGRST/rpc/update_customer_interaction"
```

## `POST /rpc/update_listing`

**Function:** api.update_listing  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_title": null, "p_status": null, "p_featured": null, "p_listing_id": null, "p_visibility": null, "p_description": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_title": null, "p_status": null, "p_featured": null, "p_listing_id": null, "p_visibility": null, "p_description": null}' \\
  "$PGRST/rpc/update_listing"
```

## `POST /rpc/update_listing_price`

**Function:** api.update_listing_price  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_price": null, "p_currency": null, "p_listing_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_price": null, "p_currency": null, "p_listing_id": null}' \\
  "$PGRST/rpc/update_listing_price"
```

## `POST /rpc/update_model`

**Function:** api.update_model  
**Returns:** TABLE(id bigint, make_id bigint, name text)  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_name": null, "p_make_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_name": null, "p_make_id": null}' \\
  "$PGRST/rpc/update_model"
```

## `POST /rpc/update_supplier`

**Function:** api.update_supplier  
**Returns:** api.suppliers  
**Security:** SECURITY DEFINER · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_id": null, "p_name": null, "p_slug": null, "p_email": null, "p_notes": null, "p_phone": null, "p_tax_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_id": null, "p_name": null, "p_slug": null, "p_email": null, "p_notes": null, "p_phone": null, "p_tax_id": null}' \\
  "$PGRST/rpc/update_supplier"
```

## `POST /rpc/update_vehicle`

**Function:** api.update_vehicle  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_vin": null, "p_year": null, "p_doors": null, "p_seats": null, "p_engine": null, "p_trim_id": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_vehicle_id": null, "p_odometer_km": null, "p_transmission": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_vin": null, "p_year": null, "p_doors": null, "p_seats": null, "p_engine": null, "p_trim_id": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_vehicle_id": null, "p_odometer_km": null, "p_transmission": null}' \\
  "$PGRST/rpc/update_vehicle"
```

## `POST /rpc/update_vehicle`

**Function:** api.update_vehicle  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_vin": null, "p_year": null, "p_doors": null, "p_photo": null, "p_seats": null, "p_engine": null, "p_trim_id": null, "p_document": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_vehicle_id": null, "p_odometer_km": null, "p_transmission": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_vin": null, "p_year": null, "p_doors": null, "p_photo": null, "p_seats": null, "p_engine": null, "p_trim_id": null, "p_document": null, "p_color_ext": null, "p_color_int": null, "p_fuel_type": null, "p_drive_type": null, "p_vehicle_id": null, "p_odometer_km": null, "p_transmission": null}' \\
  "$PGRST/rpc/update_vehicle"
```

## `POST /rpc/update_vehicle_image`

**Function:** api.update_vehicle_image  
**Returns:** void  
**Security:** invoker · VOLATILE  
**Body (JSON ejemplo):**

```json
{"p_image_url": null, "p_vehicle_id": null}
```

**Headers:**

```
Authorization: Bearer <JWT>
Content-Type: application/json
Accept: application/json
```

**cURL:**

```bash
curl -X POST \\
  -H 'Authorization: Bearer $TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{"p_image_url": null, "p_vehicle_id": null}' \\
  "$PGRST/rpc/update_vehicle_image"
```