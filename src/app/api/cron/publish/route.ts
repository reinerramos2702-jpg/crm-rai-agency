import { NextRequest, NextResponse } from 'next/server';
import { runDuePosts } from '@/lib/publish-runner';
import { productionDeps } from '@/lib/schedule-runtime';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || !auth) return false;
  const a = Buffer.from(auth);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET|POST /api/cron/publish — publica los posts programados cuya hora llegó.
 * Lo invoca GitHub Actions (.github/workflows/publish-scheduled.yml) cada 15 min.
 * Protegido con `Authorization: Bearer <CRON_SECRET>`; sin secreto configurado → 401.
 */
async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const deps = productionDeps();
  const summary = await runDuePosts(deps);
  return NextResponse.json({ ok: true, mode: deps.mode, ...summary, ranAt: new Date().toISOString() });
}
export const GET = handle;
export const POST = handle;
