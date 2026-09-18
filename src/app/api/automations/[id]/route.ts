import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET    /api/automations/[id] — detalle de un flujo + sus últimas ejecuciones
 * PATCH  /api/automations/[id]  body: { name?, description?, folderId?, status?, trigger?, steps? }
 *        status: 'draft' | 'active' | 'paused' (toggle on/off del flujo)
 * DELETE /api/automations/[id]
 */

async function assertOwnership(workspaceId: string, id: string) {
  return prisma.workflow.findFirst({ where: { id, workspaceId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      runs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  return NextResponse.json({ workflow });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const { name, description, folderId, status, trigger, steps } = await req.json();

  if (status !== undefined && !['draft', 'active', 'paused'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }
  if (folderId) {
    const folder = await prisma.workflowFolder.findFirst({ where: { id: folderId, workspaceId: ws.id } });
    if (!folder) return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
  }
  if (trigger !== undefined && (typeof trigger !== 'object' || !trigger?.type)) {
    return NextResponse.json({ error: 'trigger { type, config } inválido' }, { status: 400 });
  }

  const workflow = await prisma.workflow.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(folderId !== undefined ? { folderId: folderId || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(trigger !== undefined ? { trigger } : {}),
      ...(steps !== undefined ? { steps } : {}),
    },
  });

  return NextResponse.json({ workflow });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;
  const { id } = await params;

  const owned = await assertOwnership(ws.id, id);
  if (!owned) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.$transaction([
    prisma.workflowRun.deleteMany({ where: { workflowId: id } }),
    prisma.workflow.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
