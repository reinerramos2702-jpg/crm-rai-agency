'use client';

import React, { useMemo, useRef, useState } from 'react';
import { FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  SNIPPET_LIMITS,
  SNIPPET_SAMPLE_VALUES,
  excerpt,
  extractVariables,
  filterSnippets,
  renderSnippet,
  validateSnippetDraft,
  type SnippetItem,
} from '@/lib/marketing-snippets';
import { errorText, loadErrorText, refreshSummary, scrollBehavior, sendJson, useCopy, type Msg } from './shared';
import { CardTitle, CopyButton, InlineError, Note, StatusMsg } from './ui';
import { ListSkeleton } from './skeletons';

const URL_SNIPPETS = '/api/snippets';
const QUICK_VARS = ['nombre', 'empresa', 'telefono', 'fecha', 'enlace'];

interface SnippetsResponse {
  snippets: SnippetItem[];
}

export default function SnippetsTab({ canWrite }: { canWrite: boolean }) {
  const { data, error, loading, refresh, revalidating, mutate } = useCachedJson<SnippetsResponse>(URL_SNIPPETS);
  const { copied, copy } = useCopy();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [listMsg, setListMsg] = useState<Msg | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [fill, setFill] = useState({ nombre: '', empresa: '' });
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const all = data?.snippets ?? [];
  const shown = useMemo(() => filterSnippets(all, query), [all, query]);
  const vars = useMemo(() => extractVariables(body), [body]);
  const preview = useMemo(() => renderSnippet(body, SNIPPET_SAMPLE_VALUES), [body]);
  const copyValues: Record<string, string> = { nombre: fill.nombre, empresa: fill.empresa };

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + token);
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + token + body.slice(e));
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

  function startEdit(s: SnippetItem) {
    setEditingId(s.id);
    setTitle(s.title);
    setBody(s.body);
    setMsg(null);
    // En pantallas estrechas el formulario queda arriba de la lista: se acerca y se enfoca.
    if (window.matchMedia('(max-width: 900px)').matches) titleRef.current?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    titleRef.current?.focus({ preventScroll: true });
  }

  async function save() {
    const problem = validateSnippetDraft({ title, body });
    if (problem) return setMsg({ kind: 'error', text: problem });
    setBusy(true);
    setMsg(null);
    let created: SnippetItem | null = null;
    try {
      // El API no edita en sitio: se crea el nuevo y se retira el anterior.
      const res = await sendJson<{ snippet: SnippetItem }>(URL_SNIPPETS, 'POST', { title: title.trim(), body: body.trim() });
      created = res.snippet;
      if (editingId) await sendJson(`${URL_SNIPPETS}?id=${encodeURIComponent(editingId)}`, 'DELETE');
      mutate({ snippets: [res.snippet, ...all.filter((s) => s.id !== editingId)] });
      setMsg({ kind: 'ok', text: editingId ? 'Fragmento actualizado.' : 'Fragmento guardado.' });
      reset();
      refreshSummary();
    } catch (e) {
      const base = errorText(e, 'No se pudo guardar.');
      setMsg({ kind: 'error', text: created ? `La nueva versión se guardó, pero no se pudo retirar la anterior: ${base}` : base });
      void refresh();
      if (created) reset();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setConfirmId(null);
    setListMsg(null);
    try {
      await sendJson(`${URL_SNIPPETS}?id=${encodeURIComponent(id)}`, 'DELETE');
      mutate({ snippets: all.filter((s) => s.id !== id) });
      if (editingId === id) reset();
      setListMsg({ kind: 'ok', text: 'Fragmento eliminado.' });
      refreshSummary();
    } catch (e) {
      setListMsg({ kind: 'error', text: errorText(e, 'No se pudo eliminar.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="snip-form">
          <CardTitle id="snip-form" icon={Plus}>{editingId ? 'Editar fragmento' : 'Nuevo fragmento'}</CardTitle>
          {!canWrite ? (
            <Note>Tu rol es de solo lectura: puedes copiar fragmentos, pero no crearlos.</Note>
          ) : (
            <div className="mkt-fields">
              <div className="mkt-field">
                <label htmlFor="snip-title">Título</label>
                <input id="snip-title" ref={titleRef} value={title} maxLength={SNIPPET_LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Saludo de bienvenida" />
              </div>
              <div className="mkt-field">
                <label htmlFor="snip-body">Texto</label>
                <textarea id="snip-body" ref={bodyRef} value={body} maxLength={SNIPPET_LIMITS.body} rows={6} onChange={(e) => setBody(e.target.value)} placeholder="Hola {{nombre}}, gracias por escribir a {{empresa}}…" />
                <small className="mkt-count">{body.length.toLocaleString('es')} / {SNIPPET_LIMITS.body.toLocaleString('es')} caracteres</small>
                <div className="mkt-chips" style={{ marginTop: 6 }} role="group" aria-label="Insertar variable">
                  {QUICK_VARS.map((v) => (
                    <button key={v} type="button" className="mkt-chip" onClick={() => insertVar(v)}>{`{{${v}}}`}</button>
                  ))}
                </div>
              </div>
              <div className="mkt-field">
                <span id="snip-prev-l" className="mkt-flabel">Vista previa con datos de ejemplo</span>
                <div className="mkt-preview" role="region" aria-labelledby="snip-prev-l" aria-live="polite">{body.trim() ? preview : 'Escribe el texto para ver cómo quedará.'}</div>
                {vars.length > 0 && <small>Variables detectadas: {vars.map((v) => `{{${v}}}`).join(', ')}</small>}
              </div>
              <StatusMsg msg={msg} />
              <div className="mkt-actions">
                <button type="button" className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar fragmento'}</button>
                {(editingId || title || body) && (
                  <button type="button" className="mkt-btn" onClick={reset}><X size={14} aria-hidden="true" />Descartar</button>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="snip-list">
          <CardTitle id="snip-list" icon={FileText} meta={all.length}>Tus fragmentos</CardTitle>
          <div className="mkt-fields">
            <div className="mkt-field">
              <label htmlFor="snip-search">Buscar</label>
              <div className="mkt-search">
                <Search size={14} aria-hidden="true" />
                <input id="snip-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Título o texto" />
              </div>
            </div>
            <details className="mkt-more">
              <summary>Personalizar al copiar<small>{fill.nombre || fill.empresa ? 'Activo' : 'Opcional'}</small></summary>
              <div className="mkt-more-body mkt-fields two">
                <div className="mkt-field">
                  <label htmlFor="fill-nombre">Reemplazar {'{{nombre}}'}</label>
                  <input id="fill-nombre" value={fill.nombre} onChange={(e) => setFill((f) => ({ ...f, nombre: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="mkt-field">
                  <label htmlFor="fill-empresa">Reemplazar {'{{empresa}}'}</label>
                  <input id="fill-empresa" value={fill.empresa} onChange={(e) => setFill((f) => ({ ...f, empresa: e.target.value }))} placeholder="Opcional" />
                </div>
              </div>
            </details>
          </div>

          <div style={{ marginTop: 8 }}>
            <StatusMsg msg={listMsg} />
          </div>
          {loading && <ListSkeleton rows={3} />}
          {error !== null && (
            <div style={{ marginTop: 12 }}>
              <InlineError
                title={data ? 'No se pudo actualizar la lista.' : 'No se pudieron cargar los fragmentos.'}
                detail={`${loadErrorText(error)}${data ? ' Se muestra lo último guardado.' : ''}`}
                onRetry={() => void refresh()}
                retrying={revalidating}
              />
            </div>
          )}
          {data && all.length === 0 && (
            <EmptyState icon={FileText} title="Aún no tienes fragmentos" text="Guarda aquí tus respuestas frecuentes, captions y hashtags para reutilizarlos con un clic." />
          )}
          {data && all.length > 0 && shown.length === 0 && <p className="muted" style={{ marginTop: 12 }}>Ningún fragmento coincide con «{query}».</p>}
          <div className="mkt-list" style={{ marginTop: 8 }}>
            {shown.map((s) => {
              const sVars = extractVariables(s.body);
              return (
                <article key={s.id} className="mkt-item fx-reveal">
                  <div>
                    <h3>{s.title}</h3>
                    <p>{excerpt(s.body, 140)}</p>
                    {sVars.length > 0 && <div className="mkt-meta"><span>Variables: {sVars.map((v) => `{{${v}}}`).join(' ')}</span></div>}
                  </div>
                  <div className="mkt-item-actions">
                    <CopyButton id={`s-${s.id}`} text={renderSnippet(s.body, copyValues)} copied={copied} onCopy={copy} />
                    {canWrite && confirmId !== s.id && (
                      <span className="fx-reveal-actions mkt-item-actions">
                        <button type="button" className="mkt-btn is-icon" aria-label={`Editar ${s.title}`} onClick={() => startEdit(s)}><Pencil size={14} aria-hidden="true" /></button>
                        <button type="button" className="mkt-btn is-icon is-danger" aria-label={`Eliminar ${s.title}`} onClick={() => setConfirmId(s.id)}><Trash2 size={14} aria-hidden="true" /></button>
                      </span>
                    )}
                    {canWrite && confirmId === s.id && (
                      <>
                        <button type="button" className="mkt-btn is-danger" disabled={busy} onClick={() => void remove(s.id)}>Eliminar</button>
                        <button type="button" className="mkt-btn" onClick={() => setConfirmId(null)}>Cancelar</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
