'use client';

import React, { useMemo, useState } from 'react';
import { Mail, Save } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EMAIL_CATEGORIES, EMAIL_TEMPLATES, renderEmail, type EmailTemplate } from '@/lib/marketing-email-templates';
import { SNIPPET_SAMPLE_VALUES } from '@/lib/marketing-snippets';
import { CopyButton, Note, refreshSummary, sendJson, useCopy } from './shared';
import { BRAND_URL, type BrandData } from './BrandTab';

const FIELDS: Array<[string, string]> = [['nombre', 'Nombre'], ['empresa', 'Empresa'], ['fecha', 'Fecha'], ['enlace', 'Enlace'], ['telefono', 'Teléfono']];

export default function EmailsTab({ canWrite }: { canWrite: boolean }) {
  const { copied, copy } = useCopy();
  const brand = useCachedJson<{ brand: BrandData }>(BRAND_URL);
  const [cat, setCat] = useState<(typeof EMAIL_CATEGORIES)[number]>('Todas');
  const [sel, setSel] = useState<EmailTemplate>(EMAIL_TEMPLATES[0]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const list = cat === 'Todas' ? EMAIL_TEMPLATES : EMAIL_TEMPLATES.filter((t) => t.category === cat);
  const accent = brand.data?.brand.palette[0] ?? '#C9A84C';
  const company = brand.data?.brand.businessName.trim();
  const merged = useMemo(() => ({ ...(company ? { empresa: company } : {}), ...vals }), [vals, company]);
  const mail = useMemo(() => renderEmail(sel, merged, accent), [sel, merged, accent]);
  const paragraphs = mail.text.split(/\n{2,}/);

  async function saveSnippet() {
    setBusy(true);
    setMsg(null);
    try {
      await sendJson('/api/snippets', 'POST', { title: `Correo: ${sel.name}`, body: sel.body });
      setMsg({ kind: 'ok', text: 'Guardada en Fragmentos con sus variables.' });
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' });
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
      <div className="mkt-split">
        <section className="card" aria-labelledby="em-lib">
          <h2 id="em-lib" className="mkt-card-title"><Mail size={16} aria-hidden="true" />Plantillas<small>{list.length}</small></h2>
          <div className="mkt-chips" role="group" aria-label="Categoría" style={{ marginBottom: 8 }}>
            {EMAIL_CATEGORIES.map((c) => <button key={c} type="button" className="mkt-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="mkt-list">
            {list.map((t) => (
              <article key={t.id} className="mkt-item">
                <div><h3>{t.name}</h3><p>{t.subject}</p><div className="mkt-meta"><span>{t.category}</span></div></div>
                <div className="mkt-item-actions"><button type="button" className={sel.id === t.id ? 'mkt-btn is-done' : 'mkt-btn'} aria-pressed={sel.id === t.id} onClick={() => { setSel(t); setMsg(null); }}>{sel.id === t.id ? 'Seleccionada' : 'Usar'}</button></div>
              </article>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="em-prev">
          <h2 id="em-prev" className="mkt-card-title">Vista previa</h2>
          <div className="mkt-fields two" style={{ marginBottom: 12 }}>
            {FIELDS.map(([k, l]) => (
              <div key={k} className="mkt-field">
                <label htmlFor={`em-${k}`}>{l}</label>
                <input id={`em-${k}`} value={vals[k] ?? ''} placeholder={k === 'empresa' && company ? company : SNIPPET_SAMPLE_VALUES[k]} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mkt-mail" style={{ ['--mkt-accent' as string]: accent }}>
            <p className="mkt-mail-subject">{mail.subject}</p>
            {paragraphs.map((p, i) => <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{p}</p>)}
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Las variables sin valor quedan como {'{{variable}}'} para que veas qué falta. {brand.data?.brand.palette[0] ? 'El borde usa el primer color de tu marca.' : ''}</p>
          <div className="mkt-actions" style={{ marginTop: 10 }}>
            <CopyButton id="em-subject" text={mail.subject} copied={copied} onCopy={copy} label="Copiar asunto" />
            <CopyButton id="em-text" text={mail.text} copied={copied} onCopy={copy} label="Copiar texto" />
            <CopyButton id="em-html" text={mail.html} copied={copied} onCopy={copy} label="Copiar HTML" />
            {canWrite && <button type="button" className="mkt-btn" disabled={busy} onClick={saveSnippet}><Save size={14} />Guardar en Fragmentos</button>}
          </div>
          {msg && <p className={msg.kind === 'ok' ? 'mkt-ok' : 'mkt-error'} role="status" style={{ marginTop: 8 }}>{msg.text}</p>}
        </section>
      </div>
    </div>
  );
}
