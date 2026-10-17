'use client';

import React, { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface CrmTabItem<Id extends string> {
  id: Id;
  label: string;
  icon?: LucideIcon;
  /** Contador opcional junto a la etiqueta. */
  count?: number;
}

export const tabDomId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelDomId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

interface CrmTabsProps<Id extends string> {
  tabs: readonly CrmTabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Prefijo para enlazar cada pestaña con su panel (`aria-controls`). */
  idPrefix: string;
  ariaLabel: string;
  variant?: 'top' | 'sub';
  trailing?: React.ReactNode;
}

/** Pestañas accesibles (roles tablist/tab, flechas, Inicio/Fin y tabulación itinerante). */
export function CrmTabs<Id extends string>({
  tabs, value, onChange, idPrefix, ariaLabel, variant = 'sub', trailing,
}: CrmTabsProps<Id>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    const target = next >= 0 ? tabs[next] : undefined;
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div className={`crm-tabs crm-tabs--${variant}`}>
      <div className="crm-tablist" role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}>
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const selected = id === value;
          return (
            <button
              key={id}
              ref={(el) => { refs.current[id] = el; }}
              type="button"
              role="tab"
              id={tabDomId(idPrefix, id)}
              aria-selected={selected}
              aria-controls={panelDomId(idPrefix, id)}
              tabIndex={selected ? 0 : -1}
              className="crm-tab"
              onClick={() => onChange(id)}
            >
              {Icon && <Icon size={14} aria-hidden="true" />}
              <span>{label}</span>
              {count !== undefined && <span className="crm-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>
      {trailing && <div className="crm-tabs-trailing">{trailing}</div>}
    </div>
  );
}
