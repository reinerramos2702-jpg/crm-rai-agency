'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, type CardPrefs } from './card-prefs';

/** Preferencias de la tarjeta por persona: se leen tras montar (sin desajuste de hidratación) y fallan en silencio. */
export function useCardPrefs() {
  const [prefs, setPrefs] = useState<CardPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try { setPrefs(parsePrefs(window.localStorage.getItem(PREFS_KEY))); } catch { /* almacenamiento bloqueado */ }
  }, []);

  const save = useCallback((next: CardPrefs) => {
    setPrefs(next);
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* almacenamiento bloqueado */ }
  }, []);

  return { prefs, save };
}
