'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import toast from 'react-hot-toast';
import type { CompetitorInsights } from '@/lib/campaign-context';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Campaña existente reabierta con `?id=`. */
export interface LoadedCampaign {
  id: string;
  name: string;
  pipelineType?: string;
  llmProvider?: string;
  llmModel?: string;
  chatHistory: ChatMessage[];
  competitorInsights: CompetitorInsights | null;
  hasMaster: boolean;
}

/**
 * Identidad de la campaña en el servidor: crea una nueva al primer uso o
 * recupera una existente. `isNew` es null hasta leer la URL (solo en el cliente).
 */
export interface NewCampaignParams {
  name: string;
  pipelineType: string;
}

/**
 * `params` apunta siempre al nombre y pipeline vigentes del formulario (que se crea después
 * de este hook porque depende de `isNew`); se lee solo al crear la campaña.
 */
export function useCampaignSession(params: MutableRefObject<NewCampaignParams>) {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState<LoadedCampaign | null>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    idRef.current = campaignId;
  }, [campaignId]);

  useEffect(() => {
    const existingId = new URLSearchParams(window.location.search).get('id');
    if (!existingId) {
      setIsNew(true);
      return;
    }
    setIsNew(false);

    (async () => {
      try {
        const res = await fetch(`/api/campaigns/${existingId}`);
        if (!res.ok) {
          toast.error('No se pudo cargar la campaña existente.');
          return;
        }
        const data = await res.json();
        const c = data.campaign;
        if (!c) return;
        const master = c.masterJson as Record<string, unknown> | null;
        setCampaignId(c.id);
        setLoaded({
          id: c.id,
          name: c.name || '',
          pipelineType: c.pipelineType || undefined,
          llmProvider: c.llmProvider || undefined,
          llmModel: c.llmModel || undefined,
          chatHistory: Array.isArray(c.chatHistory) ? (c.chatHistory as ChatMessage[]) : [],
          competitorInsights: (master?.competitorInsights as CompetitorInsights | undefined) ?? null,
          hasMaster: master !== null && master !== undefined,
        });
        toast.success(`Continuando "${c.name}"`);
      } catch {
        toast.error('Error de red al cargar la campaña.');
      }
    })();
  }, []);

  /** Devuelve la campaña actual o crea una (exige nombre). */
  const ensureCampaign = useCallback(async (): Promise<string | null> => {
    if (idRef.current) return idRef.current;
    const { name, pipelineType } = params.current;
    if (!name.trim()) {
      toast.error('Escribe un nombre para la campaña');
      return null;
    }
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pipelineType }),
    });
    const data = await res.json();
    const id: string | undefined = data.campaign?.id;
    if (id) {
      idRef.current = id;
      setCampaignId(id);
    }
    return id ?? null;
  }, [params]);

  return { campaignId, isNew, loaded, ensureCampaign };
}
