'use client';

import { useCallback, useState } from 'react';
import {
  CAMPAIGN_DRAFT_KEY,
  INITIAL_CAMPAIGN_DRAFT,
  isCampaignDraft,
  type CampaignDraft,
} from '@/lib/campaign-draft';
import { EMPTY_BRIEF, type BriefKey } from '@/lib/campaign-brief';
import { PROVIDERS } from '@/lib/campaign-new-options';
import { useDraft } from '@/lib/use-draft';

/** Campos que se pueden cambiar de golpe (plantillas, preajustes, reutilización). */
export type FormPatch = Partial<CampaignDraft>;

/**
 * Estado del formulario de configuración + borrador autoguardado.
 * `enabled` se activa solo en campañas nuevas, tras leer la URL (nunca en el render).
 */
export function useCampaignForm(enabled: boolean) {
  const [form, setForm] = useState<CampaignDraft>(INITIAL_CAMPAIGN_DRAFT);
  const brief = form.brief ?? EMPTY_BRIEF;

  const draft = useDraft(CAMPAIGN_DRAFT_KEY, form, {
    initial: INITIAL_CAMPAIGN_DRAFT,
    validate: isCampaignDraft,
    enabled,
  });

  const setField = useCallback(<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const apply = useCallback((patch: FormPatch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const setBriefField = useCallback((key: BriefKey, value: string) => {
    setForm((prev) => ({ ...prev, brief: { ...(prev.brief ?? EMPTY_BRIEF), [key]: value } }));
  }, []);

  /** Al cambiar de proveedor, el modelo vuelve al primero de su lista. */
  const changeProvider = useCallback((next: string) => {
    const first = PROVIDERS.find((x) => x.provider === next)?.models[0];
    setForm((prev) => ({ ...prev, provider: next, ...(first ? { modelId: first } : {}) }));
  }, []);

  const { recovered, acceptRecovered } = draft;
  const restoreDraft = useCallback(() => {
    if (!recovered) return;
    const d = recovered.data;
    setForm({ ...d, brief: d.brief ?? EMPTY_BRIEF });
    acceptRecovered();
  }, [recovered, acceptRecovered]);

  return {
    form,
    brief,
    setField,
    apply,
    setBriefField,
    changeProvider,
    recovered: draft.recovered,
    savedAt: draft.savedAt,
    restoreDraft,
    discardRecovered: draft.discardRecovered,
    clearDraft: draft.clear,
  };
}

export type CampaignForm = ReturnType<typeof useCampaignForm>;
