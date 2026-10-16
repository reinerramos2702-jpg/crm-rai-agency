'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PRESETS_KEY,
  parsePresets,
  removePreset,
  serializePresets,
  upsertPreset,
  type CampaignPreset,
} from '@/lib/campaign-presets';

/** Preajustes en localStorage: la lectura ocurre en un efecto para no romper la hidratación. */
export function useCampaignPresets() {
  const [presets, setPresets] = useState<CampaignPreset[]>([]);

  useEffect(() => {
    try {
      setPresets(parsePresets(localStorage.getItem(PRESETS_KEY)));
    } catch {
      // Almacenamiento bloqueado: se trabaja sin preajustes.
    }
  }, []);

  const persist = useCallback((next: CampaignPreset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, serializePresets(next));
    } catch {
      // Sin espacio o bloqueado: el cambio vale solo para esta sesión.
    }
  }, []);

  const save = useCallback((preset: CampaignPreset) => persist(upsertPreset(presets, preset)), [persist, presets]);
  const remove = useCallback((id: string) => persist(removePreset(presets, id)), [persist, presets]);

  return { presets, save, remove };
}
