'use client';

import { useEffect } from 'react';

/** Elementos que merecen respuesta visual al tocarlos. */
const INTERACTIVE =
  'button, a[href], [role="button"], [role="tab"], [role="option"], summary, input[type="checkbox"], input[type="radio"], .card[tabindex], .gi-card, .lp-item';
/** Máximo de anillos simultáneos: evita saturar si se pulsa muy rápido. */
const MAX_RINGS = 4;
const RING_MS = 520;

/**
 * Micro-interacción global: un anillo dorado discreto nace donde se hace clic o
 * se toca un elemento interactivo. Solo `transform` y `opacity`; se desactiva
 * con "reducir movimiento" y no intercepta eventos (pointer-events: none).
 */
export function ClickFx() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (reduce.matches || e.button > 0 || active >= MAX_RINGS) return;
      const target = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;

      const ring = document.createElement('span');
      ring.className = 'fx-ring';
      ring.setAttribute('aria-hidden', 'true');
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.appendChild(ring);
      active += 1;
      const done = () => {
        ring.remove();
        active -= 1;
      };
      ring.addEventListener('animationend', done, { once: true });
      window.setTimeout(() => ring.isConnected && done(), RING_MS + 200); // por si la animación no corre
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    return () => document.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, []);

  return null;
}
