// src/lib/VendedoresApi.ts

import { client } from "@/lib/api.customer/client";

// Tipos para vendedores
export interface SalesPerson {
  id: string;
  name: string;
  email: string;
  phone?: string;
  team?: string;
  monthly_sales_goal?: number;
  user_id?: string | null;   // 👈
  created_at?: string;
  updated_at?: string;
}

export interface CreateSalesPersonParams {
  p_name: string;
  p_email: string;
  p_phone?: string;
  p_team?: string;
  p_monthly_sales_goal?: number;
  p_user_id?: string | null;  // 👈
}

export interface UpdateSalesPersonParams {
  p_id: string | number;
  p_data: {
    name?: string;
    email?: string;
    phone?: string;
    team?: string;
    monthly_sales_goal?: number;
    user_id?: string | null;  // 👈
  };
}

export interface DeleteSalesPersonParams {
  p_id: string;
}

// Listar vendedores
export const GetSalesPersons = async (token: string) => {
  const apiBase = client.getApiBase();
  return client.fetch(`${apiBase}/sales_person?order=name.asc`, {
    method: "GET",
    token,
  }) as Promise<SalesPerson[]>;
};

// Crear vendedor
export const CreateSalesPerson = (params: CreateSalesPersonParams, token: string) =>
  client.rpc("create_sales_person", params, token) as Promise<{ sales_person_id: string }>;

// Actualizar vendedor
export const UpdateSalesPerson = (params: UpdateSalesPersonParams, token: string) =>
  client.rpc("update_sales_person", params, token) as Promise<{ sales_person_id: string }>;

// Eliminar vendedor
export const DeleteSalesPerson = (params: DeleteSalesPersonParams, token: string) =>
  client.rpc("delete_sales_person", params, token) as Promise<{ sales_person_id: string }>;
