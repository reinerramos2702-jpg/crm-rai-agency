'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_PREFS,
  PREFS_STORAGE_KEY,
  parsePrefs,
  serializePrefs,
  type AutomationPrefs,
} from '@/lib/automation-prefs';

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPrefs: AutomationPrefs = DEFAULT_PREFS;

let storageBroken = false;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  if (storageBroken) return memoryRaw;
  try {
    return localStorage.getItem(PREFS_STORAGE_KEY);
  } catch {
    storageBroken = true;
    return memoryRaw;
  }
}

function getSnapshot(): AutomationPrefs {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedPrefs = parsePrefs(raw);
  }
  return cachedPrefs;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

function write(next: AutomationPrefs | null) {
  const raw = next ? serializePrefs(next) : null;
  try {
    if (raw) localStorage.setItem(PREFS_STORAGE_KEY, raw);
    else localStorage.removeItem(PREFS_STORAGE_KEY);
  } catch {
    storageBroken = true;
    memoryRaw = raw;
  }
  listeners.forEach((cb) => cb());
}

/** Preferencias del módulo: el servidor y la primera pintura usan los valores por defecto; luego se leen del navegador. */
export function useAutomationPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFS);
  const update = useCallback((patch: Partial<AutomationPrefs>) => write({ ...getSnapshot(), ...patch }), []);
  const reset = useCallback(() => write(null), []);
  return { prefs, update, reset };
}
