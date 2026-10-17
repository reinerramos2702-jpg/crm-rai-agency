'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Info } from 'lucide-react';
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

interface CopyButtonProps {
  id: string;
  text: string;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
  label?: string;
  disabled?: boolean;
}

export function CopyButton({ id, text, copied, onCopy, label = 'Copiar', disabled }: CopyButtonProps) {
  const done = copied === id;
  const failed = copied === `${id}:error`;
  return (
    <button type="button" className={`mkt-btn${done ? ' is-done' : ''}`} disabled={disabled} onClick={() => onCopy(id, text)}>
      {done ? <Check size={14} /> : <Copy size={14} />}
      <span aria-live="polite">{done ? 'Copiado' : failed ? 'No se pudo copiar' : label}</span>
    </button>
  );
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

/** Origen público (https://…) solo en el navegador. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
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

type NoteTone = 'info' | 'warn';

export function Note({ tone = 'info', children }: { tone?: NoteTone; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`mkt-note is-${tone}`} role="note">
      <Icon size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function NeedKeyNote({ provider, why }: { provider: string; why: string }) {
  return (
    <Note tone="warn">
      <strong>Requiere clave de {provider}.</strong> {why}{' '}
      <Link href="/keys">Agregar clave en Claves API</Link> (solo administradores).
    </Note>
  );
}

export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card mkt-skel-panel" aria-busy="true" role="status">
      <span className="fx-sr-only">Cargando…</span>
      <div style={{ display: 'grid', gap: 14 }}>
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="fx-shimmer fx-skel-line" style={{ width: i % 2 ? '86%' : '100%', height: 16 }} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
