'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Compass, Lightbulb, MessageSquareQuote, ThumbsDown, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseUrlList } from '@/lib/marketing-links';
import { errorText, sendJson, useCopy, useElapsed } from './shared';
import { BusyBar, CardTitle, CopyButton, NeedKeyNote, Note, StatusMsg } from './ui';

interface Insights {
  painPoints: string[];
  contentThemes: string[];
  avoidTopics: string[];
  opportunities: string[];
  toneAnalysis: string;
  rawSummary: string;
}

type ListKey = 'painPoints' | 'contentThemes' | 'avoidTopics' | 'opportunities';

const SECTIONS: Array<[ListKey, string, LucideIcon, string]> = [
  ['painPoints', 'Quejas de clientes', AlertCircle, 'danger'],
  ['contentThemes', 'Temas que usan', Compass, 'info'],
  ['avoidTopics', 'Lo que hacen mal', ThumbsDown, 'warn'],
  ['opportunities', 'Oportunidades', Lightbulb, 'ok'],
];

export default function ProspectingTab({ anthropic, canWrite }: { anthropic: boolean | undefined; canWrite: boolean }) {
  const { copied, copy } = useCopy();
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const secs = useElapsed(running);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Insights | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  const parsed = parseUrlList(text, 5);

  async function run() {
    if (parsed.urls.length === 0) return setError('Escribe al menos una dirección válida.');
    if (parsed.invalid.length > 0) return setError(`Estas direcciones no son válidas: ${parsed.invalid.join(', ')}`);
    ctl.current = new AbortController();
    setRunning(true); setError(null); setRes(null);
    try {
      const r = await sendJson<{ insights: Insights }>('/api/research/competitors', 'POST', { urls: parsed.urls }, ctl.current.signal);
      setRes(r.insights);
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError' ? 'Análisis cancelado.' : errorText(e, 'No se pudo completar el análisis.'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="pr-form">
          <CardTitle id="pr-form" icon={Users}>Analizar competidores</CardTitle>
          <div className="mkt-fields">
            {anthropic === false && <NeedKeyNote provider="Anthropic" why="El análisis lo hace Claude." />}
            {!canWrite && <Note>Tu rol es de solo lectura: no puede lanzar análisis.</Note>}
            <div className="mkt-field">
              <label htmlFor="pr-urls">Sitios web o perfiles públicos (uno por línea, máximo 5)</label>
              <textarea id="pr-urls" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'competidor1.com\ncompetidor2.com/tienda'} />
              <small>{parsed.urls.length} {parsed.urls.length === 1 ? 'válida' : 'válidas'}{parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} con error` : ''}{parsed.tooMany ? ' · se analizarán las primeras 5' : ''}</small>
            </div>
            {error && <StatusMsg msg={{ kind: 'error', text: error }} />}
            <div className="mkt-actions">
              <button type="button" className="primary" disabled={running || !canWrite} onClick={() => void run()}>{running ? `Analizando… ${secs} s` : 'Analizar'}</button>
              {running && <button type="button" className="mkt-btn" onClick={() => ctl.current?.abort()}>Cancelar</button>}
            </div>
            {running && (
              <>
                <BusyBar />
                <Note>Puede tardar hasta 2 minutos: se visita cada sitio y se resume su contenido.</Note>
              </>
            )}
          </div>
        </section>
        <section className="card" aria-labelledby="pr-leads">
          <CardTitle id="pr-leads" icon={Users}>Leads y contactos</CardTitle>
          <Note tone="warn"><strong>La búsqueda automática de leads requiere un proveedor de datos.</strong> Hoy no hay extractor integrado al CRM; este análisis estudia a tu competencia, no genera contactos.</Note>
          <div className="mkt-actions" style={{ marginTop: 12 }}>
            <Link className="mkt-btn" href="/clientes-potenciales">Ir a Clientes potenciales</Link>
            <Link className="mkt-btn" href="/contactos">Ver contactos</Link>
          </div>
        </section>
      </div>

      {res && (
        <section className="card" aria-labelledby="pr-res" aria-live="polite">
          <CardTitle id="pr-res" icon={Lightbulb}>Resultado del análisis</CardTitle>
          <div className="mkt-results">
            {SECTIONS.map(([k, l, Icon, tone]) => (
              <div key={k} className={`mkt-result t-${tone}`}><h3><Icon size={14} aria-hidden="true" />{l}</h3>{res[k].length ? <ul>{res[k].map((x) => <li key={x}>{x}</li>)}</ul> : <p>Sin datos.</p>}</div>
            ))}
            <div className="mkt-result t-muted"><h3><MessageSquareQuote size={14} aria-hidden="true" />Tono de la competencia</h3><p>{res.toneAnalysis}</p></div>
          </div>
          {res.rawSummary && <p className="mkt-preview" style={{ marginTop: 12, fontSize: 13 }}>{res.rawSummary}</p>}
          <div className="mkt-actions" style={{ marginTop: 10 }}><CopyButton id="pr-sum" text={res.rawSummary || res.toneAnalysis} copied={copied} onCopy={copy} label="Copiar resumen" /></div>
        </section>
      )}
    </div>
  );
}
