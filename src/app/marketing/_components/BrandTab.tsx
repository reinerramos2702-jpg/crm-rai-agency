'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Circle, FileText, Palette } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { readableOn, type ChecklistItem, type ParsedBrandProfile } from '@/lib/marketing-brand';
import { Note, SectionSkeleton, useCopy } from './shared';

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
  const { data, error, loading } = useCachedJson<{ brand: BrandData }>(BRAND_URL);
  const { copied, copy } = useCopy();
  if (loading) return <SectionSkeleton rows={6} />;
  if (!data) return <p className="mkt-error" role="alert">No se pudo cargar la ficha de marca ({error}).</p>;
  const b = data.brand;
  const pending = b.checklist.filter((c) => !c.done);

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="br-id">
          <h2 id="br-id" className="mkt-card-title"><Palette size={16} aria-hidden="true" />{b.businessName.trim() || 'Tu marca'}<small>Completa al {b.score} %</small></h2>
          <div className="mkt-meter" role="progressbar" aria-valuenow={b.score} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la ficha de marca"><span style={{ width: `${b.score}%` }} /></div>
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
          <h2 id="br-pal" className="mkt-card-title">Paleta de colores<small>{b.palette.length}</small></h2>
          {b.palette.length === 0 ? (
            <Note>Aún no hay colores con código. Escribe tus colores con su código hexadecimal (por ejemplo, #C9A84C) en la configuración de marca y aparecerán aquí.</Note>
          ) : (
            <div className="mkt-swatches">
              {b.palette.map((c) => (
                <button key={c} type="button" className="mkt-swatch" style={{ background: c, color: readableOn(c) }} onClick={() => copy(`sw-${c}`, c)} aria-label={`Copiar color ${c}`}>
                  {c}<small>{copied === `sw-${c}` ? 'Copiado' : 'Tocar para copiar'}</small>
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
          <h2 id="br-doc" className="mkt-card-title"><FileText size={16} aria-hidden="true" />Documento de marca</h2>
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
          <h2 id="br-todo" className="mkt-card-title">Para completarla<small>{pending.length === 0 ? 'Todo listo' : `${pending.length} pendientes`}</small></h2>
          {b.checklist.map((c) => (
            <div key={c.id} className="mkt-check">
              {c.done ? <Check size={16} className="is-ok" aria-label="Completado" /> : <Circle size={16} className="is-todo" aria-label="Pendiente" />}
              <div><strong>{c.label}</strong><span>{c.hint}</span></div>
              {!c.done && <Link className="mkt-btn" href={c.href}>Completar</Link>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
