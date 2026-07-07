/**
 * Definiciones de roles y permisos compartidas entre cliente y servidor.
 * Este archivo NO debe importar nada de Prisma/servidor — es seguro
 * usarlo desde componentes 'use client' (Sidebar, páginas, etc.)
 *
 * - admin   → owner del workspace (implícito) o miembro con rol 'admin'. Control total.
 * - gerente → gestiona operación diaria, campañas, automatizaciones y configuración
 *             general, pero NO administra el equipo ni las claves de IA (BYOK).
 * - agente  → trabaja en módulos operativos (Conversaciones, Calendarios, Campañas,
 *             Automatización) sin acceso a Configuración, Claves, Facturación ni Equipo.
 * - viewer  → acceso de solo lectura a los módulos operativos. No puede crear, editar
 *             ni eliminar nada.
 */

export type Role = 'admin' | 'gerente' | 'agente' | 'viewer';

export const ROLES: Role[] = ['admin', 'gerente', 'agente', 'viewer'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  agente: 'Agente',
  viewer: 'Solo lectura',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: 'Control total: equipo, configuración, claves de IA, facturación y todos los módulos.',
  gerente: 'Gestiona campañas, conversaciones, calendarios, marketing y automatizaciones. Sin acceso a Equipo ni Claves de IA.',
  agente: 'Trabaja en el día a día: conversaciones, calendarios y campañas. Sin acceso a configuración ni datos sensibles.',
  viewer: 'Solo lectura en los módulos operativos. No puede crear, editar ni eliminar nada.',
};

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
  '/instagram': ['admin', 'gerente', 'agente', 'viewer'],
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
  return role === 'admin';
}

export function isAdminOrManager(role: Role): boolean {
  return role === 'admin' || role === 'gerente';
}

export function hasModuleAccess(role: Role, path: string): boolean {
  const allowed = MODULE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}
