import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET    /api/content-grids/[id]   → detalle completo de una grilla (wizard)
 * PATCH  /api/content-grids/[id]   → actualiza progreso (currentStep, themes, chatHistory, etc.)
 * DELETE /api/content-grids/[id]   → elimina la grilla y sus assets (cascade)
 */

async function getOwnedGrid(id: string, userId: string) {
  const grid = await prisma.contentGrid.findUnique({
    where: { id },
    include: { assets: { orderBy: [{ themeIndex: 'asc' }, { slideNumber: 'asc' }] } },
  });
  if (!grid || grid.userId !== userId) return null;
  return grid;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const grid = await getOwnedGrid(id, auth.userId);
  if (!grid) return new Response('Not found', { status: 404 });

  return Response.json({ grid });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const existing = await getOwnedGrid(id, auth.userId);
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
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const existing = await getOwnedGrid(id, auth.userId);
  if (!existing) return new Response('Not found', { status: 404 });

  await prisma.contentGridAsset.deleteMany({ where: { gridId: id } });
  await prisma.contentGrid.delete({ where: { id } });

  return Response.json({ ok: true });
}
