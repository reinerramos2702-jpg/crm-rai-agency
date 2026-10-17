'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { parseUrlList } from '@/lib/marketing-links';
import { CopyButton, NeedKeyNote, Note, sendJson, useCopy } from './shared';

interface Insights {
  painPoints: string[];
  contentThemes: string[];
  avoidTopics: string[];
  opportunities: string[];
  toneAnalysis: string;
  rawSummary: string;
}

const SECTIONS: Array<[keyof Pick<Insights, 'painPoints' | 'contentThemes' | 'avoidTopics' | 'opportunities'>, string]> = [
  ['painPoints', 'Quejas de clientes'],
  ['contentThemes', 'Temas que usan'],
  ['avoidTopics', 'Lo que hacen mal'],
  ['opportunities', 'Oportunidades'],
];

export default function ProspectingTab({ anthropic }: { anthropic: boolean | undefined }) {
  const { copied, copy } = useCopy();
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Insights | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(h);
  }, [running]);
  useEffect(() => () => ctl.current?.abort(), []);

  const parsed = parseUrlList(text, 5);

  async function run() {
    if (parsed.urls.length === 0) return setError('Escribe al menos una dirección válida.');
    if (parsed.invalid.length > 0) return setError(`Estas direcciones no son válidas: ${parsed.invalid.join(', ')}`);
    ctl.current = new AbortController();
    setRunning(true); setSecs(0); setError(null); setRes(null);
    try {
      const r = await sendJson<{ insights: Insights }>('/api/research/competitors', 'POST', { urls: parsed.urls }, ctl.current.signal);
      setRes(r.insights);
    } catch (e) {
      setError((e as Error).name === 'AbortError' ? 'Análisis cancelado.' : e instanceof Error ? e.message : 'No se pudo completar el análisis.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="pr-form">
          <h2 id="pr-form" className="mkt-card-title"><Users size={16} aria-hidden="true" />Analizar competidores</h2>
          <div className="mkt-fields">
            {anthropic === false && <NeedKeyNote provider="Anthropic" why="El análisis lo hace Claude." />}
            <div className="mkt-field">
              <label htmlFor="pr-urls">Sitios web o perfiles públicos (uno por línea, máximo 5)</label>
              <textarea id="pr-urls" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'competidor1.com\ncompetidor2.com/tienda'} />
              <small>{parsed.urls.length} {parsed.urls.length === 1 ? 'válida' : 'válidas'}{parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} con error` : ''}{parsed.tooMany ? ' · se analizarán las primeras 5' : ''}</small>
            </div>
            {error && <p className="mkt-error" role="alert">{error}</p>}
            <div className="mkt-actions">
              <button type="button" className="primary" disabled={running} onClick={run}>{running ? `Analizando… ${secs} s` : 'Analizar'}</button>
              {running && <button type="button" className="mkt-btn" onClick={() => ctl.current?.abort()}>Cancelar</button>}
            </div>
            {running && <Note>Puede tardar hasta 2 minutos: se visita cada sitio y se resume su contenido.</Note>}
          </div>
        </section>
        <section className="card" aria-labelledby="pr-leads">
          <h2 id="pr-leads" className="mkt-card-title">Leads y contactos</h2>
          <Note tone="warn"><strong>La búsqueda automática de leads requiere un proveedor de datos.</strong> Hoy no hay extractor integrado al CRM; este análisis estudia a tu competencia, no genera contactos.</Note>
          <div className="mkt-actions" style={{ marginTop: 12 }}>
            <Link className="mkt-btn" href="/clientes-potenciales">Ir a Clientes potenciales</Link>
            <Link className="mkt-btn" href="/contactos">Ver contactos</Link>
          </div>
        </section>
      </div>

      {res && (
        <section className="card" aria-labelledby="pr-res" aria-live="polite">
          <h2 id="pr-res" className="mkt-card-title">Resultado del análisis</h2>
          <div className="mkt-results">
            {SECTIONS.map(([k, l]) => (
              <div key={k}><h3>{l}</h3>{res[k].length ? <ul>{res[k].map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted" style={{ fontSize: 13 }}>Sin datos.</p>}</div>
            ))}
            <div><h3>Tono de la competencia</h3><p className="muted" style={{ fontSize: 13, margin: 0 }}>{res.toneAnalysis}</p></div>
          </div>
          {res.rawSummary && <p className="mkt-preview" style={{ marginTop: 12, fontSize: 13 }}>{res.rawSummary}</p>}
          <div className="mkt-actions" style={{ marginTop: 10 }}><CopyButton id="pr-sum" text={res.rawSummary || res.toneAnalysis} copied={copied} onCopy={copy} label="Copiar resumen" /></div>
        </section>
      )}
    </div>
  );
}
