'use client';

import React, { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { rankItems } from '@/lib/command-search';

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  /** Destino de navegación. */
  href?: string;
  /** Acción local (si no hay `href`). */
  run?: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  items: PaletteItem[];
  /** Ids recientes (más nuevo primero), mostrados con la consulta vacía. */
  recentIds: string[];
  onClose: () => void;
  onSelect: (item: PaletteItem) => void;
}

const cv = (vars: Record<string, string | number>) => vars as CSSProperties;

/**
 * Paleta de comandos (Ctrl/Cmd+K): salto rápido a cualquier módulo y acciones.
 * Patrón combobox ARIA: el foco queda en el campo y las flechas mueven la opción activa.
 */
export function CommandPalette({ open, items, recentIds, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  // Foco al abrir y devolución al cerrar.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      returnFocus.current?.focus?.();
    };
  }, [open]);

  // Lista plana en el orden en que se muestra (y se navega con el teclado).
  const rows = useMemo(() => {
    const q = query.trim();
    if (q) {
      const ranked = rankItems(items, q, (i) => `${i.label} ${i.group} ${i.keywords ?? ''}`);
      return ranked.map((item) => ({ item, heading: '' }));
    }
    const recents = recentIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is PaletteItem => !!i)
      .slice(0, 4);
    const recentSet = new Set(recents.map((r) => r.id));
    const out: Array<{ item: PaletteItem; heading: string }> = recents.map((item) => ({ item, heading: 'Recientes' }));
    for (const item of items) {
      if (recentSet.has(item.id)) continue;
      out.push({ item, heading: item.group });
    }
    return out;
  }, [items, query, recentIds]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Mantiene visible la opción activa.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open, rows]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, rows.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[active];
      if (row) onSelect(row.item);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // el foco permanece dentro de la paleta
    }
  };

  const activeId = rows[active] ? `${uid}-opt-${rows[active].item.id}` : undefined;
  let lastHeading = '';

  return (
    <div className="cp-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-panel" role="dialog" aria-modal="true" aria-label="Paleta de comandos" onKeyDown={onKeyDown}>
        <div className="cp-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un módulo o acción…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>

        <div ref={listRef} id={listId} role="listbox" className="cp-list" aria-label="Resultados">
          {rows.length === 0 && (
            <p className="cp-empty">No encontramos resultados para «{query.trim()}». Prueba con otra palabra.</p>
          )}
          {rows.map(({ item, heading }, idx) => {
            const showHeading = heading && heading !== lastHeading;
            if (heading) lastHeading = heading;
            const Icon = item.icon;
            return (
              <React.Fragment key={`${heading}-${item.id}`}>
                {showHeading && <div className="cp-heading">{heading}</div>}
                <div
                  id={`${uid}-opt-${item.id}`}
                  role="option"
                  aria-selected={idx === active}
                  className={`cp-item${idx === active ? ' is-active' : ''}`}
                  style={cv({ '--i': Math.min(idx, 10) })}
                  onMouseMove={() => idx !== active && setActive(idx)}
                  onClick={() => onSelect(item)}
                >
                  <span className="cp-ic">
                    <Icon size={16} />
                  </span>
                  <span className="cp-label">{item.label}</span>
                  {query.trim() && <span className="cp-group">{item.group}</span>}
                  {idx === active && <CornerDownLeft size={14} className="cp-enter" aria-hidden="true" />}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="cp-foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
