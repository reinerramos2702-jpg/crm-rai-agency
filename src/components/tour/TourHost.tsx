'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, HelpCircle, RotateCcw, X } from 'lucide-react';
import ProductTour from './ProductTour';
import { SIDEBAR_EVENT } from '../layout/Sidebar';
import {
  CRM_TOUR,
  TOUR_AUTO_OFF_KEY,
  findModuleTour,
  tourSeenKey,
  type ModuleTour,
} from './tours';

/** Rutas sin menú ni guías (autenticación, páginas públicas). */
const EXCLUDED = ['/login', '/registro', '/recuperar', '/restablecer', '/privacidad', '/terminos', '/go', '/book'];

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento: la guía simplemente puede repetirse */
  }
}

/**
 * Anfitrión de guías: botón «?» flotante, menú de recorridos y arranque
 * automático (una sola vez por módulo). Se monta una vez en el layout.
 */
export default function TourHost() {
  const pathname = usePathname() || '/';
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<ModuleTour | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoOff, setAutoOff] = useState(false);
  const [seenTick, setSeenTick] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  const hidden = EXCLUDED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const mod = useMemo(() => findModuleTour(pathname), [pathname]);

  useEffect(() => {
    setMounted(true);
    setAutoOff(readFlag(TOUR_AUTO_OFF_KEY));
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Arranque automático: solo la primera vez que se entra a un módulo.
  useEffect(() => {
    if (!mounted || hidden || !mod || autoOff) return;
    if (readFlag(tourSeenKey(mod.id))) return;
    const t = window.setTimeout(() => {
      if (!document.querySelector('.rtour-layer')) setActive(mod);
    }, 1400);
    return () => window.clearTimeout(t);
  }, [mounted, hidden, mod, autoOff]);

  // Cierre del menú con clic fuera o Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || fabRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const start = useCallback((tour: ModuleTour) => {
    setMenuOpen(false);
    // El recorrido general señala el menú lateral: debe estar visible.
    if (tour.id === 'crm') window.dispatchEvent(new CustomEvent(SIDEBAR_EVENT, { detail: 'open' }));
    setActive(tour);
  }, []);

  const handleClose = useCallback(() => {
    setActive((cur) => {
      if (cur) writeFlag(tourSeenKey(cur.id), true);
      return null;
    });
    setSeenTick((n) => n + 1);
  }, []);

  const dismissAll = useCallback(() => {
    writeFlag(TOUR_AUTO_OFF_KEY, true);
    setAutoOff(true);
    handleClose();
  }, [handleClose]);

  const reenableAuto = useCallback(() => {
    writeFlag(TOUR_AUTO_OFF_KEY, false);
    setAutoOff(false);
    setMenuOpen(false);
  }, []);

  if (!mounted || hidden) return null;

  // seenTick fuerza la relectura del indicador «nuevo» tras cerrar una guía.
  const hasNew = !!mod && !readFlag(tourSeenKey(mod.id)) && seenTick >= 0;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className={`rtour-fab${hasNew ? ' has-new' : ''}`}
        aria-label="Guías y ayuda"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Guías y ayuda"
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? <X size={18} /> : <HelpCircle size={19} />}
      </button>

      {menuOpen && (
        <div ref={menuRef} className="rtour-menu" role="menu" aria-label="Guías y ayuda">
          <div className="rtour-menu-title">Guías y ayuda</div>
          {mod && (
            <button type="button" role="menuitem" className="rtour-menu-item" onClick={() => start(mod)}>
              <span className="ic"><BookOpen size={15} /></span>
              <span>
                Guía de {mod.label}
                <small>Qué hace cada parte de esta pantalla</small>
              </span>
            </button>
          )}
          <button type="button" role="menuitem" className="rtour-menu-item" onClick={() => start(CRM_TOUR)}>
            <span className="ic"><Compass size={15} /></span>
            <span>
              Recorrido general del CRM
              <small>Conoce el menú y dónde está cada módulo</small>
            </span>
          </button>
          {autoOff && (
            <button type="button" role="menuitem" className="rtour-menu-item" onClick={reenableAuto}>
              <span className="ic"><RotateCcw size={15} /></span>
              <span>
                Reactivar guías automáticas
                <small>Se mostrarán al entrar por primera vez a cada módulo</small>
              </span>
            </button>
          )}
        </div>
      )}

      <ProductTour
        steps={active?.steps ?? []}
        open={!!active}
        onClose={handleClose}
        onDismissAll={active && active.id !== 'crm' ? dismissAll : undefined}
      />
    </>
  );
}
