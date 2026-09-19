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
 * GET  /api/content-grids        → lista las "grillas" del usuario (galería de tarjetas)
 * POST /api/content-grids body?: { name? }  → crea una nueva grilla vacía
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, CONTENT_GENERATOR_READ_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const grids = await prisma.contentGrid.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      currentStep: true,
      activeThemeIndex: true,
      themesTotal: true,
      imageProvider: true,
      themes: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { assets: true } },
    },
  });

  return Response.json({ grids });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, CONTENT_GENERATOR_WRITE_ROLES);
  if (!isRoleContext(ctx)) return ctx;
  const ws = ctx.workspace;

  let body: { name?: string; imageProvider?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body opcional
  }

  // Nombre amistoso automático: "Grilla 1", "Grilla 2", ...
  const count = await prisma.contentGrid.count({ where: { workspaceId: ctx.workspace.id } });
  const name = body.name?.trim() || `Grilla ${count + 1}`;

  const grid = await prisma.contentGrid.create({
    data: {
      workspaceId: ws.id,
      userId: ctx.auth.userId,
      name,
      imageProvider: body.imageProvider || 'gemini',
    },
  });

  return Response.json({ grid });
}
