import 'dotenv/config';
import { Worker } from 'bullmq';
import { getRedisConnection } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { processTask } from '@/agents/orchestrator';
import type { MasterJson } from '@/lib/master-json-schema';

/**
 * PIPELINE WORKER
 * ================
 * Procesa Jobs de la cola 'content-pipeline'.
 * Cada job = 1 Task (1 item del batch).
 *
 * Arrancar con: pnpm worker
 */

const worker = new Worker(
  'content-pipeline',
  async (job) => {
    const { taskId, executionId, userId } = job.data;
    console.log(`[worker] start task ${taskId} (exec ${executionId})`);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { campaign: true },
    });
    if (!execution) throw new Error(`Execution not found: ${executionId}`);

    // Re-checkpoint: si task ya está done, saltamos
    if (task.status === 'done') {
      console.log(`[worker] task ${taskId} already done, skipping`);
      return;
    }

    const master = execution.campaign.masterJson as unknown as MasterJson;
    const item = master.items.find((i) => i.id === (task.masterNode as any).id);
    if (!item) throw new Error(`Item not found in master for task ${taskId}`);

    // Update execution → running si estaba queued
    if (execution.status === 'queued') {
      await prisma.execution.update({
        where: { id: executionId },
        data: { status: 'running', startedAt: new Date() },
      });
    }

    await processTask({ userId, executionId, taskId, master, item });

    // Si todas las tasks de la exec están done → marcar exec completed
    const pending = await prisma.task.count({
      where: { executionId, status: { in: ['queued', 'running'] } },
    });
    if (pending === 0) {
      const failed = await prisma.task.count({
        where: { executionId, status: { in: ['failed', 'paused'] } },
      });
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: failed > 0 ? 'paused' : 'completed',
          finishedAt: new Date(),
        },
      });
    }
  },
  {
    connection: getRedisConnection() as any,
    concurrency: 3, // 3 tasks en paralelo por worker
  }
);

worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log('[worker] ready, listening on queue "content-pipeline"');
});

process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM, closing...');
  await worker.close();
  process.exit(0);
});
