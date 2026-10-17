'use client';

import { useCallback, useEffect, useState } from 'react';
import { CFG_SECTION_IDS } from './constants';

/** Sección de configuración visible en pantalla (para resaltarla en el índice) y salto suave a una sección. */
export function useConfigNav(active: boolean, ready: boolean) {
  const [activeSection, setActiveSection] = useState<string>(CFG_SECTION_IDS[0]);

  useEffect(() => {
    if (!active || typeof IntersectionObserver === 'undefined') return;
    const els = CFG_SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveSection(top.target.id);
      },
      { rootMargin: '-10% 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [active, ready]);

  const goSection = useCallback((id: string) => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return { activeSection, goSection };
}
