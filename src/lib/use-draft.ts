'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readDraft,
  removeDraft,
  stableStringify,
  writeDraft,
  type DraftValidator,
  type StoredDraft,
} from './draft-storage';

interface UseDraftOptions<T> {
  /** Estado de un formulario sin tocar: nunca se guarda ni se ofrece recuperar. */
  initial: T;
  /** Debe tener identidad estable (definida fuera del componente). */
  validate: DraftValidator<T>;
  delayMs?: number;
  ttlMs?: number;
  /** Mientras sea `false` no se lee ni se guarda nada (p. ej. al editar una campaña existente). */
  enabled?: boolean;
}

interface UseDraftResult<T> {
  /** Borrador previo pendiente de decisión; mientras exista no se sobrescribe el guardado. */
  recovered: StoredDraft<T> | null;
  /** Marca de tiempo del último guardado en esta sesión. */
  savedAt: number | null;
  /** La persona restauró el borrador: se reanuda el guardado automático. */
  acceptRecovered: () => void;
  /** La persona descartó el borrador: se elimina y se reanuda el guardado. */
  discardRecovered: () => void;
  /** Elimina el borrador (p. ej. tras completar la acción con éxito) y cancela guardados pendientes. */
  clear: () => void;
}

/**
 * Autoguarda `value` en localStorage con debounce. La lectura ocurre en un
 * efecto (nunca en el estado inicial) para no romper la hidratación.
 */
export function useDraft<T>(key: string, value: T, options: UseDraftOptions<T>): UseDraftResult<T> {
  const { initial, validate, delayMs = 800, ttlMs, enabled = true } = options;
  const [recovered, setRecovered] = useState<StoredDraft<T> | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const initialSerialized = useRef(stableStringify(initial));
  const serialized = stableStringify(value);
  const valueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  });

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const stored = readDraft(key, { validate, ttlMs });
    if (stored && stableStringify(stored.data) === initialSerialized.current) {
      removeDraft(key);
    } else {
      setRecovered(stored);
    }
    setReady(true);
  }, [enabled, key, validate, ttlMs]);

  useEffect(() => {
    if (!enabled || !ready || recovered) return;
    if (serialized === initialSerialized.current) {
      removeDraft(key);
      setSavedAt(null);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (writeDraft(key, valueRef.current)) setSavedAt(Date.now());
    }, delayMs);
    return cancelPending;
  }, [enabled, ready, recovered, serialized, key, delayMs, cancelPending]);

  const acceptRecovered = useCallback(() => setRecovered(null), []);

  const discardRecovered = useCallback(() => {
    removeDraft(key);
    setRecovered(null);
  }, [key]);

  const clear = useCallback(() => {
    cancelPending();
    removeDraft(key);
    setRecovered(null);
    setSavedAt(null);
  }, [cancelPending, key]);

  return { recovered, savedAt, acceptRecovered, discardRecovered, clear };
}
