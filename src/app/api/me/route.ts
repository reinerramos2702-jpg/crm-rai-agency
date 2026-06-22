import { NextRequest, NextResponse } from 'next/server';
import { getRoleContext } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET /api/me — datos del usuario autenticado: identidad, workspace y rol efectivo.
 * Usado por el frontend (Sidebar, páginas) para mostrar/ocultar UI según permisos.
 */
export async function GET(req: NextRequest) {
  const ctx = await getRoleContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    userId: ctx.auth.userId,
    email: ctx.auth.email,
    displayName: ctx.auth.displayName,
    role: ctx.role,
    workspaceId: ctx.workspace.id,
    workspaceName: ctx.workspace.name,
  });
}
