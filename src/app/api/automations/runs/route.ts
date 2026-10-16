import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

interface RunLogEntry {
  step: string;
  ok: boolean;
  detail: string;
}

function extractLog(result: unknown): RunLogEntry[] | null {
  if (!result || typeof result !== 'object') return null;
  const log = (result as { log?: unknown }).log;
  return Array.isArray(log) && log.length > 0 ? (log as RunLogEntry[]) : null;
}

function extractTriggerType(trigger: unknown): string | null {
  if (!trigger || typeof trigger !== 'object') return null;
  const type = (trigger as { type?: unknown }).type;
  return typeof type === 'string' ? type : null;
}

/**
 * GET /api/automations/runs?workflowId=...&status=...&limit=50&cursor=<runId>
 *     Pestaña "Actividad" — historial de ejecuciones de todos los flujos del workspace.
 *     Paginación por cursor (id de la última ejecución recibida); responde `nextCursor`
 *     o `null` cuando no hay más. Devuelve solo lo que la pantalla pinta.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const params = req.nextUrl.searchParams;
  const workflowId = params.get('workflowId');
  const status = params.get('status');
  const cursor = params.get('cursor');
  const limit = Math.min(Math.max(Number(params.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const rows = await prisma.workflowRun.findMany({
    where: {
      workflow: { workspaceId: ws.id },
      ...(workflowId ? { workflowId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      workflowId: true,
      contactId: true,
      status: true,
      trigger: true,
      result: true,
      error: true,
      createdAt: true,
      workflow: { select: { id: true, name: true } },
    },
  });

  if (rows.length === 0 && workflowId && !cursor) {
    const owned = await prisma.workflow.findFirst({ where: { id: workflowId, workspaceId: ws.id }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Flujo no encontrado' }, { status: 404 });
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const contactIds = Array.from(new Set(page.map((r) => r.contactId).filter((id): id is string => !!id)));
  const contacts = contactIds.length
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, workspaceId: ws.id },
        select: { id: true, name: true },
      })
    : [];
  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  const runs = page.map((r) => {
    const log = extractLog(r.result);
    return {
      id: r.id,
      workflowId: r.workflowId,
      contactId: r.contactId,
      contactName: r.contactId ? contactMap.get(r.contactId) ?? null : null,
      status: r.status,
      trigger: { type: extractTriggerType(r.trigger) },
      result: log ? { log } : null,
      error: r.error,
      createdAt: r.createdAt,
      workflow: r.workflow,
    };
  });

  return NextResponse.json(
    { runs, nextCursor: hasMore ? page[page.length - 1].id : null },
    { headers: { 'Cache-Control': 'private, no-cache', Vary: 'Cookie' } }
  );
}
