const API = (
   import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

const PROFILE_HEADERS: Record<string, string> = {
  "Accept-Profile": "api",
  "Content-Profile": "api",
};

// ----------------- NORMALIZACIÓN (UI -> DB) -----------------

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normKey(s: string) {
  return stripDiacritics(s).trim().toLowerCase();
}

/**
 * Tu enum real (según lo que pegaste):
 * manual, automatic, cvt, dct, automatica, Automatica, hybrid, híbrida
 *
 * Para evitar el 400, mapeamos entradas típicas de UI:
 * "Automática" -> "Automatica" (SIN tilde, que sí existe)
 */
const transmissionToDb: Record<string, string> = {
  [normKey("Automática")]: "Automatica",
  [normKey("Automatica")]: "Automatica",
  [normKey("automatica")]: "Automatica",
  [normKey("auto")]: "Automatica",

  [normKey("Manual")]: "manual",
  [normKey("manual")]: "manual",

  [normKey("automatic")]: "automatic",
  [normKey("cvt")]: "cvt",
  [normKey("dct")]: "dct",

  [normKey("híbrida")]: "hybrid",
  [normKey("hibrida")]: "hybrid",
  [normKey("hybrid")]: "hybrid",
};

const fuelToDb: Record<string, string> = {
  [normKey("Gasolina")]: "gasoline",
  [normKey("gasoline")]: "gasoline",
  [normKey("gas")]: "gasoline",

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

function isEnumValueAllowed(value: string, map: Record<string, string>) {
  // si ya viene como valor db, lo dejamos
  const key = normKey(value);
  return Object.values(map).some((v) => normKey(v) === key);
}

// Soporta eq.X e in.(A,B)
function normalizeEnumFilterValue(value: string, map: Record<string, string>) {
  const v = value.trim();
  if (!v) return value;

  // eq.<value>
  if (v.startsWith("eq.")) {
    const raw = v.slice(3);
    const decoded = decodeURIComponent(raw);

    if (isEnumValueAllowed(decoded, map)) return `eq.${decoded}`;

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

    const mappedItems = items.map((it) => {
      if (isEnumValueAllowed(it, map)) return it;
      return map[normKey(it)] ?? it;
    });

    return `in.(${mappedItems.join(",")})`;
  }

  return value;
}

function normalizeEnumFiltersInUrl(fullUrl: string) {
  try {
    const u = new URL(fullUrl);

    const tr = u.searchParams.get("transmission");
    if (tr)
      u.searchParams.set(
        "transmission",
        normalizeEnumFilterValue(tr, transmissionToDb),
      );

    const fu = u.searchParams.get("fuel_type");
    if (fu)
      u.searchParams.set("fuel_type", normalizeEnumFilterValue(fu, fuelToDb));

    const dr = u.searchParams.get("drive_type");
    if (dr)
      u.searchParams.set("drive_type", normalizeEnumFilterValue(dr, driveToDb));

    return u.toString();
  } catch {
    return fullUrl;
  }
}

// ----------------- SEARCH OR SAFE -----------------

function escapeOrValue(raw: string) {
  // evita romper or=(...) por caracteres especiales
  return raw
    .replace(/[(),]/g, " ")
    .replace(/[*;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIntTerm(raw: string) {
  return /^\d+$/.test(raw);
}

function buildVehiclesOr(searchRaw: string) {
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

// ----------------- Helper function for authenticated API calls -----------------

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...PROFILE_HEADERS,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const rawUrl = `${API}${endpoint}`;
  const finalUrl = normalizeEnumFiltersInUrl(rawUrl);

  const res = await fetch(finalUrl, {
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

// ----------------- TYPES -----------------

export interface Vehicle {
  id: string;
  vin?: string;
  make_id?: number;
  model_id?: number;
  trim_id?: number;
  year: number;

  // columnas reales de api.vehicles
  odometer_km?: number;
  transmission?: string;
  fuel_type?: string;
  color_ext?: string;
  color_int?: string;
  engine?: string;
  drive_type?: string;
  doors?: number;
  seats?: number;

  price1?: number;
  price2?: number;
  license_plate?: string;
  notes?: string;
  image_url?: string;
  status_id: number;
  created_at?: string;
  updated_at?: string;

  status?: { id: number; name: string };
  make?: { id: number; name: string };
  model?: { id: number; name: string };
}

export interface VehicleListItem extends Vehicle {
  days_in_stock?: number;
  price?: number;
}

export interface FilterOptions {
  status_id?: number;
  make_id?: number;
  year?: number;
  transmission?: string; // viene de UI (ej "Automática")
  price_min?: number;
  price_max?: number;
  search?: string;
}

// ----------------- TRADUCCIONES (SOLO DISPLAY) -----------------

function translateTransmission(value?: string) {
  if (!value) return undefined;
  const v = normKey(value);

  // "automatic", "Automatica", "automatica" => Automática (display)
  if (v.includes("auto")) return "Automática";
  if (v.includes("manual")) return "Manual";
  if (v.includes("cvt")) return "CVT";
  if (v.includes("dct")) return "DCT";
  if (v.includes("hybrid") || v.includes("hibrid")) return "Híbrida";

  return value;
}

function translateFuel(value?: string) {
  if (!value) return undefined;
  const v = normKey(value);

  if (v.includes("gas")) return "Gasolina";
  if (v.includes("diesel")) return "Diésel";
  if (v.includes("electric")) return "Eléctrico";
  if (v.includes("hybrid") || v.includes("hibrid")) return "Híbrido";

  return value;
}

// helper para no repetir lógica
function mapVehicleToListItem(v: Vehicle): VehicleListItem {
  const daysInStock = v.created_at
    ? Math.ceil(
        (Date.now() - new Date(v.created_at).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return {
    ...v,
    // ✅ SOLO display
    transmission: translateTransmission(v.transmission),
    fuel_type: translateFuel(v.fuel_type),
    days_in_stock: daysInStock,
    price: v.price1 || 0, // Mostrar costo de compra (price1), los retoques se muestran en el detalle
  };
}

// ----------------- INVENTARIO API -----------------

export async function listVehicles(
  dealerId: string, // por ahora no se usa en el endpoint
  filters?: FilterOptions,
  token?: string,
): Promise<VehicleListItem[]> {
  let endpoint = `/vehicles?`;

  endpoint +=
    "select=" +
    [
      "id",
      "vin",
      "year",
      "license_plate",
      "price1",
      "price2",
      "price1_crc",
      "price2_crc",
      "transmission",
      "image_url",
      "status_id",
      "created_at",
      "make_id",
      "model_id",
      "notes",
      "odometer_km",
      "fuel_type",
      "color_ext",
      "color_int",
      "engine",
      "drive_type",
      "doors",
      "seats",
    ].join(",");

  endpoint += "&order=created_at.desc";

  // Filtros
  if (filters?.status_id) {
    endpoint += `&status_id=eq.${filters.status_id}`;
  }
  if (filters?.make_id) {
    endpoint += `&make_id=eq.${filters.make_id}`;
  }
  if (filters?.year) {
    endpoint += `&year=eq.${filters.year}`;
  }

  // 🔥 CLAVE: normalizar valor de UI a valor DB válido
  if (filters?.transmission) {
    const mapped =
      transmissionToDb[normKey(filters.transmission)] ?? filters.transmission;
    endpoint += `&transmission=eq.${encodeURIComponent(mapped)}`;
  }

  if (filters?.price_min !== undefined) {
    endpoint += `&price2=gte.${filters.price_min}`;
  }
  if (filters?.price_max !== undefined) {
    endpoint += `&price2=lte.${filters.price_max}`;
  }

  // 🔥 OR seguro: no mete year.eq si no es número, y escapa caracteres
  if (filters?.search) {
    const or = buildVehiclesOr(filters.search);
    if (or) endpoint += `&or=${encodeURIComponent(or)}`;
  }

  // apiFetch además normaliza por si llega algo mal de otros lados
  const vehicles = await apiFetch<Vehicle[]>(endpoint, {}, token);
  return vehicles.map(mapVehicleToListItem);
}

export async function getVehicleById(
  vehicleId: string,
  token?: string,
): Promise<VehicleListItem> {
  const endpoint = `/vehicles?id=eq.${vehicleId}&select=*`;

  const vehicles = await apiFetch<Vehicle[]>(endpoint, {}, token);
  if (!vehicles || vehicles.length === 0) {
    throw new Error("Vehículo no encontrado");
  }

  return mapVehicleToListItem(vehicles[0]);
}

export async function updateVehicle(
  vehicleId: string,
  data: Partial<Vehicle>,
  token?: string,
): Promise<Vehicle> {
  const endpoint = `/vehicles?id=eq.${vehicleId}`;
  const result = await apiFetch<Vehicle[]>(
    endpoint,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );

  if (!result || result.length === 0) {
    throw new Error("Error al actualizar vehículo");
  }
  return result[0];
}

export async function countVehiclesInManagement(
  dealerId: string,
  token?: string,
): Promise<number> {
  const endpoint = `/vehicles?status_id=in.(1,2,3,4,5)&select=count`;

  try {
    const response = await fetch(
      normalizeEnumFiltersInUrl(`${API}${endpoint}`),
      {
        headers: {
          "Content-Type": "application/json",
          Prefer: "count=exact",
          ...PROFILE_HEADERS,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

    if (!response.ok) {
      return 0;
    }

    const contentRange = response.headers.get("Content-Range");
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  } catch (error) {
    console.error("Error counting vehicles:", error);
    return 0;
  }
}

// ------------ Catálogos: marcas, modelos, años ------------

export async function getMakes(
  token?: string,
): Promise<Array<{ id: number; name: string }>> {
  const endpoint = `/makes?select=id,name&order=name.asc`;
  return apiFetch<Array<{ id: number; name: string }>>(endpoint, {}, token);
}

export async function getMakesMap(
  token?: string,
): Promise<Record<number, string>> {
  const makes = await getMakes(token);
  return makes.reduce(
    (acc, make) => {
      acc[make.id] = make.name;
      return acc;
    },
    {} as Record<number, string>,
  );
}

export async function getModels(
  token?: string,
): Promise<Array<{ id: number; name: string; make_id: number }>> {
  const endpoint = `/models?select=id,name,make_id&order=name.asc`;
  return apiFetch<Array<{ id: number; name: string; make_id: number }>>(
    endpoint,
    {},
    token,
  );
}

export async function getModelsMap(
  token?: string,
): Promise<Record<number, string>> {
  const models = await getModels(token);
  return models.reduce(
    (acc, model) => {
      acc[model.id] = model.name;
      return acc;
    },
    {} as Record<number, string>,
  );
}

export async function getYears(token?: string): Promise<number[]> {
  const endpoint = `/vehicles?select=year&order=year.desc`;
  const result = await apiFetch<Array<{ year: number }>>(endpoint, {}, token);
  const uniqueYears = [...new Set(result.map((r) => r.year))];
  return uniqueYears.sort((a, b) => b - a);
}
