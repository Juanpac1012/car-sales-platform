// IngresoApi.ts (COMPLETO y CORREGIDO)
// ✅ NO toca JWT
// ✅ SIEMPRE envía Accept-Profile/Content-Profile: api
// ✅ Arregla búsquedas OR (no rompe year si es texto)
// ✅ 🔥 Arregla filtros enum en querystring (transmission/fuel_type/drive_type)
//    - Soporta eq.* e in.(...)
//    - Normaliza tildes/case: "Automática" -> "Automatica" (válido en tu enum)

import { dbErrorToSpanishMessage, logDbError } from "@/lib/errors/EnumDbError";
import { getToken } from "@/lib/adminAuth";

const API = (
   import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

const PROFILE_HEADERS: Record<string, string> = {
  "Accept-Profile": "api",
  "Content-Profile": "api",
};

// Lee token SIN validar por RPC
function resolveToken(explicit?: string) {
  if (explicit) return explicit;
  return getToken(); // tu adminAuth ya lee memoria/localStorage
}

async function authHeaders(token?: string): Promise<Record<string, string>> {
  const t = resolveToken(token);

  // ✅ SIEMPRE devolvemos profile headers, haya token o no
  if (!t) return { ...PROFILE_HEADERS };

  return {
    ...PROFILE_HEADERS,
    Authorization: `Bearer ${t}`,
  };
}

// ✅ DEBUG: NO redirige, NO borra token.
function handle401(res?: Response, where?: string) {
  console.error("⛔ 401 atrapado", {
    where,
    url: res?.url,
    status: res?.status,
  });

  // ⚠️ Producción:
  // clearAuth();
  // window.location.href = "/login";
}

// ================= Helpers enums (NORMALIZA filtros) =================

// Quita tildes y normaliza a lower
function normKey(s: string) {
  return s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacríticos
    .toLowerCase();
}

// 🔥 OJO: tu enum de transmission tiene "Automatica" / "automatica" / "automatic"
// Para evitar sorpresas, devolvemos "Automatica" (sin tilde) como canónico para español.
const transmissionToDb: Record<string, string> = {
  // UI ES
  [normKey("Automática")]: "Automatica",
  [normKey("Automatica")]: "Automatica",
  [normKey("automatica")]: "Automatica",

  [normKey("Manual")]: "manual",
  [normKey("manual")]: "manual",

  [normKey("CVT")]: "cvt",
  [normKey("cvt")]: "cvt",

  [normKey("DCT")]: "dct",
  [normKey("dct")]: "dct",

  // híbrida en tu enum existe como "híbrida" y también "hybrid"
  // elegimos "hybrid" (sin tilde) como canónico para evitar tildes en URLs
  [normKey("Híbrida")]: "hybrid",
  [normKey("hibrida")]: "hybrid",
  [normKey("hybrid")]: "hybrid",
};

const fuelToDb: Record<string, string> = {
  [normKey("Gasolina")]: "gasoline",
  [normKey("gasolina")]: "gasoline",
  [normKey("gasoline")]: "gasoline",

  [normKey("Diesel")]: "diesel",
  [normKey("diesel")]: "diesel",

  [normKey("Eléctrico")]: "electric",
  [normKey("electrico")]: "electric",
  [normKey("electric")]: "electric",

  [normKey("Híbrido")]: "hybrid",
  [normKey("hibrido")]: "hybrid",
  [normKey("hybrid")]: "hybrid",
};

const driveToDb: Record<string, string> = {
  [normKey("Delantera")]: "fwd",
  [normKey("fwd")]: "fwd",

  [normKey("Trasera")]: "rwd",
  [normKey("rwd")]: "rwd",

  [normKey("4x4")]: "4wd",
  [normKey("4wd")]: "4wd",

  [normKey("AWD")]: "awd",
  [normKey("awd")]: "awd",
};

// Soporta: "eq.X" y "in.(A,B,C)"
function normalizeEnumFilterValue(value: string, map: Record<string, string>) {
  const v = value.trim();
  if (!v) return value;

  // eq.<value>
  if (v.startsWith("eq.")) {
    const raw = v.slice(3);
    const decoded = decodeURIComponent(raw);
    const mapped = map[normKey(decoded)];
    return mapped ? `eq.${mapped}` : value;
  }

  // in.(A,B,C)
  if (v.startsWith("in.(") && v.endsWith(")")) {
    const inside = v.slice(4, -1);
    const items = inside
      .split(",")
      .map((x) => decodeURIComponent(x.trim()))
      .filter(Boolean);

    const mappedItems = items.map((it) => map[normKey(it)] ?? it);
    return `in.(${mappedItems.join(",")})`;
  }

  // si algún día usás neq., like., ilike., etc. se puede ampliar
  return value;
}

function normalizeEnumFiltersInUrl(url: string) {
  try {
    const u = new URL(url);

    const tr = u.searchParams.get("transmission");
    if (tr) {
      u.searchParams.set(
        "transmission",
        normalizeEnumFilterValue(tr, transmissionToDb),
      );
    }

    const fu = u.searchParams.get("fuel_type");
    if (fu) {
      u.searchParams.set("fuel_type", normalizeEnumFilterValue(fu, fuelToDb));
    }

    const dr = u.searchParams.get("drive_type");
    if (dr) {
      u.searchParams.set("drive_type", normalizeEnumFilterValue(dr, driveToDb));
    }

    return u.toString();
  } catch {
    return url;
  }
}

// ================= Helpers de búsqueda (OR seguro) =================

function escapeOrValue(raw: string) {
  return raw
    .replace(/[(),]/g, " ")
    .replace(/[*;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIntTerm(raw: string) {
  return /^\d+$/.test(raw);
}

function buildVehicleOrFilter(searchRaw: string) {
  const term = escapeOrValue(searchRaw);
  if (!term) return null;

  const parts: string[] = [
    `license_plate.ilike.*${term}*`,
    `notes.ilike.*${term}*`,
    `vin.ilike.*${term}*`,
  ];

  if (isIntTerm(term)) {
    parts.push(`year.eq.${term}`);
  }

  return `(${parts.join(",")})`;
}

/**
 * ✅ Lee el body UNA sola vez.
 * Devuelve: json | texto | null
 */
async function readBodyOnce(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

async function safeRequest<T>(res: Response, where?: string): Promise<T> {
  if (res.status === 401) {
    handle401(res, where);
    return [] as unknown as T;
  }

  const payload = await readBodyOnce(res);

  if (!res.ok) {
    logDbError(payload);
    throw new Error(dbErrorToSpanishMessage(payload));
  }

  if (res.status === 204) return undefined as T;
  return payload as T;
}

/**
 * fetch con:
 * - headers auth + profile
 * - normalización de enums en la URL (aunque otros módulos la manden mal)
 */
async function apiFetch<T>(
  url: string,
  init: RequestInit | undefined,
  token?: string,
  where?: string,
): Promise<T> {
  const headers = await authHeaders(token);
  const finalUrl = normalizeEnumFiltersInUrl(url);

  const res = await fetch(finalUrl, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...headers,
    },
  });

  return await safeRequest<T>(res, where);
}

// ================= RPC =================

export async function rpc<T>(
  name: string,
  body: any,
  token?: string,
): Promise<T> {
  const url = `${API}/rpc/${name}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(token)),
    },
    body: JSON.stringify(body ?? {}),
  });

  return await safeRequest<T>(res, `rpc:${name}`);
}

// ================= Tipos catálogos =================

export interface Make {
  id: number;
  name: string;
}

export interface Model {
  id: number;
  make_id: number;
  name: string;
}

export interface Supplier {
  id: number;
  name: string;
}

// ================= GET makes/models/suppliers =================

export const getMakes = async (token?: string): Promise<Make[]> => {
  const url = `${API}/makes`;
  return await apiFetch<Make[]>(url, { method: "GET" }, token, "getMakes");
};

export const getModels = async (token?: string): Promise<Model[]> => {
  const url = `${API}/models`;
  return await apiFetch<Model[]>(url, { method: "GET" }, token, "getModels");
};

export const getSuppliers = async (token?: string): Promise<Supplier[]> => {
  const url = `${API}/suppliers`;
  return await apiFetch<Supplier[]>(
    url,
    { method: "GET" },
    token,
    "getSuppliers",
  );
};

// ================= Vehículos (lectura) =================

export interface VehicleRow {
  id: string;
  vin: string | null;
  license: string | null;
  make_id: number;
  model_id: number;
  trim_id?: number | null;
  year: number;
  odometer_km?: number | null;
  doors?: number | null;
  seats?: number | null;
  created_at: string;
  price1?: number | null;
  price2?: number | null;
  price1_crc?: number | null;
  price2_crc?: number | null;
  license_plate?: string | null;
  placa?: string | null;
  notes?: string | null;
  image_url?: string | null;
  color_ext?: string | null;
  color_int?: string | null;
  color_exterior?: string | null;
  color_interior?: string | null;
  transmission?: string | null;
  transmision?: string | null;
  drive_type?: string | null;
  fuel_type?: string | null;
  engine?: string | null;
  status_id?: number | null;
  estado?: string | null;
  supplier_id?: string | null;
  fotos?: {
    ingreso: string[];
    revision: string[];
    retoques: string[];
    finales: string[];
  } | null;
}

/**
 * VALIDAR PLACA EXISTENTE
 */
export const existsPlate = async (
  plate: string,
  token?: string,
): Promise<boolean> => {
  const clean = plate?.trim();
  if (!clean) return false;

  const url =
    `${API}/vehicles?select=id` +
    `&license_plate=eq.${encodeURIComponent(clean)}` +
    `&limit=1`;

  const rows = await apiFetch<any[]>(
    url,
    { method: "GET" },
    token,
    "existsPlate",
  );
  return Array.isArray(rows) && rows.length > 0;
};

/**
 * VALIDAR VIN EXISTENTE
 */
export const existsVin = async (
  vin: string,
  token?: string,
): Promise<boolean> => {
  const clean = vin?.trim();
  if (!clean) return false;

  const url =
    `${API}/vehicles?select=id` +
    `&vin=eq.${encodeURIComponent(clean)}` +
    `&limit=1`;

  const rows = await apiFetch<any[]>(
    url,
    { method: "GET" },
    token,
    "existsVin",
  );
  return Array.isArray(rows) && rows.length > 0;
};

/**
 * Vehículos recientes excluyendo "Vendido" (status_id = 6)
 * ✅ Soporta búsqueda opcional (search) sin romper year cuando es texto
 */
export const getRecentVehicles = async (
  limit = 20,
  offset = 0,
  search?: string,
  token?: string,
): Promise<VehicleRow[]> => {
  const baseSelect =
    `id,make_id,model_id,year,vin,license_plate,created_at,price1,price2,price1_crc,price2_crc,status_id,image_url,` +
    `color_ext,color_int,transmission,fuel_type,drive_type,engine,odometer_km,doors,seats,notes,supplier_id`;

  const params = new URLSearchParams();
  params.set("select", baseSelect);
  params.set("status_id", "neq.6");
  params.set("order", "created_at.desc");
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const or = search ? buildVehicleOrFilter(search) : null;
  if (or) params.set("or", or);

  const url = `${API}/vehicles?${params.toString()}`;

  return await apiFetch<VehicleRow[]>(
    url,
    { method: "GET" },
    token,
    "getRecentVehicles",
  );
};

/**
 * Conteo total excluyendo vendidos
 */
export const getVehiclesCountExcludingSold = async (
  token?: string,
): Promise<number> => {
  const url = `${API}/vehicles?select=id&status_id=neq.6`;
  const headers = await authHeaders(token);

  const res = await fetch(normalizeEnumFiltersInUrl(url), {
    method: "GET",
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  });

  if (res.status === 401) {
    handle401(res, "getVehiclesCountExcludingSold");
    return 0;
  }

  if (!res.ok) {
    const payload = await readBodyOnce(res);
    logDbError(payload);
    throw new Error(dbErrorToSpanishMessage(payload));
  }

  const contentRange = res.headers.get("content-range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Conteo por estado
 */
export const getVehiclesCountByStatus = async (
  statusId: number,
  token?: string,
): Promise<number> => {
  const url = `${API}/vehicles?select=id&status_id=eq.${statusId}`;
  const headers = await authHeaders(token);

  const res = await fetch(normalizeEnumFiltersInUrl(url), {
    method: "GET",
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  });

  if (res.status === 401) {
    handle401(res, "getVehiclesCountByStatus");
    return 0;
  }

  if (!res.ok) {
    const payload = await readBodyOnce(res);
    logDbError(payload);
    throw new Error(dbErrorToSpanishMessage(payload));
  }

  const contentRange = res.headers.get("content-range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
};

/**
 * Conteo total (sin filtro)
 */
export const getVehiclesCount = async (token?: string): Promise<number> => {
  const url = `${API}/vehicles?select=id`;
  const headers = await authHeaders(token);

  const res = await fetch(normalizeEnumFiltersInUrl(url), {
    method: "GET",
    headers: {
      ...headers,
      Prefer: "count=exact",
    },
  });

  if (res.status === 401) {
    handle401(res, "getVehiclesCount");
    return 0;
  }

  if (!res.ok) {
    const payload = await readBodyOnce(res);
    logDbError(payload);
    throw new Error(dbErrorToSpanishMessage(payload));
  }

  const contentRange = res.headers.get("content-range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
};

export const getVehicleById = async (
  vehicleId: string,
  token?: string,
): Promise<VehicleRow> => {
  const url =
    `${API}/vehicles?select=` +
    `id,make_id,model_id,year,vin,license_plate,created_at,price1,price2,price1_crc,price2_crc,status_id,image_url,` +
    `color_ext,color_int,transmission,fuel_type,drive_type,engine,odometer_km,doors,seats,notes,supplier_id,fotos` +
    `&id=eq.${vehicleId}`;

  const vehicles = await apiFetch<VehicleRow[]>(
    url,
    { method: "GET" },
    token,
    "getVehicleById",
  );

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    const err: any = new Error("NOT_FOUND");
    err.httpStatus = 404;
    throw err;
  }
  return vehicles[0];
};

// ================= Actualizar Vehículo (PATCH) =================

export interface UpdateVehicleParams {
  year: number;
  vin: string;
  license_plate?: string | null;
  color_ext: string;
  color_int: string;
  transmission: string; // ⚠️ ideal: "Automatica" o "manual" o "automatic"
  fuel_type?: string;
  engine?: string;
  drive_type?: string;
  odometer_km?: number;
  doors: number;
  seats: number;
  price1?: number;
  price2?: number;
  notes?: string | null;
  supplier_id?: string | null;
}

export const updateVehicle = async (
  vehicleId: string,
  params: UpdateVehicleParams,
  token?: string,
): Promise<void> => {
  const url = `${API}/vehicles?id=eq.${vehicleId}`;

  const res = await fetch(normalizeEnumFiltersInUrl(url), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(await authHeaders(token)),
    },
    body: JSON.stringify(params),
  });

  await safeRequest<void>(res, "updateVehicle");
};

// ================= Actualizar fotos (PATCH) =================

export const updateVehiclePhotos = async (
  vehicleId: string,
  fotos: {
    ingreso: string[];
    revision: string[];
    retoques: string[];
    finales: string[];
  },
  token?: string,
): Promise<void> => {
  const url = `${API}/vehicles?id=eq.${vehicleId}`;

  const res = await fetch(normalizeEnumFiltersInUrl(url), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(await authHeaders(token)),
    },
    body: JSON.stringify({ fotos }),
  });

  await safeRequest<void>(res, "updateVehiclePhotos");
};

// ================= RPCs =================

export const updateVehicleImage = async (
  vehicleId: string,
  imageUrl: string,
  token?: string,
): Promise<void> => {
  await rpc<void>(
    "update_vehicle_image",
    { p_vehicle_id: vehicleId, p_image_url: imageUrl },
    token,
  );
};

export const updateVehiclePriceCRC = async (
  vehicleId: string,
  price1Crc?: number,
  price2Crc?: number,
  token?: string,
): Promise<void> => {
  await rpc<void>(
    "update_vehicle_price_crc",
    {
      p_vehicle_id: vehicleId,
      p_price1_crc: price1Crc ?? null,
      p_price2_crc: price2Crc ?? null,
    },
    token,
  );
};

// ================= Eliminar Vehículo =================

export const deleteVehicle = async (
  vehicleId: string,
  token?: string,
): Promise<void> => {
  try {
    await rpc<void>("delete_vehicle", { p_vehicle_id: vehicleId }, token);
    return;
  } catch {
    const url = `${API}/vehicles?id=eq.${vehicleId}`;

    const res = await fetch(normalizeEnumFiltersInUrl(url), {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal",
        ...(await authHeaders(token)),
      },
    });

    await safeRequest<void>(res, "deleteVehicle:direct");
  }
};
