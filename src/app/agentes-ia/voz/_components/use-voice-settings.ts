'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_VOICE_SETTINGS, parseStoredVoiceSettings, voiceSettingsKey, type VoiceSettings,
} from '@/lib/voice/settings';

/**
 * Ajustes de voz del workspace.
 * DEUDA: se guardan en este navegador (localStorage, solo dentro de efectos) porque el esquema
 * aún no tiene un campo JSON para ellos. Ver docs/planning/VOZ-RETELL-PLAN.md §9.
 */
export function saveVoiceSettings(workspaceId: string, settings: VoiceSettings): boolean {
  try {
    window.localStorage.setItem(voiceSettingsKey(workspaceId), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function useVoiceSettings(workspaceId: string | undefined) {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    try {
      setSettings(parseStoredVoiceSettings(window.localStorage.getItem(voiceSettingsKey(workspaceId))));
    } catch {
      setSettings(DEFAULT_VOICE_SETTINGS);
    }
    setLoaded(true);
  }, [workspaceId]);

  const save = useCallback(
    (next: VoiceSettings): boolean => {
      if (!workspaceId) return false;
      const ok = saveVoiceSettings(workspaceId, next);
      if (ok) setSettings(next);
      return ok;
    },
    [workspaceId],
  );

  return { settings, setSettings, loaded, save };
}
