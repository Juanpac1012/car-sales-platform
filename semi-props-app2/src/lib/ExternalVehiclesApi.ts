/**
 * API client for external vehicles data (scraped from external portals)
 * All endpoints use the PostgREST API
 */
export const API = (
   import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");
 
 async function apiFetch<T>(
   endpoint: string,
   options: RequestInit = {},
  token?: string,
 ): Promise<T> {
   const headers: HeadersInit = {
     "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error:",
      response.status,
      response.statusText,
      errorText,
    );
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// =============== EXTERNAL VEHICLES =========================

export interface ExternalVehicle {
  id: string;
  source?: string;
  dealer_external_id?: string;
  dealer_name?: string;
  make_external_id?: number;
  make_name?: string;
  model_external_id?: number;
  model_name?: string;
  trim_external_id?: number;
  trim_name?: string;
  year?: number;
  price?: number;
  odometer_km?: number;
  km?: number;
  city?: string;
  state?: string;
  location?: string;
  url?: string;
  listing_url?: string;
  created_at?: string;
  scraped_at?: string;
  transmission?: string;
  fuel_type?: string;
  color_ext?: string;
  color_int?: string;
  doors?: number;
  seats?: number;
  description?: string;
  image_url?: string;
  images?: string[];
  vehicle_identifier?: string;
  engine?: string;
  drive_type?: string;
  vin?: string;
  province?: string;
  plate?: string;
  taxes_included?: string;
  negotiable_price?: string;
  receives_vehicle?: string;
  vehicle_entry_date?: string;
  make?: { id?: number; name: string };
  model?: { id?: number; name: string };
}

export interface ExternalVehicleFilters {
  make_external_id?: number;
  make_name?: string;
  model_external_id?: number;
  model_name?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  dealer_external_id?: string;
  dealer_name?: string;
  source?: string;
  limit?: number;
  offset?: number;
  odometer_km_max?: number;
  fuel_type?: string;
  transmission?: string;
  doors_min?: number;
  seats_min?: number;
  color_ext?: string;
  color_int?: string;
  taxes_included?: string;
  negotiable_price?: string;
  receives_vehicle?: string;
  province?: string;
  plate_ending?: string;  
  entry_date_from?: string;
  entry_date_to?: string;
  style?: string;
}

export interface ExternalVehiclesPage {
  items: ExternalVehicle[];
  total: number;
}

function buildExternalVehicleParams(
  filters: ExternalVehicleFilters = {},
): URLSearchParams {
  const params = new URLSearchParams();
  const trimRelation = filters.style
    ? "trim:trims_external!inner(name,id)"
    : "trim:trims_external(name,id)";

  params.append(
    "select",
    `*,make:makes_external(name,id),model:models_external(name,id),${trimRelation}`,
  );

  if (filters.make_external_id) {
    params.append("make_external_id", `eq.${filters.make_external_id}`);
  }
  if (filters.make_name) {
    params.append("make_name", `ilike.*${filters.make_name}*`);
  }
  if (filters.model_external_id) {
    params.append("model_external_id", `eq.${filters.model_external_id}`);
  }
  if (filters.model_name) {
    params.append("model_name", `ilike.*${filters.model_name}*`);
  }
  if (filters.style) {
    params.append("trim.name", `ilike.*${filters.style}*`);
  }
  if (filters.year_min) {
    params.append("year", `gte.${filters.year_min}`);
  }
  if (filters.year_max) {
    params.append("year", `lte.${filters.year_max}`);
  }
  if (filters.price_min !== undefined) {
    params.append("price", `gte.${filters.price_min}`);
  }
  if (filters.price_max !== undefined) {
    params.append("price", `lte.${filters.price_max}`);
  }
  if (filters.dealer_external_id) {
    params.append("dealer_external_id", `eq.${filters.dealer_external_id}`);
  }
  if (filters.odometer_km_max !== undefined) {
    params.append("odometer_km", `lte.${filters.odometer_km_max}`);
  }
  if (filters.fuel_type) {
    params.append("fuel_type", `eq.${filters.fuel_type}`);
  }
  if (filters.transmission) {
    params.append("transmission", `eq.${filters.transmission}`);
  }
  if (filters.doors_min !== undefined) {
    params.append("doors", `gte.${filters.doors_min}`);
  }
  if (filters.seats_min !== undefined) {
    params.append("num_passengers", `gte.${filters.seats_min}`);
  }
  if (filters.color_ext) {
    params.append("color_ext", `ilike.*${filters.color_ext}*`);
  }
  if (filters.color_int) {
    params.append("color_int", `ilike.*${filters.color_int}*`);
  }
  if (filters.taxes_included) {
    params.append("taxes_included", `eq.${filters.taxes_included}`);
  }
  if (filters.negotiable_price) {
    params.append("negotiable_price", `eq.${filters.negotiable_price}`);
  }
  if (filters.receives_vehicle) {
    params.append("receives_vehicle", `eq.${filters.receives_vehicle}`);
  }
  if (filters.province) {
    params.append("province", `eq.${filters.province}`);
  }
  if (filters.plate_ending) {
    params.append("plate", `ilike.*${filters.plate_ending}`);
  }
  if (filters.entry_date_from) {
    params.append("vehicle_entry_date", `gte.${filters.entry_date_from}`);
  }
  if (filters.entry_date_to) {
    params.append("vehicle_entry_date", `lte.${filters.entry_date_to}`);
  }
  if (filters.dealer_name) {
    params.append("dealer_name", `ilike.*${filters.dealer_name}*`);
  }
  if (filters.source) {
    params.append("source", `eq.${filters.source}`);
  }


  params.append("order", "created_at.desc");
  params.append("limit", String(filters.limit ?? 50));
  if (filters.offset !== undefined) {
    params.append("offset", String(filters.offset));
  }

  return params;
}

function readTotalFromContentRange(
  contentRange: string | null,
  fallback: number,
): number {
  if (!contentRange) return fallback;
  const slash = contentRange.lastIndexOf("/");
  if (slash < 0) return fallback;
  const total = Number(contentRange.slice(slash + 1));
  return Number.isFinite(total) ? total : fallback;
}

async function fetchExternalVehiclesPage(
  params: URLSearchParams,
  token?: string,
): Promise<ExternalVehiclesPage> {
  const response = await fetch(
    `${API}/vehicles_external?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        Prefer: "count=exact",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "API Error:",
      response.status,
      response.statusText,
      errorText,
    );
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
     );
  }

  const data = (await response.json()) as ExternalVehicle[];
  return {
    items: Array.isArray(data) ? data : [],
    total: readTotalFromContentRange(
      response.headers.get("content-range"),
      Array.isArray(data) ? data.length : 0,
    ),
  };
}

export async function listExternalVehiclesPage(
  filters: ExternalVehicleFilters = {},
  token?: string,
): Promise<ExternalVehiclesPage> {
  const params = buildExternalVehicleParams(filters);

  try {
    return await fetchExternalVehiclesPage(params, token);
  } catch (error) {
    console.warn(
      "Failed to fetch external vehicles with embeds, retrying without embeds:",
      error,
    );
    params.set("select", "*");
    return fetchExternalVehiclesPage(params, token);
  }
}

export async function listExternalVehicles(
  filters: ExternalVehicleFilters = {},
  token?: string,
): Promise<ExternalVehicle[]> {
  const page = await listExternalVehiclesPage(filters, token);
  return page.items;
}

export async function getExternalVehicle(
  id: string,
  token?: string,
): Promise<ExternalVehicle> {
  const result = await apiFetch<ExternalVehicle[]>(
    `/vehicles_external?id=eq.${id}&select=*,make:makes_external(name,id),model:models_external(name,id)`,
    {},
    token,
  );
  return result[0];
}

// =============== EXTERNAL CATALOGS =========================

export interface ExternalMake {
  id: number;
  name: string;
  logo_url?: string;
}

export interface ExternalModel {
  id: number;
  name: string;
  make_id?: number;
}

export interface ExternalTrim {
  id: number;
  name: string;
  model_external_id?: number;
}

export interface ExternalDealer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  website?: string;
}

export async function listExternalMakes(
  token?: string,
): Promise<ExternalMake[]> {
  return apiFetch<ExternalMake[]>(`/makes_external?order=name.asc`, {}, token);
}

export async function listExternalModels(
  makeId?: number,
  token?: string,
): Promise<ExternalModel[]> {
  const all = await apiFetch<ExternalModel[]>(
    `/models_external?order=name.asc`,
    {},
    token,
  );

  if (!makeId) return all;

  return all.filter((m) => Number(m.make_id) === Number(makeId));
}

export async function listExternalTrims(
  modelId?: number,
  token?: string
): Promise<ExternalTrim[]> {
  const filter = modelId
    ? `?model_external_id=eq.${modelId}&order=name.asc`
    : "?order=name.asc";

  return apiFetch<ExternalTrim[]>(`/trims_external${filter}`, {}, token);
}

export async function listExternalDealers(
  token?: string,
): Promise<ExternalDealer[]> {
  return apiFetch<ExternalDealer[]>(
    `/dealers_external?order=name.asc`,
    {},
    token,
  );
}

// =============== EXTERNAL LISTINGS =========================

export interface ExternalListing {
  id: string;
  vehicle_external_id: string;
  dealer_external_id: string;
  slug?: string;
  title?: string;
  description?: string;
  listing_url?: string;
  price?: number;
  currency?: string;
  status?: string;
  visibility?: string;
  featured?: boolean;
  mileage_display?: number;
  first_seen?: string;
  last_seen?: string;
  created_at?: string;
  published_at?: string;
}

export interface PriceHistory {
  id: number;
  listing_external_id: string;
  price?: number;
  currency?: string;
  recorded_at?: string;
  created_at?: string;
}

export async function listExternalListings(
  vehicleExternalId: string,
  token?: string,
): Promise<ExternalListing[]> {
  return apiFetch<ExternalListing[]>(
    `/vehicle_listings_external?vehicle_external_id=eq.${vehicleExternalId}&order=created_at.desc`,
    {},
    token,
  );
}

export async function listPriceHistory(
  listingExternalId: string,
  token?: string,
): Promise<PriceHistory[]> {
  return apiFetch<PriceHistory[]>(
    `/price_history_external?listing_external_id=eq.${listingExternalId}&order=recorded_at.asc`,
    {},
    token,
  );
}

export async function getExternalListingUrl(
  vehicleExternalId: string,
  token?: string,
): Promise<string | null> {
  const listings = await listExternalListings(vehicleExternalId, token);
  const first = listings[0];

  if (!first) return null;

  return first.slug || first.listing_url || null;
}

// =============== VEHICLE PRICE SUMMARY =====================

export interface VehiclesAvgPriceSummary {
  make_id: number;
  make_name: string;
  model_id: number;
  model_name: string;
  year: number;
  avg_price: number;
  vehicles_count: number;
  calculated_at: string;
  pricemax?: number;
  pricemin?: number;
}

export interface AvgPriceSummaryFilters {
  page?: number;
  page_size?: number;
}

// ✅ AHORA ACEPTA TOKEN (IMPORTANTE)
export async function getAveragePriceSummary(
  filters: AvgPriceSummaryFilters = {},
  token?: string,
): Promise<VehiclesAvgPriceSummary[]> {
  const params = new URLSearchParams();

  if (filters.page_size) {
    params.append("limit", String(filters.page_size));
    if (filters.page && filters.page > 1) {
      params.append("offset", String((filters.page - 1) * filters.page_size));
    }
  }

  params.append("order", "vehicles_count.desc,avg_price.desc");

  return apiFetch<VehiclesAvgPriceSummary[]>(
    `/vehicles_avg_price?${params.toString()}`,
    {},
    token,
  );
}
