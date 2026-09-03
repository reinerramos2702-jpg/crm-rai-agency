import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';
import { getAuth, AuthContext } from './auth';
import { getOrCreateWorkspace } from './workspace';
import { ROLES, hasPermission, type Role, type Permission } from './roles-shared';

export * from './roles-shared';

/**
 * Resuelve el rol efectivo de un usuario dentro de un workspace.
 * El owner del workspace es siempre 'admin' (no necesita fila en WorkspaceMember).
 * Si el usuario no tiene membresía activa, se le trata como 'viewer' (acceso mínimo
 * de solo lectura) para no romper invitaciones pendientes ni accesos legacy.
 */
export async function getRole(userId: string, ws: { id: string; ownerId: string }): Promise<Role> {
  if (ws.ownerId === userId) return 'admin';

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId, status: 'active' },
  });

  if (member && (ROLES as string[]).includes(member.role)) {
    return member.role as Role;
  }

  return 'viewer';
}

export interface RoleContext {
  auth: AuthContext;
  workspace: { id: string; ownerId: string; name: string };
  role: Role;
}

/**
 * Helper para rutas de API: obtiene auth + workspace + rol del usuario actual.
 * Devuelve null si no está autenticado (el caller debe responder 401).
 */
export async function getRoleContext(req: NextRequest): Promise<RoleContext | null> {
  const auth = await getAuth(req);
  if (!auth) return null;
  const workspace = await getOrCreateWorkspace(auth.userId);
  const role = await getRole(auth.userId, workspace);
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
