'use client';

import { useCallback, useMemo, useState } from 'react';
import { validateSiteForm, type SiteFormErrors, type SiteFormValues } from './site-model';

/**
 * Estado del formulario de sitio con validación en línea:
 * un error se muestra al salir del campo o tras un primer intento de guardar.
 */
export function useSiteForm(initial: SiteFormValues) {
  const [values, setValues] = useState<SiteFormValues>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof SiteFormValues, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const all = useMemo(() => validateSiteForm(values), [values]);
  const errors = useMemo<SiteFormErrors>(() => {
    if (submitted) return all;
    const visible: SiteFormErrors = {};
    for (const key of Object.keys(all) as Array<keyof SiteFormValues>) {
      if (touched[key]) visible[key] = all[key];
    }
    return visible;
  }, [all, touched, submitted]);

  const set = useCallback(<K extends keyof SiteFormValues>(key: K, value: SiteFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  const touch = useCallback((key: keyof SiteFormValues) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }, []);

  /** Marca el envío y devuelve true si el formulario es válido. */
  const validate = useCallback((): boolean => {
    setSubmitted(true);
    return Object.keys(all).length === 0;
  }, [all]);

  return { values, errors, set, touch, validate };
}
