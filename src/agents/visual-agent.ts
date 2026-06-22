import { resolveApiKey } from '@/lib/llm-providers';
import { ingestUrl } from '@/lib/r2';
import type { AgentOutput, MasterJson, ContentItem } from '@/lib/master-json-schema';

/**
 * VISUAL AGENT — Generador de Imágenes
 * =====================================
 * Genera imágenes para cada escena del guion.
 *
 * Soporta múltiples proveedores según master.modelConfig.visualAgent.imageProvider:
 * - 'gemini': Gemini Imagen 3 (imagen-3.0-generate-001)
 * - 'openai': DALL-E 3 / gpt-image-1
 * - 'stabilityai': Stability AI API
 *
 * El selector en la UI actualiza master.modelConfig.visualAgent.imageProvider
 * El worker lee este campo y llama al proveedor correcto
 */
export async function runVisualAgent(args: {
  userId: string;
  executionId: string;
  taskId: string;
  master: MasterJson;
  item: ContentItem;
  copyOutput: Record<string, unknown>;
}): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  const { master, item, copyOutput } = args;
  const provider = master.modelConfig.visualAgent.imageProvider || 'gemini';

  try {
    const scenes =
      (copyOutput?.scenes as Array<{ id?: number; visualDirection?: string }>) ||
      [{ id: 0, visualDirection: item.visualBrief }];
    const assets: Array<{ kind: string; url: string; metadata?: Record<string, unknown> }> = [];
    let totalCost = 0;

    for (const scene of scenes) {
      const prompt = buildVisualPrompt(master, item, scene);
      const { url, cost } = await generateImage(args.userId, provider, prompt);

      const stored = await ingestUrl(url, {
        executionId: args.executionId,
        taskId: args.taskId,
        kind: 'image',
        ext: 'png',
        contentType: 'image/png',
      });

      assets.push({
        kind: 'image',
        url: stored.publicUrl,
        metadata: { sceneId: scene.id, r2Key: stored.r2Key, prompt },
      });
      totalCost += cost;
    }

    return {
      agent: 'visual',
      itemId: item.id,
      status: 'success',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { sceneCount: assets.length, provider },
      assets,
      costUsd: totalCost,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error en visual-agent';
    return {
      agent: 'visual',
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

function buildVisualPrompt(master: MasterJson, item: ContentItem, scene: { visualDirection?: string }): string {
  return `${scene.visualDirection || item.visualBrief}
Marca: ${master.brand.name}. Tono visual: ${master.brand.tone || 'premium, moderno'}.
Paleta: ${(master.brand.colors || []).join(', ') || 'libre'}.
Estilo fotorrealista, alta calidad, sin texto sobreimpreso salvo que se indique.`;
}

export async function generateImage(
  userId: string,
  provider: string,
  prompt: string
): Promise<{ url: string; cost: number }> {
  // ===== GEMINI IMAGEN 3 =====
  if (provider === 'gemini') {
    const apiKey = await resolveApiKey(userId, 'google');
    if (!apiKey) throw new Error('Google API key ausente para Imagen 3');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
          },
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Imagen 3 error: ${res.status} ${errText}`);
    }

    const data = await res.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('Imagen 4 no devolvió imagen');
    return { url: `data:image/png;base64,${b64}`, cost: 0.04 };
  }

  // ===== OPENAI gpt-image-1 / DALL-E 3 =====
  if (provider === 'openai') {
    const apiKey = await resolveApiKey(userId, 'openai');
    if (!apiKey) throw new Error('OpenAI API key ausente para imagen');

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
        n: 1,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI image error: ${res.status} ${errText}`);
    }

    const data = await res.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const item = data.data?.[0];
    if (!item) throw new Error('OpenAI no devolvió imagen');

    let url = item.url || '';
    if (!url && item.b64_json) {
      url = `data:image/png;base64,${item.b64_json}`;
    }
    return { url, cost: 0.04 };
  }

  // ===== STABILITY AI =====
  if (provider === 'stabilityai') {
    const apiKey = await resolveApiKey(userId, 'openai'); // usa slot openai temporalmente
    if (!apiKey) throw new Error('Stability AI API key ausente');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        output_format: 'png',
        aspect_ratio: '1:1',
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Stability AI error: ${res.status} ${errText}`);
    }

    const data = await res.json() as { image?: string };
    if (!data.image) throw new Error('Stability AI no devolvió imagen');
    return { url: `data:image/png;base64,${data.image}`, cost: 0.08 };
  }

  throw new Error(`Proveedor de imagen desconocido: ${provider}`);
}
