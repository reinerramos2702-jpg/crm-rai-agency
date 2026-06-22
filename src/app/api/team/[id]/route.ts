import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ROLES, isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * PATCH  /api/team/[id] — cambia el rol o estado (activo/suspendido) de un miembro (solo admin).
 * DELETE /api/team/[id] — elimina a un miembro del workspace (solo admin).
 */

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;

  const member = await prisma.workspaceMember.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!member) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });

  const { role, status } = await req.json();

  const data: { role?: string; status?: string } = {};

  if (role !== undefined) {
    if (!(ROLES as string[]).includes(role) || role === 'admin') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }
    data.role = role;
  }

  if (status !== undefined) {
    if (!['active', 'invited', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }
    data.status = status;
  }

  const updated = await prisma.workspaceMember.update({ where: { id: member.id }, data });

  return NextResponse.json({ member: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireRole(req, ['admin']);
  if (!isRoleContext(ctx)) return ctx;

  const member = await prisma.workspaceMember.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!member) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });

  await prisma.workspaceMember.delete({ where: { id: member.id } });

  return NextResponse.json({ ok: true });
}
