// AdminApi.ts (COMPLETO y CORREGIDO)
// ✅ Dealer roles por `dealer_users.dealer_role` (TEXT)
// ❌ Se elimina `app_user_dealer_roles` (no existe en tu DB)
// ✅ app_role_permissions maneja scope ("vista" | "accion")
// ✅ Fix PostgREST: return=representation normalmente devuelve ARRAY -> usamos postOne/patchOne
// ✅ Upsert real para dealer_users usando on_conflict + resolution=merge-duplicates

const API = (
   import.meta.env.VITE_API_URL ||

  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

const PROFILE_HEADERS = {
  "Accept-Profile": "api",
  "Content-Profile": "api",
};

function normalizeToken(token?: string) {
  if (!token) return null;
  const t = String(token).trim();
  if (!t || t === "null" || t === "undefined") return null;
  return t;
}

function buildHeaders(token?: string, extra?: Record<string, string>) {
  const t = normalizeToken(token);
  return {
    ...PROFILE_HEADERS,
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(extra ?? {}),
  };
}

// ==================== CORE HELPERS ====================

async function parseJsonOrText(res: Response) {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function requireToken(token?: string, where?: string) {
  const t = normalizeToken(token);
  if (!t) {
    throw new Error(`NO_TOKEN${where ? ` (${where})` : ""}`);
  }
  return t;
}

// Helper para llamadas RPC (requiere token)
export async function rpc<T>(
  name: string,
  body: any,
  token?: string,
): Promise<T> {
  const t = requireToken(token, `rpc:${name}`);

  const res = await fetch(`${API}/rpc/${name}`, {
    method: "POST",
    headers: buildHeaders(t, { "Content-Type": "application/json" }),
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`RPC ${name}: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return undefined as T;

  const parsed = await parseJsonOrText(res);
  return parsed as T;
}

// Helper para llamadas GET (en tu app casi todo es protegido, así que requerimos token)
export async function get<T>(endpoint: string, token?: string): Promise<T> {
  const t = requireToken(token, `get:${endpoint}`);

  const res = await fetch(`${API}/${endpoint}`, {
    method: "GET",
    headers: buildHeaders(t),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GET ${endpoint}: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return undefined as T;

  const parsed = await parseJsonOrText(res);
  return parsed as T;
}

// Helper para llamadas POST (con debug + headers extra opcionales)
export async function post<T>(
  endpoint: string,
  body: any,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const t = requireToken(token, `post:${endpoint}`);

  const res = await fetch(`${API}/${endpoint}`, {
    method: "POST",
    headers: buildHeaders(t, {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(extraHeaders ?? {}),
    }),
    body: JSON.stringify(body ?? {}),
  });

  const parsed = await parseJsonOrText(res);

  if (!res.ok) {
    console.error("POST FAIL:", endpoint, { body }, parsed);
    throw new Error(
      `POST ${endpoint}: ${res.status} ${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      }`,
    );
  }

  return parsed as T;
}

// Helper para llamadas PATCH (headers extra opcionales)
export async function patch<T>(
  endpoint: string,
  body: any,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const t = requireToken(token, `patch:${endpoint}`);

  const res = await fetch(`${API}/${endpoint}`, {
    method: "PATCH",
    headers: buildHeaders(t, {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(extraHeaders ?? {}),
    }),
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PATCH ${endpoint}: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return undefined as T;

  const parsed = await parseJsonOrText(res);
  return parsed as T;
}

// Helper para llamadas DELETE
export async function del<T>(endpoint: string, token?: string): Promise<T> {
  const t = requireToken(token, `del:${endpoint}`);

  const res = await fetch(`${API}/${endpoint}`, {
    method: "DELETE",
    headers: buildHeaders(t),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`DELETE ${endpoint}: ${res.status} ${errorText}`);
  }

  if (res.status === 204) return undefined as T;

  const parsed = await parseJsonOrText(res);
  return parsed as T;
}

// ✅ PostgREST normalmente devuelve arrays con return=representation.
// Estos helpers te regresan 1 fila (la primera).
async function postOne<T>(
  endpoint: string,
  body: any,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const rows = await post<T[]>(endpoint, body, token, extraHeaders);
  return rows?.[0] as T;
}

async function patchOne<T>(
  endpoint: string,
  body: any,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const rows = await patch<T[]>(endpoint, body, token, extraHeaders);
  return rows?.[0] as T;
}

// ==================== USER ROLE (SINGLE) ====================

export interface AppUserRole {
  user_id: string;
  role_id: string;
}

export const getAppUserRoles = (token: string) =>
  get<AppUserRole[]>("app_user_roles?order=user_id.asc", token);

export const createAppUserRole = (data: Partial<AppUserRole>, token: string) =>
  postOne<AppUserRole>("app_user_roles", data, token);

  export const deleteAppUserRole = (
  userId: string,
  roleId: string,
  token: string,
) =>
  del<void>(`app_user_roles?user_id=eq.${userId}&role_id=eq.${roleId}`, token);

export async function setSingleUserRole(
  userId: string,
  roleId: string,
  token: string,
) {
  const current = await get<AppUserRole[]>(
    `app_user_roles?user_id=eq.${userId}`,
    token,
  );

  for (const r of current) {
    await deleteAppUserRole(userId, r.role_id, token);
  }

  await createAppUserRole({ user_id: userId, role_id: roleId }, token);
}
/**
 * ✅ CORREGIDO:
 * En tu DB REAL el rol por dealer NO usa `app_user_dealer_roles`,
 * se guarda en `dealer_users.dealer_role` (TEXT).
 */
export async function addUserToDealerWithRole(
  dealerId: string,
  userId: string,
  dealerRole: string,
  token: string,
) {
  await upsertDealerUserRole(dealerId, userId, dealerRole, token);
}

// ==================== LOCAL USERS ====================

export interface LocalUser {
  user_id: string;
  email: string;
  display_name?: string;
  password_hash?: string;
  created_at?: string;
}

export const getLocalUsers = (token: string) =>
  get<LocalUser[]>("local_users?order=created_at.desc", token);

export const updateLocalUser = (
  id: string,
  data: { email?: string; display_name?: string },
  token: string,
) => patchOne<LocalUser>(`local_users?user_id=eq.${id}`, data, token);

export const deleteLocalUser = (id: string, token: string) =>
  del<void>(`local_users?user_id=eq.${id}`, token);

export const setLocalUserPassword = (
  userId: string,
  password: string,
  token: string,
) =>
  rpc<void>(
    "set_local_user_password",
    {
      p_user_id: userId,
      p_password: password,
    },
    token,
  );

export interface CreateLocalUserResult {
  user_id: string;
  email: string;
  display_name: string;
}

export const createLocalUserWithPassword = (
  data: { email: string; display_name: string; password: string },
  token: string,
) =>
  rpc<CreateLocalUserResult>(
    "create_local_user_with_password",
    {
      p_email: data.email,
      p_display_name: data.display_name,
      p_password: data.password,
    },
    token,
  );

// ==================== ROLE PERM COUNTS ====================

export interface RolePermCount {
  role_id: string;
  role_code: string;
  perm_count: number;
}

export const getRolePermCounts = (token: string) =>
  get<RolePermCount[]>("v_role_perm_counts", token);

// ==================== APP ROLES ====================

export interface AppRole {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
}

export type PermissionScope = "vista" | "accion";

export interface AppRolePermissionRow {
  role_id: string;
  permission_id: string;
  scope?: PermissionScope | null;
}

export const getAppRolePermissions = (roleId: string, token: string) =>
  get<AppRolePermissionRow[]>(
    `app_role_permissions?role_id=eq.${roleId}&select=role_id,permission_id,scope`,
    token,
  );

export const getAppRoles = (token: string) =>
  get<AppRole[]>("app_roles?order=name.asc", token);

export const createAppRole = (data: Partial<AppRole>, token: string) =>
  postOne<AppRole>("app_roles", data, token);

export const updateAppRole = (
  id: string,
  data: Partial<AppRole>,
  token: string,
) => patchOne<AppRole>(`app_roles?id=eq.${id}`, data, token);

export const deleteAppRole = (id: string, token: string) =>
  del<void>(`app_roles?id=eq.${id}`, token);

// ==================== APP PERMISSIONS ====================

export interface AppPerm {
  id: string;
  code: string;
  description?: string;
  created_at?: string;
}

export const getAppPerms = (token: string) =>
  get<AppPerm[]>("app_permissions?order=code.asc", token);

export const createAppPerm = (data: Partial<AppPerm>, token: string) =>
  postOne<AppPerm>("app_permissions", data, token);

export const updateAppPerm = (
  id: string,
  data: Partial<AppPerm>,
  token: string,
) => patchOne<AppPerm>(`app_permissions?id=eq.${id}`, data, token);

export const deleteAppPerm = (id: string, token: string) =>
  del<void>(`app_permissions?id=eq.${id}`, token);

// ==================== APP ROLE PERMISSIONS ====================

export const getAllRolePermissions = (token: string) =>
  get<AppRolePermissionRow[]>(
    "app_role_permissions?select=role_id,permission_id,scope",
    token,
  );  

export const createRolePermission = (
  roleId: string,
  permId: string,
  scope: PermissionScope = "vista",
  token: string,
) =>
  postOne<AppRolePermissionRow>(
    "app_role_permissions",
    { role_id: roleId, permission_id: permId, scope },
    token,
  );

// ⚠️ Si tu PK incluye scope también, filtrá por scope.
export const deleteRolePermission = (
  roleId: string,
  permId: string,
  token: string,
) =>
  del<void>(
    `app_role_permissions?role_id=eq.${roleId}&permission_id=eq.${permId}`,
    token,
  );

// ==================== DEALER USERS ====================

export type DealerRole = "admin" | "team_admin" | "sales_person" | string;

export interface DealerUser {
  dealer_id: string;
  user_id: string;
  dealer_role: DealerRole;
  created_at?: string;
}

export interface CreateDealerUserInput {
  dealer_id: string;
  user_id: string;
  dealer_role: DealerRole;
}

export const getDealerUsers = (token: string) =>
  get<DealerUser[]>("dealer_users?order=created_at.desc", token);

export const createDealerUser = (data: CreateDealerUserInput, token: string) =>
  postOne<DealerUser>("dealer_users", data, token);

export const deleteDealerUser = (
  dealerId: string,
  userId: string,
  token: string,
) =>
  del<void>(
    `dealer_users?dealer_id=eq.${dealerId}&user_id=eq.${userId}`,
    token,
  );

export const updateDealerUserRole = (
  dealerId: string,
  userId: string,
  dealerRole: DealerRole,
  token: string,
) =>
  patchOne<DealerUser>(
    `dealer_users?dealer_id=eq.${dealerId}&user_id=eq.${userId}`,
    { dealer_role: dealerRole },
    token,
  );

/**
 * ✅ UPSERT real
 * Requiere constraint único o PK en (dealer_id, user_id).
 */
export async function upsertDealerUserRole(
  dealerId: string,
  userId: string,
  dealerRole: DealerRole,
  token: string,
) {
  return await postOne<DealerUser>(
    `dealer_users?on_conflict=dealer_id,user_id`,
    { dealer_id: dealerId, user_id: userId, dealer_role: dealerRole },
    token,
    { Prefer: "return=representation, resolution=merge-duplicates" },
  );
}

// ==================== LOCATIONS ====================

export interface Location {
  id: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export const getLocations = (token: string) =>
  get<Location[]>("locations?order=id.asc", token);

export const createLocation = (data: Partial<Location>, token: string) =>
  postOne<Location>("locations", data, token);

export const updateLocation = (
  id: string,
  data: Partial<Location>,
  token: string,
) => patchOne<Location>(`locations?id=eq.${id}`, data, token);

export const deleteLocation = (id: string, token: string) =>
  del<void>(`locations?id=eq.${id}`, token);

// ==================== DEALERS ====================

export interface Dealer {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  location_id?: string;
  created_at?: string;
}

export const getDealers = (token: string) =>
  get<Dealer[]>("dealers?order=name.asc", token);

export const createDealer = (data: Partial<Dealer>, token: string) =>
  postOne<Dealer>("dealers", data, token);

export const updateDealer = (
  id: string,
  data: Partial<Dealer>,
  token: string,
) => patchOne<Dealer>(`dealers?id=eq.${id}`, data, token);

export const deleteDealer = (id: string, token: string) =>
  del<void>(`dealers?id=eq.${id}`, token);

// ==================== MARCAS ====================

export interface Make {
  id: string;
  name: string;
  created_at?: string;
}

export interface Model {
  id: string;
  make_id: string;
  name: string;
  created_at?: string;
}

export const getMakes = (token: string) =>
  get<Make[]>("makes?order=name.asc", token);
export const getModels = (token: string) =>
  get<Model[]>("models?order=name.asc", token);

export const createMake = (data: { name: string }, token: string) =>
  postOne<Make>("makes", data, token);

export const updateMake = (id: string, data: { name: string }, token: string) =>
  patchOne<Make>(`makes?id=eq.${id}`, data, token);

export const deleteMake = (id: string, token: string) =>
  del<void>(`makes?id=eq.${id}`, token);

export const createModel = (
  data: { make_id: string; name: string },
  token: string,
) => postOne<Model>("models", data, token);

export const updateModel = (
  id: string,
  data: { make_id: string; name: string },
  token: string,
) => patchOne<Model>(`models?id=eq.${id}`, data, token);

export const deleteModel = (id: string, token: string) =>
  del<void>(`models?id=eq.${id}`, token);

// ==================== STATUS ====================

export interface Status {
  id: number;
   name: string;
 }
 
export const getStatuses = (token: string) =>
  get<Status[]>("status?order=id.asc", token);
 
 export const createStatus = (data: Partial<Status>, token: string) =>
   postOne<Status>("status", data, token);
 
export const updateStatus = (
  id: number,
  data: Partial<Status>,
  token: string,
) => patchOne<Status>(`status?id=eq.${id}`, data, token);
 
 export const deleteStatus = (id: number, token: string) =>
   del<void>(`status?id=eq.${id}`, token);