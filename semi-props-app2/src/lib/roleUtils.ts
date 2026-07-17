export function userHasAccess(user: any, allowedRoles: string[]) {
  if (!user) return false;
  return allowedRoles.includes(user.role_code);
}