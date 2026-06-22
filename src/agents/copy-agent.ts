import { generateText } from 'ai';
import { getLLM } from '@/lib/llm-providers';
import type { AgentOutput } from '@/lib/master-json-schema';
import type { MasterJson, ContentItem } from '@/lib/master-json-schema';

const SYSTEM_PROMPT = `Eres el Agente de Copy del pipeline de RAI Agency.
Tu única tarea: convertir un brief en un guion final listo para grabación.

REGLAS:
- Output en JSON estricto, sin markdown.
- Respeta la voz y tono de la marca al pie de la letra.
- Para UGC y Avatar Reel: diálogo natural conversacional, máximo 30s leído en voz normal (~80 palabras).
- Para anuncios estáticos: copy corto, headline + body + CTA.
- Para carruseles: array de slides, cada slide con título + cuerpo breve.
- Nunca uses emojis salvo que la marca los pida.
- Castellano impecable.

FORMATO OUTPUT:
{
  "script": string | string[] | { headline: string, body: string, cta: string },
  "scenes": [{ "id": number, "duration": number, "dialogue": string, "visualDirection": string }],
  "hook": string,
  "wordCount": number
}`;

export async function runCopyAgent(args: {
  userId: string;
  master: MasterJson;
  item: ContentItem;
}): Promise<AgentOutput> {
  const startedAt = new Date().toISOString();
  const { master, item } = args;
  const { provider, modelId } = master.modelConfig.copyAgent;

  try {
    const model = await getLLM(args.userId, provider as any, modelId);

    const userPrompt = `MARCA: ${JSON.stringify(master.brand)}
TIPO DE PIPELINE: ${item.pipelineType}
ÁNGULO: ${item.angle}
OBJETIVO: ${item.goal || 'awareness'}
BRIEF DE GUIÓN: ${item.scriptBrief}
BRIEF VISUAL: ${item.visualBrief}
DURACIÓN OBJETIVO: ${item.durationSec || 30}s

Genera el guion final estructurado en JSON.`;

    const { text, usage } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxTokens: 1500,
    });

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    // Costo aproximado (depende del modelo; calculado fuera mejor)
    const costUsd = 0.001; // placeholder; mejor calcular con usage.totalTokens × tabla

    return {
      agent: 'copy',
      itemId: item.id,
      status: 'ok',
      startedAt,
      finishedAt: new Date().toISOString(),
      data: { ...parsed, tokenUsage: usage },
      costUsd,
    };
  } catch (err: any) {
    return {
      agent: 'copy',
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
