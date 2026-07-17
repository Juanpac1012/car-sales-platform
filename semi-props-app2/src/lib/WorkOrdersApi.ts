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
export interface WorkOrder {
  id?: string;
  vehicle_id: string;
  dealer_id?: string;
  step_id?: number;
  status?: "pending" | "in_progress" | "completed" | "cancelled" | "listo";
  start_date?: string;
  end_date?: string;
  total_cost?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkOrderTask {
  id?: number;
  work_order_id: string;
  step_id?: number;
  task_name: string;
  supplier_id: string;
  responsible: string;
  cost: number;
  cost_crc?: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  status?: "pending" | "in_progress" | "completed";
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  supplier?: {
    s_name: string;
    s_email?: string;
    s_phone?: string;
  };
}

export interface CreateWorkOrderTaskParams {
  task_name: string;
  supplier_id: string;
  responsible: string;
  cost: number;
  start_date: string;
  end_date?: string;
  notes?: string;
  step_id?: number;
}

// Work Orders API
export async function listWorkOrders(
  vehicleId?: string,
  token?: string,
): Promise<WorkOrder[]> {
  const baseQuery = "/work_orders?select=*&order=created_at.desc";
  const filter = vehicleId ? `&vehicle_id=eq.${vehicleId}` : "";
  return apiFetch<WorkOrder[]>(`${baseQuery}${filter}`, {}, token);
}

export async function getWorkOrder(
  id: string,
  token?: string,
): Promise<WorkOrder> {
  const result = await apiFetch<WorkOrder[]>(
    `/work_orders?id=eq.${id}&select=*`,
    {},
    token,
  );
  return result[0];
}

export async function createWorkOrder(
  vehicleId: string,
  data: Partial<WorkOrder>,
  token?: string,
): Promise<WorkOrder> {
  const authData = localStorage.getItem("adminAuthData");
  let createdBy = null;
  
  if (authData) {
    const parsedAuth = JSON.parse(authData);
    createdBy =
      parsedAuth.user?.id ||
      parsedAuth.user?.sub?.split(":")[1] ||
      parsedAuth.sub?.split(":")[1];
  }

  const { dealer_id, ...rest } = data;
  const workOrderData = {
    vehicle_id: vehicleId,
    ...(dealer_id ? { dealer_id } : {}),
    ...rest,
  };

  const result = await apiFetch<WorkOrder[]>(
    "/work_orders",
    {
      method: "POST",
      body: JSON.stringify(workOrderData),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function updateWorkOrder(
  id: string,
  data: Partial<WorkOrder>,
  token?: string,
): Promise<WorkOrder> {
  const result = await apiFetch<WorkOrder[]>(
    `/work_orders?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function deleteWorkOrder(
  id: string,
  token?: string,
): Promise<void> {
  return apiFetch<void>(
    `/work_orders?id=eq.${id}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// Work Order Tasks API
export async function listWorkOrderTasks(
  workOrderId: string,
  token?: string,
): Promise<WorkOrderTask[]> {
  // Ajuste: supplier_id apunta a suppliers, join directo
  // Quitar el join para evitar error de relación
  return apiFetch<WorkOrderTask[]>(
    `/work_order_tasks?work_order_id=eq.${workOrderId}&order=created_at.desc`,
    {},
    token,
  );
}

export async function getWorkOrderTask(
  id: number,
  token?: string,
): Promise<WorkOrderTask> {
  const result = await apiFetch<WorkOrderTask[]>(
    `/work_order_tasks?id=eq.${id}&select=*`,
    {},
    token,
  );
  return result[0];
}

export async function createWorkOrderTask(
  workOrderId: string,
  data: CreateWorkOrderTaskParams,
  token?: string,
): Promise<WorkOrderTask> {
  const authData = localStorage.getItem("adminAuthData");
  let createdBy = null;
  
  if (authData) {
    const parsedAuth = JSON.parse(authData);
    createdBy =
      parsedAuth.user?.id ||
      parsedAuth.user?.sub?.split(":")[1] ||
      parsedAuth.sub?.split(":")[1];
  }

  const taskData = {
    work_order_id: workOrderId,
    task_name: data.task_name,
    supplier_id: data.supplier_id,
    responsible: data.responsible,
    cost: data.cost,
    start_date: data.start_date,
    end_date: data.end_date || null,
    notes: data.notes || null,
    step_id: data.step_id || null,
    created_by: createdBy,
  };

  console.log("Creating work order task with data:", taskData);

  const result = await apiFetch<WorkOrderTask[]>(
    "/work_order_tasks",
    {
      method: "POST",
      body: JSON.stringify(taskData),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function updateWorkOrderTask(
  id: number,
  data: Partial<WorkOrderTask>,
  token?: string,
): Promise<WorkOrderTask> {
  const result = await apiFetch<WorkOrderTask[]>(
    `/work_order_tasks?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
  
  return Array.isArray(result) ? result[0] : result;
}

export async function deleteWorkOrderTask(
  id: number,
  token?: string,
): Promise<void> {
  return apiFetch<void>(
    `/work_order_tasks?id=eq.${id}`,
    {
      method: "DELETE",
    },
    token,
  );
}

// Calculate total cost of work order
export async function calculateWorkOrderTotal(
  workOrderId: string,
  token?: string,
): Promise<number> {
  const tasks = await listWorkOrderTasks(workOrderId, token);
  return tasks.reduce((sum, task) => sum + (task.cost || 0), 0);
}

// Complete work order (update status and vehicle status)
export async function completeWorkOrder(
  workOrderId: string,
  token?: string,
): Promise<void> {
  const workOrder = await getWorkOrder(workOrderId, token);
  const total = await calculateWorkOrderTotal(workOrderId, token);
  // Update work order
  await updateWorkOrder(
    workOrderId,
    {
      status: "listo",
      end_date: new Date().toISOString().split("T")[0],
      total_cost: total,
    },
    token,
  );
  // Ya no se actualiza el status_id aquí. El vehículo permanece en retoques hasta ser publicado.
}

/**
 * Obtiene el total de costos de retoques de un vehículo
 * Retorna { totalUSD, totalCRC } o null si no hay work orders
 */
export async function getVehicleRetoquesTotal(
  vehicleId: string,
  exchangeRate: number = 500,
  token?: string,
): Promise<{ totalUSD: number; totalCRC: number } | null> {
  try {
    const workOrders = await listWorkOrders(vehicleId, token);
    if (!workOrders || workOrders.length === 0) return null;

    let totalUSD = 0;
    let totalCRC = 0;

    for (const wo of workOrders) {
      if (wo.id) {
        const tasks = await listWorkOrderTasks(wo.id, token);
        for (const task of tasks) {
          totalUSD += task.cost || 0;
          totalCRC +=
            task.cost_crc ?? Math.round((task.cost || 0) * exchangeRate);
        }
      }
    }

    return { totalUSD, totalCRC };
  } catch (error) {
    console.error("[getVehicleRetoquesTotal] Error:", error);
    return null;
  }
}
