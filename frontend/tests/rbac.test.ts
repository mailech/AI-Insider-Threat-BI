import { describe, expect, it } from 'vitest';

import {
  ROLE_PERMISSIONS,
  canConfigureScoringRules,
  canManageEmployees,
  canViewApiDocs,
  canViewSystemHealth,
  hasPermission,
  isElevatedRole,
} from '../src/lib/rbac';
import type { RoleEnum } from '../src/types/api';

const ALL_ROLES: RoleEnum[] = [
  'SECURITY_ANALYST',
  'SOC_ENGINEER',
  'SECURITY_MANAGER',
  'ADMINISTRATOR',
];

describe('Module 1 frontend RBAC', () => {
  it('defines permission maps for all four platform roles', () => {
    for (const role of ALL_ROLES) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('grants administrator full settings, user, and employee management', () => {
    expect(hasPermission('ADMINISTRATOR', 'manage:settings')).toBe(true);
    expect(hasPermission('ADMINISTRATOR', 'manage:users')).toBe(true);
    expect(canManageEmployees('ADMINISTRATOR')).toBe(true);
    expect(canViewApiDocs('ADMINISTRATOR')).toBe(true);
    expect(canConfigureScoringRules('ADMINISTRATOR')).toBe(true);
    expect(canViewSystemHealth('ADMINISTRATOR')).toBe(true);
    expect(isElevatedRole('ADMINISTRATOR')).toBe(true);
  });

  it('allows security managers to manage employees but not admin settings', () => {
    expect(canManageEmployees('SECURITY_MANAGER')).toBe(true);
    expect(isElevatedRole('SECURITY_MANAGER')).toBe(true);
    expect(hasPermission('SECURITY_MANAGER', 'manage:settings')).toBe(false);
    expect(hasPermission('SECURITY_MANAGER', 'manage:users')).toBe(false);
    expect(canViewApiDocs('SECURITY_MANAGER')).toBe(false);
    expect(canConfigureScoringRules('SECURITY_MANAGER')).toBe(false);
    expect(canViewSystemHealth('SECURITY_MANAGER')).toBe(false);
  });

  it('allows SOC engineers technical access without employee or settings management', () => {
    expect(canViewApiDocs('SOC_ENGINEER')).toBe(true);
    expect(hasPermission('SOC_ENGINEER', 'manage:telemetry')).toBe(true);
    expect(canManageEmployees('SOC_ENGINEER')).toBe(false);
    expect(hasPermission('SOC_ENGINEER', 'manage:settings')).toBe(false);
    expect(canConfigureScoringRules('SOC_ENGINEER')).toBe(false);
    expect(canViewSystemHealth('SOC_ENGINEER')).toBe(false);
    expect(isElevatedRole('SOC_ENGINEER')).toBe(false);
  });

  it('restricts security analysts to view/triage permissions', () => {
    expect(hasPermission('SECURITY_ANALYST', 'view:employees')).toBe(true);
    expect(hasPermission('SECURITY_ANALYST', 'triage:incidents')).toBe(true);
    expect(canManageEmployees('SECURITY_ANALYST')).toBe(false);
    expect(canViewApiDocs('SECURITY_ANALYST')).toBe(false);
    expect(hasPermission('SECURITY_ANALYST', 'manage:settings')).toBe(false);
    expect(hasPermission('SECURITY_ANALYST', 'close:incidents')).toBe(false);
    expect(canConfigureScoringRules('SECURITY_ANALYST')).toBe(false);
    expect(canViewSystemHealth('SECURITY_ANALYST')).toBe(false);
    expect(isElevatedRole('SECURITY_ANALYST')).toBe(false);
  });

  it('denies unknown or missing roles', () => {
    expect(hasPermission(undefined, 'manage:settings')).toBe(false);
    expect(hasPermission(null, 'manage:settings')).toBe(false);
    expect(hasPermission('NOT_A_ROLE', 'manage:settings')).toBe(false);
    expect(isElevatedRole(undefined)).toBe(false);
  });
});
