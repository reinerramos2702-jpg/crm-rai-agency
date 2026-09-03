import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  isAdmin,
  isAdminOrManager,
  canWrite,
  hasModuleAccess,
  PERMISSIONS_BY_ROLE,
  MODULE_ACCESS,
  ROLES,
  type Role,
  type Permission,
} from '../roles-shared';

describe('hasPermission', () => {
  for (const role of ROLES) {
    const granted = PERMISSIONS_BY_ROLE[role];
    const allPermissions: Permission[] = [
      'canCreateLead',
      'canViewReports',
      'canManageTeam',
      'canManageBilling',
      'canConnectMeta',
      'canManageContent',
      'canApproveContent',
      'canManageAdvisors',
    ];
    const notGranted = allPermissions.filter((p) => !granted.includes(p));

    it(`role '${role}' returns true for a permission it has by default`, () => {
      expect(granted.length).toBeGreaterThan(0);
      expect(hasPermission(role, granted[0])).toBe(true);
    });

    it(`role '${role}' returns false for a permission it does not have by default`, () => {
      if (notGranted.length === 0) {
        // super_admin has all permissions; skip the false case for it here,
        // but still assert it doesn't fall through unexpectedly.
        expect(notGranted.length).toBe(0);
        return;
      }
      expect(hasPermission(role, notGranted[0])).toBe(false);
    });
  }

  it('overrides can grant a permission not present in the role default', () => {
    // 'viewer' does not have 'canCreateLead' by default
    expect(PERMISSIONS_BY_ROLE.viewer.includes('canCreateLead')).toBe(false);
    expect(
      hasPermission('viewer', 'canCreateLead', { canCreateLead: true })
    ).toBe(true);
  });

  it('overrides can revoke a permission present in the role default', () => {
    // 'admin' has 'canManageTeam' by default
    expect(PERMISSIONS_BY_ROLE.admin.includes('canManageTeam')).toBe(true);
    expect(
      hasPermission('admin', 'canManageTeam', { canManageTeam: false })
    ).toBe(false);
  });
});

describe('isAdmin', () => {
  it('returns true for super_admin', () => {
    expect(isAdmin('super_admin')).toBe(true);
  });

  it('returns true for agency_owner', () => {
    expect(isAdmin('agency_owner')).toBe(true);
  });

  it('returns true for admin', () => {
    expect(isAdmin('admin')).toBe(true);
  });

  it('returns false for gerente', () => {
    expect(isAdmin('gerente')).toBe(false);
  });

  it('returns false for viewer', () => {
    expect(isAdmin('viewer')).toBe(false);
  });
});

describe('isAdminOrManager', () => {
  it('returns true for super_admin', () => {
    expect(isAdminOrManager('super_admin')).toBe(true);
  });

  it('returns true for agency_owner', () => {
    expect(isAdminOrManager('agency_owner')).toBe(true);
  });

  it('returns true for admin', () => {
    expect(isAdminOrManager('admin')).toBe(true);
  });

  it('returns true for gerente', () => {
    expect(isAdminOrManager('gerente')).toBe(true);
  });

  it('returns false for viewer', () => {
    expect(isAdminOrManager('viewer')).toBe(false);
  });
});

describe('canWrite', () => {
  const writableRoles = ROLES.filter((r) => r !== 'viewer');

  for (const role of writableRoles) {
    it(`returns true for '${role}'`, () => {
      expect(canWrite(role)).toBe(true);
    });
  }

  it("returns false for 'viewer'", () => {
    expect(canWrite('viewer')).toBe(false);
  });
});

describe('hasModuleAccess', () => {
  it('super_admin always has access, even to restricted routes', () => {
    expect(hasModuleAccess('super_admin', '/keys')).toBe(true);
    expect(hasModuleAccess('super_admin', '/settings')).toBe(true);
    expect(hasModuleAccess('super_admin', '/facturacion')).toBe(true);
  });

  it("'/keys' is restricted to admin/gerente: 'agente' is denied", () => {
    expect(MODULE_ACCESS['/keys']).toEqual(['admin', 'gerente']);
    expect(hasModuleAccess('agente', '/keys')).toBe(false);
  });

  it("'/keys' is restricted to admin/gerente: 'admin' is allowed", () => {
    expect(hasModuleAccess('admin', '/keys')).toBe(true);
  });

  it('a route not listed in MODULE_ACCESS is accessible to any role', () => {
    const unlistedPath = '/some-unlisted-route-xyz';
    expect(MODULE_ACCESS[unlistedPath]).toBeUndefined();
    for (const role of ROLES) {
      expect(hasModuleAccess(role, unlistedPath)).toBe(true);
    }
  });
});
