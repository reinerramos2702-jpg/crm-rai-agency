'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Mail, Save } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EMAIL_CATEGORIES, EMAIL_TEMPLATES, renderEmail, type EmailTemplate } from '@/lib/marketing-email-templates';
import { SNIPPET_SAMPLE_VALUES } from '@/lib/marketing-snippets';
import { marketingTabHref } from '@/lib/marketing-tabs';
import { errorText, refreshSummary, sendJson, useCopy, type Msg } from './shared';
import { CardTitle, CopyButton, Note, StatusMsg } from './ui';
import { BRAND_URL, type BrandData } from './BrandTab';

const FIELDS: Array<[string, string]> = [['nombre', 'Nombre'], ['empresa', 'Empresa'], ['fecha', 'Fecha'], ['enlace', 'Enlace'], ['telefono', 'Teléfono']];
const SUBJECT_IDEAL = 60;

export default function EmailsTab({ canWrite }: { canWrite: boolean }) {
  const { copied, copy } = useCopy();
  const brand = useCachedJson<{ brand: BrandData }>(BRAND_URL);
  const [cat, setCat] = useState<(typeof EMAIL_CATEGORIES)[number]>('Todas');
  const [sel, setSel] = useState<EmailTemplate>(EMAIL_TEMPLATES[0]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  const list = cat === 'Todas' ? EMAIL_TEMPLATES : EMAIL_TEMPLATES.filter((t) => t.category === cat);
  const accent = brand.data?.brand.palette[0] ?? '#C9A84C';
  const company = brand.data?.brand.businessName.trim();
  const merged = useMemo(() => ({ ...(company ? { empresa: company } : {}), ...vals }), [vals, company]);
  const mail = useMemo(() => renderEmail(sel, merged, accent), [sel, merged, accent]);
  const paragraphs = mail.text.split(/\n{2,}/);
  const subjectLen = mail.subject.length;

  async function saveSnippet() {
    setBusy(true);
    setMsg(null);
    try {
      await sendJson('/api/snippets', 'POST', { title: `Correo: ${sel.name}`, body: sel.body });
      setMsg({ kind: 'ok', text: 'Guardada en Fragmentos con sus variables.' });
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: errorText(e, 'No se pudo guardar.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mkt-panel">
      <Note tone="warn">
        <strong>Envío de campañas: requiere un proveedor de correo.</strong> El CRM solo envía correos del sistema (como recuperar contraseña) con Resend; no hay envío masivo ni listas.
        Personaliza una plantilla aquí y cópiala a tu proveedor.
      </Note>
      {brand.error !== null && !brand.data && (
        <Note tone="warn">
          No se pudo leer tu marca, así que la vista previa usa el color y el nombre predeterminados.
          <div className="mkt-note-actions"><button type="button" className="mkt-btn" onClick={() => void brand.refresh()}>Reintentar</button></div>
        </Note>
      )}
      <div className="mkt-split">
        <section className="card" aria-labelledby="em-lib">
          <CardTitle id="em-lib" icon={Mail} meta={list.length}>Plantillas</CardTitle>
          <div className="mkt-chips" role="group" aria-label="Categoría" style={{ marginBottom: 8 }}>
            {EMAIL_CATEGORIES.map((c) => <button key={c} type="button" className="mkt-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="mkt-list">
            {list.map((t) => {
              const on = sel.id === t.id;
              return (
                <article key={t.id} className={`mkt-item is-selectable${on ? ' is-selected' : ''}`}>
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.subject}</p>
                    <div className="mkt-meta"><span className="mkt-cat">{t.category}</span></div>
                  </div>
                  <div className="mkt-item-actions">
                    <button type="button" className={on ? 'mkt-btn is-done' : 'mkt-btn'} aria-pressed={on} onClick={() => { setSel(t); setMsg(null); }}>{on ? 'Seleccionada' : 'Usar'}</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="card" aria-labelledby="em-prev">
          <CardTitle id="em-prev" icon={Eye}>Vista previa</CardTitle>
          <div className="mkt-fields two" style={{ marginBottom: 12 }}>
            {FIELDS.map(([k, l]) => (
              <div key={k} className="mkt-field">
                <label htmlFor={`em-${k}`}>{l}</label>
                <input id={`em-${k}`} value={vals[k] ?? ''} placeholder={k === 'empresa' && company ? company : SNIPPET_SAMPLE_VALUES[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mkt-mail-frame">
            <div className="mkt-mail-bar">
              <span><strong>{sel.name}</strong></span>
              <span style={{ marginLeft: 'auto', color: subjectLen > SUBJECT_IDEAL ? 'var(--rai-warning)' : undefined }}>Asunto: {subjectLen} caracteres{subjectLen > SUBJECT_IDEAL ? ` (ideal hasta ${SUBJECT_IDEAL})` : ''}</span>
            </div>
            <div className="mkt-mail" style={{ ['--mkt-accent' as string]: accent }}>
              <p className="mkt-mail-subject">{mail.subject}</p>
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Las variables sin valor quedan como {'{{variable}}'} para que veas qué falta. {brand.data?.brand.palette[0] ? 'El borde usa el primer color de tu marca.' : ''}</p>
          <div className="mkt-actions" style={{ marginTop: 10 }}>
            <CopyButton id="em-subject" text={mail.subject} copied={copied} onCopy={copy} label="Copiar asunto" />
            <CopyButton id="em-text" text={mail.text} copied={copied} onCopy={copy} label="Copiar texto" />
            <CopyButton id="em-html" text={mail.html} copied={copied} onCopy={copy} label="Copiar HTML" />
            {canWrite && <button type="button" className="mkt-btn" disabled={busy} onClick={() => void saveSnippet()}><Save size={14} aria-hidden="true" />{busy ? 'Guardando…' : 'Guardar en Fragmentos'}</button>}
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusMsg msg={msg} />
            {msg?.kind === 'ok' && <p className="muted" style={{ margin: '4px 0 0' }}><Link href={marketingTabHref('snippets')} scroll={false} style={{ color: 'var(--rai-gold)' }}>Ver en Fragmentos</Link></p>}
          </div>
        </section>
      </div>
    </div>
  );
}
