// src/lib/customers/customers.types.ts

export interface Cliente {
  id: string;
  name: string;
  phone: string;
  ownerId?: string;                 // opcional en el UI
  email?: string | null;
  notes?: string | null;
  government_id?: string | null;
}

export interface APICreateCustomerRPC {
  p_name: string;
  p_phone: string;
  p_owner_id: string;               // requerido por el RPC
  p_email?: string | null;
  p_notes?: string | null;
  p_government_id?: string | null;
}

// 🔹 Tipo base para el mapper (sin owner_id)
export type APICreateCustomerBase = Omit<APICreateCustomerRPC, "p_owner_id">;

export interface APICreateInteractionRPC {
  p_customer_id: string;
  p_channel: string;
  p_subject?: string | null;
  p_message?: string | null;
  p_performed_by?: string | null;
  p_performed_at?: string | null;
}
