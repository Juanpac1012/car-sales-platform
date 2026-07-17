// src/lib/api.customer/client.ts

// IMPORTS SIEMPRE ARRIBA
import * as adminAuth from "../adminAuth";

// --- Normalización del API_BASE ---
const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "").replace(/\/api$/, "");

// --- Getters básicos (delegan en adminAuth) ---
export const getApiBase = (): string => API_BASE;
export const getToken = (): string | null => adminAuth.getToken();
export const getUserId = (): string | null => adminAuth.getUserId();
export const getTokenExpiresAt = (): string | null => adminAuth.getTokenExpiresAt?.() ?? null;

// --- Setters / limpieza (delegan en adminAuth) ---
export const setToken = (token: string) => adminAuth.setToken(token);
export const setUserId = (userId: string) => adminAuth.setUserId(userId);
export const setTokenExpiresAt = (iso: string) => adminAuth.setTokenExpiresAt(iso);

export const clearToken = () => adminAuth.clearAuth();
export const clearAuth = () => adminAuth.clearAuth();

// --- Auth guard reutilizando el flujo real de adminAuth ---
export const ensureAuth = async () => {
  const { token, userId } = await adminAuth.ensureAuth();
  return { token, userId };
};

// --- Headers dinámicos ---
const buildHeaders = (token?: string | null): HeadersInit => {
  const t = typeof token === "string" ? token : getToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (t && t.trim()) headers["Authorization"] = `Bearer ${t}`;
  return headers;
};

interface ApiFetchOptions {
  method?: string;
  token?: string | null;
  body?: any;                 // pásame objetos JS; aquí se serializan
  headers?: HeadersInit;
  _retryOnAuthFail?: boolean; // interno para evitar loops
  _returnMeta?: boolean;      // para pedir {data, headers, status}
}

// --- fetch con ensure + reintento único en 401/403 ---
export const apiFetch = async (url: string, options: ApiFetchOptions = {}) => {
  const {
    method = "GET",
    token = null,
    body,
    headers = {},
    _retryOnAuthFail = true,
    _returnMeta = false,
  } = options;

  // Si no viene token explícito, nos aseguramos que haya sesión válida
  if (!token) {
    await ensureAuth();
  }

  const effectiveHeaders = { ...buildHeaders(token), ...(headers || {}) };

  const res = await fetch(url, {
    method,
    headers: effectiveHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // noop
  }

  if ((res.status === 401 || res.status === 403) && _retryOnAuthFail) {
    await ensureAuth();
    return apiFetch(url, { ...options, _retryOnAuthFail: false });
  }

  if (!res.ok) {
    const bodyMsg = parsed?.message || parsed?.error || text || res.statusText;
    const err: any = new Error(`API ${res.status}: ${bodyMsg}`);
    err.status = res.status;
    err.body = parsed ?? text;
    throw err;
  }

  if (_returnMeta) {
    return { data: parsed, headers: res.headers, status: res.status };
  }
  return parsed;
};

// expón una firma “amigable” desde client
export const client = {
  fetch: apiFetch,

  rpc: async (rpcName: string, payload: any, token?: string | null) => {
    const url = `${API_BASE}/rpc/${rpcName}`;
    return apiFetch(url, { method: "POST", body: payload, token });
  },

  tableInsert: async (table: string, payload: any, token?: string | null) => {
    const url = `${API_BASE}/${table}`;
    return apiFetch(url, {
      method: "POST",
      body: payload,
      token,
      headers: { Prefer: "return=representation" },
    });
  },

  tableDelete: async (table: string, query: string, token?: string | null) => {
    const url = `${API_BASE}/${table}?${query}`;
    return apiFetch(url, { method: "DELETE", token });
  },

  // Helpers expuestos
  getApiBase,
  getToken,
  setToken,
  clearToken,
  getUserId,
  setUserId,
  getTokenExpiresAt,
  setTokenExpiresAt,
  clearAuth,
  ensureAuth,
};
