// src/lib/vendedoresAuth.ts
// Reutiliza el mismo sistema de autenticación que Administración

import * as adminAuth from "./adminAuth";

// Lectura
export const getToken = adminAuth.getToken;
export const getUserId = adminAuth.getUserId;
export const getTokenExpiresAt = adminAuth.getTokenExpiresAt;

// Escritura
export const setToken = adminAuth.setToken;
export const setUserId = adminAuth.setUserId;
export const setTokenExpiresAt = adminAuth.setTokenExpiresAt;

// Limpieza
export const clearAuth = adminAuth.clearAuth;
export const isExpired = adminAuth.isExpired;

// Auth guard con misma firma que antes
export const ensureAuth = adminAuth.ensureAuth;

// Mantener demoLogin por compatibilidad, aunque no debería usarse ya
export const demoLogin = adminAuth.demoLogin;
