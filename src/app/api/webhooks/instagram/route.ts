import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { processIncomingComment, logAction } from '@/lib/instagram';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Webhook de Meta (objeto `instagram`, campo `comments`).
 * GET  → verificación inicial (hub.challenge) al configurar en Meta Developer.
 * POST → eventos en tiempo real: comentarios nuevos → motor de keywords → reply + DM.
 *
 * Configuración en developers.facebook.com → App → Webhooks → Instagram:
 *   Callback URL:  https://<app>.vercel.app/api/webhooks/instagram
 *   Verify token:  valor de META_WEBHOOK_VERIFY_TOKEN
 *   Campos:        comments (y messages si se quiere ampliar después)
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge || '', { status: 200 });
  }
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // sin secret configurado no podemos validar — aceptar y registrar
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
}

type WebhookChange = {
  field?: string;
  value?: {
    id?: string; // comment id
    text?: string;
    media?: { id?: string; media_product_type?: string };
    from?: { id?: string; username?: string };
    parent_id?: string;
  };
};

type WebhookEntry = { id?: string; time?: number; changes?: WebhookChange[] };

async function resolveWorkspaceId(igAccountId: string | undefined): Promise<string | null> {
  if (igAccountId) {
    const account = await prisma.socialAccount.findFirst({
      where: { igUserId: igAccountId, platform: 'instagram' },
      select: { workspaceId: true },
    });
    if (account) return account.workspaceId;
  }
  // fallback single-tenant: si el ID coincide con el env o no hay cuenta registrada,
  // usar el workspace más antiguo (RAI Agency es el tenant primario)
  if (!igAccountId || igAccountId === process.env.INSTAGRAM_BUSINESS_ID) {
    const ws = await prisma.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return ws?.id ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let payload: { object?: string; entry?: WebhookEntry[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (payload.object !== 'instagram') {
    // responder 200 igual para que Meta no reintente indefinidamente
    return NextResponse.json({ ok: true, skipped: 'object no soportado' });
  }

  const results: unknown[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'comments' || !change.value?.id || !change.value.text) continue;

      const workspaceId = await resolveWorkspaceId(entry.id);
      if (!workspaceId) continue;

      try {
        const outcome = await processIncomingComment(workspaceId, {
          commentId: change.value.id,
          mediaId: change.value.media?.id,
          text: change.value.text,
          fromId: change.value.from?.id,
          fromUsername: change.value.from?.username,
          igAccountId: entry.id,
        });
        results.push(outcome);
      } catch (e) {
        await logAction(workspaceId, {
          kind: 'webhook',
          status: 'failed',
          igCommentId: change.value.id,
          detail: `Error procesando comentario: ${e instanceof Error ? e.message : e}`,
        });
        results.push({ error: true });
      }
    }
  }

  // Meta exige 200 rápido; los detalles quedan en SocialActionLog
  return NextResponse.json({ ok: true, processed: results.length });
}
