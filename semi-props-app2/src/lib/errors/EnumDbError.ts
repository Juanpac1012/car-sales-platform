// src/lib/errors/EnumDbError.ts

export enum DbErrorCode {
  UNIQUE_VIOLATION = "23505",
  FOREIGN_KEY_VIOLATION = "23503",
  NOT_NULL_VIOLATION = "23502",
  CHECK_VIOLATION = "23514",

  INSUFFICIENT_PRIVILEGE = "42501",
  INVALID_TEXT_REPRESENTATION = "22P02",
  INVALID_PARAMETER_VALUE = "22023",
  INVALID_AUTHORIZATION = "28000",

  JWT_INVALID = "PGRST301",
  JWT_EXPIRED = "PGRST302",

  NOT_FOUND = "PGRST116",

  UNKNOWN = "UNKNOWN",
}

export const DbErrorMessage: Record<DbErrorCode, string> = {
  [DbErrorCode.UNIQUE_VIOLATION]:
    "El registro ya existe. No se permiten valores duplicados.",

  [DbErrorCode.FOREIGN_KEY_VIOLATION]:
    "No se puede completar la acción porque existen datos relacionados.",

  [DbErrorCode.NOT_NULL_VIOLATION]:
    "Faltan datos obligatorios para completar la acción.",

  [DbErrorCode.CHECK_VIOLATION]:
    "Uno de los valores no cumple las reglas del sistema.",

  [DbErrorCode.INSUFFICIENT_PRIVILEGE]:
    "No tienes permisos para realizar esta acción.",

  [DbErrorCode.INVALID_TEXT_REPRESENTATION]:
    "Uno de los valores ingresados no tiene el formato correcto.",

  [DbErrorCode.INVALID_PARAMETER_VALUE]:
    "Parámetro inválido enviado al servidor.",

  [DbErrorCode.INVALID_AUTHORIZATION]:
    "Credenciales inválidas.",

  [DbErrorCode.JWT_INVALID]:
    "Tu sesión no es válida. Inicia sesión nuevamente.",

  [DbErrorCode.JWT_EXPIRED]:
    "Tu sesión ha expirado. Inicia sesión nuevamente.",

  [DbErrorCode.NOT_FOUND]:
    "El recurso solicitado no existe.",

  [DbErrorCode.UNKNOWN]:
    "Ocurrió un error inesperado. Intenta nuevamente.",
};

export function extractDbErrorCode(error: any): DbErrorCode {
  if (!error) return DbErrorCode.UNKNOWN;

  if (typeof error === "string") {
    for (const code of Object.values(DbErrorCode)) {
      if (error.includes(code)) return code;
    }
  }

  if (error?.code && Object.values(DbErrorCode).includes(error.code)) {
    return error.code as DbErrorCode;
  }

  if (error?.message) {
    for (const code of Object.values(DbErrorCode)) {
      if (error.message.includes(code)) return code;
    }
  }

  return DbErrorCode.UNKNOWN;
}

export function dbErrorToSpanishMessage(error: any): string {
  const code = extractDbErrorCode(error);
  return DbErrorMessage[code] ?? DbErrorMessage[DbErrorCode.UNKNOWN];
}

export function logDbError(error: any) {
  console.error("DB_ERROR_RAW:", error);
}

export async function throwIfNotOk(res: Response, url?: string) {
  if (res.ok) return;

  let payload: any = null;

  try {
    payload = await res.json();
  } catch {
    payload = await res.text();
  }

  logDbError(payload);

  const message = dbErrorToSpanishMessage(
    payload?.code || payload?.error || payload
  );

  throw new Error(message);
}
