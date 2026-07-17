// src/hooks/useAuthToken.ts
import { useAuth } from "@/lib/Authentication";

/**
 * Hook personalizado para obtener el token de autenticación
 * Prioridad: 1) Token del contexto, 2) Token de localStorage como fallback
 * 
 * Este hook asegura que siempre se use el token más actualizado disponible.
 */
export function useAuthToken(): string {
  const { token: contextToken } = useAuth();
  
  // Priorizar el token del contexto
  if (contextToken) {
    return contextToken;
  }
  
  // Fallback a localStorage (solo si el contexto no está disponible)
  const localToken = localStorage.getItem("auth_token");
  if (localToken) {
    return localToken;
  }
  
  // Si no hay token en ningún lugar, retornar cadena vacía
  return "";
}

/**
 * Versión síncrona para usar fuera de componentes React
 * NOTA: Esta función NO puede acceder al contexto, solo a localStorage
 */
export function getAuthTokenSync(): string {
  return localStorage.getItem("auth_token") || "";
}