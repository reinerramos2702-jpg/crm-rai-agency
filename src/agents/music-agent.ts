import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { ingestUrl } from '@/lib/r2';
import type { AgentOutput, MasterJson, ContentItem } from '@/lib/master-json-schema';

/**
 * Música de fondo opcional. Soporta Suno API (no oficial).
 * Si no hay key de Suno, retorna skipped.
 * VERIFY: Suno API es no oficial; verificar provider actual antes de prod.
 */
export async function runMusicAgent(args: {
  userId: string;
  executionId: string;
  taskId: string;
  master: MasterJson;
  item: ContentItem;
  copyOutput: any;
}): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  const { master, item } = args;

  if (!master.modelConfig.musicAgent) {
    return {
      agent: 'music',
      itemId: item.id,
      status: 'ok',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { skipped: true, reason: 'music agent not configured' },
      costUsd: 0,
    };
  }

  try {
    const stored = await prisma.apiKey.findFirst({
      where: { userId: args.userId, provider: 'suno', validated: true },
    });
    if (!stored) {
      return {
        agent: 'music',
        itemId: item.id,
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        data: { skipped: true, reason: 'no suno key' },
        costUsd: 0,
      };
    }

    const apiKey = decrypt(stored.ciphertext, stored.iv, stored.authTag);
    const musicPrompt = buildMusicPrompt(master, item, args.copyOutput);

    // VERIFY: este endpoint es ilustrativo; cambiar al gateway real de Suno
    const res = await fetch('https://api.sunoapi.com/api/v1/suno/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: musicPrompt, make_instrumental: true, wait_audio: true }),
    });
    if (!res.ok) throw new Error(`Suno error: ${res.status}`);
    const data = await res.json();
    const audioUrl = data?.[0]?.audio_url || data?.audio_url;
    if (!audioUrl) throw new Error('Suno no audio_url');

    const stored2 = await ingestUrl(audioUrl, {
      executionId: args.executionId,
      taskId: args.taskId,
      kind: 'music',
      ext: 'mp3',
      contentType: 'audio/mpeg',
    });

    return {
      agent: 'music',
      itemId: item.id,
      status: 'ok',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { prompt: musicPrompt },
      assets: [{ kind: 'music', url: stored2.publicUrl, metadata: { r2Key: stored2.r2Key } }],
      costUsd: 0.25,
    };
  } catch (err: any) {
    return {
      agent: 'music',
      itemId: item.id,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: {},
      costUsd: 0,
      errorMessage: err.message,
    };
  }
}

function buildMusicPrompt(master: MasterJson, item: ContentItem, copyOutput: any): string {
  const mood = copyOutput?.hook ? `mood que acompañe: ${copyOutput.hook}` : '';
  return `Música instrumental ${master.brand.tone || 'moderna'}, energía media, sin vocales. ${mood}`;
}
