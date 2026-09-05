/**
 * Definiciones de roles y permisos compartidas entre cliente y servidor.
 * Este archivo NO debe importar nada de Prisma/servidor — es seguro
 * usarlo desde componentes 'use client' (Sidebar, páginas, etc.)
 *
 * RBAC formal (Bloque 1, v3.0-master-prompt, sección 3) — extiende los 4 roles
 * originales a los 7 mínimos del master prompt SIN renombrarlos (evita forzar
 * una migración masiva de las 32 rutas que ya usan los strings originales,
 * regla no negociable #5 anti-refactor-masivo). Equivalencia:
 *
 * - admin        ≈ TENANT_ADMIN → owner del workspace (implícito) o miembro 'admin'. Control total del tenant.
 * - gerente      ≈ MANAGER      → gestiona operación diaria, campañas, automatizaciones y configuración
 *                                  general, pero NO administra el equipo ni las claves de IA (BYOK).
 * - agente       ≈ ADVISOR      → trabaja en módulos operativos (Conversaciones, Calendarios, Campañas,
 *                                  Automatización) sin acceso a Configuración, Claves, Facturación ni Equipo.
 * - viewer       ≈ CLIENT       → acceso de solo lectura a los módulos operativos. No puede crear, editar
 *                                  ni eliminar nada. Reservado también para el futuro portal de cliente.
 * - super_admin  = SUPER_ADMIN  → RAI Agency, cross-tenant. Ve y administra todos los workspaces.
 * - agency_owner = AGENCY_OWNER → dueño de una agencia/tenant que revende el CRM a sus propios clientes
 *                                  (rol tipo Belloanam, genérico — nunca nombrado a un cliente específico).
 * - staff        = STAFF        → categorías de RRHH-lite del Bloque 4 (vendedor/CM/camarógrafo/editor),
 *                                  sin permisos administrativos por default.
 */

export type Role =
  | 'super_admin'
  | 'agency_owner'
  | 'admin'
  | 'gerente'
  | 'agente'
  | 'staff'
  | 'viewer';

export const ROLES: Role[] = [
  'super_admin',
  'agency_owner',
  'admin',
  'gerente',
  'agente',
  'staff',
  'viewer',
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin (RAI Agency)',
  agency_owner: 'Dueño de agencia',
  admin: 'Administrador',
  gerente: 'Gerente',
  agente: 'Agente',
  staff: 'Staff',
  viewer: 'Solo lectura',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'RAI Agency — acceso cross-tenant a todos los workspaces. Reservado para operación interna.',
  agency_owner: 'Dueño de una agencia/tenant que revende el CRM: administra sus propios clientes/asesores desde un panel privado.',
  admin: 'Control total del tenant: equipo, configuración, claves de IA, facturación y todos los módulos.',
  gerente: 'Gestiona campañas, conversaciones, calendarios, marketing y automatizaciones. Sin acceso a Equipo ni Claves de IA.',
  agente: 'Trabaja en el día a día: conversaciones, calendarios y campañas. Sin acceso a configuración ni datos sensibles.',
  staff: 'Categoría de RRHH-lite (vendedor/CM/camarógrafo/editor) — acceso operativo acotado a su carga de trabajo.',
  viewer: 'Solo lectura en los módulos operativos. No puede crear, editar ni eliminar nada.',
};

/**
 * Permisos explícitos (sección 3 del master prompt) — la autorización real en
 * backend SIEMPRE se valida por permiso, nunca por nombre de rol "a pelo".
 * Cada rol tiene un set de permisos por default (ver PERMISSIONS_BY_ROLE).
 */
export type Permission =
  | 'canCreateLead'
  | 'canViewReports'
  | 'canManageTeam'
  | 'canManageBilling'
  | 'canConnectMeta'
  | 'canManageContent'
  | 'canApproveContent'
  | 'canManageAdvisors';

export const PERMISSIONS: Permission[] = [
  'canCreateLead',
  'canViewReports',
  'canManageTeam',
  'canManageBilling',
  'canConnectMeta',
  'canManageContent',
  'canApproveContent',
  'canManageAdvisors',
];

/** Set de permisos por default de cada rol. Un WorkspaceMember puede tener overrides puntuales (ver hasPermission). */
export const PERMISSIONS_BY_ROLE: Record<Role, Permission[]> = {
  super_admin: [...PERMISSIONS],
  agency_owner: [
    'canCreateLead',
    'canViewReports',
    'canManageTeam',
    'canManageBilling',
    'canConnectMeta',
    'canManageContent',
    'canApproveContent',
    'canManageAdvisors',
  ],
  admin: [
    'canCreateLead',
    'canViewReports',
    'canManageTeam',
    'canManageBilling',
    'canConnectMeta',
    'canManageContent',
    'canApproveContent',
    'canManageAdvisors',
  ],
  gerente: ['canCreateLead', 'canViewReports', 'canConnectMeta', 'canManageContent', 'canApproveContent', 'canManageAdvisors'],
  agente: ['canCreateLead', 'canManageContent'],
  staff: ['canManageContent'],
  viewer: ['canViewReports'],
};

/**
 * ¿El rol tiene el permiso indicado? Valida por permiso, no por rol hardcodeado.
 * `overrides` (opcional) permite ajustes puntuales por WorkspaceMember sin tocar
 * el default del rol (ej. un 'agente' con canApproveContent concedido a mano).
 */
export function hasPermission(role: Role, permission: Permission, overrides?: Partial<Record<Permission, boolean>>): boolean {
  if (overrides && permission in overrides) return !!overrides[permission];
  return PERMISSIONS_BY_ROLE[role]?.includes(permission) ?? false;
}

/**
 * Mapa de acceso a módulos del sidebar por rol.
 * Si una ruta no aparece aquí, se asume accesible para todos los roles autenticados.
 */
export const MODULE_ACCESS: Record<string, Role[]> = {
  '/': ['admin', 'gerente', 'agente', 'viewer'],
  '/launchpad': ['admin', 'gerente', 'agente'],
  '/campaign/new': ['admin', 'gerente', 'agente'],
  '/generador-imagenes': ['admin', 'gerente', 'agente'],
  '/agentes-ia': ['admin', 'gerente', 'agente', 'viewer'],
  '/conversaciones': ['admin', 'gerente', 'agente', 'viewer'],
  '/calendarios': ['admin', 'gerente', 'agente', 'viewer'],
  '/contactos': ['admin', 'gerente', 'agente', 'viewer'],
  '/clientes-potenciales': ['admin', 'gerente', 'agente', 'viewer'],
  '/pasajeros': ['admin', 'gerente', 'agente', 'viewer'],
  '/reservas': ['admin', 'gerente', 'agente', 'viewer'],
  '/pagos': ['admin', 'gerente'],
  '/automatizacion': ['admin', 'gerente', 'agente', 'viewer'],
  '/marketing': ['admin', 'gerente', 'agente', 'viewer'],
  '/sitios': ['admin', 'gerente', 'agente'],
  '/contenido-multimedia': ['admin', 'gerente', 'agente'],
  '/reputacion': ['admin', 'gerente', 'agente', 'viewer'],
  '/informes': ['admin', 'gerente', 'viewer'],
  '/marketplace': ['admin', 'gerente'],
  '/facturacion': ['admin', 'gerente'],
  '/keys': ['admin', 'gerente'],
  '/settings': ['admin', 'gerente'],
};

/** Roles que pueden crear/editar/eliminar (todo excepto 'viewer'). */
export function canWrite(role: Role): boolean {
  return role !== 'viewer';
}

export function isAdmin(role: Role): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'agency_owner';
}

export function isAdminOrManager(role: Role): boolean {
  return isAdmin(role) || role === 'gerente';
}

export function hasModuleAccess(role: Role, path: string): boolean {
  if (role === 'super_admin') return true; // cross-tenant, siempre pasa
  const allowed = MODULE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
