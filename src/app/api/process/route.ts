import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPipelineQueue } from '@/lib/redis';
import { estimateExecutionCost, enforceHardCap } from '@/lib/cost-estimator';
import { MasterJson } from '@/lib/master-json-schema';

export const runtime = 'nodejs';

/**
 * POST /api/process
 * Body: { campaignId, confirmedCostUsd? }
 *
 * - Lee Master JSON.
 * - Calcula costo estimado.
 * - Si > hard cap y no hay confirmación → 412 Precondition Failed.
 * - Crea Execution + N Tasks + N Jobs en cola.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const queue = getPipelineQueue();
  const { campaignId, confirmedCostUsd } = await req.json();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId: auth.userId },
  });
  if (!campaign?.masterJson) return new Response('Campaign not ready', { status: 400 });

  const master = MasterJson.parse(campaign.masterJson);
  const { totalUsd, breakdown } = estimateExecutionCost(master);
  const cap = enforceHardCap(totalUsd);

  if (!cap.ok && (confirmedCostUsd === undefined || confirmedCostUsd < totalUsd)) {
    return new Response(
      JSON.stringify({
        error: 'hard_cap_exceeded',
        estimatedUsd: totalUsd,
        cap: cap.cap,
        breakdown,
        message: 'Confirma el costo enviando confirmedCostUsd >= estimatedUsd',
      }),
      { status: 412, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const execution = await prisma.execution.create({
    data: {
      campaignId,
      userId: auth.userId,
      status: 'queued',
      estimatedCostUsd: totalUsd,
      hardCapUsd: cap.cap,
    },
  });

  // Crear N Tasks + jobs
  const tasks = await Promise.all(
    master.items.map((item, idx) =>
      prisma.task.create({
        data: {
          executionId: execution.id,
          index: idx,
          masterNode: item as any,
          status: 'queued',
        },
      })
    )
  );

  await Promise.all(
    tasks.map((task) =>
      queue.add(
        `task-${task.id}`,
        { taskId: task.id, executionId: execution.id, userId: auth.userId },
        { jobId: task.id }
      )
    )
  );

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'processing' },
  });

  return Response.json({
    executionId: execution.id,
    estimatedCostUsd: totalUsd,
    breakdown,
    tasksQueued: tasks.length,
  });
}
