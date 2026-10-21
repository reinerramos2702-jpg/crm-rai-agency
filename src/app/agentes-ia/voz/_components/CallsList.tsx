'use client';

import React, { useState } from 'react';
import { ChevronDown, Loader2, PhoneIncoming, PhoneOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OUTCOME_LABEL, formatDuration } from '@/lib/voice/call-meta';
import type { CallListItem } from '@/lib/voice/queries';
import { fmtDateTime, usd } from './format';

const OUTCOME_DOT: Record<CallListItem['outcome'], string> = {
  resolved: 'fx-dot--ok', unresolved: 'fx-dot--warn', transferred: 'fx-dot--ok', voicemail: '', missed: '', error: 'fx-dot--danger', in_progress: 'fx-dot--live', unknown: '',
};
const SENTIMENT: Record<string, string> = { Positive: 'Positivo', Negative: 'Negativo', Neutral: 'Neutral', Unknown: 'Sin dato' };
const PREVIEW_TURNS = 24;

function Call({ call }: { call: CallListItem }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const turns = all ? call.transcript : call.transcript.slice(0, PREVIEW_TURNS);
  const panelId = `vz-tr-${call.id}`;

  return (
    <li className="vz-call">
      <div className="vz-call-top">
        <span className="vz-call-who">
          <strong>{call.contact.phone ?? call.contact.name}</strong>
          {call.webCall && <span className="ag-pill">Prueba</span>}
        </span>
        <span className="vz-call-meta muted">{fmtDateTime(call.startedAt)} · {formatDuration(call.durationSec)}{call.costUsd !== null ? ` · ${usd(call.costUsd)}` : ''}</span>
      </div>
      <div className="vz-call-outcome">
        <span className={`fx-dot ${OUTCOME_DOT[call.outcome]}`} aria-hidden="true" /> {OUTCOME_LABEL[call.outcome]}
        {call.sentiment && <span className="muted"> · {SENTIMENT[call.sentiment] ?? call.sentiment}</span>}
      </div>
      {call.summary && <p className="vz-call-summary">{call.summary}</p>}
      <div className="vz-call-actions">
        {call.transcript.length > 0 ? (
          <button type="button" className="ag-btn ag-btn--ghost" style={{ minHeight: 34, padding: '0 12px' }} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
            <ChevronDown size={14} className="vz-chev" data-open={open} aria-hidden="true" /> {open ? 'Ocultar transcripción' : 'Ver transcripción'}
          </button>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>Sin transcripción (grabación y transcripción desactivadas, o la llamada no conectó).</span>
        )}
        {call.recordingUrl && <a className="ag-btn ag-btn--ghost" style={{ minHeight: 34, padding: '0 12px' }} href={call.recordingUrl} target="_blank" rel="noopener noreferrer">Escuchar</a>}
      </div>
      {open && (
        <div id={panelId} className="vz-transcript fx-field-in">
          {turns.map((t, i) => (
            <p key={i} className="vz-turn" data-role={t.role}><span className="vz-turn-who">{t.role === 'agent' ? 'Agente' : 'Llamante'}</span>{t.text}</p>
          ))}
          {!all && call.transcript.length > PREVIEW_TURNS && (
            <button type="button" className="ag-btn ag-btn--ghost" style={{ minHeight: 32, padding: '0 10px' }} onClick={() => setAll(true)}>Mostrar las {call.transcript.length} intervenciones</button>
          )}
        </div>
      )}
    </li>
  );
}

interface Props {
  calls: CallListItem[] | undefined;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
}

export function CallsList({ calls, loading, error, hasMore, loadingMore, onMore }: Props) {
  if (loading) return <SkeletonCard lines={4} />;
  if (error && !calls) return <p className="vz-err" role="alert">No se pudieron cargar las llamadas: {error}</p>;
  if (!calls || calls.length === 0) {
    return (
      <EmptyState
        icon={PhoneOff}
        title="Aún no hay llamadas"
        text="Cuando el número reciba su primera llamada aparecerá aquí con duración, resultado, resumen y transcripción. Mientras tanto, prueba el agente con el simulador."
      />
    );
  }
  return (
    <section className="card vz-card" aria-labelledby="vz-calls-title">
      <div className="vz-card-head">
        <h2 id="vz-calls-title" className="vz-h2"><PhoneIncoming size={16} color="var(--ag-voice)" aria-hidden="true" /> Llamadas recientes</h2>
      </div>
      <ul className="vz-calls">{calls.map((c) => <Call key={c.id} call={c} />)}</ul>
      {hasMore && (
        <button type="button" className="ag-btn ag-btn--ghost" style={{ marginTop: 12 }} onClick={onMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="animate-spin" size={14} aria-hidden="true" />} Cargar más
        </button>
      )}
    </section>
  );
}
