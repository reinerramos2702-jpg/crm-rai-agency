'use client';

import React, { useRef } from 'react';
import { RAIL_TABS, type RailTabId } from './rail-config';

interface RailTabsProps {
  active: RailTabId;
  onChange: (id: RailTabId) => void;
}

/**
 * Pestañas del panel derecho. Vertical en escritorio, horizontal con scroll táctil
 * en pantallas estrechas. Cada icono tiene `aria-label` y tooltip (hover y foco).
 */
export function RailTabs({ active, onChange }: RailTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = RAIL_TABS.findIndex((t) => t.id === active);
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = RAIL_TABS.length - 1;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % RAIL_TABS.length;
    else next = (index - 1 + RAIL_TABS.length) % RAIL_TABS.length;
    const target = RAIL_TABS[next];
    if (!target) return;
    onChange(target.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#cv-rail-tab-${target.id}`)?.focus();
  }

  return (
    <div ref={listRef} className="cv-rail-tabs" role="tablist" aria-label="Paneles del contacto" onKeyDown={onKeyDown}>
      {RAIL_TABS.map(({ id, label, icon: Icon }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={`cv-rail-tab-${id}`}
            type="button"
            role="tab"
            className="cv-rail-tab cv-tip"
            data-tip={label}
            aria-label={label}
            aria-selected={selected}
            aria-controls="cv-rail-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="cv-rail-tab-label" aria-hidden="true">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
