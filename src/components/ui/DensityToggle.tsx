'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Rows2, Rows3, Rows4, type LucideIcon } from 'lucide-react';
import {
  DENSITIES,
  DENSITY_EVENT,
  DENSITY_KEY,
  DENSITY_LABELS,
  DEFAULT_DENSITY,
  normalizeDensity,
  type Density,
} from '@/lib/density';

const ICONS: Record<Density, LucideIcon> = {
  compact: Rows4,
  comfortable: Rows3,
  spacious: Rows2,
};

/** Lee la densidad vigente: primero el atributo (lo fija el script de <head>), después localStorage. */
export function readDensity(): Density {
  const attr = document.documentElement.dataset.density;
  if (attr) return normalizeDensity(attr);
  try {
    return normalizeDensity(window.localStorage.getItem(DENSITY_KEY));
  } catch {
    return DEFAULT_DENSITY;
  }
}

/**
 * Aplica y persiste la densidad. Avisa a los demás controles mediante un evento
 * de ventana (p. ej. la acción de la paleta de comandos).
 */
export function applyDensity(value: Density): void {
  document.documentElement.dataset.density = value;
  try {
    window.localStorage.setItem(DENSITY_KEY, value);
  } catch {
    /* sin almacenamiento: la preferencia solo dura la sesión */
  }
  window.dispatchEvent(new CustomEvent<Density>(DENSITY_EVENT, { detail: value }));
}

/**
 * Control segmentado de densidad (Compacta / Estándar / Espaciosa).
 * El estado se lee en un efecto, nunca en el inicializador de useState,
 * para evitar errores de hidratación.
 */
export function DensityToggle() {
  const [density, setDensity] = useState<Density>(DEFAULT_DENSITY);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const current = readDensity();
    document.documentElement.dataset.density = current;
    setDensity(current);
    // La transición de densidad solo se activa tras el primer render.
    const id = window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => document.documentElement.classList.add('d-anim')),
    );
    const onChange = (e: Event) => setDensity(normalizeDensity((e as CustomEvent<unknown>).detail));
    window.addEventListener(DENSITY_EVENT, onChange);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener(DENSITY_EVENT, onChange);
    };
  }, []);

  const choose = useCallback((value: Density) => {
    setDensity(value);
    applyDensity(value);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let target = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = (index + 1) % DENSITIES.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = (index - 1 + DENSITIES.length) % DENSITIES.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = DENSITIES.length - 1;
    if (target < 0) return;
    e.preventDefault();
    choose(DENSITIES[target]);
    refs.current[target]?.focus();
  };

  return (
    <div className="fx-density">
      <div className="fx-density-head">
        <span>Densidad</span>
        <strong>{DENSITY_LABELS[density]}</strong>
      </div>
      <div className="fx-density-seg" role="radiogroup" aria-label="Densidad de la interfaz">
        {DENSITIES.map((value, i) => {
          const Icon = ICONS[value];
          const checked = value === density;
          return (
            <button
              key={value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={DENSITY_LABELS[value]}
              title={DENSITY_LABELS[value]}
              tabIndex={checked ? 0 : -1}
              className="fx-density-opt"
              onClick={() => choose(value)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <Icon size={15} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
