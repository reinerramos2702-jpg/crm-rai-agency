'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';

export interface TourStep {
  id: string;
  /** Selector CSS del elemento a resaltar. Sin target → tarjeta centrada. */
  target?: string;
  title: string;
  body: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Vista que debe estar activa para este paso (la aplica el padre en onStep). */
  view?: string;
}

interface ProductTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  onStep?: (step: TourStep, index: number) => void;
}

const PAD = 8;
const GAP = 14;
const CARD_W = 360;

function waitForElement(selector: string, timeoutMs: number): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) return resolve(el);
      if (performance.now() - started > timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

type Rect = { top: number; left: number; width: number; height: number };

function readRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  // Elemento más alto que la pantalla: se resalta solo su parte visible superior.
  if (r.height > vh * 0.7) {
    const top = Math.max(r.top, 16);
    return { top, left: r.left, width: r.width, height: Math.min(r.height - (top - r.top), vh * 0.5) };
  }
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computeCardPosition(
  rect: Rect,
  placement: NonNullable<TourStep['placement']>,
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const w = Math.min(CARD_W, vw - 24);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const options: Array<NonNullable<TourStep['placement']>> = [
    placement,
    placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left',
    'bottom',
    'top',
    'right',
    'left',
  ];
  for (const opt of options) {
    let top = 0;
    let left = 0;
    if (opt === 'bottom') {
      top = rect.top + rect.height + PAD + GAP;
      left = rect.left + rect.width / 2 - w / 2;
    } else if (opt === 'top') {
      top = rect.top - PAD - GAP - cardH;
      left = rect.left + rect.width / 2 - w / 2;
    } else if (opt === 'right') {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left + rect.width + PAD + GAP;
    } else {
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - PAD - GAP - w;
    }
    const fits = top >= 12 && top + cardH <= vh - 12 && left >= 12 && left + w <= vw - 12;
    if (fits) return { top, left };
  }
  // Sin espacio claro: pegar abajo, dentro de la pantalla.
  return {
    top: clamp(rect.top + rect.height + PAD + GAP, 12, Math.max(12, vh - cardH - 12)),
    left: clamp(rect.left + rect.width / 2 - w / 2, 12, Math.max(12, vw - w - 12)),
  };
}

export default function ProductTour({ steps, open, onClose, onStep }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  const [cardH, setCardH] = useState(230);
  const targetRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const isMobile = vp.w < 640;

  const remeasure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (targetRef.current && document.contains(targetRef.current)) setRect(readRect(targetRef.current));
  }, []);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    onStepRef.current?.(step, index);
    targetRef.current = null;
    setRect(null);
    (async () => {
      if (!step.target) return;
      const el = await waitForElement(step.target, 2500);
      if (cancelled || !el) return;
      targetRef.current = el;
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      window.setTimeout(() => {
        if (!cancelled) remeasure();
      }, 140);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    remeasure();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current(false);
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, remeasure, steps.length]);

  useEffect(() => {
    if (open && cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [open, index, rect]);

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, index]);

  if (!open || !step || typeof document === 'undefined') return null;

  const pos = rect && !isMobile ? computeCardPosition(rect, step.placement ?? 'bottom', cardH, vp.w, vp.h) : null;
  const cardStyle: React.CSSProperties = isMobile
    ? { left: 12, right: 12, bottom: 12, width: 'auto' }
    : pos
      ? { top: pos.top, left: pos.left, width: Math.min(CARD_W, vp.w - 24) }
      : { top: 0, bottom: 0, left: 0, right: 0, margin: 'auto', height: 'fit-content', width: Math.min(CARD_W + 40, vp.w - 24) };

  return createPortal(
    <div className="rai-tour-layer" role="presentation">
      <div className="rai-tour-block" />
      {rect ? (
        <div
          className="rai-tour-spot"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="rai-tour-dim" />
      )}
      <div
        ref={cardRef}
        className="rai-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rai-tour-title"
        style={cardStyle}
      >
        <div className="rai-tour-head">
          <span className="rai-tour-count">Paso {index + 1} de {steps.length}</span>
          <button type="button" className="rai-tour-x" aria-label="Cerrar recorrido" onClick={() => onClose(false)}>
            <X size={16} />
          </button>
        </div>
        <h4 id="rai-tour-title" className="rai-tour-title">{step.title}</h4>
        <div className="rai-tour-body">{step.body}</div>
        <div className="rai-tour-dots" aria-hidden="true">
          {steps.map((s, i) => (
            <i key={s.id} className={i === index ? 'is-on' : i < index ? 'is-past' : ''} />
          ))}
        </div>
        <div className="rai-tour-actions">
          {index > 0 ? (
            <button type="button" className="rai-tour-btn is-ghost" onClick={() => setIndex(index - 1)}>
              <ArrowLeft size={14} /> Atrás
            </button>
          ) : (
            <button type="button" className="rai-tour-btn is-link" onClick={() => onClose(false)}>
              Omitir
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            className="rai-tour-btn is-primary"
            onClick={() => (isLast ? onClose(true) : setIndex(index + 1))}
          >
            {isLast ? (<><Check size={14} /> Terminar</>) : (<>Siguiente <ArrowRight size={14} /></>)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
