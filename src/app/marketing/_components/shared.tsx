'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { fetchJson } from '@/lib/swr-cache';

export interface MarketingSummary {
  publishMode: 'simulated' | 'live';
  canManageContent: boolean;
  canWrite: boolean;
  posts: { available: boolean; upcoming: number; failed: number; published30: number };
  snippets: number;
  links: { count: number; clicks: number };
  brandScore: number;
  providers: { anthropic: boolean; google: boolean };
}

export const SUMMARY_URL = '/api/marketing/summary';

/** Mensaje de estado de una acción (guardar, crear, borrar…). */
export interface Msg {
  kind: 'ok' | 'error';
  text: string;
}

/** Refresca los indicadores del encabezado tras crear o borrar algo. */
export function refreshSummary(): void {
  fetchJson<MarketingSummary>(SUMMARY_URL).catch(() => {
    /* los indicadores se actualizan en la siguiente visita */
  });
}

/** Copia texto al portapapeles; devuelve false si el navegador lo impide. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Estado «Copiado» temporal por identificador de botón. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = useCallback(async (id: string, text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? id : `${id}:error`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1600);
  }, []);
  return { copied, copy };
}

/** Reloj que se actualiza cada `ms`; arranca en null para no desajustar la hidratación. */
export function useNow(ms = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const h = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(h);
  }, [ms]);
  return now;
}

/** Segundos transcurridos mientras `running` es true (para tareas largas con cancelación). */
export function useElapsed(running: boolean): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    setSecs(0);
    const h = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(h);
  }, [running]);
  return secs;
}

/** Origen público (https://…) solo en el navegador. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

/** Comportamiento de desplazamiento que respeta «reducir movimiento». Solo en el navegador. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** Texto en español para un error de carga del tipo «HTTP 500» o un fallo de red. */
export function loadErrorText(error: string): string {
  const status = /^HTTP (\d{3})$/.exec(error)?.[1];
  if (!status) return 'Revisa tu conexión a internet e inténtalo de nuevo.';
  if (status === '401' || status === '403') return 'Tu rol no tiene permiso para ver esta información.';
  if (status.startsWith('5')) return 'El servidor tuvo un problema. Inténtalo de nuevo en unos segundos.';
  return `El servidor respondió con un error (${status}).`;
}

export function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown; message?: unknown };
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.error === 'string' && data.error) return data.error;
  } catch {
    /* respuesta sin JSON */
  }
  return res.status === 403 ? 'Tu rol no tiene permiso para esta acción.' : fallback;
}

/** Petición con cuerpo JSON; devuelve el JSON o lanza un Error con texto en español. */
export async function sendJson<T = unknown>(url: string, method: 'POST' | 'DELETE', body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await apiFetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body), signal });
  if (!res.ok) throw new Error(await readError(res, 'No se pudo completar la acción.'));
  return (await res.json()) as T;
}
