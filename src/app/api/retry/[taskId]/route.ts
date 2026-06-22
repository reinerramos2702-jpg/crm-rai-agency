import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Queue } from 'bullmq';

export const runtime = 'nodejs';

/**
 * POST /api/retry/[taskId]
 *
 * Reinicia una task específica que esté en status 'paused' o 'failed'.
 *
 * Proceso:
 * 1. Verifica que la task existe y está en 'paused'/'failed'
 * 2. Resetea task.status = 'queued', limpia errorAgent y errorMessage
 * 3. Si la Execution estaba en 'paused', la pone en 'running'
 * 4. Re-encola el job en BullMQ
 * 5. Devuelve { success: true }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = params;

  // Verificar que la task existe y pertenece al usuario
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      execution: {
        include: {
          campaign: { select: { userId: true, masterJson: true, name: true } },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task no encontrada' }, { status: 404 });
  }

  if (task.execution.campaign.userId !== auth.userId) {
    return NextResponse.json({ error: 'Sin acceso a esta task' }, { status: 403 });
  }

  if (!['paused', 'failed'].includes(task.status)) {
    return NextResponse.json(
      { error: `No se puede reintentar una task en estado '${task.status}'` },
      { status: 400 }
    );
  }

  // 1. Resetear task
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'queued',
      errorAgent: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
  });

  // 2. Si la ejecución estaba paused, ponerla en running
  if (task.execution.status === 'paused') {
    await prisma.execution.update({
      where: { id: task.executionId },
      data: { status: 'running' },
    });
  }

  // 3. Re-encolar en BullMQ — usar URL directa para evitar conflicto de versiones ioredis
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return NextResponse.json({ error: 'REDIS_URL no configurada' }, { status: 500 });
  }
  const queue = new Queue('content-pipeline', {
    connection: { url: redisUrl, maxRetriesPerRequest: null },
  });

  await queue.add(
    'process-task',
    {
      taskId,
      executionId: task.executionId,
      userId: auth.userId,
    },
    {
      jobId: `retry-${taskId}-${Date.now()}`,
      attempts: 1,
      backoff: { type: 'fixed', delay: 1000 },
    }
  );

  await queue.close();

  return NextResponse.json({ success: true, taskId });
}
