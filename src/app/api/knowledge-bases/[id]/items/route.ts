import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/knowledge-bases/[id]/items → lista los elementos de la base
 *      (FAQs, texto, tablas, archivos, URLs de rastreo)
 * POST /api/knowledge-bases/[id]/items
 *   body: { type: 'faq'|'text'|'table'|'file'|'url', question?, answer?, title?, content?, data? }
 */

const ALLOWED_TYPES = ['faq', 'text', 'table', 'file', 'url'];

async function ownedKB(id: string, workspaceId: string) {
  return prisma.knowledgeBase.findFirst({ where: { id, workspaceId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const kb = await ownedKB(id, ctx.workspace.id);
  if (!kb) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  const items = await prisma.knowledgeBaseItem.findMany({
    where: { knowledgeBaseId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente']);
  if (!isRoleContext(ctx)) return ctx;

  const { id } = await params;
  const kb = await ownedKB(id, ctx.workspace.id);
  if (!kb) return NextResponse.json({ error: 'Base de conocimiento no encontrada' }, { status: 404 });

  const body = await req.json();
  const type = ALLOWED_TYPES.includes(body.type) ? body.type : 'faq';

  if (type === 'faq' && (!body.question || !body.answer)) {
    return NextResponse.json({ error: 'Pregunta y respuesta son requeridas' }, { status: 400 });
  }
  if (type === 'url' && !body.content) {
    return NextResponse.json({ error: 'La URL es requerida' }, { status: 400 });
  }

  const item = await prisma.knowledgeBaseItem.create({
    data: {
      knowledgeBaseId: id,
      type,
      question: typeof body.question === 'string' ? body.question.trim() : null,
      answer: typeof body.answer === 'string' ? body.answer : null,
      title: typeof body.title === 'string' ? body.title.trim() : null,
      content: typeof body.content === 'string' ? body.content : null,
      data: body.data ?? undefined,
    },
  });

  await prisma.knowledgeBase.update({ where: { id }, data: { updatedAt: new Date() } });

  return NextResponse.json({ item }, { status: 201 });
}
