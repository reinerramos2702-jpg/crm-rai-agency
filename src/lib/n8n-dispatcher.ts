/**
 * N8N DISPATCHER
 * ==============
 * Envía un payload a n8n cuando una Task se completa.
 *
 * n8n recibe el payload y decide:
 * - Si publicationMode = 'auto_instagram' → publica via Meta Graph API
 * - Si publicationMode = 'manual_push' → envía notificación push con assets
 */

export interface N8nTaskPayload {
  event: 'task.completed';
  taskId: string;
  dayNumber: number;
  publicationMode: 'auto_instagram' | 'manual_push' | 'schedule_only';
  assets: {
    video?: { url: string; r2Key: string };
    image?: { url: string; r2Key: string };
    voice?: { url: string; r2Key: string };
    music?: { url: string; r2Key: string };
  };
  copy: {
    caption?: string;
    hashtags?: string[];
    callToAction?: string;
    script?: string;
  };
  brand: {
    instagramHandle?: string;
    igPageId?: string;
  };
  scheduledFor?: string; // ISO datetime
  campaignName: string;
}

/**
 * Envía la tarea completada al webhook de n8n.
 * Falla silenciosamente si el webhook no está configurado.
 */
export async function dispatchToN8n(
  webhookUrl: string,
  payload: N8nTaskPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RAI-Source': 'content-engine',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000), // 15s timeout
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `n8n respondió ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return { ok: false, error: message };
  }
}
