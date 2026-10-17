'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TourStep } from '../ProductTour';
import { TOUR_KEY } from './constants';
import { isIgView, type IgView } from './types';

/** Recorrido guiado: se abre solo la primera vez (si el almacenamiento lo permite) y se puede repetir. */
export function useIgTour(setView: (view: IgView) => void) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === 'done';
    } catch {
      seen = false;
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 1000);
    return () => window.clearTimeout(t);
  }, []);

  const onStep = useCallback((step: TourStep) => {
    if (isIgView(step.view)) setView(step.view);
  }, [setView]);

  const close = useCallback((completed: boolean) => {
    try {
      localStorage.setItem(TOUR_KEY, 'done');
    } catch {
      /* sin almacenamiento: el recorrido se podrá repetir */
    }
    setOpen(false);
    setView(completed ? 'config' : 'campaigns');
  }, [setView]);

  return { open, setOpen, onStep, close };
}
