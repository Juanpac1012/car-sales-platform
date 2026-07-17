// Utilidad para decodificar JWT y extraer claims (sin dependencias externas)
export function decodeJWT(token: string): any {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Extrae el rol del payload del JWT (role, rol, roles, etc)
export function extractRoleFromJWT(token: string): string | null {
  const payload = decodeJWT(token);
  if (!payload) return null;
  return payload.role || payload.rol || (Array.isArray(payload.roles) ? payload.roles[0] : payload.roles) || null;
}
