'use client';

import { useCallback } from 'react';
import { useCachedJson } from '@/lib/use-cached-json';
import { getCached } from '@/lib/swr-cache';
import { requestJson, updateCached } from './api';
import { SETTINGS_URL, type SettingsPayload, type SettingsT } from './types';

/** Ajustes del motor (interruptor general, correo de alertas) con cambios optimistas. */
export function useAutomationSettings() {
  const { data, loading, error, refresh } = useCachedJson<SettingsPayload>(SETTINGS_URL, { ttlMs: 15_000 });

  const settings: SettingsT | null = data
    ? {
        automationsEnabled: data.settings?.automationsEnabled ?? true,
        automationNotifyEmail: data.settings?.automationNotifyEmail ?? null,
        n8nWebhookUrl: data.settings?.n8nWebhookUrl ?? null,
      }
    : null;

  const save = useCallback(async (patch: Partial<SettingsT>) => {
    const previous = getCached<SettingsPayload>(SETTINGS_URL)?.data.settings ?? null;
    updateCached<SettingsPayload>(SETTINGS_URL, (current) => ({ ...current, settings: { ...current.settings, ...patch } }));
    try {
      await requestJson(SETTINGS_URL, 'POST', patch);
    } catch (e) {
      updateCached<SettingsPayload>(SETTINGS_URL, (current) => ({ ...current, settings: previous }));
      throw e;
    }
  }, []);

  return { settings, loading, error, refresh, save };
}
