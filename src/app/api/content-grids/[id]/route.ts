import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  CONTENT_GENERATOR_READ_ROLES,
  CONTENT_GENERATOR_WRITE_ROLES,
  isRoleContext,
  requireRole,
} from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET    /api/content-grids/[id]   → detalle completo de una grilla (wizard)
 * PATCH  /api/content-grids/[id]   → actualiza progreso (currentStep, themes, chatHistory, etc.)
 * DELETE /api/content-grids/[id]   → elimina la grilla y sus assets (cascade)
 */

async function getWorkspaceGrid(id: string, workspaceId: string) {
  return prisma.contentGrid.findFirst({
    where: { id, workspaceId },
    include: { assets: { orderBy: [{ themeIndex: 'asc' }, { slideNumber: 'asc' }] } },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, CONTENT_GENERATOR_READ_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const grid = await getWorkspaceGrid(id, ctx.workspace.id);
  if (!grid) return new Response('Not found', { status: 404 });

  return Response.json({ grid });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, CONTENT_GENERATOR_WRITE_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await getWorkspaceGrid(id, ctx.workspace.id);
  if (!existing) return new Response('Not found', { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // Campos permitidos para actualizar desde el wizard
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.currentStep === 'number') data.currentStep = body.currentStep;
  if (typeof body.activeThemeIndex === 'number') data.activeThemeIndex = body.activeThemeIndex;
  if (typeof body.themesTotal === 'number') data.themesTotal = body.themesTotal;
  if (typeof body.imageProvider === 'string') data.imageProvider = body.imageProvider;
  if (typeof body.llmProvider === 'string') data.llmProvider = body.llmProvider;
  if (typeof body.llmModel === 'string') data.llmModel = body.llmModel;
  if (body.chatHistory !== undefined) data.chatHistory = body.chatHistory;
  if (body.themes !== undefined) data.themes = body.themes;

  const grid = await prisma.contentGrid.update({ where: { id }, data });
  return Response.json({ grid });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, CONTENT_GENERATOR_WRITE_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const existing = await getWorkspaceGrid(id, ctx.workspace.id);
  if (!existing) return new Response('Not found', { status: 404 });

  await prisma.contentGridAsset.deleteMany({ where: { gridId: id } });
  await prisma.contentGrid.delete({ where: { id } });

  return Response.json({ ok: true });
}
