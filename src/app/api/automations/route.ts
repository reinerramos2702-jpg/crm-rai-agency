import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTemplate } from '@/lib/automations/templates';
import { TRIGGER_META } from '@/lib/automations/ui-meta';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/** Cuántas ejecuciones recientes se miran para saber cómo terminó la última de cada flujo. */
const LAST_RUN_SCAN = 300;

/**
 * GET  /api/automations — lista carpetas + flujos del workspace (con conteo de runs)
 * POST /api/automations  body: { name, description?, folderId?, templateId?, trigger?, steps? }
 *      Crea un flujo nuevo, ya sea desde una plantilla (templateId) o en blanco.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente', 'staff', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const [folders, workflows, settings, recentRuns] = await Promise.all([
    prisma.workflowFolder.findMany({ where: { workspaceId: ws.id }, orderBy: { name: 'asc' } }),
    prisma.workflow.findMany({
      where: { workspaceId: ws.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    }),
    prisma.settings.findUnique({ where: { workspaceId: ws.id }, select: { automationsEnabled: true } }),
    // Estado de la última ejecución por flujo: solo dos columnas de las ejecuciones más recientes (el primero que aparece de cada flujo es el último).
    prisma.workflowRun.findMany({
      where: { workflow: { workspaceId: ws.id } },
      orderBy: { createdAt: 'desc' },
      take: LAST_RUN_SCAN,
      select: { workflowId: true, status: true },
    }),
  ]);

  const lastStatus = new Map<string, string>();
  for (const run of recentRuns) {
    if (!lastStatus.has(run.workflowId)) lastStatus.set(run.workflowId, run.status);
  }

  return NextResponse.json(
    {
      folders,
      workflows: workflows.map((w) => ({ ...w, lastRunStatus: lastStatus.get(w.id) ?? null })),
      automationsEnabled: settings?.automationsEnabled ?? true,
    },
    {
      // La pantalla ya usa caché SWR en el cliente; el navegador no debe devolver una copia vieja tras activar/pausar/eliminar.
      headers: {
        'Cache-Control': 'private, no-cache',
        Vary: 'Cookie',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['super_admin', 'agency_owner', 'admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  const body = await req.json();
  const { name, description, folderId, templateId, trigger, steps } = body;

  if (folderId) {
    const folder = await prisma.workflowFolder.findFirst({ where: { id: folderId, workspaceId: ws.id } });
    if (!folder) return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
  }

  let finalName = name;
  let finalDescription = description ?? null;
  let finalTrigger = trigger;
  let finalSteps = steps;

  if (templateId) {
    const tpl = getTemplate(templateId);
    if (!tpl) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    finalName = finalName || tpl.name;
    finalDescription = finalDescription ?? tpl.description;
    finalTrigger = finalTrigger || tpl.trigger;
    finalSteps = finalSteps || tpl.steps;
  }

  if (!finalName || typeof finalName !== 'string' || !finalName.trim()) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }
  if (finalName.trim().length > 120) {
    return NextResponse.json({ error: 'El nombre admite hasta 120 caracteres' }, { status: 400 });
  }
  if (!finalTrigger || typeof finalTrigger !== 'object' || !finalTrigger.type) {
    return NextResponse.json({ error: 'trigger { type, config } es requerido' }, { status: 400 });
  }
  if (!Object.prototype.hasOwnProperty.call(TRIGGER_META, finalTrigger.type)) {
    return NextResponse.json({ error: 'Tipo de disparador desconocido' }, { status: 400 });
  }
  if (finalSteps !== undefined && finalSteps !== null && (!Array.isArray(finalSteps) || finalSteps.length > 50)) {
    return NextResponse.json({ error: 'steps debe ser una lista (máximo 50 pasos)' }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      workspaceId: ws.id,
      folderId: folderId || null,
      name: finalName.trim(),
      description: finalDescription,
      status: 'draft',
      trigger: finalTrigger,
      steps: finalSteps || [],
    },
  });

  return NextResponse.json({ workflow });
}
