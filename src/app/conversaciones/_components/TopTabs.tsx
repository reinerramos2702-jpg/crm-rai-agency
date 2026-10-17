'use client';

import React, { useEffect, useRef } from 'react';
import { TOP_TABS } from './top-tabs-config';
import type { TopTabId } from '../_lib/conv-types';

interface TopTabsProps {
  active: TopTabId;
  onChange: (id: TopTabId) => void;
}

/**
 * Pestañas superiores. En móvil se desplazan en horizontal con el dedo;
 * la activa se centra sola. Flechas, Inicio y Fin cambian de pestaña (patrón WAI-ARIA).
 */
export function TopTabs({ active, onChange }: TopTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;
    // Desplazamiento propio (scrollIntoView podría mover también contenedores ancestros).
    const a = el.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollBy({ left: a.left - b.left - (b.width - a.width) / 2, behavior: calm ? 'auto' : 'smooth' });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = TOP_TABS.findIndex((t) => t.id === active);
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % TOP_TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TOP_TABS.length) % TOP_TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TOP_TABS.length - 1;
    if (next === -1) return;
    event.preventDefault();
    const target = TOP_TABS[next];
    if (!target) return;
    onChange(target.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#cv-tab-${target.id}`)?.focus();
  }

  return (
    <div ref={listRef} className="cv-tabs" role="tablist" aria-label="Secciones de Conversaciones" onKeyDown={onKeyDown}>
      {TOP_TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          id={`cv-tab-${id}`}
          type="button"
          role="tab"
          className="cv-tab"
          aria-selected={id === active}
          aria-controls="cv-tabpanel"
          tabIndex={id === active ? 0 : -1}
          onClick={() => onChange(id)}
        >
          <Icon size={14} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
