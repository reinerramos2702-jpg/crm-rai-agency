'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, X, AlertTriangle, Loader2, Info } from 'lucide-react';
import type { BatchDayInput, BatchResponse } from './useScheduledPosts';

interface Props {
  open: boolean;
  campaignName: string;
  days: BatchDayInput[];
  invalidDays: Array<{ day: number; reason: string }>;
  igHandle: string;
  time: string;
  timezone: string;
  mode: 'simulated' | 'live';
  metaConnected: boolean | null;
  onClose: () => void;
  onConfirm: () => Promise<BatchResponse>;
}

/** Resumen + confirmación del lote antes de programarlo. Sin blur; foco atrapado; Esc cierra. */
export default function ScheduleBatchDialog({ open, campaignName, days, invalidDays, igHandle, time, timezone, mode, metaConnected, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BatchResponse | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setBusy(false);
    const t = window.setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, busy, onClose]);

  if (!open) return null;

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const carousels = days.filter((d) => d.mediaType === 'carousel').length;
  const done = result?.ok === true;

  const confirm = async () => {
    setBusy(true);
    const r = await onConfirm();
    setResult(r);
    setBusy(false);
  };

  return (
    <div className="rai-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="rai-sheet" role="dialog" aria-modal="true" aria-labelledby="rai-sheet-title">
        <div className="rai-sheet-head">
          <span className="rai-sheet-ico"><CalendarClock size={18} /></span>
          <div>
            <h3 id="rai-sheet-title">{done ? 'Lote programado' : 'Programar lote'}</h3>
            <p>{campaignName}</p>
          </div>
          <button type="button" className="rai-sheet-x" aria-label="Cerrar" onClick={onClose} disabled={busy}><X size={16} /></button>
        </div>

        {!done && (
          <>
            <div className="rai-sheet-grid">
              <div><strong>{days.length}</strong><span>publicaciones</span></div>
              <div><strong>{carousels}</strong><span>carruseles</span></div>
              <div><strong>{time}</strong><span>{timezone}</span></div>
            </div>
            <ul className="rai-sheet-list">
              <li><span>Cuenta</span><b>{igHandle || 'Sin handle (se usará la conexión del workspace)'}</b></li>
              <li><span>Período</span><b>{first && last ? `${first} → ${last}` : '—'}</b></li>
              <li><span>Modo</span><b>{mode === 'live' ? 'Publicación real en Instagram' : 'Simulado (no publica en Instagram)'}</b></li>
            </ul>

            {mode === 'simulated' && (
              <p className="rai-sheet-note"><Info size={14} /> Modo de prueba: el CRM recorre todo el ciclo (programado → publicado) sin tocar tu cuenta real.</p>
            )}
            {mode === 'live' && metaConnected === false && (
              <p className="rai-sheet-note is-warn"><AlertTriangle size={14} /> Instagram no está conectado. Conéctalo antes de programar o los posts fallarán.</p>
            )}
            {invalidDays.length > 0 && (
              <div className="rai-sheet-note is-warn" style={{ display: 'block' }}>
                <p style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={14} /> {invalidDays.length} día(s) se omitirán:</p>
                <ul className="rai-sheet-skips">
                  {invalidDays.slice(0, 6).map((d) => <li key={d.day}>Día {d.day}: {d.reason}</li>)}
                  {invalidDays.length > 6 && <li>… y {invalidDays.length - 6} más</li>}
                </ul>
              </div>
            )}
            {result && !result.ok && <p className="rai-sheet-note is-err"><AlertTriangle size={14} /> {result.error}</p>}
          </>
        )}

        {done && (
          <div className="rai-sheet-done">
            <p><b>{(result?.created ?? 0) + (result?.updated ?? 0)}</b> publicaciones quedaron programadas{result?.updated ? ` (${result.updated} actualizadas)` : ''}.</p>
            {(result?.skipped?.length ?? 0) > 0 && (
              <ul className="rai-sheet-skips">
                {result!.skipped!.slice(0, 6).map((s, i) => <li key={i}>Día {s.day ?? '?'}: {s.reason}</li>)}
              </ul>
            )}
            <p className="rai-hint">El CRM las publicará solo a la hora indicada. Puedes cancelar o reintentar cada una desde el calendario.</p>
          </div>
        )}

        <div className="rai-sheet-actions">
          {done ? (
            <button type="button" className="primary rai-sheet-btn" onClick={onClose}>Listo</button>
          ) : (
            <>
              <button type="button" className="ghost rai-sheet-btn" onClick={onClose} disabled={busy}>Cancelar</button>
              <button type="button" ref={confirmRef} className="primary rai-sheet-btn" onClick={confirm} disabled={busy || days.length === 0}>
                {busy ? <><Loader2 size={14} className="animate-spin" /> Programando…</> : <><CalendarClock size={14} /> Programar {days.length}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
