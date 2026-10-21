'use client';

import React, { useEffect, useRef } from 'react';
import { Calendar, FileText, Link2, Mail, Megaphone, Palette, Timer, Users, type LucideIcon } from 'lucide-react';
import { prefetchJson } from '@/lib/swr-cache';
import { MARKETING_TABS, type MarketingTabId } from '@/lib/marketing-tabs';
import { scrollBehavior } from './shared';

const ICONS: Record<MarketingTabId, LucideIcon> = {
  social: Calendar,
  emails: Mail,
  snippets: FileText,
  countdown: Timer,
  links: Link2,
  brand: Palette,
  ads: Megaphone,
  prospecting: Users,
};

/** Datos que cada pestaña pide al abrirse: se precargan al pasar el cursor o enfocar la pestaña. */
const TAB_PREFETCH: Partial<Record<MarketingTabId, string[]>> = {
  snippets: ['/api/snippets'],
  links: ['/api/activation-links'],
  brand: ['/api/marketing/brand'],
  emails: ['/api/marketing/brand'],
};

interface Props {
  tab: MarketingTabId;
  onSelect: (id: MarketingTabId) => void;
}

/** Barra de pestañas accesible (flechas, Inicio y Fin) con scroll horizontal táctil en pantallas estrechas. */
export function MarketingTabs({ tab, onSelect }: Props) {
  const first = useRef(true);

  // La pestaña activa se centra en la barra; en la primera pintura no se mueve nada.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (tab === MARKETING_TABS[0].id) return;
    }
    document.getElementById(`mkt-tab-${tab}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: scrollBehavior() });
  }, [tab]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = MARKETING_TABS.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(MARKETING_TABS[next].id);
    requestAnimationFrame(() => document.getElementById(`mkt-tab-${MARKETING_TABS[next].id}`)?.focus());
  };

  return (
    <div className="mkt-tabs" role="tablist" aria-label="Herramientas de marketing" data-tour="marketing-tabs">
      {MARKETING_TABS.map((t, i) => {
        const Icon = ICONS[t.id];
        const selected = t.id === tab;
        return (
          <button
            key={t.id}
            id={`mkt-tab-${t.id}`}
            type="button"
            role="tab"
            className="mkt-tab"
            aria-selected={selected}
            aria-controls="mkt-tabpanel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onPointerEnter={() => TAB_PREFETCH[t.id]?.forEach((u) => prefetchJson(u))}
            onFocus={() => TAB_PREFETCH[t.id]?.forEach((u) => prefetchJson(u))}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Icon size={15} aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
