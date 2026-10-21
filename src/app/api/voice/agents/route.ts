import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { AI_AGENT_WRITE_ROLES, isRoleContext, requireRole } from '@/lib/roles';
import { buildVoiceAgentSpec } from '@/lib/voice/agent-config';
import { readVoiceConfig, webhookUrlFor } from '@/lib/voice/config';
import { getVoiceProvider } from '@/lib/voice';
import { RetellError } from '@/lib/voice/retell';
import { validateVoiceSettings } from '@/lib/voice/settings';
import { loadMonthUsage } from '@/lib/voice/queries';
import { effectiveCap } from '@/lib/voice/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * POST /api/voice/agents   body: { agentId, settings }
 * Activa el agente de voz en el proveedor. En modo simulado (por defecto) NO sale a internet:
 * valida y devuelve una vista previa de lo que se enviaría (sin secretos).
 */
export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, AI_AGENT_WRITE_ROLES);
  if (!isRoleContext(ctx)) return ctx;
  const workspaceId = ctx.workspace.id;

  const limit = checkRateLimit(`voice-sync:${workspaceId}`, { max: 10, windowMs: 60_000 });
  if (!limit.ok) return json({ error: 'Demasiados intentos. Espera un momento.' }, 429);

  let body: { agentId?: unknown; settings?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }
  const agentId = typeof body.agentId === 'string' ? body.agentId.slice(0, 80) : '';
  if (!agentId) return json({ error: 'agentId es requerido.' }, 400);

  const parsed = validateVoiceSettings(body.settings);
  if (!parsed.ok) return json({ error: 'Los ajustes de voz no son válidos.', errors: parsed.errors }, 400);
  const settings = parsed.data;

  const agent = await prisma.aIAgent.findFirst({
    where: { id: agentId, workspaceId },
    include: { triggers: { include: { knowledgeBase: { select: { name: true, description: true, _count: { select: { items: true } } } } } } },
  });
  if (!agent) return json({ error: 'Agente no encontrado.' }, 404);
  if (agent.kind !== 'voice') return json({ error: 'El agente no es de voz.' }, 400);

  const cfg = readVoiceConfig();
  const built = buildVoiceAgentSpec({
    agent,
    knowledgeBases: agent.triggers.map((t) => ({ name: t.knowledgeBase.name, description: t.knowledgeBase.description, itemCount: t.knowledgeBase._count.items })),
    settings,
    config: cfg,
  });

  // Vista previa: nunca incluye secretos ni el prompt completo.
  const preview = built.ok
    ? {
        language: built.spec.language,
        voiceSpeed: built.spec.voiceSpeed,
        beginMessage: built.spec.beginMessage,
        tools: built.spec.tools.map((t) => t.name),
        promptChars: built.spec.prompt.length,
        maxCallMinutes: Math.round(built.spec.maxCallMs / 60_000),
        webhookUrl: webhookUrlFor(cfg, agent.id),
      }
    : null;

  if (cfg.mode !== 'live') {
    return json({ mode: 'simulated', synced: false, preview, issues: built.ok ? [] : built.errors });
  }
  if (!built.ok) return json({ error: 'Faltan datos para activar la voz.', errors: built.errors }, 422);

  const usage = await loadMonthUsage(workspaceId, effectiveCap(cfg.monthlyCapUsd, settings.monthlyCapUsd), true);
  if (usage.level === 'cap') return json({ error: 'Se alcanzó el tope de gasto mensual de voz. Súbelo en los ajustes o espera al próximo mes.' }, 409);

  const provider = getVoiceProvider(cfg);
  if (!provider) return json({ error: 'El proveedor de voz no está configurado.' }, 503);
  try {
    const ref = await provider.upsertAgent(built.spec);
    await logAudit({
      workspaceId,
      userId: ctx.auth.userId,
      action: 'voice.agent_synced',
      entityType: 'ai_agent',
      entityId: agent.id,
      meta: { provider: provider.name, providerAgentId: ref.agentId },
    });
    return json({ mode: 'live', synced: true, providerAgentId: ref.agentId, preview });
  } catch (e) {
    const message = e instanceof RetellError ? e.message : 'No se pudo activar el agente en el proveedor.';
    console.error('[voice/agents] error de proveedor', agent.id, message);
    return json({ error: message }, 502);
  }
}
