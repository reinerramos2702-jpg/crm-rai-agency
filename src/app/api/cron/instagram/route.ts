import { NextRequest, NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/instagram';

export const runtime = 'nodejs';
export const maxDuration = 60; // límite plan Hobby de Vercel
export const dynamic = 'force-dynamic';

/**
 * Tick del publicador: publica los posts programados vencidos.
 *
 * Se invoca de dos formas:
 *  1. n8n (scheduler principal, cada 5 min):
 *     HTTP GET https://<app>.vercel.app/api/cron/instagram?secret=<CRON_SECRET>
 *  2. Vercel Cron (respaldo diario en plan Hobby): manda header
 *     Authorization: Bearer <CRON_SECRET> automáticamente.
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secret configurado, endpoint cerrado
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === secret) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const summary = await processScheduledPosts(5);
    return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
