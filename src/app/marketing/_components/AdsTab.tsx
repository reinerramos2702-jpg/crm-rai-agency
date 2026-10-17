'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Link2, Megaphone, Search } from 'lucide-react';
import { buildUtmUrl, UTM_PRESETS } from '@/lib/marketing-links';
import { CopyButton, NeedKeyNote, Note, refreshSummary, sendJson, useCopy } from './shared';

interface AdsResult {
  success: boolean;
  htmlReport: string;
  adsFound: number;
  scrapedOk: boolean;
  analysis: { brandName: string; formats: { image: number; video: number; carousel: number; text: number }; insights: string[]; recommendations: string[] };
}

const COUNTRIES: Array<[string, string]> = [['ALL', 'Todos los países'], ['VE', 'Venezuela'], ['CO', 'Colombia'], ['PE', 'Perú'], ['MX', 'México'], ['AR', 'Argentina'], ['CL', 'Chile'], ['EC', 'Ecuador'], ['PA', 'Panamá'], ['DO', 'Rep. Dominicana'], ['ES', 'España'], ['US', 'Estados Unidos']];

const NETWORKS = [
  ['Meta Ads (Facebook e Instagram)', 'Requiere conectar la API de Meta Ads y permisos de anuncios; hoy solo está la conexión de publicación orgánica.'],
  ['Google Ads', 'Requiere integración con la API de Google Ads (aún no disponible).'],
  ['TikTok Ads', 'Requiere integración con la API de TikTok Ads (aún no disponible).'],
] as const;

function UtmBuilder({ canWrite }: { canWrite: boolean }) {
  const { copied, copy } = useCopy();
  const [f, setF] = useState({ url: '', source: 'facebook', medium: 'paid_social', campaign: '', content: '' });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const built = f.url.trim() && f.campaign.trim() ? buildUtmUrl({ ...f }) : null;
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function makeLink() {
    if (!built || !built.ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const { link } = await sendJson<{ link: { slug: string } }>('/api/activation-links', 'POST', { label: `UTM ${f.campaign.trim()}`.slice(0, 80), destination: built.url });
      setMsg({ kind: 'ok', text: `Enlace creado: /go/${link.slug}. Lo ves en la pestaña Enlaces de Activación.` });
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo crear el enlace.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="ad-utm">
      <h2 id="ad-utm" className="mkt-card-title"><Link2 size={16} aria-hidden="true" />Constructor de enlaces con UTM</h2>
      <div className="mkt-fields">
        <div className="mkt-chips" role="group" aria-label="Plataformas frecuentes">
          {UTM_PRESETS.map((p) => <button key={p.id} type="button" className="mkt-chip" aria-pressed={f.source === p.source && f.medium === p.medium} onClick={() => setF((x) => ({ ...x, source: p.source, medium: p.medium }))}>{p.label}</button>)}
        </div>
        <div className="mkt-field"><label htmlFor="utm-url">Página de destino</label><input id="utm-url" inputMode="url" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="tuempresa.com/oferta" /></div>
        <div className="mkt-fields two">
          <div className="mkt-field"><label htmlFor="utm-src">Origen</label><input id="utm-src" value={f.source} onChange={(e) => set('source', e.target.value)} /></div>
          <div className="mkt-field"><label htmlFor="utm-med">Medio</label><input id="utm-med" value={f.medium} onChange={(e) => set('medium', e.target.value)} /></div>
          <div className="mkt-field"><label htmlFor="utm-camp">Campaña</label><input id="utm-camp" value={f.campaign} onChange={(e) => set('campaign', e.target.value)} placeholder="black_friday" /></div>
          <div className="mkt-field"><label htmlFor="utm-cont">Contenido (opcional)</label><input id="utm-cont" value={f.content} onChange={(e) => set('content', e.target.value)} placeholder="video_1" /></div>
        </div>
        <div className="mkt-field">
          <label>Resultado</label>
          <div className="mkt-preview" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
            {built ? (built.ok ? built.url : built.error) : 'Escribe la página de destino y el nombre de la campaña.'}
          </div>
        </div>
        {msg && <p className={msg.kind === 'ok' ? 'mkt-ok' : 'mkt-error'} role="status">{msg.text}</p>}
        <div className="mkt-actions">
          <CopyButton id="utm" text={built && built.ok ? built.url : ''} copied={copied} onCopy={copy} label="Copiar URL" disabled={!built || !built.ok} />
          {canWrite && <button type="button" className="mkt-btn" disabled={!built || !built.ok || busy} onClick={makeLink}>Crear enlace corto con contador</button>}
        </div>
      </div>
    </section>
  );
}

function AdsResearch({ google }: { google: boolean | undefined }) {
  const [brand, setBrand] = useState('');
  const [country, setCountry] = useState('ALL');
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<AdsResult | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(h);
  }, [running]);
  useEffect(() => () => ctl.current?.abort(), []);

  async function run() {
    if (!brand.trim()) return setError('Escribe el nombre de la marca a investigar.');
    ctl.current = new AbortController();
    setRunning(true); setSecs(0); setError(null); setRes(null);
    try {
      setRes(await sendJson<AdsResult>('/api/research/ads-library', 'POST', { brandName: brand.trim(), country }, ctl.current.signal));
    } catch (e) {
      setError((e as Error).name === 'AbortError' ? 'Investigación cancelada.' : e instanceof Error ? e.message : 'No se pudo completar la investigación.');
    } finally {
      setRunning(false);
    }
  }

  function openReport() {
    if (!res) return;
    const url = URL.createObjectURL(new Blob([res.htmlReport], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const libUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(brand.trim())}&search_type=keyword_unordered`;

  return (
    <section className="card" aria-labelledby="ad-res">
      <h2 id="ad-res" className="mkt-card-title"><Search size={16} aria-hidden="true" />Anuncios de la competencia</h2>
      <div className="mkt-fields">
        {google === false && <NeedKeyNote provider="Google" why="Sin ella se cuentan los anuncios leídos, pero no hay análisis con IA." />}
        <div className="mkt-fields two">
          <div className="mkt-field"><label htmlFor="ar-brand">Marca o palabra clave</label><input id="ar-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej.: nombre del competidor" onKeyDown={(e) => { if (e.key === 'Enter' && !running) void run(); }} /></div>
          <div className="mkt-field"><label htmlFor="ar-country">País</label><select id="ar-country" value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></div>
        </div>
        <div className="mkt-actions">
          <button type="button" className="primary" disabled={running} onClick={run}>{running ? `Investigando… ${secs} s` : 'Investigar anuncios'}</button>
          {running && <button type="button" className="mkt-btn" onClick={() => ctl.current?.abort()}>Cancelar</button>}
          {brand.trim() && <a className="mkt-btn" href={libUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Abrir en Meta Ads Library</a>}
        </div>
        {running && <Note>Puede tardar hasta 2 minutos: se abre la biblioteca de anuncios y se leen los resultados.</Note>}
        {error && <p className="mkt-error" role="alert">{error}</p>}
        {res && (
          <div className="mkt-fields" aria-live="polite">
            <Note tone={res.scrapedOk ? 'info' : 'warn'}>
              {res.scrapedOk ? <>Se encontraron <strong>{res.adsFound}</strong> anuncios para «{res.analysis.brandName}».</> : <>Meta no permitió la lectura automática (cantidad estimada: {res.adsFound}). Usa «Abrir en Meta Ads Library» para verlos directamente.</>}
            </Note>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>Formatos: {res.analysis.formats.image} imagen · {res.analysis.formats.video} video · {res.analysis.formats.carousel} carrusel · {res.analysis.formats.text} texto</p>
            <div className="mkt-results">
              <div><h3>Hallazgos</h3>{res.analysis.insights.length ? <ul>{res.analysis.insights.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="muted" style={{ fontSize: 13 }}>Sin hallazgos (el análisis con IA no estuvo disponible).</p>}</div>
              <div><h3>Recomendaciones</h3>{res.analysis.recommendations.length ? <ul>{res.analysis.recommendations.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="muted" style={{ fontSize: 13 }}>Sin recomendaciones.</p>}</div>
            </div>
            <div className="mkt-actions"><button type="button" className="mkt-btn" onClick={openReport}><ExternalLink size={14} />Abrir informe completo</button></div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdsTab({ canWrite, google }: { canWrite: boolean; google: boolean | undefined }) {
  return (
    <div className="mkt-panel">
      <section className="card" aria-labelledby="ad-conn">
        <h2 id="ad-conn" className="mkt-card-title"><Megaphone size={16} aria-hidden="true" />Gestión de campañas pagadas</h2>
        <div className="mkt-need">
          {NETWORKS.map(([n, why]) => (
            <div key={n} className="mkt-need-row"><span className="fx-dot fx-dot--warn" role="img" aria-label="No conectado" style={{ marginTop: 5 }} /><div><strong>{n}: requiere conexión</strong><span>{why}</span></div></div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>Mientras tanto puedes armar enlaces con UTM e investigar a la competencia (abajo). Las campañas internas del CRM están en <Link href="/campaign/new" style={{ color: 'var(--rai-gold)' }}>Nueva Campaña</Link>.</p>
      </section>
      <div className="mkt-split">
        <UtmBuilder canWrite={canWrite} />
        <AdsResearch google={google} />
      </div>
    </div>
  );
}
