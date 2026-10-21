import { NextRequest, NextResponse } from 'next/server';
import { AI_AGENT_WRITE_ROLES, isRoleContext, requireRole } from '@/lib/roles';
import { readVoiceConfig } from '@/lib/voice/config';
import { estimateVoiceCost, readCostAssumptions } from '@/lib/voice/cost';
import { loadCalls, loadMonthUsage } from '@/lib/voice/queries';
import { effectiveCap } from '@/lib/voice/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

/**
 * GET /api/voice/calls?limit=20&cursor=<id>&cap=<USD>
 * Llamadas de voz del workspace (más recientes primero), uso del mes y costo estimado.
 * Las transcripciones son datos sensibles: solo roles que gestionan agentes.
 * `cap` es el tope del workspace (ajustes de voz); el tope del entorno siempre manda.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, AI_AGENT_WRITE_ROLES);
  if (!isRoleContext(ctx)) return ctx;

  const sp = req.nextUrl.searchParams;
  const limitRaw = Number(sp.get('limit') ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), MAX_LIMIT) : 20;
  const cursor = sp.get('cursor')?.slice(0, 80) || null;
  const capRaw = Number(sp.get('cap'));

  const cfg = readVoiceConfig();
  const cap = effectiveCap(cfg.monthlyCapUsd, Number.isFinite(capRaw) ? capRaw : null);
  const assumptions = readCostAssumptions();

  const [page, usage] = await Promise.all([
    loadCalls(ctx.workspace.id, limit, cursor),
    loadMonthUsage(ctx.workspace.id, cap, cfg.mode === 'live'),
  ]);

  return NextResponse.json(
    {
      mode: cfg.mode,
      calls: page.calls,
      nextCursor: page.nextCursor,
      usage,
      costEstimate: estimateVoiceCost(usage.minutes, assumptions, { includeNumber: cfg.mode === 'live' }),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
