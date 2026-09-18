import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/automations/runs?workflowId=...&status=...&limit=50
 *     Pestaña "Actividad" — historial de ejecuciones de todos los flujos del workspace,
 *     opcionalmente filtrado por flujo o estado.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const workflowId = req.nextUrl.searchParams.get('workflowId');
  const status = req.nextUrl.searchParams.get('status');
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 200);

  if (workflowId) {
    const owned = await prisma.workflow.findFirst({ where: { id: workflowId, workspaceId: ws.id } });
    if (!owned) return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 });
  }

  const runs = await prisma.workflowRun.findMany({
    where: {
      workflow: { workspaceId: ws.id },
      ...(workflowId ? { workflowId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      workflow: { select: { id: true, name: true } },
    },
  });

  // Adjuntar nombre del contacto si aplica (consulta liviana, evita N+1 con un mapa)
  const contactIds = Array.from(new Set(runs.map((r) => r.contactId).filter(Boolean))) as string[];
  const contacts = contactIds.length
    ? await prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true } })
    : [];
  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  const enriched = runs.map((r) => ({
    ...r,
    contactName: r.contactId ? contactMap.get(r.contactId) || null : null,
  }));

  return NextResponse.json({ runs: enriched });
}
