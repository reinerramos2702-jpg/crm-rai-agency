/**
 * Base de la capa repository/service (Bloque 1, v3.0-master-prompt, sección 3
 * — regla no negociable de multi-tenant): ninguna consulta a base de datos para
 * lógica de negocio se hace directo desde componentes React ni rutas API sueltas
 * con `prisma.model.findMany()` a pelo. Pasa por un repository que inyecta y
 * valida `workspaceId` siempre, para no confiar en que el caller se acuerde de
 * filtrar (el peor bug posible en un CRM SaaS: Cliente A viendo datos de B).
 *
 * Este archivo es la base del patrón — se aplica primero a los módulos nuevos
 * de esta noche (Meta híbrido) y se migra el resto de forma incremental, no
 * como reescritura masiva de las 32 rutas existentes (regla no negociable #5,
 * anti-refactor-masivo). Ver plan de inserción en
 * docs/AUDITORIA-ARQUITECTURA-BLOQUE-0.5.md.
 */

export class TenantScopeError extends Error {
  constructor(message = 'workspaceId requerido y no puede estar vacío — última barrera anti cross-tenant') {
    super(message);
    this.name = 'TenantScopeError';
  }
}

/** Última barrera: lanza si el workspaceId viene vacío/undefined antes de cualquier query. */
export function assertWorkspaceScope(workspaceId: string | undefined | null): asserts workspaceId is string {
  if (!workspaceId) throw new TenantScopeError();
}
