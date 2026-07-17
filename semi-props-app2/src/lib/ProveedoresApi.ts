// Obtener dealers externos
export const GetDealersExternal = () =>
  get<Dealer[]>("dealers_external");
// Helper para llamadas RPC a PostgREST
import { ensureAuth } from "./adminAuth";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

//Utilizar rpc para aquellas funciones que lo requieran
//Función para los logs
export async function rpc<T>(name: string, body: any): Promise<T> {

  const { token } = await ensureAuth();
  
  const res = await fetch(`${API}/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body ?? {})
  });

  if (!res.ok) {
    const errorText = await res.text();
    let payload: any = null;
    try {
      payload = errorText ? JSON.parse(errorText) : null;
    } catch {
      // La respuesta no siempre es JSON.
    }

    const error: any = new Error(
      payload?.message || `RPC ${name}: ${res.status} ${errorText}`
    );
    error.status = res.status;
    error.code = payload?.code;
    error.details = payload?.details;
    error.payload = payload;
    throw error;
  }

  return res.status === 204 ? (undefined as T) : await res.json();
}

//Se utiliza estra función sin RPC y en método GET para obtener los datos del proveedores
export async function get<T>(name: string): Promise<T> {

  const { token } = await ensureAuth();

  const res = await fetch(`${API}/${name}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GET ${name}: ${res.status} ${errorText}`);
  }

  return res.status === 204 ? (undefined as T) : await res.json();
}

// Tipos para las funciones RPC
export interface RegisterUserParams {
  p_email: string;
  p_password: string;
}

export interface LoginParams {
  p_email: string;
  p_password: string;
  p_minutes_valid?: number;
}

export interface LoginResponse {
  token_type: string;
  access_token: string;
  expires_at: string;
  user: {
    id: string;
    sub: string;
    email: string;
  };
}

//Tipado para obtener proveedores
export interface GetSupplierParams {
  id: string;
  dealer_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  tax_id: string;
  created_at: string;
  updated_at: string;
  slug: string;
}

//Tipado para agregar proveedores
export interface SupplierParams {
  p_dealer_id: string;
  p_name: string;
  p_slug: string;
  p_email: string;
  p_phone: string;
  p_tax_id: string;
  p_notes: string;
}

export interface Dealer {
  id: string;
  name: string;
}

export interface Slug {
  id_slug: string;
  name: string;
}

export interface Tax {
  tax_id: string;
  description: string;
}

//Tipado para actualizar proveedores
export interface UpdateSupplierParams {
  p_id: string;
  p_name?: string;
  p_slug?: string;
  p_email?: string;
  p_phone?: string;
  p_tax_id?: string;
  p_notes?: string;
}
export interface VehicleInventory {
  id?: string; 
  make_id: string;
  model_id: string;
  year: number;
  transmission: string;
  price2: number;
}
export interface Make {
  id: number;
  name: string;
}
export interface Model {
  id: number;
  make_id: number;
  name: string;
}

// Funciones de autenticación
export const registerUser = (params: RegisterUserParams) =>
  rpc<string>("register_local_user", params);

export const loginUser = (params: LoginParams) =>
  rpc<LoginResponse>("login_local", params);

//Funciones de proveedores
export const GetSuppliers = () =>
  get<GetSupplierParams[]>("suppliers");

export const GetSuppliersBySlug = (slugId: string) =>
  get<GetSupplierParams[]>(`suppliers?slug=eq.${slugId}`);

export const GetDealers = () =>
  get<Dealer[]>("dealers");

export const GetSlug = () =>
  get<Slug[]>("slug");

export const GetTax = () =>
  get<Tax[]>("tax");

export const CreateSupplier = (params: SupplierParams) =>
  rpc<{ supplier_id: string }>("create_supplier", params);

export const UpdateSupplier = (params: UpdateSupplierParams) =>
  rpc<{ supplier_id: string }>("update_supplier", params);
/*
export async function DeleteSupplier(id: string) {
  const { token } = await ensureAuth();

  const res = await fetch(`${API}/rpc/delete_supplier?id=eq.${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`DeleteSupplier: ${res.status} — ${error}`);
  }

  return true;
} */
export const DeleteSupplier = (id: string) =>
 rpc<{ supplier_id: string }>("delete_supplier", { p_id: id });

export const GetVehiclesBySupplier = (supplierId: string) =>
  get<VehicleInventory[]>(`vehicles?supplier_id=eq.${supplierId}`);

export const getMakes = async (token?: string): Promise<Make[]> => {
  const auth = await ensureAuth();
  const authToken = token || auth.token;
  
  const res = await fetch(`${API}/makes`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  if (!res.ok) throw new Error(`GET makes: ${res.status}`);
  return res.json();
};

export const getModels = async (token?: string): Promise<Model[]> => {
  const auth = await ensureAuth();
  const authToken = token || auth.token;
  
  const res = await fetch(`${API}/models`, {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  });
  if (!res.ok) throw new Error(`GET models: ${res.status}`);
  return res.json();
};