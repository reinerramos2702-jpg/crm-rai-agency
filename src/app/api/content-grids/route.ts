import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getOrCreateWorkspace } from '@/lib/workspace';

export const runtime = 'nodejs';

/**
 * GET  /api/content-grids        → lista las "grillas" del usuario (galería de tarjetas)
 * POST /api/content-grids body?: { name? }  → crea una nueva grilla vacía
 */

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const grids = await prisma.contentGrid.findMany({
    where: { userId: auth.userId },
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
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const ws = await getOrCreateWorkspace(auth.userId);

  let body: { name?: string; imageProvider?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body opcional
  }

  // Nombre amistoso automático: "Grilla 1", "Grilla 2", ...
  const count = await prisma.contentGrid.count({ where: { userId: auth.userId } });
  const name = body.name?.trim() || `Grilla ${count + 1}`;

  const grid = await prisma.contentGrid.create({
    data: {
      workspaceId: ws.id,
      userId: auth.userId,
      name,
      imageProvider: body.imageProvider || 'gemini',
    },
  });

  return Response.json({ grid });
}
