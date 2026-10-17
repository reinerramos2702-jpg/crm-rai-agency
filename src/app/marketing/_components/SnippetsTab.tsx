'use client';

import React, { useMemo, useRef, useState } from 'react';
import { FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SNIPPET_SAMPLE_VALUES,
  excerpt,
  extractVariables,
  filterSnippets,
  renderSnippet,
  validateSnippetDraft,
  type SnippetItem,
} from '@/lib/marketing-snippets';
import { CopyButton, Note, SectionSkeleton, refreshSummary, sendJson, useCopy } from './shared';

const URL_SNIPPETS = '/api/snippets';
const QUICK_VARS = ['nombre', 'empresa', 'telefono', 'fecha', 'enlace'];

interface SnippetsResponse {
  snippets: SnippetItem[];
}

export default function SnippetsTab({ canWrite }: { canWrite: boolean }) {
  const { data, error, loading, refresh, mutate } = useCachedJson<SnippetsResponse>(URL_SNIPPETS);
  const { copied, copy } = useCopy();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [fill, setFill] = useState({ nombre: '', empresa: '' });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const all = data?.snippets ?? [];
  const shown = useMemo(() => filterSnippets(all, query), [all, query]);
  const vars = useMemo(() => extractVariables(body), [body]);
  const preview = useMemo(() => renderSnippet(body, SNIPPET_SAMPLE_VALUES), [body]);

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + token);
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? body.length;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  }

  function reset() {
    setTitle('');
    setBody('');
    setEditingId(null);
  }

  async function save() {
    const problem = validateSnippetDraft({ title, body });
    if (problem) return setMsg({ kind: 'error', text: problem });
    setBusy(true);
    setMsg(null);
    try {
      const { snippet } = await sendJson<{ snippet: SnippetItem }>(URL_SNIPPETS, 'POST', { title: title.trim(), body: body.trim() });
      let rest = all;
      if (editingId) {
        // El API no edita en sitio: se crea el nuevo y se retira el anterior.
        await sendJson(`${URL_SNIPPETS}?id=${encodeURIComponent(editingId)}`, 'DELETE');
        rest = all.filter((s) => s.id !== editingId);
      }
      mutate({ snippets: [snippet, ...rest] });
      setMsg({ kind: 'ok', text: editingId ? 'Fragmento actualizado.' : 'Fragmento guardado.' });
      reset();
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' });
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setConfirmId(null);
    try {
      await sendJson(`${URL_SNIPPETS}?id=${encodeURIComponent(id)}`, 'DELETE');
      mutate({ snippets: all.filter((s) => s.id !== id) });
      if (editingId === id) reset();
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo eliminar.' });
    } finally {
      setBusy(false);
    }
  }

  const copyValues: Record<string, string> = { nombre: fill.nombre, empresa: fill.empresa };

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="snip-form">
          <h2 id="snip-form" className="mkt-card-title"><Plus size={16} aria-hidden="true" />{editingId ? 'Editar fragmento' : 'Nuevo fragmento'}</h2>
          {!canWrite ? (
            <Note>Tu rol es de solo lectura: puedes copiar fragmentos, pero no crearlos.</Note>
          ) : (
            <div className="mkt-fields">
              <div className="mkt-field">
                <label htmlFor="snip-title">Título</label>
                <input id="snip-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Saludo de bienvenida" />
              </div>
              <div className="mkt-field">
                <label htmlFor="snip-body">Texto</label>
                <textarea id="snip-body" ref={bodyRef} value={body} maxLength={5000} rows={6} onChange={(e) => setBody(e.target.value)} placeholder="Hola {{nombre}}, gracias por escribir a {{empresa}}…" />
                <small>Variables: toca una para insertarla en el texto.</small>
                <div className="mkt-chips" style={{ marginTop: 6 }}>
                  {QUICK_VARS.map((v) => (
                    <button key={v} type="button" className="mkt-chip" aria-pressed="false" onClick={() => insertVar(v)}>{`{{${v}}}`}</button>
                  ))}
                </div>
              </div>
              <div className="mkt-field">
                <label>Vista previa con datos de ejemplo</label>
                <div className="mkt-preview" aria-live="polite">{body.trim() ? preview : 'Escribe el texto para ver cómo quedará.'}</div>
                {vars.length > 0 && <small>Variables detectadas: {vars.map((v) => `{{${v}}}`).join(', ')}</small>}
              </div>
              {msg && <p className={msg.kind === 'ok' ? 'mkt-ok' : 'mkt-error'} role="status">{msg.text}</p>}
              <div className="mkt-actions">
                <button type="button" className="primary" disabled={busy} onClick={save}>{editingId ? 'Guardar cambios' : 'Guardar fragmento'}</button>
                {(editingId || title || body) && (
                  <button type="button" className="mkt-btn" onClick={reset}><X size={14} />Descartar</button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="snip-list">
          <h2 id="snip-list" className="mkt-card-title"><FileText size={16} aria-hidden="true" />Tus fragmentos<small>{all.length}</small></h2>
          <div className="mkt-fields">
            <div className="mkt-field">
              <label htmlFor="snip-search">Buscar</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 13, color: 'var(--rai-muted)' }} />
                <input id="snip-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título o texto" style={{ paddingLeft: 34 }} />
              </div>
            </div>
            <div className="mkt-fields two">
              <div className="mkt-field">
                <label htmlFor="fill-nombre">Al copiar, reemplazar {'{{nombre}}'}</label>
                <input id="fill-nombre" value={fill.nombre} onChange={(e) => setFill((f) => ({ ...f, nombre: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="mkt-field">
                <label htmlFor="fill-empresa">Al copiar, reemplazar {'{{empresa}}'}</label>
                <input id="fill-empresa" value={fill.empresa} onChange={(e) => setFill((f) => ({ ...f, empresa: e.target.value }))} placeholder="Opcional" />
              </div>
            </div>
          </div>

          {loading && <SectionSkeleton rows={3} />}
          {error && !data && <p className="mkt-error" role="alert">No se pudieron cargar los fragmentos ({error}).</p>}
          {data && all.length === 0 && (
            <EmptyState icon={FileText} title="Aún no tienes fragmentos" text="Guarda aquí tus respuestas frecuentes, captions y hashtags para reutilizarlos con un clic." />
          )}
          {data && all.length > 0 && shown.length === 0 && <p className="muted" style={{ marginTop: 12 }}>Ningún fragmento coincide con «{query}».</p>}
          <div className="mkt-list" style={{ marginTop: 8 }}>
            {shown.map((s) => (
              <article key={s.id} className="mkt-item fx-reveal">
                <div>
                  <h3>{s.title}</h3>
                  <p>{excerpt(s.body, 140)}</p>
                  {extractVariables(s.body).length > 0 && <div className="mkt-meta"><span>Variables: {extractVariables(s.body).map((v) => `{{${v}}}`).join(' ')}</span></div>}
                </div>
                <div className="mkt-item-actions">
                  <CopyButton id={`s-${s.id}`} text={renderSnippet(s.body, copyValues)} copied={copied} onCopy={copy} />
                  {canWrite && confirmId !== s.id && (
                    <span className="fx-reveal-actions mkt-item-actions">
                      <button type="button" className="mkt-btn" aria-label={`Editar ${s.title}`} onClick={() => { setEditingId(s.id); setTitle(s.title); setBody(s.body); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={14} /></button>
                      <button type="button" className="mkt-btn is-danger" aria-label={`Eliminar ${s.title}`} onClick={() => setConfirmId(s.id)}><Trash2 size={14} /></button>
                    </span>
                  )}
                  {canWrite && confirmId === s.id && (
                    <>
                      <button type="button" className="mkt-btn is-danger" disabled={busy} onClick={() => remove(s.id)}>Eliminar</button>
                      <button type="button" className="mkt-btn" onClick={() => setConfirmId(null)}>Cancelar</button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
