'use client';

import { useCallback, useState } from 'react';
import { EMPTY_CONFIG, type ContentPlannerConfig } from '@/lib/content-planner-config';
import { useContentPlannerSync, type SyncStatus } from '../useContentPlannerSync';
import type { ConfigSetter } from './types';

const SYNC_LABELS: Record<SyncStatus, string> = {
  loading: 'Cargando configuración…',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'No se pudo guardar. Revisa tu conexión o permisos.',
  idle: 'Los cambios se guardan solos',
};

/** Configuración del planificador: vive en la BD de la empresa y se guarda con retraso (debounce). */
export function useIgConfig() {
  const [config, setConfig] = useState<ContentPlannerConfig>(EMPTY_CONFIG);
  const { status, ready, saveNow } = useContentPlannerSync(config, setConfig);
  const setField: ConfigSetter = useCallback((key, value) => setConfig((c) => ({ ...c, [key]: value })), []);
  return { config, setField, syncStatus: status, syncLabel: SYNC_LABELS[status], configReady: ready, saveNow };
}
