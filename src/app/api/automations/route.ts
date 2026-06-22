import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';
import { getTemplate } from '@/lib/automations/templates';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/automations — lista carpetas + flujos del workspace (con conteo de runs)
 * POST /api/automations  body: { name, description?, folderId?, templateId?, trigger?, steps? }
 *      Crea un flujo nuevo, ya sea desde una plantilla (templateId) o en blanco.
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);

  const [folders, workflows, settings] = await Promise.all([
    prisma.workflowFolder.findMany({ where: { workspaceId: ws.id }, orderBy: { name: 'asc' } }),
    prisma.workflow.findMany({
      where: { workspaceId: ws.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    }),
    prisma.settings.findUnique({ where: { id: 'global' } }),
  ]);

  return NextResponse.json(
    {
      folders,
      workflows,
      automationsEnabled: settings?.automationsEnabled ?? true,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;
  const auth = ctx.auth;

  const body = await req.json();
  const { name, description, folderId, templateId, trigger, steps } = body;

  const ws = await getOrCreateWorkspace(auth.userId);

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
  if (!finalTrigger || typeof finalTrigger !== 'object' || !finalTrigger.type) {
    return NextResponse.json({ error: 'trigger { type, config } es requerido' }, { status: 400 });
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
