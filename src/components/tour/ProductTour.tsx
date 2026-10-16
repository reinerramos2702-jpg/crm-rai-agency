'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import './tour.css';

/** Elemento a resaltar: selector CSS o función que lo resuelve en el momento. */
export type TourTarget = string | (() => HTMLElement | null);

export interface TourHint {
  target: TourTarget;
  /** Texto corto que acompaña a la marca numerada (aparecen en cascada). */
  label: string;
}

export interface TourStep {
  id: string;
  /** Elemento a resaltar. Sin target → tarjeta centrada. */
  target?: TourTarget;
  title: string;
  body: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Vista que debe estar activa para este paso (la aplica el padre en onStep). */
  view?: string;
  /** Marcas numeradas sobre sub-elementos; se muestran en cascada. */
  hints?: TourHint[];
  /** Si el elemento no existe, el paso se omite solo. */
  optional?: boolean;
  /** Se omite en pantallas angostas (p. ej. pasos que apuntan al menú lateral). */
  desktopOnly?: boolean;
  /** Etiqueta pequeña sobre el título (por defecto «Paso x de n»). */
  kicker?: string;
  icon?: React.ReactNode;
}

interface ProductTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  onStep?: (step: TourStep, index: number) => void;
  /** Si se pasa, el primer paso ofrece «No volver a mostrar guías automáticas». */
  onDismissAll?: () => void;
}

const PAD = 10;
const GAP = 16;
const CARD_W = 392;
const EDGE = 12;
const NARROW = 900;
const MOBILE = 640;

type Rect = { top: number; left: number; width: number; height: number };
type Side = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'sheet';
type HintRect = { rect: Rect; label: string; n: number; on: boolean };

const cv = (o: Record<string, string | number>) => o as unknown as React.CSSProperties;

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function resolveTarget(t: TourTarget): HTMLElement | null {
  try {
    return typeof t === 'string' ? document.querySelector<HTMLElement>(t) : t();
  } catch {
    return null;
  }
}

function waitForTarget(t: TourTarget, timeoutMs: number): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const el = resolveTarget(t);
      if (el && el.getClientRects().length > 0) return resolve(el);
      if (performance.now() - started > timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function plainRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function readRect(el: HTMLElement, mobile: boolean): Rect {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const cap = mobile ? vh * 0.36 : vh * 0.62;
  // Elemento más alto que el área útil: se resalta solo su parte visible superior.
  if (r.height > cap) {
    const top = Math.max(r.top, mobile ? 72 : 16);
    return { top, left: r.left, width: r.width, height: Math.min(r.height - (top - r.top), cap) };
  }
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function isOffscreen(r: Rect, vw: number, vh: number): boolean {
  return r.left + r.width <= 0 || r.left >= vw || r.top + r.height <= 0 || r.top >= vh;
}

function scrollToTarget(el: HTMLElement, mobile: boolean) {
  try {
    // Elementos más altos que la pantalla (p. ej. el menú lateral) no se centran:
    // hacerlo desplazaría su propio contenedor y ocultaría sus primeras entradas.
    if (el.getBoundingClientRect().height > window.innerHeight * 0.8) return;
    if (mobile) {
      const prev = el.style.scrollMarginTop;
      el.style.scrollMarginTop = '84px';
      el.scrollIntoView({ block: 'start', behavior: 'auto' });
      el.style.scrollMarginTop = prev;
    } else {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
  } catch {
    /* sin efecto */
  }
}

interface Placement {
  top: number;
  left: number;
  width: number;
  side: Side;
  arrow: number;
}

function computePlacement(
  rect: Rect | null,
  preferred: NonNullable<TourStep['placement']>,
  cardH: number,
  vw: number,
  vh: number,
): Placement {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  if (vw < MOBILE) {
    const width = vw - EDGE * 2;
    return { top: Math.max(EDGE, vh - cardH - EDGE), left: EDGE, width, side: 'sheet', arrow: 0 };
  }
  const width = Math.min(CARD_W, vw - EDGE * 2);
  if (!rect) {
    return {
      top: Math.max(EDGE, (vh - cardH) / 2),
      left: Math.max(EDGE, (vw - width) / 2),
      width,
      side: 'center',
      arrow: 0,
    };
  }
  const opposite: Record<string, NonNullable<TourStep['placement']>> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  const order: Array<NonNullable<TourStep['placement']>> = [
    preferred,
    opposite[preferred],
    'bottom',
    'top',
    'right',
    'left',
  ];
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (const side of order) {
    let top = 0;
    let left = 0;
    if (side === 'bottom') {
      top = rect.top + rect.height + PAD + GAP;
      left = cx - width / 2;
    } else if (side === 'top') {
      top = rect.top - PAD - GAP - cardH;
      left = cx - width / 2;
    } else if (side === 'right') {
      top = cy - cardH / 2;
      left = rect.left + rect.width + PAD + GAP;
    } else {
      top = cy - cardH / 2;
      left = rect.left - PAD - GAP - width;
    }
    if (top >= EDGE && top + cardH <= vh - EDGE && left >= EDGE && left + width <= vw - EDGE) {
      const arrow = side === 'top' || side === 'bottom' ? clamp(cx - left, 26, width - 26) : clamp(cy - top, 26, cardH - 26);
      return { top, left, width, side, arrow };
    }
  }
  // Sin hueco limpio: se centra en pantalla y se mantiene visible (sin flecha).
  return {
    top: clamp(rect.top + rect.height + PAD + GAP, EDGE, Math.max(EDGE, vh - cardH - EDGE)),
    left: clamp(cx - width / 2, EDGE, Math.max(EDGE, vw - width - EDGE)),
    width,
    side: 'center',
    arrow: 0,
  };
}

export default function ProductTour({ steps, open, onClose, onStep, onDismissAll }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [hints, setHints] = useState<HintRect[]>([]);
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  const [cardH, setCardH] = useState(280);
  const targetRef = useRef<HTMLElement | null>(null);
  const hintEls = useRef<Array<{ el: HTMLElement; label: string; n: number }>>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const dirRef = useRef<1 | -1>(1);
  const rafRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  const narrow = vp.w < NARROW;
  const list = useMemo(() => steps.filter((s) => !(s.desktopOnly && narrow)), [steps, narrow]);
  const safeIndex = Math.max(0, Math.min(index, list.length - 1));
  const step = list[safeIndex];
  const isLast = safeIndex === list.length - 1;
  const isFirst = safeIndex === 0;

  const go = useCallback((delta: 1 | -1) => {
    dirRef.current = delta;
    setIndex((i) => Math.max(0, i + delta));
  }, []);

  const measure = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setVp((p) => (p.w === w && p.h === h ? p : { w, h }));
    const el = targetRef.current;
    if (el && document.contains(el)) {
      const r = readRect(el, w < MOBILE);
      setRect(isOffscreen(r, w, h) ? null : r);
    }
    setHints(
      hintEls.current
        .filter((x) => document.contains(x.el))
        .map((x) => {
          const rect = plainRect(x.el);
          return { rect, label: x.label, n: x.n, on: !isOffscreen(rect, w, h) };
        }),
    );
  }, []);

  const remeasure = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    if (open) {
      setIndex(0);
      dirRef.current = 1;
      prevFocus.current = document.activeElement as HTMLElement | null;
    } else {
      setRect(null);
      setHints([]);
      targetRef.current = null;
      hintEls.current = [];
      prevFocus.current?.focus?.();
    }
  }, [open]);

  // Resolución del paso actual: objetivo, scroll, medición y marcas en cascada.
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    onStepRef.current?.(step, safeIndex);
    targetRef.current = null;
    hintEls.current = [];
    setHints([]);
    if (!step.target) {
      setRect(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const el = await waitForTarget(step.target as TourTarget, step.optional ? 450 : 2500);
      if (cancelled) return;
      if (!el) {
        if (step.optional) {
          const next = safeIndex + dirRef.current;
          if (next >= 0 && next < list.length) setIndex(next);
          else if (next >= list.length) onCloseRef.current(true);
          else setIndex(0);
        } else {
          setRect(null);
        }
        return;
      }
      targetRef.current = el;
      scrollToTarget(el, window.innerWidth < MOBILE);
      await sleep(170);
      if (cancelled) return;
      measure();
      if (step.hints?.length) {
        const found: Array<{ el: HTMLElement; label: string; n: number }> = [];
        for (let i = 0; i < step.hints.length; i += 1) {
          const h = step.hints[i];
          const he = await waitForTarget(h.target, 600);
          if (cancelled) return;
          if (he) found.push({ el: he, label: h.label, n: found.length + 1 });
        }
        hintEls.current = found;
        measure();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, safeIndex, list.length]);

  useEffect(() => {
    if (!open) return;
    measure();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current(false);
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => {
          dirRef.current = 1;
          return Math.min(i + 1, list.length - 1);
        });
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => {
          dirRef.current = -1;
          return Math.max(i - 1, 0);
        });
      } else if (e.key === 'Tab' && cardRef.current) {
        const btns = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (btns.length === 0) return;
        const first = btns[0];
        const last = btns[btns.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !cardRef.current.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !cardRef.current.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, measure, remeasure, list.length]);

  useEffect(() => {
    if (open && cardRef.current) {
      const h = cardRef.current.offsetHeight;
      setCardH((p) => (Math.abs(p - h) > 1 ? h : p));
    }
  }, [open, safeIndex, rect, hints.length]);

  useEffect(() => {
    if (open) primaryRef.current?.focus({ preventScroll: true });
  }, [open, safeIndex]);

  if (!open || !step || typeof document === 'undefined') return null;

  const place = computePlacement(rect, step.placement ?? 'bottom', cardH, vp.w, vp.h);
  const cardStyle: React.CSSProperties = { top: place.top, left: place.left, width: place.width };
  const arrowStyle = cv({ '--a': `${place.arrow}px` });
  const progress = list.length > 1 ? (safeIndex + 1) / list.length : 1;
  const kicker = step.kicker ?? `Paso ${safeIndex + 1} de ${list.length}`;
  const icon = step.icon ?? (isLast ? <Check size={15} strokeWidth={3} /> : <Sparkles size={15} />);

  return createPortal(
    <div className="rtour-layer" role="presentation">
      <div className="rtour-block" />
      {rect ? (
        <div
          className="rtour-spot"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="rtour-dim" />
      )}

      {hints.filter((h) => h.on).map((h) => {
        const ring = cv({
          top: h.rect.top - 3,
          left: h.rect.left - 3,
          width: h.rect.width + 6,
          height: h.rect.height + 6,
          '--i': h.n - 1,
        });
        const bx = Math.max(4, Math.min(vp.w - 26, h.rect.left + h.rect.width - 11));
        const by = Math.max(4, h.rect.top - 11);
        return (
          <React.Fragment key={`${step.id}-${h.n}`}>
            <div className="rtour-hint-ring" style={ring} />
            <div
              className="rtour-hint-n"
              style={cv({ top: by, left: bx, '--i': h.n - 1 })}
              aria-hidden="true"
            >
              {h.n}
            </div>
          </React.Fragment>
        );
      })}

      <div
        ref={cardRef}
        className="rtour-card"
        data-side={place.side}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rtour-title"
        style={cardStyle}
      >
        {place.side !== 'center' && place.side !== 'sheet' && <span className="rtour-arrow" data-side={place.side} style={arrowStyle} />}
        <div className="rtour-progress" aria-hidden="true">
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
        <div className="rtour-inner" key={step.id}>
          <div className="rtour-head rtour-c" style={cv({ '--i': 0 })}>
            <span className="rtour-chip" aria-hidden="true">{icon}</span>
            <span className="rtour-count">{kicker}</span>
            <button type="button" className="rtour-x" aria-label="Cerrar recorrido" onClick={() => onClose(false)}>
              <X size={16} />
            </button>
          </div>
          <h4 id="rtour-title" className="rtour-title rtour-c" style={cv({ '--i': 1 })}>
            {step.title}
          </h4>
          <div className="rtour-body rtour-c" style={cv({ '--i': 2 })}>
            {step.body}
          </div>
          {hints.length > 0 && (
            <ol className="rtour-hints" aria-label="Elementos destacados">
              {hints.map((h) => (
                <li key={h.n} style={cv({ '--i': h.n - 1 })}>
                  <span className="n">{h.n}</span>
                  <span>{h.label}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="rtour-actions rtour-c" style={cv({ '--i': 3 })}>
            {safeIndex > 0 ? (
              <button type="button" className="rtour-btn is-ghost" onClick={() => go(-1)}>
                <ArrowLeft size={14} /> Atrás
              </button>
            ) : (
              <button type="button" className="rtour-btn is-link" onClick={() => onClose(false)}>
                Omitir
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              className="rtour-btn is-primary"
              onClick={() => (isLast ? onClose(true) : go(1))}
            >
              {isLast ? (
                <>
                  <Check size={14} /> Terminar
                </>
              ) : (
                <>
                  {isFirst ? 'Empezar' : 'Siguiente'} <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
          <div className="rtour-foot rtour-c" style={cv({ '--i': 4 })}>
            <span className="rtour-keys" aria-hidden="true">
              <kbd>←</kbd> <kbd>→</kbd> navegar · <kbd>Esc</kbd> salir
            </span>
            {isFirst && onDismissAll && (
              <button type="button" className="rtour-quiet" onClick={onDismissAll}>
                No volver a mostrar guías automáticas
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
