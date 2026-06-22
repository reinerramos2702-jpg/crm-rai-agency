import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/knowledge-bases — lista las bases de conocimiento del workspace
 *      (Rastreador web, FAQs, Tablas, Texto enriquecido, Archivos) con conteo
 *      de elementos y agentes que las usan.
 * POST /api/knowledge-bases  body: { name, description? } — crea una nueva base.
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const bases = await prisma.knowledgeBase.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true, triggers: true } },
    },
  });

  return NextResponse.json({ knowledgeBases: bases });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: { name?: string; description?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body opcional
  }

  const count = await prisma.knowledgeBase.count({ where: { workspaceId: ctx.workspace.id } });
  const name = body.name?.trim() || `Base de conocimiento ${count + 1}`;

  const kb = await prisma.knowledgeBase.create({
    data: {
      workspaceId: ctx.workspace.id,
      name,
      description: body.description?.trim() || null,
    },
  });

  return NextResponse.json({ knowledgeBase: kb }, { status: 201 });
}
