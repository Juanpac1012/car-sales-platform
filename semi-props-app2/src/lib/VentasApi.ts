const API = (
  import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

// Helper function for authenticated API calls
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API ${endpoint}: ${res.status} ${errorText}`);
  }

  return res.status === 204 ? (undefined as T) : await res.json();
}

// Types
export interface Sale {
  id?: string;
  dealer_id: string;
  vehicle_id: string;
  customer_id: string;
  price_final: number;
  price_final_crc?: number;
  currency?: string;
  payment_method: string;
  status?: string;
  sold_at?: string;
  sales_person?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}

export interface SaleWithDetails extends Sale {
  vehicle?: {
    id: string;
    vin?: string;
    license_plate?: string;
    year: number;
    status_id?: number;
    make_id?: number;
    model_id?: number;
    price2?: number;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    government_id?: string;
  };
}

export interface Customer {
  id?: string;
  owner_id: string;
  name: string;
  phone?: string;
  email?: string;
  government_id?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleListingForSale {
  id: string;
  vehicle_id: string;
  title?: string;
  price?: number;
  currency?: string;
  status?: string;
  vehicle?: {
    id: string;
    vin?: string;
    year: number;
    license_plate?: string;
    status_id?: number;
    make_id?: number;
    model_id?: number;
    make?: {
      id: number;
      name: string;
    };
    model?: {
      id: number;
      name: string;
    };
  };
}

export interface CreateSaleParams {
  vehicle_id: string;
  customer_id: string;
  price_final: number;
  price_final_crc?: number;
  payment_method: string;
  sales_person?: string;
  notes?: string;
}

// Sales API
export async function listSales(
  dealerId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  },
  token?: string,
): Promise<SaleWithDetails[]> {
  let endpoint = `/sales?dealer_id=eq.${dealerId}&select=*,`;
  endpoint += `vehicle:vehicles(id,vin,license_plate,year,status_id,make_id,model_id,price2),`;
  endpoint += `customer:customers(id,name,phone,email,government_id)`;
  endpoint += `&order=sold_at.desc`;
  
  if (filters?.startDate) {
    endpoint += `&sold_at=gte.${filters.startDate}`;
  }
  if (filters?.endDate) {
    endpoint += `&sold_at=lte.${filters.endDate}`;
  }
  if (filters?.limit) {
    endpoint += `&limit=${filters.limit}`;
  }

  return apiFetch<SaleWithDetails[]>(endpoint, {}, token);
}

export async function getSaleById(
  saleId: string,
  token?: string,
): Promise<SaleWithDetails> {
  const endpoint =
    `/sales?id=eq.${saleId}` +
    `&select=*,` +
    `vehicle:vehicles(id,vin,license_plate,year,status_id,make_id,model_id,price2),` +
    `customer:customers(id,name,phone,email,government_id)`;
  
  const result = await apiFetch<SaleWithDetails[]>(endpoint, {}, token);
  return result[0];
}

export async function createSale(
  dealerId: string,
  data: CreateSaleParams,
  token?: string,
): Promise<Sale> {
  const saleData: Partial<Sale> = {
    dealer_id: dealerId,
    vehicle_id: data.vehicle_id,
    customer_id: data.customer_id,
    price_final: data.price_final,
    price_final_crc: data.price_final_crc,
    payment_method: data.payment_method,
    sales_person: data.sales_person,
    notes: data.notes,
    currency: "USD",
    status: "completed",
  };

  console.log("Creating sale with data:", saleData);

  const result = await apiFetch<Sale[]>(
    "/sales",
    {
      method: "POST",
      body: JSON.stringify(saleData),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function updateSale(
  saleId: string,
  data: Partial<Sale>,
  token?: string,
): Promise<Sale> {
  const result = await apiFetch<Sale[]>(
    `/sales?id=eq.${saleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function deleteSale(
  saleId: string,
  token?: string,
): Promise<void> {
  return apiFetch<void>(
    `/sales?id=eq.${saleId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// Vehicle Listings API (for available vehicles)
export async function listAvailableVehicles(
  dealerId: string,
  token?: string,
): Promise<VehicleListingForSale[]> {
  // Note: vehicles endpoint doesn't have dealer_id column, loading all vehicles
  // Using PostgREST's embedded resources to join makes and models
  const vehiclesEndpoint = `/vehicles?select=id,vin,year,license_plate,price2,status_id,make_id,model_id,make:makes(id,name),model:models(id,name)&order=created_at.desc`;
  
  const vehicles = await apiFetch<any[]>(vehiclesEndpoint, {}, token);
  
  // Transform vehicles to match VehicleListingForSale interface
  return vehicles.map((v) => {
    const makeName = v.make?.name || "Sin marca";
    const modelName = v.model?.name || "Sin modelo";
    const year = v.year || "";
    const plate = v.license_plate || v.vin || "";
    
    return {
      id: v.id,
      vehicle_id: v.id,
      title: `${makeName} ${modelName} ${year} - ${plate}`.trim(),
      price: v.price2,
      currency: "USD",
      status: "available",
      vehicle: {
        id: v.id,
        vin: v.vin,
        year: v.year,
        license_plate: v.license_plate,
        status_id: v.status_id,
        make_id: v.make_id,
        model_id: v.model_id,
        make: v.make,
        model: v.model,
      },
    };
  });
}

export async function markVehicleAsSold(
  vehicleId: string,
  statusId: number,
  token?: string,
): Promise<void> {
  await apiFetch<void>(
    `/vehicles?id=eq.${vehicleId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status_id: statusId }),
    },
    token,
  );
}

// Dealers API
export async function listDealers(token?: string): Promise<any[]> {
  return apiFetch<any[]>("/dealers?order=name.asc", {}, token);
}

// Customers API
export async function searchCustomers(
  dealerId: string,
  searchTerm: string,
  token?: string,
): Promise<Customer[]> {
  // No filtrar por owner_id para mostrar todos los clientes
  let endpoint = `/customers?order=name.asc`;
  
  // Search by phone, email, government_id or name
  if (searchTerm) {
    endpoint += `&or=(phone.ilike.*${searchTerm}*,email.ilike.*${searchTerm}*,government_id.ilike.*${searchTerm}*,name.ilike.*${searchTerm}*)`;
  }
  
  endpoint += `&limit=50`; // Aumentar límite para mostrar más clientes
  
  return apiFetch<Customer[]>(endpoint, {}, token);
}

export async function getCustomerById(
  customerId: string,
  token?: string,
): Promise<Customer> {
  const result = await apiFetch<Customer[]>(
    `/customers?id=eq.${customerId}`,
    {},
    token,
  );
  return result[0];
}

export async function createCustomer(
  dealerId: string,
  data: Omit<Customer, "id" | "owner_id" | "created_at" | "updated_at">,
  token?: string,
): Promise<Customer> {
  const customerData = {
    owner_id: dealerId,
    ...data,
  };

  console.log("Creating customer with data:", customerData);

  const result = await apiFetch<Customer[]>(
    "/customers",
    {
      method: "POST",
      body: JSON.stringify(customerData),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function updateCustomer(
  customerId: string,
  data: Partial<Customer>,
  token?: string,
): Promise<Customer> {
  const result = await apiFetch<Customer[]>(
    `/customers?id=eq.${customerId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function deleteCustomer(
  customerId: string,
  token?: string,
): Promise<void> {
  return apiFetch<void>(
    `/customers?id=eq.${customerId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// Sales Statistics
// Helper to get vehicle status name by ID (hardcoded mapping)
export function getStatusNameById(statusId: number): string {
  const statusMap: Record<number, string> = {
    1: "Ingreso",
    2: "Inspección",
    3: "Retoques",
    4: "Listo para vender",
    5: "Publicado",
    6: "Vendido",
    7: "Oferta",
  };
  return statusMap[statusId] || "Desconocido";
}

export async function getSalesStats(
  dealerId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
  },
  token?: string,
): Promise<{
  totalSales: number;
  totalRevenue: number;
  avgSalePrice: number;
}> {
  const sales = await listSales(dealerId, filters, token);
  
  return {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + (sale.price_final || 0), 0),
    avgSalePrice:
      sales.length > 0
        ? sales.reduce((sum, sale) => sum + (sale.price_final || 0), 0) /
          sales.length
        : 0,
  };
}
