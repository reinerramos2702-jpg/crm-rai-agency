'use client';

import { useCallback, useRef, useState } from 'react';
import { invalidate } from '@/lib/swr-cache';
import {
  composeAgentPayload,
  toVoiceLocalConfig,
  voiceConfigKey,
  type AgentKind,
  type ChatDraft,
  type VoiceDraft,
} from '@/lib/agent-wizard';

export type CreateState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'done'; agentId: string; warning?: string }
  | { status: 'error'; message: string };

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function apiError(res: Response): Promise<string> {
  const err: { error?: string } = await res.json().catch(() => ({}));
  return err.error || `Error del servidor (${res.status})`;
}

/**
 * Crea el agente con las APIs existentes: POST (borrador) y, en paralelo, PATCH con la
 * configuración completa y un POST por cada base de conocimiento vinculada.
 * Si falla a medias, reintentar reutiliza el agente ya creado (sin duplicarlo).
 */
export function useCreateAgent(kind: AgentKind) {
  const [state, setState] = useState<CreateState>({ status: 'idle' });
  const createdId = useRef<string | null>(null);

  const create = useCallback(
    async (draft: ChatDraft | VoiceDraft): Promise<boolean> => {
      setState({ status: 'creating' });
      try {
        if (!createdId.current) {
          const res = await fetch('/api/ai-agents', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ kind, name: draft.name.trim() }) });
          if (!res.ok) throw new Error(await apiError(res));
          const data: { agent: { id: string } } = await res.json();
          createdId.current = data.agent.id;
        }
        const id = createdId.current;
        const [patch, ...links] = await Promise.all([
          fetch(`/api/ai-agents/${id}`, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(composeAgentPayload(kind, draft)) }),
          ...draft.kbIds.map((knowledgeBaseId) =>
            fetch(`/api/ai-agents/${id}/triggers`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ knowledgeBaseId }) }),
          ),
        ]);
        if (!patch.ok) throw new Error(await apiError(patch));
        const failedLinks = links.filter((r) => !r.ok && r.status !== 409).length;

        if (kind === 'voice') {
          try {
            window.localStorage.setItem(voiceConfigKey(id), JSON.stringify(toVoiceLocalConfig(draft as VoiceDraft)));
          } catch {
            // Sin almacenamiento local: la vista previa de voz simplemente no se recordará.
          }
        }
        invalidate('/api/ai-agents');
        setState({
          status: 'done',
          agentId: id,
          warning: failedLinks ? `No se pudieron vincular ${failedLinks} base(s) de conocimiento; puedes hacerlo en la pestaña «Entrenamiento del bot».` : undefined,
        });
        return true;
      } catch (e: unknown) {
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Error de red: no se pudo contactar al servidor.' });
        return false;
      }
    },
    [kind],
  );

  return { state, create };
}
