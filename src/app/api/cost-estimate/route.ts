import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { estimateExecutionCost, enforceHardCap } from '@/lib/cost-estimator';
import { MasterJson } from '@/lib/master-json-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cost-estimate?campaignId=xxx
 * Devuelve estimado antes de procesar.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const campaignId = new URL(req.url).searchParams.get('campaignId');
  if (!campaignId) return new Response('campaignId required', { status: 400 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: auth.userId },
  });
  if (!campaign?.masterJson) return new Response('Master JSON not ready', { status: 400 });

  const master = MasterJson.parse(campaign.masterJson);
  const estimate = estimateExecutionCost(master);
  const cap = enforceHardCap(estimate.totalUsd);

  return Response.json({
    estimatedUsd: estimate.totalUsd,
    breakdown: estimate.breakdown,
    hardCap: cap.cap,
    withinCap: cap.ok,
  });
}
