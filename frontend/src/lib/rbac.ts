import type { RoleEnum } from '@/types/api';

/**
 * Frontend RBAC Permissions Definition
 * Defines granular security permissions across the ITBIS frontend application
 * matching backend security enforcement.
 */
export type Permission =
  | 'view:api_docs'
  | 'manage:employees'
  | 'view:employees'
  | 'manage:telemetry'
  | 'view:telemetry'
  | 'manage:analytics'
  | 'view:analytics'
  | 'manage:settings'
  | 'manage:users';

/**
 * Role to Permissions Mapping:
 * - ADMINISTRATOR: Full system access including API docs and employee management.
 * - SOC_ENGINEER: Technical investigation, telemetry operations, and API docs. (Cannot manage employees)
 * - SECURITY_MANAGER: Team oversight, threat analytics, and employee management. (Cannot view API docs)
 * - SECURITY_ANALYST: View-only analyst access. (Cannot manage employees, cannot view API docs)
 */
export const ROLE_PERMISSIONS: Record<RoleEnum, Permission[]> = {
  ADMINISTRATOR: [
    'view:api_docs',
    'manage:employees',
    'view:employees',
    'manage:telemetry',
    'view:telemetry',
    'manage:analytics',
    'view:analytics',
    'manage:settings',
    'manage:users',
  ],
  SOC_ENGINEER: [
    'view:api_docs',
    'view:employees',
    'manage:telemetry',
    'view:telemetry',
    'view:analytics',
  ],
  SECURITY_MANAGER: [
    'manage:employees',
    'view:employees',
    'view:telemetry',
    'manage:analytics',
    'view:analytics',
  ],
  SECURITY_ANALYST: [
    'view:employees',
    'view:telemetry',
    'view:analytics',
  ],
};

/**
 * Check whether a given user role possesses a specific permission.
 *
 * @param role - The user's RoleEnum value from auth state
 * @param permission - The requested permission string
 * @returns boolean indicating whether the permission is granted
 */
export function hasPermission(
  role: RoleEnum | string | undefined | null,
  permission: Permission | string,
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as RoleEnum];
  if (!permissions) return false;
  return permissions.includes(permission as Permission);
}

/**
 * Check if the role is an elevated administrative or managerial role.
 *
 * @param role - The user's RoleEnum value
 * @returns boolean indicating whether the role is elevated (ADMINISTRATOR or SECURITY_MANAGER)
 */
export function isElevatedRole(role: RoleEnum | string | undefined | null): boolean {
  if (!role) return false;
  return role === 'ADMINISTRATOR' || role === 'SECURITY_MANAGER';
}

/**
 * Helper to check if role has technical engineering / admin access for API docs
 */
export function canViewApiDocs(role: RoleEnum | string | undefined | null): boolean {
  return hasPermission(role, 'view:api_docs');
}

/**
 * Helper to check if role can manage employee identities (create / edit)
 */
export function canManageEmployees(role: RoleEnum | string | undefined | null): boolean {
  return hasPermission(role, 'manage:employees');
}

/**
 * Helper to check if role can configure threat scoring rules
 * (ADMINISTRATOR only)
 */
export function canConfigureScoringRules(role: RoleEnum | string | undefined | null): boolean {
  if (!role) return false;
  return role === 'ADMINISTRATOR';
}

/**
 * Helper to check if role can view system health & backend integrations
 * (ADMINISTRATOR only)
 */
export function canViewSystemHealth(role: RoleEnum | string | undefined | null): boolean {
  if (!role) return false;
  return role === 'ADMINISTRATOR';
}

