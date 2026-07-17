// Obtener vehículos vendidos (status_id = 6)
export async function listSoldVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/vehicles?status_id=eq.6&select=*,make:makes(name),model:models(name)&order=updated_at.desc");
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row),
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: row.make,
    model: row.model,
  }));
}
/**
 * Verifica la estructura completa de una inspección con su checklist
 * ÚTIL PARA DEBUGGING - Ejecuta diagnóstico automático
 */
export async function diagnoseInspectionChecklist(vehicleId: string) {
  console.group('🔍 DIAGNÓSTICO DE INSPECCIÓN');
  try {
    // 1. Buscar inspección
    const inspection = await getInspectionByVehicleId(vehicleId);
    console.log('1. Inspección encontrada:', inspection);
    if (!inspection) {
      console.warn('❌ No existe inspección para este vehículo');
      console.groupEnd();
      return { inspection: null, checklist: [], error: 'No inspection found' };
    }
    // 2. Buscar checklist entries
    const checklist = await getInspectionChecklistEntries(inspection.id);
    console.log('2. Checklist entries:', checklist);
    // 3. Verificar en la base de datos directamente (raw)
    const rawCheck = await apiFetch(`/inspection_checklist_entries?inspection_id=eq.${inspection.id}`);
    console.log('3. Raw DB response:', rawCheck);
    // 4. Comparar estructuras si hay discrepancia
    if (checklist.length === 0 && Array.isArray(rawCheck) && rawCheck.length > 0) {
      console.error('⚠️ PROBLEMA: La DB tiene datos pero la función no los mapea correctamente');
      console.log('Estructura esperada vs recibida:', {
        expected: { id: 'uuid', inspection_id: 'uuid', item: 'string', aprobado: 'boolean', comentario: 'string' },
        received: rawCheck[0],
      });
    }
    console.groupEnd();
    return { inspection, checklist, rawCheck };
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    console.groupEnd();
    return { inspection: null, checklist: [], error };
  }
}
// Guardar un ítem del checklist de inspección
export async function createInspectionChecklistEntry(entry: {
  inspection_id: string;
  item: string;
  aprobado: boolean;
  comentario?: string;
}): Promise<any> {
  const result = await apiFetch(`/inspection_checklist_entries`, {
    method: "POST",
    body: JSON.stringify(entry)
  });
  return Array.isArray(result) ? result[0] : result;
}
// Obtener checklist de inspección con comentarios y estado
export async function getInspectionChecklist(inspectionId: string): Promise<Array<{ item_id: string; item_name: string; estado: string; comentario: string }>> {
  const result = await apiFetch(`/rpc/get_inspection_checklist`, {
    method: "POST",
    body: JSON.stringify({ p_inspection_id: inspectionId })
  });
  return Array.isArray(result) ? result : [];
}
/**
 * Obtiene la inspección por vehicle_id
 * CORREGIDO: Maneja mejor los casos donde no existe
 */
export async function getInspectionByVehicleId(vehicleId: string): Promise<Inspection | null> {
  if (!vehicleId) {
    console.warn('[getInspectionByVehicleId] vehicleId vacío');
    return null;
  }
  try {
    console.log('[getInspectionByVehicleId] Buscando inspección para vehicle_id:', vehicleId);
    const result = await apiFetch(`/inspections?vehicle_id=eq.${vehicleId}&order=created_at.desc&limit=1`);
    if (Array.isArray(result) && result.length > 0) {
      console.log('[getInspectionByVehicleId] Inspección encontrada:', result[0].id);
      return result[0];
    }
    console.log('[getInspectionByVehicleId] No se encontró inspección');
    return null;
  } catch (error) {
    console.error('[getInspectionByVehicleId] Error:', error);
    return null;
  }
}

// Obtener items de inspección por inspección
export async function getInspectionItems(inspectionId: string): Promise<InspectionItem[]> {
  const result = await apiFetch(`/inspection_items?inspection_id=eq.${inspectionId}`);
  return Array.isArray(result) ? result : [];
}
// Obtener todos los vehículos sin filtrar por status
export async function listAllVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/vehicles?select=*,make:makes(name),model:models(name)&order=created_at.desc");
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row),
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: row.make,
    model: row.model,
  }));
}

// Obtener vehículos por status específico
export async function listVehiclesByStatus(statusId: number): Promise<Vehicle[]> {
  const result = await apiFetch(`/vehicles?status_id=eq.${statusId}&select=*,make:makes(name),model:models(name)&order=created_at.desc`);
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row),
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: row.make,
    model: row.model,
  }));
}
import { ensureAuth } from "./adminAuth";

const API_HOST = (
  import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

// ==================== Types ====================

export interface Vehicle {
  id: string;
  status_id: number;
  make_id: number;
  model_id: number;
  year: number;
  license_plate?: string;
  vin?: string;
  transmission?: string;
  
  // ⭐ CAMPOS DE COLOR - siempre en camelCase
  exteriorColor: string;  // mapeado desde color_ext
  interiorColor: string;  // mapeado desde color_int
  
  price1?: number;
  price2?: number;
  price2_crc?: number;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined data
  make?: { name: string };
  model?: { name: string };
}

export interface VehicleListing {
  id?: string;
  vehicle_id: string;
  dealer_id: string;
  slug?: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'unlisted';
  featured?: boolean;
  mileage_display?: number;
  created_at?: string;
  published_at?: string;
  vehicle?: Vehicle;
  total_cost_usd?: number;
  total_cost_crc?: number;
  is_oferta?: boolean;
}

export interface Inspection {
  id: string;
  vehicle_id: string;
  inspector_id: string;
  status: "en_proceso" | "finalizada";
  resultado: "aprobado" | "rechazado" | "pendiente";
  total_items: number;
  aprobados?: number;
  rechazados?: number;
  notas_generales?: string;
  notes?: string; // Para compatibilidad con el campo notes en la tabla
  created_at?: string;
  updated_at?: string;
}

export interface InspectionChecklistItem {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface InspectionItem {
  id?: string;
  inspection_id: string;
  nombre_item: string;
  estado: "aprobado" | "rechazado" | "no_aplica";
  comentarios?: string;
  foto_url?: string;
  costo_estimado_retoque?: number;
}

// ==================== API Helper ====================

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const { token } = await ensureAuth();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "Prefer": "return=representation",
    ...options.headers,
  };

  const res = await fetch(`${API_HOST}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return null;
}

// ==================== MAPEO DE COLORES HELPER ====================
// ⭐ Función centralizada para mapear colores de forma consistente
// Busca en múltiples campos posibles dependiendo de la fuente (tabla directa, RPC, etc.)
function mapVehicleColors(row: any): { exteriorColor: string; interiorColor: string } {
  const extColor = row.color_ext 
    || row.color_exterior 
    || row.vehicle_color_ext 
    || row.vehicle_color_exterior 
    || row.exteriorColor
    || '';
  const intColor = row.color_int 
    || row.color_interior 
    || row.vehicle_color_int 
    || row.vehicle_color_interior 
    || row.interiorColor
    || '';
  
  return {
    exteriorColor: extColor && extColor.trim() !== "" ? extColor : "No especificado",
    interiorColor: intColor && intColor.trim() !== "" ? intColor : "No especificado",
  };
}

// ==================== Vehicles - SECCIÓN "PUBLICACIÓN" ====================

export async function listPendingVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/vehicles?status_id=in.(1,2)&select=*,make:makes(name),model:models(name)&order=created_at.desc");
  
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row), // ⭐ MAPEO LIMPIO
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: row.make,
    model: row.model,
  }));
}

export async function listRetoquesVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/vehicles?status_id=eq.3&select=*,make:makes(name),model:models(name)&order=created_at.desc");
  
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row), // ⭐ MAPEO LIMPIO
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: row.make,
    model: row.model,
  }));
}

// ⭐ FUNCIÓN PARA VEHÍCULOS LISTOS PARA PUBLICAR (status 4)
export async function listPublicacionVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/rpc/get_vehicles_ready_to_publish", {
    method: "POST",
    body: JSON.stringify({}),
  });
  
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row), // ⭐ MAPEO ROBUSTO
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: { name: row.make_name },
    model: { name: row.model_name },
  }));
}

// ⭐ FUNCIÓN PARA VEHÍCULOS YA PUBLICADOS (status 5)
export async function listPublishedVehicles(): Promise<Vehicle[]> {
  const result = await apiFetch("/rpc/get_vehicles_published", {
    method: "POST",
    body: JSON.stringify({}),
  });
  
  return result.map((row: any) => ({
    id: row.id,
    status_id: row.status_id,
    make_id: row.make_id,
    model_id: row.model_id,
    year: row.year,
    license_plate: row.license_plate,
    vin: row.vin,
    transmission: row.transmission,
    ...mapVehicleColors(row),
    price1: row.price1,
    price2: row.price2,
    price2_crc: row.price2_crc,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    make: { name: row.make_name },
    model: { name: row.model_name },
  }));
}

// ⭐ FUNCIÓN PARA OBTENER VEHÍCULO POR ID CON TODOS LOS CAMPOS (incluyendo colores)
export async function getVehicleById(vehicleId: string): Promise<Vehicle | null> {
  try {
    console.log('[getVehicleById] Buscando vehículo:', vehicleId);
    const result = await apiFetch(`/vehicles?id=eq.${vehicleId}&select=*,make:makes(name),model:models(name)`);
    console.log('[getVehicleById] Resultado RAW:', JSON.stringify(result, null, 2));
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      console.log('[getVehicleById] No se encontró el vehículo');
      return null;
    }
    const row = Array.isArray(result) ? result[0] : result;
    
    // Log específico de colores
    console.log('[getVehicleById] Campos de color encontrados:', {
      color_ext: row.color_ext,
      color_int: row.color_int,
      color_exterior: row.color_exterior,
      color_interior: row.color_interior,
    });
    
    const mappedColors = mapVehicleColors(row);
    console.log('[getVehicleById] Colores mapeados:', mappedColors);
    
    return {
      id: row.id,
      status_id: row.status_id,
      make_id: row.make_id,
      model_id: row.model_id,
      year: row.year,
      license_plate: row.license_plate,
      vin: row.vin,
      transmission: row.transmission,
      ...mappedColors,
      price1: row.price1,
      price2: row.price2,
      price2_crc: row.price2_crc,
      image_url: row.image_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
      make: row.make,
      model: row.model,
    };
  } catch (error) {
    console.error('[getVehicleById] Error:', error);
    return null;
  }
}

export async function updateVehicleStatus(vehicleId: string, statusId: number): Promise<Vehicle> {
  const result = await apiFetch(`/vehicles?id=eq.${vehicleId}`, {
    method: "PATCH",
    body: JSON.stringify({ status_id: statusId }),
  });
  const vehicle = Array.isArray(result) ? result[0] : result;
  
  // Asegurar mapeo de colores en el resultado
  return {
    ...vehicle,
    ...mapVehicleColors(vehicle),
  };
}

export async function deleteVehicle(vehicleId: string): Promise<void> {
  return apiFetch(`/vehicles?id=eq.${vehicleId}`, {
    method: "DELETE",
  });
}

export async function diagnoseVehicleStatusUpdate(vehicleId: string, newStatusId: number) {
  try {
    const before = await apiFetch(`/vehicles?id=eq.${vehicleId}&select=id,status_id,supplier_id`);
    console.log('Estado antes del UPDATE:', before);

    const updateRes = await apiFetch(`/vehicles?id=eq.${vehicleId}`, {
      method: "PATCH",
      body: JSON.stringify({ status_id: newStatusId }),
      headers: { "Prefer": "return=representation" },
    });
    console.log('Respuesta UPDATE:', updateRes);

    const after = await apiFetch(`/vehicles?id=eq.${vehicleId}&select=id,status_id,supplier_id`);
    console.log('Estado después del UPDATE:', after);

    return { before, updateRes, after };
  } catch (err) {
    console.error('Error completo:', err);
    return { error: err };
  }
}

export const updateVehiclePrice2 = async (
  vehicleId: string,
  price2: number,
  price2_crc?: number
): Promise<Vehicle> => {
  const updates: { price2: number; price2_crc?: number } = { price2 };
  if (price2_crc !== undefined) {
    updates.price2_crc = price2_crc;
  }

  const result = await apiFetch(`/vehicles?id=eq.${vehicleId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  if (!result) {
    throw new Error('Failed to update vehicle price. No representation returned.');
  }

  const vehicle = Array.isArray(result) ? result[0] : result;
  
  // Asegurar mapeo de colores
  return {
    ...vehicle,
    ...mapVehicleColors(vehicle),
  };
};

// ==================== Inspections ====================

export async function createInspection(vehicleId: string, inspectorId: string): Promise<Inspection> {
  console.group('[createInspection] Intentando crear inspección');
  console.log('Payload:', {
    vehicle_id: vehicleId,
    notes: '',
  });
  try {
    const result = await apiFetch("/inspections", {
      method: "POST",
      body: JSON.stringify({
        vehicle_id: vehicleId,
        notes: '',
      }),
    });
    console.log('[createInspection] Respuesta del backend:', result);
    if (!result) throw new Error('Respuesta vacía del backend');
    if (Array.isArray(result) && result.length === 0) throw new Error('Array vacío devuelto por el backend');
    const inspection = Array.isArray(result) ? result[0] : result;
    if (!inspection.id) throw new Error('No se recibió un id de inspección');
    console.groupEnd();
    return inspection;
  } catch (error: any) {
    console.error('[createInspection] Error al crear inspección:', error);
    console.groupEnd();
    throw error;
  }
}

export async function finalizeInspection(
  inspectionId: string,
  aprobados: number,
  rechazados: number,
  notasGenerales?: string
): Promise<Inspection> {
  // Solo enviar campos válidos: notes (notas_generales no existe, usar notes)
  const result = await apiFetch(`/inspections?id=eq.${inspectionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      notes: notasGenerales || '',
    }),
  });
  return Array.isArray(result) ? result[0] : result;
}


/**
 * Carga los ítems del checklist para una inspección.
 * Si la inspección no tiene entradas, usa la plantilla (inspection_checklist_items).
 */
export async function loadChecklistItems(inspectionId?: string): Promise<InspectionChecklistItem[]> {
  if (inspectionId) {
    // Buscar entradas existentes para la inspección
    const entries = await apiFetch(`/inspection_checklist_entries?inspection_id=eq.${inspectionId}&order=created_at.asc`);
    if (Array.isArray(entries) && entries.length > 0) {
      // Mapear al formato estándar, incluyendo comentario y aprobado
      return entries.map((row: any) => ({
        id: row.id,
        nombre: row.item || row.nombre || row.nombre_item || 'Sin nombre',
        descripcion: row.descripcion || '',
        orden: row.orden || 0,
        activo: row.activo !== false,
        comentario: row.comentario || row.comment || row.comments || row.comentarios || '',
        aprobado: typeof row.aprobado === 'boolean' ? row.aprobado : undefined,
      }));
    }
  }
  // Si no hay inspectionId o no hay entradas, cargar plantilla.
  const template = await apiFetch(`/inspection_checklist_items?activo=eq.true&order=orden.asc`);
  if (Array.isArray(template)) {
    return template.map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      orden: row.orden || 0,
      activo: row.activo !== false,
    }));
  }
  return [];
}

export async function saveInspectionItems(items: InspectionItem[]): Promise<InspectionItem[]> {
  // Mapear los campos a los de inspection_checklist_entries
  const entries = items.map(item => ({
    inspection_id: item.inspection_id,
    item: item.nombre_item, // nombre_item → item
    aprobado: item.estado === "aprobado", // estado → aprobado (boolean)
    comentario: item.comentarios || ""
  }));
  return apiFetch("/inspection_checklist_entries", {
    method: "POST",
    body: JSON.stringify(entries),
  });
}

export async function countApprovedItems(inspectionId: string): Promise<number> {
  const result = await apiFetch(
    `/inspection_items?inspection_id=eq.${inspectionId}&estado=eq.aprobado&select=count`,
    {
      headers: { "Prefer": "count=exact" },
    }
  );
  
  if (Array.isArray(result) && result.length > 0) {
    return result.length;
  }
  return 0;
}

export async function completeInspectionFlow(
  vehicleId: string,
  inspectionId: string,
  items: Array<{ nombre_item: string; estado: "aprobado" | "rechazado"; comentarios?: string }>,
  notasGenerales?: string
): Promise<{ inspection: Inspection; vehicle: Vehicle }> {
  const inspectionItems: InspectionItem[] = items.map(item => ({
    inspection_id: inspectionId,
    nombre_item: item.nombre_item,
    estado: item.estado,
    comentarios: item.comentarios,
  }));
  
  await saveInspectionItems(inspectionItems);
  
  const aprobados = items.filter(item => item.estado === "aprobado").length;
  const rechazados = items.length - aprobados;
  
  const inspection = await finalizeInspection(inspectionId, aprobados, rechazados, notasGenerales);
  
  // El estado del vehículo se cambia desde la pantalla después de completar
  // las operaciones dependientes. Así, si falla la creación del listing, el
  // vehículo no queda marcado como "Listo" sin una publicación asociada.
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) {
    throw new Error("No se pudo recuperar el vehículo inspeccionado.");
  }
  
  return { inspection, vehicle };
}

// ==================== Vehicle Listings - SECCIÓN "OFERTAS" (FUTURA) ====================
// ⚠️ NOTA: Esta sección usará los ALIAS de la función RPC get_vehicle_listings_with_prices

export async function listVehicleListings(): Promise<VehicleListing[]> {
  const result = await apiFetch("/rpc/get_vehicle_listings_with_prices", {
    method: "POST",
    body: JSON.stringify({}),
  });

  return result.map((row: any) => {
    // ⭐ MAPEO ROBUSTO DE COLORES - buscar en múltiples campos posibles
    const extColor = row.vehicle_color_ext 
      || row.vehicle_color_exterior 
      || row.color_ext 
      || row.color_exterior
      || row.exteriorColor
      || '';
    const intColor = row.vehicle_color_int 
      || row.vehicle_color_interior 
      || row.color_int 
      || row.color_interior
      || row.interiorColor
      || '';
    
    return {
      id: row.id,
      vehicle_id: row.vehicle_id,
      dealer_id: row.dealer_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: row.price,
      currency: row.currency,
      status: row.status,
      visibility: row.visibility,
      featured: row.featured,
      created_at: row.created_at,
      published_at: row.published_at,
      is_oferta: row.is_oferta,
      vehicle: {
        id: row.vehicle_id,
        status_id: row.vehicle_status_id || 5,
        make_id: row.vehicle_make_id || 0,
        model_id: row.vehicle_model_id || 0,
        year: row.vehicle_year,
        license_plate: row.vehicle_license_plate,
        vin: row.vehicle_vin,
        price1: row.vehicle_price1,
        price2: row.vehicle_price2,
        price2_crc: row.vehicle_price2_crc,
        image_url: row.vehicle_image_url,
        make: { name: row.vehicle_make_name },
        model: { name: row.vehicle_model_name },
        // ⭐ MAPEO DE COLORES ROBUSTO
        exteriorColor: extColor && extColor.trim() !== '' ? extColor : 'No especificado',
        interiorColor: intColor && intColor.trim() !== '' ? intColor : 'No especificado',
      }
    };
  });
}

export async function createVehicleListing(listing: Omit<VehicleListing, 'id' | 'created_at' | 'updated_at'>): Promise<VehicleListing> {
  const result = await apiFetch("/vehicle_listings", {
    method: "POST",
    body: JSON.stringify(listing),
  });
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Obtiene el listing existente de un vehículo (si existe)
 */
export async function getListingByVehicleId(vehicleId: string): Promise<VehicleListing | null> {
  const result = await apiFetch(`/vehicle_listings?vehicle_id=eq.${vehicleId}&order=created_at.desc&limit=1`);
  if (Array.isArray(result) && result.length > 0) {
    return result[0];
  }
  return null;
}

/**
 * Crea un listing si no existe, o actualiza el existente si ya hay uno para ese vehículo.
 * Esto evita duplicados al republicar desde Retoques.
 */
export async function upsertVehicleListing(
  listing: Omit<VehicleListing, 'id' | 'created_at' | 'updated_at'>
): Promise<{ listing: VehicleListing; isUpdate: boolean }> {
  // Verificar si ya existe un listing para este vehículo
  const existingListing = await getListingByVehicleId(listing.vehicle_id);
  
  if (existingListing && existingListing.id) {
    // Actualizar el listing existente
    const updated = await updateVehicleListing(existingListing.id, {
      dealer_id: listing.dealer_id,
      title: listing.title,
      price: listing.price,
      status: listing.status,
      visibility: listing.visibility,
    });
    return { listing: updated, isUpdate: true };
  }
  
  // Crear nuevo listing
  const created = await createVehicleListing(listing);
  return { listing: created, isUpdate: false };
}

export async function updateVehicleListing(id: string, updates: Partial<VehicleListing>): Promise<VehicleListing> {
  const result = await apiFetch(`/vehicle_listings?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return Array.isArray(result) ? result[0] : result;
}

export async function deleteVehicleListing(id: string): Promise<void> {
  return apiFetch(`/vehicle_listings?id=eq.${id}`, {
    method: "DELETE",
  });
}

export async function publishListing(listingId: string): Promise<void> {
  return apiFetch(`/rpc/publish_listing`, {
    method: "POST",
    body: JSON.stringify({ p_listing_id: listingId }),
  });
}

export async function archiveListing(listingId: string): Promise<void> {
  return apiFetch(`/rpc/archive_listing`, {
    method: "POST",
    body: JSON.stringify({ p_listing_id: listingId }),
  });
}


// ==================== Checklist Entries Mejorado ====================

export interface InspectionChecklistEntry {
  id: string;
  inspection_id: string;
  item: string;
  aprobado: boolean;
  comentario?: string;
  created_at?: string;
}

/**
 * Obtiene los ítems del checklist de una inspección
 * CORREGIDO: Maneja diferentes estructuras de respuesta
 */
export async function getInspectionChecklistEntries(inspectionId: string): Promise<InspectionChecklistEntry[]> {
  if (!inspectionId) {
    console.warn('[getInspectionChecklistEntries] inspectionId vacío');
    return [];
  }

  try {
    console.log('[getInspectionChecklistEntries] Buscando checklist para inspection_id:', inspectionId);
    const result = await apiFetch(`/inspection_checklist_entries?inspection_id=eq.${inspectionId}&order=created_at.asc`);
    if (!Array.isArray(result)) {
      console.warn('[getInspectionChecklistEntries] Respuesta no es array:', result);
      return [];
    }
    console.log(`[getInspectionChecklistEntries] Encontrados ${result.length} ítems`);
    // ⭐ Normalizar la estructura de datos para manejar diferentes nombres de columnas
    return result.map((row: any) => ({
      id: row.id,
      inspection_id: row.inspection_id,
      item: row.item || row.item_name || row.nombre_item || 'Sin nombre',
      aprobado: row.aprobado ?? row.approved ?? row.estado === 'aprobado',
      comentario: row.comentario || row.comment || row.comments || row.comentarios || '',
      created_at: row.created_at,
    }));
  } catch (error) {
    console.error('[getInspectionChecklistEntries] Error:', error);
    return [];
  }
}

/**
 * Cuenta los listings (anuncios) que están PUBLICADOS (status = 'published')
 */
export async function getListingsCount(): Promise<number> {
  try {
    const { token } = await ensureAuth();
    const response = await fetch(
      `${API_HOST}/vehicle_listings?status=eq.published&select=id`,
      {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${token}`,
          Prefer: "count=exact",
        },
      }
    );

    if (!response.ok) return 0;

    const contentRange = response.headers.get("content-range") || "";
    const match = contentRange.match(/\/(\d+)$/);
    return match ? Number(match[1]) : 0;
  } catch (error) {
    console.error('[getListingsCount] Error:', error);
    return 0;
  }
}