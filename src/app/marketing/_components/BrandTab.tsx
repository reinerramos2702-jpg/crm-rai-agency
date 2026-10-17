'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Circle, FileText, ListChecks, Palette } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { readableOn, type ChecklistItem, type ParsedBrandProfile } from '@/lib/marketing-brand';
import { loadErrorText, useCopy } from './shared';
import { CardTitle, InlineError, Meter, Note } from './ui';
import { SplitSkeleton } from './skeletons';

export interface BrandData {
  configured: boolean;
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessWebsite: string;
  igHandle: string;
  brandTone: string;
  brandColorsText: string;
  targetAudience: string;
  services: string;
  rulesCount: number;
  doc: { name: string | null; updatedAt: string | null; hasDoc: boolean; charCount: number; excerpt: string };
  profile: ParsedBrandProfile;
  palette: string[];
  checklist: ChecklistItem[];
  score: number;
}

export const BRAND_URL = '/api/marketing/brand';

function Row({ k, v }: { k: string; v: string }) {
  return (<><dt>{k}</dt><dd>{v.trim() ? v : <span className="muted">Sin completar</span>}</dd></>);
}

export default function BrandTab() {
  const { data, error, loading, refresh, revalidating } = useCachedJson<{ brand: BrandData }>(BRAND_URL);
  const { copied, copy } = useCopy();
  if (loading) {
    return (
      <div className="mkt-panel" aria-busy="true">
        <SplitSkeleton fields={5} />
        <SplitSkeleton fields={3} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mkt-panel">
        <InlineError title="No se pudo cargar la ficha de marca." detail={loadErrorText(error ?? '')} onRetry={() => void refresh()} retrying={revalidating} />
        <div className="mkt-idle"><SplitSkeleton idle fields={5} /></div>
      </div>
    );
  }
  const b = data.brand;
  const pending = b.checklist.filter((c) => !c.done);
  const scoreTone = b.score >= 100 ? 'ok' : b.score >= 60 ? 'warn' : 'danger';

  return (
    <div className="mkt-panel">
      {error !== null && <InlineError title="No se pudo actualizar la ficha." detail={`${loadErrorText(error)} Se muestra lo último guardado.`} onRetry={() => void refresh()} retrying={revalidating} />}
      <div className="mkt-split">
        <section className="card" aria-labelledby="br-id">
          <CardTitle id="br-id" icon={Palette} meta={`Completa al ${b.score} %`}>{b.businessName.trim() || 'Tu marca'}</CardTitle>
          <Meter value={b.score} tone={scoreTone} label="Avance de la ficha de marca" />
          <dl className="mkt-kv" style={{ marginTop: 14 }}>
            <Row k="Tipo de negocio" v={b.businessType} />
            <Row k="Ubicación" v={b.businessLocation} />
            <Row k="Sitio web" v={b.businessWebsite} />
            <Row k="Instagram" v={b.igHandle} />
            <Row k="Tono" v={b.brandTone || b.profile.tone} />
            <Row k="Voz" v={b.profile.voice} />
            <Row k="Público" v={b.targetAudience} />
            <Row k="Servicios" v={b.services} />
            <Row k="Reglas de marca" v={b.rulesCount > 0 ? `${b.rulesCount} definidas` : ''} />
          </dl>
          {b.profile.lists.map((l) => (
            <p key={l.label} style={{ fontSize: 13, margin: '10px 0 0' }}><strong>{l.label}:</strong> <span className="muted">{l.items.join(', ')}</span></p>
          ))}
        </section>

        <section className="card" aria-labelledby="br-pal">
          <CardTitle id="br-pal" icon={Palette} meta={b.palette.length}>Paleta de colores</CardTitle>
          {b.palette.length === 0 ? (
            <Note>Aún no hay colores con código. Escribe tus colores con su código hexadecimal (por ejemplo, #C9A84C) en la configuración de marca y aparecerán aquí.</Note>
          ) : (
            <div className="mkt-swatches">
              {b.palette.map((c) => (
                <button key={c} type="button" className="mkt-swatch" style={{ background: c, color: readableOn(c) }} onClick={() => copy(`sw-${c}`, c)} aria-label={`Copiar color ${c}`}>
                  {c}<small aria-live="polite">{copied === `sw-${c}` ? 'Copiado' : copied === `sw-${c}:error` ? 'No se pudo copiar' : 'Tocar para copiar'}</small>
                </button>
              ))}
            </div>
          )}
          {b.brandColorsText.trim() && <p className="muted" style={{ fontSize: 12, marginTop: 10, overflowWrap: 'anywhere' }}>Texto original: {b.brandColorsText}</p>}
          <div style={{ marginTop: 14 }}>
            <Note tone="info"><strong>Logos y tipografías: requieren almacenamiento de archivos.</strong> Hoy el CRM no guarda activos de marca; la ficha usa los datos de configuración y el documento de marca.</Note>
          </div>
        </section>
      </div>

      <div className="mkt-split">
        <section className="card" aria-labelledby="br-doc">
          <CardTitle id="br-doc" icon={FileText}>Documento de marca</CardTitle>
          {b.doc.hasDoc ? (
            <>
              <dl className="mkt-kv">
                <Row k="Archivo" v={b.doc.name ?? 'Cargado desde Automatización'} />
                <Row k="Actualizado" v={b.doc.updatedAt ? new Date(b.doc.updatedAt).toLocaleDateString('es') : ''} />
                <Row k="Tamaño" v={b.doc.charCount > 0 ? `${b.doc.charCount.toLocaleString('es')} caracteres` : ''} />
              </dl>
              {b.doc.excerpt && <p className="mkt-preview" style={{ marginTop: 12, fontSize: 13 }}>{b.doc.excerpt}{b.doc.charCount > b.doc.excerpt.length ? '…' : ''}</p>}
            </>
          ) : (
            <Note tone="warn">Todavía no hay documento de marca. Súbelo (.docx) en el <Link href="/generador-imagenes">Generador de imágenes</Link>: la IA lo usa como guía de estilo.</Note>
          )}
        </section>

        <section className="card" aria-labelledby="br-todo">
          <CardTitle id="br-todo" icon={ListChecks} meta={pending.length === 0 ? 'Todo listo' : `${pending.length} pendientes`}>Para completarla</CardTitle>
          {b.checklist.map((c) => (
            <div key={c.id} className="mkt-check">
              {c.done ? <Check size={16} className="is-ok" role="img" aria-label="Completado" /> : <Circle size={16} className="is-pending" role="img" aria-label="Pendiente" />}
              <div><strong>{c.label}</strong><span>{c.hint}</span></div>
              {!c.done && <Link className="mkt-btn" href={c.href}>Completar</Link>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
