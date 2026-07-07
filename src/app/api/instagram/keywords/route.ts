import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente', 'agente', 'viewer']);
  if (!isRoleContext(ctx)) return ctx;

  const rules = await prisma.keywordRule.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(
    { rules },
    { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const keyword = String(body.keyword || '').trim();
  if (!keyword) return NextResponse.json({ error: 'keyword es obligatoria' }, { status: 400 });

  const dup = await prisma.keywordRule.findFirst({
    where: { workspaceId: ctx.workspace.id, keyword: { equals: keyword, mode: 'insensitive' } },
  });
  if (dup) return NextResponse.json({ error: `Ya existe una regla para "${keyword}"` }, { status: 409 });

  const rule = await prisma.keywordRule.create({
    data: {
      workspaceId: ctx.workspace.id,
      keyword,
      matchType: body.matchType === 'exact' ? 'exact' : 'contains',
      enabled: body.enabled !== false,
      replyToComment: body.replyToComment !== false,
      commentReplies: Array.isArray(body.commentReplies)
        ? (body.commentReplies as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
        : [],
      dmEnabled: body.dmEnabled !== false,
      dmMessage: String(body.dmMessage || ''),
      dmLink: body.dmLink ? String(body.dmLink) : null,
      mediaScope: body.mediaScope === 'specific' ? 'specific' : 'all',
      mediaIds: Array.isArray(body.mediaIds)
        ? (body.mediaIds as unknown[]).map(String).filter(Boolean)
        : [],
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
