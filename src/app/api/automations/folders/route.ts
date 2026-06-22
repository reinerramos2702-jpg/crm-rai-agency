import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * POST   /api/automations/folders  body: { name }
 * DELETE /api/automations/folders?id=...  (los flujos dentro quedan sin carpeta)
 */

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const ws = ctx.workspace;

  const folder = await prisma.workflowFolder.create({
    data: { workspaceId: ws.id, name: name.trim() },
  });

  return NextResponse.json({ folder });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  const ws = ctx.workspace;
  const folder = await prisma.workflowFolder.findFirst({ where: { id, workspaceId: ws.id } });
  if (!folder) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  await prisma.$transaction([
    prisma.workflow.updateMany({ where: { folderId: id }, data: { folderId: null } }),
    prisma.workflowFolder.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
