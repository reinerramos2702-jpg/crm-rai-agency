import { resolveApiKey } from '@/lib/llm-providers';
import { ingestUrl } from '@/lib/r2';
import type { AgentOutput, MasterJson, ContentItem } from '@/lib/master-json-schema';

/**
 * VIDEO AGENT — Gemini Veo 2
 * ==========================
 * Genera video con Google Veo 2 (long-running operation).
 *
 * Flujo:
 * 1. Toma el script del copy-agent y las imágenes del visual-agent
 * 2. Construye un prompt de video detallado
 * 3. Llama a Veo 2 con polling (operación long-running)
 * 4. Sube el video resultante a R2
 * 5. Devuelve AgentOutput con la URL de R2
 *
 * Si Veo 2 no está disponible, intenta fallback con modelo alternativo.
 * Para pipelines sin video (static_ads, carousel) retorna skipped.
 */
export async function runVideoAgent(args: {
  userId: string;
  executionId: string;
  taskId: string;
  master: MasterJson;
  item: ContentItem;
  copyOutput: Record<string, unknown>;
  visualOutput: AgentOutput;
  audioOutput: AgentOutput;
}): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  const { master, item } = args;

  // Pipelines sin video: retornar skipped
  if (item.pipelineType === 'static_ads' || item.pipelineType === 'carousel') {
    return {
      agent: 'video',
      itemId: item.id,
      status: 'skipped',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { skipped: true, reason: 'pipeline sin etapa de video' },
      costUsd: 0,
    };
  }

  try {
    const apiKey = await resolveApiKey(args.userId, 'google');
    if (!apiKey) throw new Error('Google API key ausente para Veo');

    const prompt = buildVeoPrompt(master, item, args.copyOutput, args.visualOutput);
    const durationSec = item.durationSec || 8;
    const referenceImageB64 = extractFirstImageB64(args.visualOutput);

    // Determinar proveedor de video desde modelConfig
    const videoProvider = master.modelConfig.videoAgent?.provider || 'gemini';
    
    if (videoProvider === 'gemini') {
      return await runVeo2(
        apiKey,
        prompt,
        durationSec,
        referenceImageB64,
        args,
        item,
        startedAt
      );
    }

    // Fallback: si el proveedor no es gemini, retornar skipped con mensaje
    return {
      agent: 'video',
      itemId: item.id,
      status: 'skipped',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { skipped: true, reason: `Proveedor ${videoProvider} no implementado aún` },
      costUsd: 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido en video-agent';
    return {
      agent: 'video',
      itemId: item.id,
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: {},
      costUsd: 0,
      errorMessage: message,
    };
  }
}

/**
 * Genera video con Gemini Veo 2 usando operación long-running.
 * Endpoint: POST /v1beta/models/veo-2.0-generate-001:predictLongRunning
 */
async function runVeo2(
  apiKey: string,
  prompt: string,
  durationSec: number,
  referenceImageB64: string | null,
  args: Parameters<typeof runVideoAgent>[0],
  item: ContentItem,
  startedAt: string
): Promise<AgentOutput> {
  // Iniciar generación de video (long-running operation)
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [
          {
            prompt,
            ...(referenceImageB64
              ? { image: { bytesBase64Encoded: referenceImageB64, mimeType: 'image/png' } }
              : {}),
          },
        ],
        parameters: {
          aspectRatio: '9:16',  // vertical para Instagram Reels
          durationSeconds: durationSec,
          generateAudio: true,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`Veo 2 start failed: ${startRes.status} ${errText}`);
  }

  const startData = await startRes.json() as { name?: string };
  const opName = startData.name;
  if (!opName) throw new Error('Veo 2 no devolvió nombre de operación');

  // Polling: hasta ~5 minutos con intervalos de 5 segundos
  let videoUri: string | null = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const pollData = await pollRes.json() as {
      done?: boolean;
      response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } };
    };

    if (pollData.done) {
      videoUri =
        pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        null;
      if (!videoUri) {
        throw new Error(`Veo 2 completó sin URI de video: ${JSON.stringify(pollData)}`);
      }
      break;
    }
  }

  if (!videoUri) throw new Error('Timeout esperando Veo 2 (5 minutos)');

  // Descargar y subir a Cloudflare R2
  const stored = await ingestUrl(`${videoUri}&key=${apiKey}`, {
    executionId: args.executionId,
    taskId: args.taskId,
    kind: 'video',
    ext: 'mp4',
    contentType: 'video/mp4',
  });

  return {
    agent: 'video',
    itemId: item.id,
    status: 'success',
    startedAt,
    finishedAt: new Date().toISOString(),
    data: { durationSec, opName },
    assets: [{ kind: 'video', url: stored.publicUrl, metadata: { r2Key: stored.r2Key } }],
    costUsd: durationSec * 0.4, // estimado de costo por segundo de Veo
  };
}

function buildVeoPrompt(
  master: MasterJson,
  item: ContentItem,
  copyOutput: Record<string, unknown>,
  visualOutput: AgentOutput
): string {
  const dialogue =
    (copyOutput?.scenes as Array<{ dialogue?: string }>)?.[0]?.dialogue ||
    (copyOutput?.script as string) ||
    item.scriptBrief;

  const visualStyle = (visualOutput?.data as Record<string, unknown>)?.style || 'fotorrealista';

  return `${item.visualBrief}
Diálogo/Narración: "${dialogue}"
Marca: ${master.brand.name}. Tono: ${master.brand.tone || 'natural, auténtico'}.
Estilo visual: ${visualStyle}.
Cámara: handheld fluida, iluminación natural cálida.
Formato: vertical 9:16 para Instagram Reels.
Sin texto sobreimpreso salvo que el brief lo indique.`;
}

function extractFirstImageB64(visualOutput: AgentOutput): string | null {
  const url = visualOutput?.assets?.[0]?.url;
  if (!url || !url.startsWith('data:')) return null;
  return url.split(',')[1] || null;
}
