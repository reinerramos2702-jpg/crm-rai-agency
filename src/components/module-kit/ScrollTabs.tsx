'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  centerScrollLeft,
  indicatorTransform,
  nextTabIndex,
  panelDomId,
  scrollEdges,
  tabDomId,
  type EdgeState,
  type IndicatorBox,
} from './tabs-nav';

export interface ScrollTabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Muestra un punto «datos reales» en la pestaña. */
  live?: boolean;
}

interface ScrollTabsProps {
  tabs: readonly ScrollTabItem[];
  active: string;
  onChange: (id: string) => void;
  /** Nombre accesible de la lista de pestañas. */
  label: string;
  /** Prefijo de ids; el panel debe usar `panelDomId(idPrefix)`. */
  idPrefix: string;
}

/**
 * Pestañas en una sola fila con scroll horizontal táctil, degradados de borde
 * y subrayado animado solo con `transform`. Patrón ARIA tabs con activación automática.
 */
export function ScrollTabs({ tabs, active, onChange, label, idPrefix }: ScrollTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<IndicatorBox | null>(null);
  const [edges, setEdges] = useState<EdgeState>({ start: false, end: false });
  const userChanged = useRef(false);

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const btn = track.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (btn) setBox({ x: btn.offsetLeft, w: btn.offsetWidth });
    setEdges(scrollEdges(scroller.scrollLeft, scroller.clientWidth, scroller.scrollWidth));
  }, []);

  useEffect(() => {
    measure();
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [measure, active]);

  useEffect(() => {
    if (!userChanged.current) return;
    const scroller = scrollerRef.current;
    const btn = document.getElementById(tabDomId(idPrefix, active));
    if (!scroller || !btn) return;
    scroller.scrollTo({ left: centerScrollLeft(btn.offsetLeft, btn.offsetWidth, scroller.clientWidth, scroller.scrollWidth) });
  }, [active, idPrefix]);

  function select(id: string) {
    userChanged.current = true;
    onChange(id);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === active);
    const target = nextTabIndex(e.key, i < 0 ? 0 : i, tabs.length);
    if (target === null) return;
    e.preventDefault();
    const next = tabs[target].id;
    select(next);
    requestAnimationFrame(() => document.getElementById(tabDomId(idPrefix, next))?.focus());
  }

  return (
    <div className="mk-tabs" data-edge-start={edges.start} data-edge-end={edges.end}>
      <div ref={scrollerRef} className="mk-tabs-scroll" onScroll={measure}>
        <div ref={trackRef} className="mk-tabs-track" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
          {tabs.map(({ id, label: text, icon: Icon, live }) => {
            const selected = id === active;
            return (
              <button
                key={id}
                id={tabDomId(idPrefix, id)}
                type="button"
                role="tab"
                className="mk-tab"
                aria-selected={selected}
                aria-controls={panelDomId(idPrefix)}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{text}</span>
                {live && (
                  <>
                    <span className="fx-dot fx-dot--ok mk-live" aria-hidden="true" />
                    <span className="fx-sr-only">(datos reales)</span>
                  </>
                )}
              </button>
            );
          })}
          <span
            className="mk-indicator"
            aria-hidden="true"
            data-ready={box !== null}
            style={box ? { transform: indicatorTransform(box) } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
