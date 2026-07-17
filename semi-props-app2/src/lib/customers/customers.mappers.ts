import { Cliente, APICreateCustomerBase } from "./customers.types";


export const toApiCustomer = (cliente: Cliente): APICreateCustomerBase => ({
  p_name: cliente.name,
  p_phone: cliente.phone,
  p_email: cliente.email ?? null,
  p_government_id: cliente.government_id ?? null,
  p_notes: cliente.notes ?? null,
});

export const fromApiCustomer = (apiData: any): Cliente => ({
  id: String(apiData.id),
  name: apiData.name ?? "",
  phone: apiData.phone ?? "",
  email: apiData.email ?? null,
  notes: apiData.notes ?? null,
  government_id: apiData.government_id ?? null,
  ownerId: apiData.owner_id ?? "",
});