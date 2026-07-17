// adminAuth.ts (COMPLETO y CORREGIDO)
// ✅ Lee token desde varias keys (localStorage y sessionStorage)
// ✅ setToken guarda en access_token / auth_token / admin_token (compatibilidad total)
// ✅ ensureAuth NO llama whoami si no hay token
// ✅ NO borra sesión por fallos de whoami (solo limpia cache de role)
// ✅ getToken SIEMPRE normaliza (evita "null", "undefined", "", etc.)
// ✅ TOKEN_KEYS incluye auth_token (tu app lo usa en varias partes)

import { rpc } from "@/lib/AdminApi";

let tokenInMemory: string | null = null;
let userIdInMemory: string | null = null;
let tokenExpiresAtInMemory: string | null = null;

const ROLE_ID_KEY = "current_role_id";
const ROLE_PERMS_KEY = "current_role_perms";
const ROLE_CODE_KEY = "current_role_code";

const USER_ID_KEY = "admin_user_id";
const TOKEN_EXPIRES_KEY = "admin_token_expires_at";

// Keys aceptadas (compatibilidad vieja + tu app actual)
const TOKEN_KEYS = [
  "access_token",
  "auth_token", // ✅ IMPORTANTE
  "admin_token",
  "token",
  "sb-access-token",
  "supabase.auth.token",
];

// ==================== storage safe wrappers ====================
function safeGetLS(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeGetSS(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeSetLS(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

function safeSetSS(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {}
}

function safeRemoveLS(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {}
}

function safeRemoveSS(k: string) {
  try {
    sessionStorage.removeItem(k);
  } catch {}
}

function normalizeToken(token?: string | null) {
  if (token == null) return null;
  const t = String(token).trim();
  if (!t || t === "null" || t === "undefined") return null;
  return t;
}

// ==================== Token discovery ====================
export function getToken(): string | null {
  // 1) memory
  const mem = normalizeToken(tokenInMemory);
  if (mem) return mem;

  // 2) localStorage / sessionStorage por lista de keys
  for (const k of TOKEN_KEYS) {
    const ls = normalizeToken(safeGetLS(k));
    if (ls) return ls;

    const ss = normalizeToken(safeGetSS(k));
    if (ss) return ss;
  }

  return null;
}

// Guarda token en keys estándar + compat
export function setToken(token: string) {
  const t = normalizeToken(token);
  if (!t) return;

  tokenInMemory = t;

  // Recomendado / estándar
  safeSetLS("access_token", t);
  safeSetSS("access_token", t);

  // Compat tu app (lo usaste en fetch y pantallas)
  safeSetLS("auth_token", t);
  safeSetSS("auth_token", t);

  // Legacy
  safeSetLS("admin_token", t);
  safeSetSS("admin_token", t);
}

export function getUserId(): string | null {
  const mem = userIdInMemory ? String(userIdInMemory) : null;
  return mem ?? safeGetLS(USER_ID_KEY) ?? safeGetSS(USER_ID_KEY);
}

export function setUserId(userId: string) {
  userIdInMemory = userId;
  safeSetLS(USER_ID_KEY, userId);
  safeSetSS(USER_ID_KEY, userId);
}

export function getTokenExpiresAt(): string | null {
  return tokenExpiresAtInMemory ?? safeGetLS(TOKEN_EXPIRES_KEY) ?? safeGetSS(TOKEN_EXPIRES_KEY);
}

export function setTokenExpiresAt(iso: string) {
  tokenExpiresAtInMemory = iso;
  safeSetLS(TOKEN_EXPIRES_KEY, iso);
  safeSetSS(TOKEN_EXPIRES_KEY, iso);
}

// ==================== Limpiar todo ====================
export function clearAuth() {
  console.trace("clearAuth() called");

  tokenInMemory = null;
  userIdInMemory = null;
  tokenExpiresAtInMemory = null;

  // borra todas las posibles keys de token
  for (const k of TOKEN_KEYS) {
    safeRemoveLS(k);
    safeRemoveSS(k);
  }

  safeRemoveLS(USER_ID_KEY);
  safeRemoveSS(USER_ID_KEY);

  safeRemoveLS(TOKEN_EXPIRES_KEY);
  safeRemoveSS(TOKEN_EXPIRES_KEY);

  // cache de rol/perms
  safeRemoveLS(ROLE_CODE_KEY);
  safeRemoveLS(ROLE_PERMS_KEY);
  safeRemoveLS(ROLE_ID_KEY);

  safeRemoveSS(ROLE_CODE_KEY);
  safeRemoveSS(ROLE_PERMS_KEY);
  safeRemoveSS(ROLE_ID_KEY);
}

// ==================== Verificar expiración ====================
export function isExpired(iso?: string | null): boolean {
  if (!iso) return false; // si no hay exp -> no expulsar
  const exp = new Date(iso).getTime();
  if (Number.isNaN(exp)) return false;
  return Date.now() >= exp - 5000;
}

// ==================== Tipos esperados (flexibles) ====================
type PermissionScope = "vista" | "accion";

type WhoAmIResponse = {
  role_code?: string | null;
  role_id?: string | number | null;
  user_id?: string | null;
  permissions?: Array<{ code: string; scope?: PermissionScope | null }> | null;
  perms?: Array<{ code: string; scope?: PermissionScope | null }> | null;
  [k: string]: any;
};

// ==================== RPC whoami ====================
async function getMe(token: string): Promise<WhoAmIResponse | null> {
  try {
    const meJson = await rpc<any>("whoami", {}, token);
    const me = Array.isArray(meJson) ? meJson[0] : meJson;
    return me ?? null;
  } catch (e) {
    console.warn("whoami failed:", e);
    return null;
  }
}

// ==================== Sync Role Code ====================
export async function syncCurrentRoleCode(
  token: string,
  _userId?: string,
  opts?: { force?: boolean }
): Promise<string | null> {
  const force = opts?.force ?? false;

  const existing = safeGetLS(ROLE_CODE_KEY) ?? safeGetSS(ROLE_CODE_KEY);
  if (existing && !force) return existing;

  const t = normalizeToken(token);
  if (!t) {
    safeRemoveLS(ROLE_CODE_KEY);
    safeRemoveSS(ROLE_CODE_KEY);
    return null;
  }

  const me = await getMe(t);
  const roleCode = me?.role_code ?? null;

  if (roleCode) {
    safeSetLS(ROLE_CODE_KEY, String(roleCode));
    safeSetSS(ROLE_CODE_KEY, String(roleCode));
  } else {
    safeRemoveLS(ROLE_CODE_KEY);
    safeRemoveSS(ROLE_CODE_KEY);
  }

  // role_id cache
  if (me?.role_id != null) {
    safeSetLS(ROLE_ID_KEY, String(me.role_id));
    safeSetSS(ROLE_ID_KEY, String(me.role_id));
  } else {
    safeRemoveLS(ROLE_ID_KEY);
    safeRemoveSS(ROLE_ID_KEY);
  }

  // cache user_id si viene
  if (me?.user_id) setUserId(String(me.user_id));

  return roleCode;
}

// ==================== Sync Role Perms ====================
export async function syncCurrentRolePerms(
  token: string,
  _userId?: string,
  opts?: { force?: boolean }
): Promise<void> {
  const force = opts?.force ?? false;

  const existing = safeGetLS(ROLE_PERMS_KEY) ?? safeGetSS(ROLE_PERMS_KEY);
  if (existing && !force) return;

  const t = normalizeToken(token);
  if (!t) {
    safeRemoveLS(ROLE_ID_KEY);
    safeRemoveSS(ROLE_ID_KEY);
    safeRemoveLS(ROLE_PERMS_KEY);
    safeRemoveSS(ROLE_PERMS_KEY);
    return;
  }

  const me = await getMe(t);
  if (!me) {
    // ✅ NO logout: solo limpia cache de rol/perms
    safeRemoveLS(ROLE_ID_KEY);
    safeRemoveSS(ROLE_ID_KEY);
    safeRemoveLS(ROLE_PERMS_KEY);
    safeRemoveSS(ROLE_PERMS_KEY);
    return;
  }

  // role_code cache
  if (me?.role_code) {
    safeSetLS(ROLE_CODE_KEY, String(me.role_code));
    safeSetSS(ROLE_CODE_KEY, String(me.role_code));
  }

  // role_id cache
  if (me?.role_id != null) {
    safeSetLS(ROLE_ID_KEY, String(me.role_id));
    safeSetSS(ROLE_ID_KEY, String(me.role_id));
  } else {
    safeRemoveLS(ROLE_ID_KEY);
    safeRemoveSS(ROLE_ID_KEY);
  }

  // permisos (puede venir en permissions o perms)
  const list =
    (Array.isArray(me.permissions) ? me.permissions : null) ??
    (Array.isArray(me.perms) ? me.perms : null);

  if (!list) {
    safeRemoveLS(ROLE_PERMS_KEY);
    safeRemoveSS(ROLE_PERMS_KEY);
    return;
  }

  const map: Record<string, PermissionScope> = {};
  for (const p of list) {
    const code = p?.code;
    const scope = p?.scope;
    if (!code) continue;
    map[String(code)] = scope === "accion" ? "accion" : "vista";
  }

  const json = JSON.stringify(map);
  safeSetLS(ROLE_PERMS_KEY, json);
  safeSetSS(ROLE_PERMS_KEY, json);
}

function getCachedRoleId(): string | null {
  return safeGetLS(ROLE_ID_KEY) ?? safeGetSS(ROLE_ID_KEY);
}

// ==================== Ensure Auth ====================
export async function ensureAuth(): Promise<{ token: string; userId: string }> {
  const token = getToken();
  const expiresAt = getTokenExpiresAt();

  if (!token) {
    clearAuth();
    throw new Error("NO_TOKEN");
  }

  if (expiresAt && isExpired(expiresAt)) {
    clearAuth();
    throw new Error("TOKEN_EXPIRED");
  }

  const userId = getUserId() ?? "";

  // 🔥 NUEVO: 1 solo whoami por ensureAuth (no 2)
  const me = await getMe(token);

  if (!me) {
    // No logout, pero limpiamos cache de rol/perms para evitar falsos positivos
    safeRemoveLS(ROLE_ID_KEY);
    safeRemoveSS(ROLE_ID_KEY);
    safeRemoveLS(ROLE_CODE_KEY);
    safeRemoveSS(ROLE_CODE_KEY);
    safeRemoveLS(ROLE_PERMS_KEY);
    safeRemoveSS(ROLE_PERMS_KEY);
    return { token, userId };
  }

  const roleIdNow = me.role_id != null ? String(me.role_id) : null;
  const roleIdCached = getCachedRoleId();

  // actualizar caches básicos siempre (barato)
  if (me.role_code) {
    safeSetLS(ROLE_CODE_KEY, String(me.role_code));
    safeSetSS(ROLE_CODE_KEY, String(me.role_code));
  }
  if (roleIdNow) {
    safeSetLS(ROLE_ID_KEY, roleIdNow);
    safeSetSS(ROLE_ID_KEY, roleIdNow);
  }

  if (me.user_id) setUserId(String(me.user_id));

  // ✅ Si cambió el rol => refrescar permisos FORZADO
  // ✅ Si no cambió => NO tocar permisos (evita whoami extra)
  const roleChanged = roleIdNow && roleIdCached && roleIdNow !== roleIdCached;

  if (roleChanged) {
    await syncCurrentRolePerms(token, userId, { force: true });
  } else {
    // si no hay permisos cacheados (primera vez), sincronizá una vez
    const existingPerms = safeGetLS(ROLE_PERMS_KEY) ?? safeGetSS(ROLE_PERMS_KEY);
    if (!existingPerms) {
      await syncCurrentRolePerms(token, userId, { force: true });
    }
  }

  return { token, userId };
}

// ==================== Demo Login (DISABLED) ====================
export async function demoLogin() {
  throw new Error("demoLogin está deshabilitado. Use la página /login");
}
