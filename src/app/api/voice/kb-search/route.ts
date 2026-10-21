import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { readVoiceConfig } from '@/lib/voice/config';
import { rankKnowledge } from '@/lib/voice/kb-search';
import { KB_SECRET_HEADER } from '@/lib/voice/retell';
import { secretsEqual } from '@/lib/voice/signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 2000;
const MAX_QUERY = 300;

/**
 * POST /api/voice/kb-search?agent=<id del agente del CRM>   body: { query }
 * Herramienta `buscar_conocimiento` que Retell llama durante la llamada. Protegida con el
 * secreto compartido (cabecera x-voice-kb-secret). Busca solo en las bases vinculadas a ESE agente.
 * Devuelve fragmentos cortos, pensados para decirse en voz alta.
 */
export async function POST(req: NextRequest) {
  const cfg = readVoiceConfig();
  if (!cfg.kbSecret) return NextResponse.json({ error: 'kb_not_configured' }, { status: 503 });

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!secretsEqual(req.headers.get(KB_SECRET_HEADER) ?? bearer, cfg.kbSecret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const agentId = req.nextUrl.searchParams.get('agent')?.slice(0, 80) ?? '';
  if (!agentId) return NextResponse.json({ error: 'missing_agent' }, { status: 400 });

  const limit = checkRateLimit(`voice-kb:${agentId}`, { max: 120, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec ?? 60) } });

  let body: { query?: unknown; args?: { query?: unknown } } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const q = body.query ?? body.args?.query;
  const query = typeof q === 'string' ? q.trim().slice(0, MAX_QUERY) : '';
  if (!query) return NextResponse.json({ error: 'missing_query' }, { status: 400 });

  const agent = await prisma.aIAgent.findUnique({ where: { id: agentId }, select: { workspaceId: true, kind: true } });
  if (!agent || agent.kind !== 'voice') return NextResponse.json({ error: 'unknown_agent' }, { status: 404 });

  const items = await prisma.knowledgeBaseItem.findMany({
    where: { knowledgeBase: { workspaceId: agent.workspaceId, triggers: { some: { agentId } } } },
    take: MAX_ITEMS,
    select: { id: true, type: true, question: true, answer: true, title: true, content: true, data: true },
  });

  const hits = rankKnowledge(items, query, { topK: 3, maxChars: 320 });
  return NextResponse.json({
    found: hits.length > 0,
    results: hits.map((h) => ({ title: h.title, text: h.text })),
    ...(hits.length === 0 ? { note: 'Sin coincidencias en la base de conocimiento. No inventes la respuesta: ofrece tomar un mensaje.' } : {}),
  });
}
