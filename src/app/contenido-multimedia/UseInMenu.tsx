'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { UseInTarget } from '@/lib/media-actions';

interface UseInMenuProps {
  targets: UseInTarget[];
  onPick: (target: UseInTarget) => void;
}

/** Menú «Usar en…»: flechas para moverse, Esc lo cierra (sin cerrar el visor) y devuelve el foco al botón. */
export function UseInMenu({ targets, onPick }: UseInMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const entries = () => Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (open) entries()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = entries();
    if (list.length === 0) return;
    const current = list.findIndex((el) => el === document.activeElement);
    const step = e.key === 'ArrowDown' ? 1 : -1;
    list[(current + step + list.length) % list.length].focus();
  }

  return (
    <div className="mm-use" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-secondary btn-sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 size={14} /> Usar en…
      </button>
      {open && (
        <div className="mm-use-menu" role="menu" aria-label="Usar este activo en">
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              className="mm-use-item"
              onClick={() => {
                setOpen(false);
                onPick(t);
              }}
            >
              <strong>{t.label}</strong>
              <span>{t.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
