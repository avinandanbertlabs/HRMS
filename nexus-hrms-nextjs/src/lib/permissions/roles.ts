export const PERMISSIONS = ["employee:read","employee:create","employee:update","employee:deactivate","organization:read","organization:manage","role:manage","audit:read","leave:read","leave:apply","leave:approve","leave:policy:manage","leave:report"] as const;
export type Permission = typeof PERMISSIONS[number];
export const ROLE_DEFAULTS: Record<string, Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  HR_ADMIN: ["employee:read","employee:create","employee:update","employee:deactivate","organization:read","organization:manage","leave:read","leave:approve","leave:policy:manage","leave:report"],
  DEPARTMENT_HEAD: ["employee:read","organization:read","leave:read","leave:approve","leave:report"],
  MANAGER: ["employee:read","leave:read","leave:approve"],
  EMPLOYEE: ["leave:read","leave:apply"],
  AUDITOR: ["employee:read","organization:read","leave:read","leave:report","audit:read"]
};
