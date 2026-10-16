import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { readVoiceConfig } from '@/lib/voice/config';
import { persistVoiceEvent } from '@/lib/voice/persist';
import { normalizeRetellCall } from '@/lib/voice/retell';
import { verifyRetellSignature } from '@/lib/voice/signature';
import { prismaVoiceStore } from '@/lib/voice/store';
import { VOICE_EVENTS, type VoiceEventName } from '@/lib/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1_000_000;

const empty = (status: number) => new NextResponse(null, { status });
const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * POST /api/voice/webhook?agent=<id del agente del CRM>
 * Eventos de Retell (call_started / call_ended / call_analyzed). Ruta pública: la identidad
 * la da la firma HMAC del proveedor; el workspace sale de la base de datos (nunca del cuerpo).
 * Idempotente: ids determinísticos, un reintento no duplica nada.
 */
export async function POST(req: NextRequest) {
  const cfg = readVoiceConfig();
  if (cfg.mode !== 'live') return fail(503, 'voice_not_live');

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = checkRateLimit(`voice-webhook:${ip}`, { max: 300, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec ?? 60) } });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, 'payload_too_large');
  if (!verifyRetellSignature(raw, cfg.webhookSecret, req.headers.get('x-retell-signature'))) return fail(401, 'invalid_signature');

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return fail(400, 'invalid_json');
  }
  const body = (typeof payload === 'object' && payload !== null ? payload : {}) as { event?: unknown; call?: unknown };
  const event = body.event;
  if (typeof event !== 'string' || !(VOICE_EVENTS as readonly string[]).includes(event)) return empty(204); // otros eventos: se ignoran

  const call = normalizeRetellCall(body.call);
  if (!call) return fail(400, 'invalid_call');

  const crmAgentId = req.nextUrl.searchParams.get('agent')?.slice(0, 80) ?? '';
  const agent = crmAgentId
    ? await prisma.aIAgent.findUnique({ where: { id: crmAgentId }, select: { id: true, workspaceId: true, kind: true } })
    : null;
  if (!agent || agent.kind !== 'voice') return fail(404, 'unknown_agent');

  try {
    const result = await persistVoiceEvent(prismaVoiceStore, { workspaceId: agent.workspaceId, agentId: agent.id }, event as VoiceEventName, call);
    if (!result.ok) return fail(409, result.reason);
  } catch (e) {
    console.error('[voice/webhook] no se pudo guardar el evento', event, call.callId, e instanceof Error ? e.message : 'error');
    return fail(500, 'persist_failed'); // Retell reintenta hasta 3 veces
  }
  return empty(204);
}
