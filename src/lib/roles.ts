import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { getAuth, isPlatformSuperAdmin, AuthContext } from './auth';
import { resolveActiveWorkspace, WorkspaceAccessError, type ActiveWorkspace } from './workspace';
import { ROLES, ESCALATION_ROLES, hasPermission, type Role, type Permission } from './roles-shared';

export * from './roles-shared';

/**
 * Resuelve el rol efectivo de un usuario dentro de un workspace.
 * - Email en SUPER_ADMIN_EMAILS → 'super_admin' (único origen de ese rol).
 * - Owner del workspace → 'admin' (no necesita fila en WorkspaceMember).
 * - Membresía activa → su rol; un rol de escalada guardado en DB se ignora
 *   (ESCALATION_ROLES: 'super_admin', 'agency_owner').
 * - Sin membresía válida → 'viewer' (acceso mínimo de solo lectura).
 */
export async function getRole(auth: AuthContext, ws: { id: string; ownerId: string }): Promise<Role> {
  if (isPlatformSuperAdmin(auth.email)) return 'super_admin';
  if (ws.ownerId === auth.userId) return 'admin';

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: auth.userId, status: 'active' },
  });

  if (
    member &&
    !(ESCALATION_ROLES as string[]).includes(member.role) &&
    (ROLES as string[]).includes(member.role)
  ) {
    return member.role as Role;
  }

  return 'viewer';
}

export interface RoleContext {
  auth: AuthContext;
  workspace: ActiveWorkspace;
  role: Role;
}

/**
 * Helper para rutas de API: obtiene auth + workspace activo + rol del usuario actual.
 * Devuelve null si no está autenticado o si el workspace pedido vía
 * X-Workspace-Id no es accesible para este usuario (el caller responde 401).
 * Mantiene la firma `RoleContext | null` para no romper a los callers existentes.
 */
export async function getRoleContext(req: NextRequest): Promise<RoleContext | null> {
  const auth = await getAuth(req);
  if (!auth) return null;

  let workspace: ActiveWorkspace;
  try {
    workspace = await resolveActiveWorkspace(req, auth);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) return null;
    throw e;
  }

  const role = await getRole(auth, workspace);
  return { auth, workspace, role };
}

/**
 * Verifica que el usuario actual tenga uno de los roles permitidos.
 * Devuelve el RoleContext si todo OK, o un NextResponse con el error a devolver.
 */
export async function requireRole(
  req: NextRequest,
  allowed: Role[]
): Promise<RoleContext | NextResponse> {
  const ctx = await getRoleContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!allowed.includes(ctx.role)) {
    return NextResponse.json(
      { error: 'No tienes permisos suficientes para realizar esta acción.' },
      { status: 403 }
    );
  }
  return ctx;
}

/** Type guard para distinguir un RoleContext de un NextResponse de error. */
export function isRoleContext(x: RoleContext | NextResponse): x is RoleContext {
  return !(x instanceof NextResponse);
}

/**
 * Guard por PERMISO explícito (sección 3 del master prompt), hermano de
 * `requireRole` — nunca reemplazo. Preferir esta función en rutas nuevas;
 * `requireRole` sigue siendo válido donde ya existe (32 rutas), migrar
 * incrementalmente en vez de refactor masivo (regla no negociable #5).
 * Autorización siempre en backend — nunca confiar solo en ocultar un botón.
 */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<RoleContext | NextResponse> {
  const ctx = await getRoleContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(ctx.role, permission)) {
    return NextResponse.json(
      { error: 'No tienes permisos suficientes para realizar esta acción.' },
      { status: 403 }
    );
  }
  return ctx;
}
