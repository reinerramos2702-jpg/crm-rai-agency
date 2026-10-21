import { resolveApiKey } from '@/lib/llm-providers';
import { uploadAsset } from '@/lib/r2';
import type { AgentOutput, MasterJson, ContentItem } from '@/lib/master-json-schema';

/**
 * Genera voice-over a partir del guion final.
 * Soporta: 'elevenlabs', 'openai-tts'.
 */
export async function runAudioAgent(args: {
  workspaceId: string;
  executionId: string;
  taskId: string;
  master: MasterJson;
  item: ContentItem;
  copyOutput: any;
}): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  const { master, item, copyOutput } = args;
  const provider = master.modelConfig.audioAgent.ttsProvider;

  try {
    const text = extractDialogue(copyOutput);
    if (!text) {
      return {
        agent: 'audio',
        itemId: item.id,
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        data: { skipped: true, reason: 'no dialogue' },
        costUsd: 0,
      };
    }

    const { buffer, cost } = await synthesize(args.workspaceId, provider, text);
    const stored = await uploadAsset({
      body: buffer,
      contentType: 'audio/mpeg',
      executionId: args.executionId,
      taskId: args.taskId,
      kind: 'voice',
      ext: 'mp3',
    });

    return {
      agent: 'audio',
      itemId: item.id,
      status: 'ok',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { charCount: text.length },
      assets: [{ kind: 'voice', url: stored.publicUrl, metadata: { r2Key: stored.r2Key } }],
      costUsd: cost,
    };
  } catch (err: any) {
    return {
      agent: 'audio',
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

function extractDialogue(copyOutput: any): string {
  if (!copyOutput) return '';
  if (typeof copyOutput.script === 'string') return copyOutput.script;
  if (Array.isArray(copyOutput.scenes)) {
    return copyOutput.scenes.map((s: any) => s.dialogue).filter(Boolean).join(' ');
  }
  return '';
}

async function synthesize(
  workspaceId: string,
  provider: string,
  text: string
): Promise<{ buffer: Buffer; cost: number }> {
  if (provider === 'elevenlabs') {
    const apiKey = await resolveApiKey(workspaceId, 'elevenlabs');
    if (!apiKey) throw new Error('ElevenLabs key missing');
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // default; debería venir del brand profile
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, cost: (text.length / 1000) * 0.18 };
  }

  if (provider === 'openai-tts') {
    const apiKey = await resolveApiKey(workspaceId, 'openai');
    if (!apiKey) throw new Error('OpenAI key missing');
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: text,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS error: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, cost: text.length * (15 / 1_000_000) };
  }

  throw new Error(`Unknown TTS provider: ${provider}`);
}
