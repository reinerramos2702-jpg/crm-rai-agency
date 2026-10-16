import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRoleContext, MODULE_ACCESS, requireRole } from '@/lib/roles';
import { readVoiceConfig, toPublicConfig } from '@/lib/voice/config';
import { readCostAssumptions, estimateVoiceCost, minutesForBudget, perMinuteUsd } from '@/lib/voice/cost';
import { buildActivationChecklist } from '@/lib/voice/status';
import { externalNameFor } from '@/lib/voice/agent-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/voice/status — checklist de activación de la voz: qué variable de entorno falta,
 * URL del webhook, modo (simulado/en vivo) y los agentes de voz del workspace.
 * Nunca devuelve el valor de un secreto, solo si existe.
 */
export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, MODULE_ACCESS['/agentes-ia']);
  if (!isRoleContext(ctx)) return ctx;
  const workspaceId = ctx.workspace.id;

  const cfg = readVoiceConfig();
  const publicCfg = toPublicConfig(cfg);
  const assumptions = readCostAssumptions();

  const [callsTotal, agents] = await Promise.all([
    prisma.conversation.count({ where: { channel: 'voice', contact: { workspaceId } } }),
    prisma.aIAgent.findMany({
      where: { workspaceId, kind: 'voice' },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, status: true, isPrimary: true, _count: { select: { triggers: true } } },
    }),
  ]);

  const checklist = buildActivationChecklist({ config: publicCfg, callsTotal, webhookBase: cfg.publicBaseUrl });
  return NextResponse.json(
    {
      workspaceId,
      ...checklist,
      config: publicCfg,
      agents: agents.map((a) => ({ id: a.id, name: a.name, status: a.status, isPrimary: a.isPrimary, knowledgeBases: a._count.triggers, providerName: externalNameFor(a.id) })),
      callsTotal,
      cost: {
        estimado: true,
        perMinuteUsd: perMinuteUsd(assumptions),
        numberUsdPerMonth: assumptions.numberUsdPerMonth,
        capUsd: cfg.monthlyCapUsd,
        minutesAtCap: minutesForBudget(cfg.monthlyCapUsd, assumptions),
        sample: estimateVoiceCost(100, assumptions),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
