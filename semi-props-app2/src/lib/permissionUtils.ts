export type PermissionScope = "vista" | "accion";
export type PermissionMap = Record<string, PermissionScope>;

const rank: Record<PermissionScope, number> = { vista: 1, accion: 2 };

export function hasPermission(
  perms: PermissionMap | null | undefined,
  code: string,
  required: PermissionScope = "vista"
) {
  if (!perms) return false;
  const got = perms[code];
  if (!got) return false;
  return rank[got] >= rank[required];
}
