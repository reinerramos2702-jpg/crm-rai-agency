'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Lightbulb, Link2, Megaphone, Search, Target } from 'lucide-react';
import { buildUtmUrl, UTM_PRESETS } from '@/lib/marketing-links';
import { errorText, refreshSummary, sendJson, useCopy, useElapsed, type Msg } from './shared';
import { BusyBar, CardTitle, CopyButton, NeedKeyNote, Note, StatusMsg } from './ui';

interface AdsFormats {
  image: number;
  video: number;
  carousel: number;
  text: number;
}

interface AdsResult {
  success: boolean;
  htmlReport: string;
  adsFound: number;
  scrapedOk: boolean;
  analysis: { brandName: string; formats: AdsFormats; insights: string[]; recommendations: string[] };
}

const COUNTRIES: Array<[string, string]> = [['ALL', 'Todos los países'], ['VE', 'Venezuela'], ['CO', 'Colombia'], ['PE', 'Perú'], ['MX', 'México'], ['AR', 'Argentina'], ['CL', 'Chile'], ['EC', 'Ecuador'], ['PA', 'Panamá'], ['DO', 'Rep. Dominicana'], ['ES', 'España'], ['US', 'Estados Unidos']];

const NETWORKS = [
  ['Meta Ads (Facebook e Instagram)', 'Requiere conectar la API de Meta Ads y permisos de anuncios; hoy solo está la conexión de publicación orgánica.'],
  ['Google Ads', 'Requiere integración con la API de Google Ads (aún no disponible).'],
  ['TikTok Ads', 'Requiere integración con la API de TikTok Ads (aún no disponible).'],
] as const;

const FORMAT_ROWS: Array<[keyof AdsFormats, string, string]> = [['image', 'Imagen', 'ok'], ['video', 'Video', 'info'], ['carousel', 'Carrusel', 'warn'], ['text', 'Texto', 'muted']];

function FormatBar({ formats }: { formats: AdsFormats }) {
  const total = formats.image + formats.video + formats.carousel + formats.text;
  return (
    <div className="mkt-formats">
      <div className="mkt-bar" aria-hidden="true">
        {FORMAT_ROWS.filter(([k]) => formats[k] > 0).map(([k, , tone]) => <span key={k} className={`t-${tone}`} style={{ flex: `${formats[k]} 1 0` }} />)}
      </div>
      <div className="mkt-legend-inline">
        {FORMAT_ROWS.map(([k, label, tone]) => <span key={k}><span className={`mkt-dot t-${tone}`} aria-hidden="true" />{label}: {formats[k]}</span>)}
        {total === 0 && <span>Sin formatos detectados</span>}
      </div>
    </div>
  );
}

function UtmBuilder({ canWrite }: { canWrite: boolean }) {
  const { copied, copy } = useCopy();
  const [f, setF] = useState({ url: '', source: 'facebook', medium: 'paid_social', campaign: '', content: '' });
  const [msg, setMsg] = useState<Msg | null>(null);
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
      setMsg({ kind: 'error', text: errorText(e, 'No se pudo crear el enlace.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="ad-utm">
      <CardTitle id="ad-utm" icon={Link2}>Constructor de enlaces con UTM</CardTitle>
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
          <span id="utm-res-l" className="mkt-flabel">Resultado</span>
          <div className={`mkt-preview${built && built.ok ? ' is-code' : ''}`} role="region" aria-labelledby="utm-res-l" aria-live="polite" style={built && !built.ok ? { color: 'var(--rai-error)' } : undefined}>
            {built ? (built.ok ? built.url : built.error) : 'Escribe la página de destino y el nombre de la campaña.'}
          </div>
        </div>
        <StatusMsg msg={msg} />
        <div className="mkt-actions">
          <CopyButton id="utm" text={built && built.ok ? built.url : ''} copied={copied} onCopy={copy} label="Copiar URL" disabled={!built || !built.ok} />
          {canWrite && <button type="button" className="mkt-btn" disabled={!built || !built.ok || busy} onClick={() => void makeLink()}>{busy ? 'Creando…' : 'Crear enlace corto con contador'}</button>}
        </div>
      </div>
    </section>
  );
}

function AdsResearch({ google, canWrite }: { google: boolean | undefined; canWrite: boolean }) {
  const [brand, setBrand] = useState('');
  const [country, setCountry] = useState('ALL');
  const [running, setRunning] = useState(false);
  const secs = useElapsed(running);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<AdsResult | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  async function run() {
    if (!brand.trim()) return setError('Escribe el nombre de la marca a investigar.');
    ctl.current = new AbortController();
    setRunning(true); setError(null); setRes(null);
    try {
      setRes(await sendJson<AdsResult>('/api/research/ads-library', 'POST', { brandName: brand.trim(), country }, ctl.current.signal));
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError' ? 'Investigación cancelada.' : errorText(e, 'No se pudo completar la investigación.'));
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
      <CardTitle id="ad-res" icon={Search}>Anuncios de la competencia</CardTitle>
      <div className="mkt-fields">
        {google === false && <NeedKeyNote provider="Google" why="Sin ella se cuentan los anuncios leídos, pero no hay análisis con IA." />}
        {!canWrite && <Note>Tu rol es de solo lectura: no puede lanzar investigaciones.</Note>}
        <div className="mkt-fields two">
          <div className="mkt-field"><label htmlFor="ar-brand">Marca o palabra clave</label><input id="ar-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej.: nombre del competidor" onKeyDown={(e) => { if (e.key === 'Enter' && !running && canWrite) void run(); }} /></div>
          <div className="mkt-field"><label htmlFor="ar-country">País</label><select id="ar-country" value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></div>
        </div>
        <div className="mkt-actions">
          <button type="button" className="primary" disabled={running || !canWrite} onClick={() => void run()}>{running ? `Investigando… ${secs} s` : 'Investigar anuncios'}</button>
          {running && <button type="button" className="mkt-btn" onClick={() => ctl.current?.abort()}>Cancelar</button>}
          {brand.trim() && <a className="mkt-btn" href={libUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Abrir en Meta Ads Library</a>}
        </div>
        {running && (
          <>
            <BusyBar />
            <Note>Puede tardar hasta 2 minutos: se abre la biblioteca de anuncios y se leen los resultados.</Note>
          </>
        )}
        {error && <StatusMsg msg={{ kind: 'error', text: error }} />}
        {res && (
          <div className="mkt-fields" aria-live="polite">
            <Note tone={res.scrapedOk ? 'info' : 'warn'}>
              {res.scrapedOk ? <>Se encontraron <strong>{res.adsFound}</strong> anuncios para «{res.analysis.brandName}».</> : <>Meta no permitió la lectura automática (cantidad estimada: {res.adsFound}). Usa «Abrir en Meta Ads Library» para verlos directamente.</>}
            </Note>
            <FormatBar formats={res.analysis.formats} />
            <div className="mkt-results">
              <div className="mkt-result t-info"><h3><Lightbulb size={14} aria-hidden="true" />Hallazgos</h3>{res.analysis.insights.length ? <ul>{res.analysis.insights.map((i) => <li key={i}>{i}</li>)}</ul> : <p>Sin hallazgos (el análisis con IA no estuvo disponible).</p>}</div>
              <div className="mkt-result t-ok"><h3><Target size={14} aria-hidden="true" />Recomendaciones</h3>{res.analysis.recommendations.length ? <ul>{res.analysis.recommendations.map((i) => <li key={i}>{i}</li>)}</ul> : <p>Sin recomendaciones.</p>}</div>
            </div>
            <div className="mkt-actions"><button type="button" className="mkt-btn" onClick={openReport}><ExternalLink size={14} aria-hidden="true" />Abrir informe completo</button></div>
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
        <CardTitle id="ad-conn" icon={Megaphone}>Gestión de campañas pagadas</CardTitle>
        <div className="mkt-networks">
          {NETWORKS.map(([n, why]) => (
            <div key={n} className="mkt-network"><span className="fx-dot fx-dot--warn" role="img" aria-label="No conectado" /><div><strong>{n}</strong><span>Requiere conexión. {why}</span></div></div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '12px 0 0' }}>Mientras tanto puedes armar enlaces con UTM e investigar a la competencia (abajo). Las campañas internas del CRM están en <Link href="/campaign/new" style={{ color: 'var(--rai-gold)' }}>Nueva Campaña</Link>.</p>
      </section>
      <div className="mkt-split">
        <UtmBuilder canWrite={canWrite} />
        <AdsResearch google={google} canWrite={canWrite} />
      </div>
    </div>
  );
}
