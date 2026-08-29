import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/automations/runs?workflowId=...&status=...&limit=50
 *     Pestaña "Actividad" — historial de ejecuciones de todos los flujos del workspace,
 *     opcionalmente filtrado por flujo o estado.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);

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
