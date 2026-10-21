'use client';

import React, { useRef } from 'react';
import { Calendar as CalendarIcon, CalendarClock, Link2, type LucideIcon } from 'lucide-react';

export type TabId = 'calendarios' | 'citas' | 'conexiones';

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'calendarios', label: 'Calendarios', icon: CalendarIcon },
  { id: 'citas', label: 'Citas', icon: CalendarClock },
  { id: 'conexiones', label: 'Conexiones', icon: Link2 },
];

export const tabButtonId = (id: TabId) => `cal-tab-${id}`;
export const tabPanelId = (id: TabId) => `cal-panel-${id}`;

/** Pestañas con roles ARIA y navegación por teclado (flechas, Inicio y Fin). */
export function TabsNav({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    const target = next >= 0 ? TABS[next] : undefined;
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current[next]?.focus();
  }

  return (
    <div className="cal-tabs" role="tablist" aria-label="Secciones de Calendarios">
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={tabButtonId(tab.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            className={`cal-tab${selected ? ' is-on' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <Icon size={15} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
