'use client';

import { useCallback, useState } from 'react';
import type { ContentPlannerConfig } from '@/lib/content-planner-config';
import type { IgSession } from './useIgSession';
import { buildBrandContext, isCampaign, isRecord } from './utils';

const SERVER_ERROR = 'Hubo un error al procesar tu mensaje. Verifica que tu API key esté configurada en Claves IA.';
const NETWORK_ERROR = 'Error de conexión. Intenta de nuevo.';

/** Envío de mensajes al planificador IA. Las fallas se muestran como respuesta del asistente, dentro de la conversación. */
export function useIgChat(session: IgSession, config: ContentPlannerConfig) {
  const { chatMessages, setChatMessages, chatInput, setChatInput, selectedModel, uploadedPhotos, setActiveCampaign, setCampaigns } = session;
  const [loading, setLoading] = useState(false);

  const send = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user' as const, content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setLoading(true);
    const reply = (content: string) => setChatMessages((prev) => [...prev, { role: 'assistant' as const, content }]);
    try {
      const res = await fetch('/api/pipeline/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          model: selectedModel,
          brandContext: buildBrandContext(config, uploadedPhotos),
        }),
      });
      if (!res.ok) {
        reply(SERVER_ERROR);
        return;
      }
      const data: unknown = await res.json();
      if (!isRecord(data) || typeof data.reply !== 'string') {
        reply(SERVER_ERROR);
        return;
      }
      reply(data.reply);
      if (isCampaign(data.campaign)) {
        const campaign = data.campaign;
        setActiveCampaign(campaign);
        setCampaigns((prev) => [...prev, campaign]);
      }
    } catch {
      reply(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }, [chatInput, loading, chatMessages, selectedModel, config, uploadedPhotos, setChatMessages, setChatInput, setActiveCampaign, setCampaigns]);

  return { loading, send };
}
