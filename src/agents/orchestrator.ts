import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { publishEvent } from '@/lib/redis';
import { runCopyAgent } from '@/agents/copy-agent';
import { runVisualAgent } from '@/agents/visual-agent';
import { runAudioAgent } from '@/agents/audio-agent';
import { runVideoAgent } from '@/agents/video-agent';
import { runMusicAgent } from '@/agents/music-agent';
import { dispatchToN8n } from '@/lib/n8n-dispatcher';
import type { MasterJson, ContentItem, AgentOutput } from '@/lib/master-json-schema';

/**
 * ORQUESTADOR
 * ============
 * DAG explícito por Item:
 *
 *   Copy ─┬─> Visual ─┐
 *         └─> Audio ──┴─> Video ──> Music
 *
 * - Copy es raíz (cascada obligada).
 * - Visual y Audio corren en paralelo después de Copy.
 * - Video depende de Visual + Audio.
 * - Music corre al final, en paralelo con cierre (opcional).
 *
 * En fallos: PAUSA la task, emite evento, deja Execution en 'paused'.
 * Decisión humana desde la UI: retry o abort.
 *
 * Al completar: envía payload a n8n si está configurado.
 */

export async function processTask(args: {
  userId: string;
  executionId: string;
  taskId: string;
  master: MasterJson;
  item: ContentItem;
}) {
  const { executionId, taskId, item } = args;

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'running', startedAt: new Date() },
  });

  const outputs: Record<string, AgentOutput> = {};

  // ============ 1. COPY (cascada) ============
  await emit(executionId, taskId, 'agent.started', 'copy');
  const copy = await runCopyAgent({ userId: args.userId, master: args.master, item });
  outputs.copy = copy;
  await persistAgent(taskId, copy);
  if (copy.status === 'failed') return pauseTask(executionId, taskId, 'copy', copy.errorMessage!);

  // ============ 2. VISUAL + AUDIO (paralelo) ============
  await emit(executionId, taskId, 'agent.started', 'visual');
  await emit(executionId, taskId, 'agent.started', 'audio');

  const [visual, audio] = await Promise.all([
    runVisualAgent({
      userId: args.userId,
      executionId,
      taskId,
      master: args.master,
      item,
      copyOutput: (copy.data || {}) as Record<string, unknown>,
    }),
    runAudioAgent({
      userId: args.userId,
      executionId,
      taskId,
      master: args.master,
      item,
      copyOutput: copy.data,
    }),
  ]);

  outputs.visual = visual;
  outputs.audio = audio;
  await persistAgent(taskId, visual);
  await persistAgent(taskId, audio);
  if (visual.status === 'failed') return pauseTask(executionId, taskId, 'visual', visual.errorMessage!);
  if (audio.status === 'failed') return pauseTask(executionId, taskId, 'audio', audio.errorMessage!);

  // ============ 3. VIDEO (depende de Visual + Audio) ============
  await emit(executionId, taskId, 'agent.started', 'video');
  const video = await runVideoAgent({
    userId: args.userId,
    executionId,
    taskId,
    master: args.master,
    item,
    copyOutput: (copy.data || {}) as Record<string, unknown>,
    visualOutput: visual,
    audioOutput: audio,
  });
  outputs.video = video;
  await persistAgent(taskId, video);
  if (video.status === 'failed') return pauseTask(executionId, taskId, 'video', video.errorMessage!);

  // ============ 4. MUSIC (opcional, paralelo final) ============
  if (args.master.modelConfig.musicAgent) {
    await emit(executionId, taskId, 'agent.started', 'music');
    const music = await runMusicAgent({
      userId: args.userId,
      executionId,
      taskId,
      master: args.master,
      item,
      copyOutput: copy.data,
    });
    outputs.music = music;
    await persistAgent(taskId, music);
    // Music no bloquea; si falla solo se omite
  }

  // ============ Cierre OK ============
  const totalCost = Object.values(outputs).reduce((s, o) => s + (o.costUsd || 0), 0);
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'done', finishedAt: new Date(), costUsd: totalCost },
  });
  await emit(executionId, taskId, 'task.completed', undefined, { totalCost });

  // ============ Dispatch a n8n (si configurado y task exitosa) ============
  const webhookUrl = args.master.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL;
  if (webhookUrl) {
    // Buscar nombre de campaña
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { campaign: { select: { name: true } } },
    });

    // Construir payload de n8n
    const itemData = item as ContentItem & {
      publicationMode?: string;
      scheduledFor?: string;
      callToAction?: string;
      hashtags?: string[];
      caption?: string;
    };

    const copyData = (copy.data || {}) as {
      script?: string;
      caption?: string;
      hashtags?: string[];
    };

    const n8nPayload = {
      event: 'task.completed' as const,
      taskId,
      dayNumber: (itemData as { dayNumber?: number }).dayNumber || 0,
      publicationMode: (itemData.publicationMode || 'manual_push') as
        'auto_instagram' | 'manual_push' | 'schedule_only',
      assets: {
        video: video.assets?.[0]
          ? { url: video.assets[0].url, r2Key: (video.assets[0].metadata?.r2Key as string) || '' }
          : undefined,
        image: visual.assets?.[0]
          ? { url: visual.assets[0].url, r2Key: (visual.assets[0].metadata?.r2Key as string) || '' }
          : undefined,
        voice: audio.assets?.[0]
          ? { url: audio.assets[0].url, r2Key: (audio.assets[0].metadata?.r2Key as string) || '' }
          : undefined,
        music: outputs.music?.assets?.[0]
          ? { url: outputs.music.assets[0].url, r2Key: (outputs.music.assets[0].metadata?.r2Key as string) || '' }
          : undefined,
      },
      copy: {
        caption: itemData.caption || copyData.caption,
        hashtags: itemData.hashtags || copyData.hashtags,
        callToAction: itemData.callToAction,
        script: copyData.script,
      },
      brand: {
        instagramHandle: args.master.brand.instagramHandle,
        igPageId: args.master.igPageId,
      },
      scheduledFor: itemData.scheduledFor,
      campaignName: execution?.campaign?.name || 'Campaña RAI',
    };

    // Despachar silenciosamente (no bloquear si falla)
    dispatchToN8n(webhookUrl, n8nPayload).catch((err: Error) => {
      console.error('[orchestrator] Error dispatching a n8n:', err.message);
    });
  }
}

async function persistAgent(taskId: string, output: AgentOutput) {
  // Append-only: leemos JSON actual y agregamos
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  const current = (task?.outputJson as Record<string, unknown>) || {};
  current[output.agent] = output;
  await prisma.task.update({
    where: { id: taskId },
    data: { outputJson: current as unknown as Prisma.InputJsonValue, costUsd: { increment: output.costUsd || 0 } },
  });

  // Persistir assets a tabla Asset
  if (output.assets) {
    for (const a of output.assets) {
      await prisma.asset.create({
        data: {
          taskId,
          kind: a.kind,
          agentName: output.agent,
          r2Key: (a.metadata?.r2Key as string) || '',
          publicUrl: a.url,
          metadata: (a.metadata as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    }
  }

  // Persistir evento de asset.ready si hubo assets
  if (output.assets?.length) {
    for (const a of output.assets) {
      const exec = await prisma.task.findUnique({ where: { id: taskId } });
      if (exec) {
        await prisma.event.create({
          data: {
            executionId: exec.executionId,
            taskId,
            type: 'asset.ready',
            agentName: output.agent,
            payload: { kind: a.kind, url: a.url } as unknown as Prisma.InputJsonValue,
          },
        });
        await publishEvent(exec.executionId, {
          type: 'asset.ready',
          agentName: output.agent,
          taskId,
          payload: { kind: a.kind, url: a.url },
        });
      }
    }
  }
}

async function emit(
  executionId: string,
  taskId: string,
  type: string,
  agentName?: string,
  payload: Record<string, unknown> = {}
) {
  await prisma.event.create({
    data: { executionId, taskId, type, agentName, payload: payload as unknown as Prisma.InputJsonValue },
  });
  await publishEvent(executionId, { type, agentName, taskId, payload });
}

async function pauseTask(
  executionId: string,
  taskId: string,
  failedAgent: string,
  errorMessage: string
) {
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'paused', errorAgent: failedAgent, errorMessage, finishedAt: new Date() },
  });
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: 'paused' },
  });
  await emit(executionId, taskId, 'execution.paused', failedAgent, { errorMessage });
  throw new Error(`Task pausada en ${failedAgent}: ${errorMessage}`);
}
