import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requirePermission } from '@/lib/roles';
import {
  parseStoredConfig,
  sanitizeContentPlannerConfig,
} from '@/lib/content-planner-config';

export const runtime = 'nodejs';

/**
 * GET /api/content-planner/config — config del planificador de la empresa activa.
 * PUT /api/content-planner/config — guarda (mezcla) la config; valida con lista blanca.
 *
 * Siempre scopeado por ctx.workspace.id: nunca se acepta workspaceId del cliente.
 * `configured: false` = la empresa aún no guardó nada (el cliente decide si migra
 * la config local antigua una sola vez).
 */

export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  const row = await prisma.settings.findUnique({
    where: { workspaceId: ctx.workspace.id },
    select: { contentPlannerConfig: true },
  });
  const stored = row?.contentPlannerConfig ?? null;
  return NextResponse.json({
    configured: stored !== null,
    config: parseStoredConfig(stored),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requirePermission(req, 'canManageContent');
  if (!isRoleContext(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const row = await prisma.settings.findUnique({
    where: { workspaceId: ctx.workspace.id },
    select: { contentPlannerConfig: true },
  });

  let next;
  try {
    next = sanitizeContentPlannerConfig(body, parseStoredConfig(row?.contentPlannerConfig ?? null));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Configuración inválida' },
      { status: 413 },
    );
  }

  await prisma.settings.upsert({
    where: { workspaceId: ctx.workspace.id },
    create: { workspaceId: ctx.workspace.id, contentPlannerConfig: next as object },
    update: { contentPlannerConfig: next as object },
  });

  return NextResponse.json({ ok: true, config: next });
}
