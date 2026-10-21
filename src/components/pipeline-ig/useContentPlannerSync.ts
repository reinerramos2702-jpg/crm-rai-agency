'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import {
  DEFAULT_PUBLISH_TIME,
  EMPTY_CONFIG,
  type ContentPlannerConfig,
} from '@/lib/content-planner-config';

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

const ENDPOINT = '/api/content-planner/config';
const LEGACY_PREFIX = 'rai-ig-';
const LEGACY_DEFAULT_HANDLE = '@Hotel_mpv'; // valor por defecto antiguo de OTRO negocio
const LEGACY_DEFAULT_TIME = '20:47';
const DEBOUNCE_MS = 800;

/** Zona horaria del navegador (el CM programa en su hora local). */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || EMPTY_CONFIG.timezone;
  } catch {
    return EMPTY_CONFIG.timezone;
  }
}

function legacyKey(k: string) {
  return LEGACY_PREFIX + k;
}

/** Claves de config que antes vivían en localStorage (sin fotos/chat/campañas: siguen locales). */
const LEGACY_KEYS = Object.keys(EMPTY_CONFIG).filter((k) => k !== 'timezone');

function readLegacy(): Partial<ContentPlannerConfig> | null {
  if (typeof window === 'undefined') return null;
  const found: Record<string, unknown> = {};
  let hasContent = false;
  try {
    for (const k of LEGACY_KEYS) {
      const raw = localStorage.getItem(legacyKey(k));
      if (raw === null) continue;
      let v: unknown;
      try {
        v = JSON.parse(raw);
      } catch {
        continue;
      }
      if (k === 'igHandle' && v === LEGACY_DEFAULT_HANDLE) continue;
      if (k === 'publishTime' && v === LEGACY_DEFAULT_TIME) continue;
      found[k] = v;
      if (
        (typeof v === 'string' && v.trim() !== '' && !['brandTone', 'photoMode', 'logoMode', 'publishTime'].includes(k)) ||
        (Array.isArray(v) && v.length > 0)
      ) {
        hasContent = true;
      }
    }
  } catch {
    return null;
  }
  return hasContent ? (found as Partial<ContentPlannerConfig>) : null;
}

function clearLegacy() {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(legacyKey(k));
  } catch {
    /* almacenamiento bloqueado: no es crítico */
  }
}

/**
 * Sincroniza la config del planificador con la BD de la empresa activa.
 * - Carga al montar y llama `hydrate` con la config completa.
 * - Si la empresa no tenía config y hay datos locales antiguos, los migra UNA vez y limpia localStorage.
 * - Guarda con debounce cuando `config` cambia. Nunca guarda antes de cargar (evita pisar con vacíos).
 */
export function useContentPlannerSync(
  config: ContentPlannerConfig,
  hydrate: (c: ContentPlannerConfig) => void,
) {
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [ready, setReady] = useState(false);
  const lastSaved = useRef<string>('');
  const latest = useRef(config);
  const hydrateRef = useRef(hydrate);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  latest.current = config;
  hydrateRef.current = hydrate;

  const put = useCallback(async (cfg: ContentPlannerConfig): Promise<boolean> => {
    setStatus('saving');
    try {
      const res = await apiFetch(ENDPOINT, { method: 'PUT', body: JSON.stringify(cfg) });
      if (!res.ok) throw new Error(String(res.status));
      lastSaved.current = JSON.stringify(cfg);
      setStatus('saved');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, []);

  // Carga inicial (+ migración única desde localStorage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(ENDPOINT);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { configured: boolean; config: ContentPlannerConfig };
        if (cancelled) return;

        let cfg: ContentPlannerConfig = data.config;
        let migrate = false;
        if (!data.configured) {
          const legacy = readLegacy();
          cfg = { ...cfg, timezone: detectTimezone() };
          if (legacy) {
            cfg = { ...cfg, ...legacy, publishTime: legacy.publishTime ?? DEFAULT_PUBLISH_TIME };
            migrate = true;
          }
        }
        hydrateRef.current(cfg);
        lastSaved.current = JSON.stringify(cfg);
        setReady(true);
        setStatus('idle');
        if (migrate && (await put(cfg))) clearLegacy();
      } catch {
        if (!cancelled) setStatus('error'); // sin carga correcta no se guarda nada
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [put]);

  // Guardado con debounce.
  const json = JSON.stringify(config);
  useEffect(() => {
    if (!ready || json === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void put(latest.current);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [json, ready, put]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!ready) return false;
    if (timer.current) clearTimeout(timer.current);
    if (JSON.stringify(latest.current) === lastSaved.current) return true;
    return put(latest.current);
  }, [ready, put]);

  return { status, ready, saveNow };
}
