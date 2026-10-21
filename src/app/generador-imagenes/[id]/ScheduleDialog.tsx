'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/ui/Spinner';
import {
  buildSchedulePayload,
  campaignRefFor,
  localIsoDate,
  prepareSchedule,
  type SchedulePiece,
} from '@/lib/grid-schedule';
import type { PublishMode } from '@/lib/scheduled-posts';

interface ScheduleDialogProps {
  gridId: string;
  pieces: SchedulePiece[];
  onClose: () => void;
}

type Loaded =
  | { state: 'loading' }
  | { state: 'ready'; mode: PublishMode; existing: number }
  | { state: 'pending' }
  | { state: 'forbidden' }
  | { state: 'error'; message: string };

interface ScheduleListResponse {
  mode?: PublishMode;
  posts?: unknown[];
}

const DATE_FORMAT = new Intl.DateTimeFormat('es', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });

function formatIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DATE_FORMAT.format(new Date(Date.UTC(y, m - 1, d)));
}

/** Confirmación clara antes de enviar la semana al planificador de Instagram. */
export function ScheduleDialog({ gridId, pieces, onClose }: ScheduleDialogProps) {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });
  const [startDate, setStartDate] = useState(() => localIsoDate(1));
  const [liveAck, setLiveAck] = useState(false);
  const [sending, setSending] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  // Una sola consulta al abrir: modo de publicación y publicaciones previas de esta grilla.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/content-planner/schedule?campaignRef=${encodeURIComponent(campaignRefFor(gridId))}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.status === 403 || res.status === 401) return setLoaded({ state: 'forbidden' });
        if (res.status === 503) return setLoaded({ state: 'pending' });
        if (!res.ok) return setLoaded({ state: 'error', message: `No se pudo consultar el planificador (${res.status}).` });
        const data = (await res.json()) as ScheduleListResponse;
        setLoaded({ state: 'ready', mode: data.mode === 'live' ? 'live' : 'simulated', existing: data.posts?.length ?? 0 });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setLoaded({ state: 'error', message: 'Sin conexión con el servidor.' });
      }
    })();
    return () => controller.abort();
  }, [gridId]);

  const mode: PublishMode = loaded.state === 'ready' ? loaded.mode : 'simulated';
  const rows = useMemo(() => prepareSchedule(pieces, startDate, mode), [pieces, startDate, mode]);
  const sendable = rows.filter((r) => r.skipReason === null).length;
  const canSend = loaded.state === 'ready' && sendable > 0 && !sending && (mode === 'simulated' || liveAck);

  async function confirm() {
    setSending(true);
    try {
      const res = await fetch('/api/content-planner/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSchedulePayload(gridId, rows)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        created?: number;
        updated?: number;
        skipped?: Array<{ day: number | null; reason: string }>;
      };
      if (!res.ok) throw new Error(data.message || data.error || 'No se pudo programar');
      const done = (data.created ?? 0) + (data.updated ?? 0);
      const skipped = data.skipped?.length ?? 0;
      toast.success(
        `${done} publicación${done === 1 ? '' : 'es'} ${mode === 'simulated' ? 'simulada' + (done === 1 ? '' : 's') : 'programada' + (done === 1 ? '' : 's')}` +
          (skipped ? ` · ${skipped} omitida${skipped === 1 ? '' : 's'}` : ''),
        { duration: 6000 },
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo programar');
      setSending(false);
    }
  }

  return (
    <div className="gi-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && !sending && onClose()}>
      <div className="gi-dialog" role="dialog" aria-modal="true" aria-labelledby="gw-sched-title">
        <div className="row-between gi-dialog-head">
          <div>
            <h2 id="gw-sched-title">Enviar a Contenido IG</h2>
            <p className="muted">Un día por publicación, a partir de la fecha de inicio.</p>
          </div>
          <button ref={closeRef} type="button" className="btn-icon btn-sm" aria-label="Cerrar" onClick={onClose} disabled={sending}>
            <X size={16} />
          </button>
        </div>

        {loaded.state === 'loading' && (
          <p className="muted row" style={{ gap: 8 }}><Spinner size="sm" /> Consultando el planificador…</p>
        )}
        {loaded.state === 'forbidden' && (
          <div className="gw-note is-warn" role="alert">
            <AlertTriangle size={15} /> Tu rol no puede programar publicaciones. Pide a un gerente que lo haga.
          </div>
        )}
        {loaded.state === 'pending' && (
          <div className="gw-note is-warn" role="alert">
            <AlertTriangle size={15} /> El planificador aún no está listo en esta base de datos (falta aplicar la tabla de publicaciones).
          </div>
        )}
        {loaded.state === 'error' && (
          <div className="gw-note is-warn" role="alert">
            <AlertTriangle size={15} /> {loaded.message}
          </div>
        )}

        {loaded.state === 'ready' && (
          <>
            <div className={`gw-note ${mode === 'live' ? 'is-live' : 'is-sim'}`}>
              {mode === 'simulated'
                ? 'Modo simulado: las publicaciones se registran y recorren el flujo, pero no se envían a Instagram.'
                : 'Modo real: cada publicación se enviará a Instagram a la hora programada.'}
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label htmlFor="gw-start">Fecha de inicio (día 1)</label>
              <input
                id="gw-start"
                type="date"
                value={startDate}
                min={localIsoDate(0)}
                onChange={(e) => e.target.value && setStartDate(e.target.value)}
              />
              <p className="muted" style={{ marginTop: 4 }}>
                La hora y la zona horaria son las de tu configuración del planificador.
              </p>
            </div>

            {loaded.existing > 0 && (
              <p className="muted" style={{ marginBottom: 10 }}>
                Esta grilla ya tiene {loaded.existing} publicación{loaded.existing === 1 ? '' : 'es'} en el planificador:
                los días repetidos se actualizan y los ya publicados no se tocan.
              </p>
            )}
          </>
        )}

        <ul className="gw-sched-rows" aria-label="Resumen por día">
          {rows.map((r) => (
            <li key={r.day} className={r.skipReason ? 'is-skipped' : ''}>
              <span className="gw-sched-day">Día {r.day}</span>
              <span className="gw-sched-when">{formatIso(r.date)}</span>
              <span className="gw-sched-what">
                {r.skipReason ? (
                  <span className="gw-sched-skip">Se omite: {r.skipReason}</span>
                ) : (
                  <>
                    <span className="gw-sched-title">{r.title || r.caption.slice(0, 40)}</span>
                    <span className="muted">
                      {r.mediaUrls.length === 0
                        ? 'sin imagen'
                        : r.mediaUrls.length === 1
                          ? '1 imagen'
                          : `carrusel de ${r.mediaUrls.length}`}
                      {r.droppedImages > 0 && ` · ${r.droppedImages} sin URL pública`}
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>

        {mode === 'live' && loaded.state === 'ready' && (
          <label className="gw-ack">
            <input type="checkbox" checked={liveAck} onChange={(e) => setLiveAck(e.target.checked)} />
            <span>Entiendo que estas publicaciones saldrán realmente en Instagram.</span>
          </label>
        )}

        <div className="row gi-dialog-foot">
          <Link href="/automatizacion" className="btn-ghost btn-sm" style={{ marginRight: 'auto' }}>
            Abrir Contenido IG
          </Link>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => void confirm()} disabled={!canSend}>
            {sending ? <Spinner size="sm" /> : <CalendarClock size={15} />}
            {mode === 'simulated'
              ? `Simular ${sendable} publicación${sendable === 1 ? '' : 'es'}`
              : `Programar ${sendable} publicación${sendable === 1 ? '' : 'es'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
