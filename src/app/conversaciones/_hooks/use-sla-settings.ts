'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { sendJson } from '../_lib/conv-http';
import { parseMinutes } from '../_lib/conv-forms';
import { parseSettings } from '../_lib/conv-parse';
import type { SettingsState } from '../_lib/conv-types';
import { useTimedJson } from './use-timed-json';

/** Configuración del ANS (SLA) de respuesta. */
export function useSlaSettings() {
  const query = useTimedJson('/api/settings', { parse: parseSettings, ttlMs: 0 });
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (form: SettingsState): Promise<boolean> => {
    const first = parseMinutes(form.slaFirstResponseMins);
    const overdue = parseMinutes(form.slaOverdueMins);
    if (!first.ok || !overdue.ok) {
      toast.error('Los minutos deben ser números enteros entre 1 y 10 080, o quedar vacíos.');
      return false;
    }
    setSaving(true);
    const res = await sendJson('/api/settings', 'POST', {
      slaFirstResponseMins: first.value,
      slaOverdueMins: overdue.value,
      aiCountsAsResponse: form.aiCountsAsResponse,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.message);
      return false;
    }
    toast.success('Configuración guardada');
    return true;
  }, []);

  return { settings: query.data, loading: query.loading, error: query.error, refresh: query.refresh, saving, save };
}
