'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, Link2, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EmptyState } from '@/components/ui/EmptyState';
import { hostOf, normalizeDestination, publicLinkUrl, sanitizeSlug, sortLinks, totalClicks, type LinkItem, type LinkSort } from '@/lib/marketing-links';
import { CopyButton, Note, SectionSkeleton, refreshSummary, sendJson, useCopy, useOrigin } from './shared';

const URL_LINKS = '/api/activation-links';

interface LinksResponse {
  links: LinkItem[];
}

export default function LinksTab({ canWrite }: { canWrite: boolean }) {
  const { data, error, loading, refresh, mutate } = useCachedJson<LinksResponse>(URL_LINKS);
  const { copied, copy } = useCopy();
  const origin = useOrigin();
  const [label, setLabel] = useState('');
  const [destination, setDestination] = useState('');
  const [slug, setSlug] = useState('');
  const [sort, setSort] = useState<LinkSort>('recent');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const links = data?.links ?? [];
  const sorted = useMemo(() => sortLinks(links, sort), [links, sort]);
  const cleanSlug = sanitizeSlug(slug);
  const previewUrl = origin ? publicLinkUrl(origin, cleanSlug || 'tu-enlace') : '';

  async function create() {
    if (!label.trim()) return setMsg({ kind: 'error', text: 'Ponle un nombre al enlace.' });
    const dest = normalizeDestination(destination);
    if (!dest.ok) return setMsg({ kind: 'error', text: dest.error });
    setBusy(true);
    setMsg(null);
    try {
      const { link } = await sendJson<{ link: LinkItem }>(URL_LINKS, 'POST', { label: label.trim(), destination: dest.url, ...(cleanSlug ? { slug: cleanSlug } : {}) });
      mutate({ links: [link, ...links] });
      setMsg({ kind: 'ok', text: `Enlace creado: /go/${link.slug}` });
      setLabel('');
      setDestination('');
      setSlug('');
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo crear el enlace.' });
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setConfirmId(null);
    try {
      await sendJson(`${URL_LINKS}?id=${encodeURIComponent(id)}`, 'DELETE');
      mutate({ links: links.filter((l) => l.id !== id) });
      refreshSummary();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo eliminar.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mkt-panel">
      <div className="mkt-split">
        <section className="card" aria-labelledby="lnk-form">
          <h2 id="lnk-form" className="mkt-card-title"><Plus size={16} aria-hidden="true" />Nuevo enlace</h2>
          {!canWrite ? (
            <Note>Tu rol es de solo lectura: puedes copiar los enlaces existentes, pero no crearlos.</Note>
          ) : (
            <div className="mkt-fields">
              <div className="mkt-field">
                <label htmlFor="lnk-label">Nombre</label>
                <input id="lnk-label" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} placeholder="Ej.: Bio de Instagram" />
              </div>
              <div className="mkt-field">
                <label htmlFor="lnk-dest">Destino</label>
                <input id="lnk-dest" inputMode="url" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="tuempresa.com/oferta" />
                <small>Si omites https:// se agrega solo.</small>
              </div>
              <div className="mkt-field">
                <label htmlFor="lnk-slug">Código corto (opcional)</label>
                <input id="lnk-slug" value={slug} maxLength={40} onChange={(e) => setSlug(e.target.value)} placeholder="oferta-verano" />
                <small>{previewUrl ? `Quedará así: ${previewUrl}` : 'Se genera uno automático si lo dejas vacío.'}</small>
              </div>
              {msg && <p className={msg.kind === 'ok' ? 'mkt-ok' : 'mkt-error'} role="status">{msg.text}</p>}
              <div className="mkt-actions"><button type="button" className="primary" disabled={busy} onClick={create}>Crear enlace</button></div>
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <Note>
              Cada visita a <code>/go/código</code> suma un clic y redirige al destino. No se dispara ninguna automatización
              al hacer clic (en otras plataformas sí). El destino de un enlace no se puede cambiar: crea uno nuevo.
            </Note>
          </div>
        </section>

        <section className="card" aria-labelledby="lnk-list">
          <h2 id="lnk-list" className="mkt-card-title">
            <Link2 size={16} aria-hidden="true" />Tus enlaces
            <small>{links.length} · {totalClicks(links)} clics</small>
          </h2>
          <div className="mkt-seg" role="group" aria-label="Ordenar enlaces">
            <button type="button" className="mkt-seg-btn" aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Recientes</button>
            <button type="button" className="mkt-seg-btn" aria-pressed={sort === 'clicks'} onClick={() => setSort('clicks')}>Más clics</button>
          </div>
          {loading && <div style={{ marginTop: 12 }}><SectionSkeleton rows={3} /></div>}
          {error && !data && <p className="mkt-error" role="alert">No se pudieron cargar los enlaces ({error}).</p>}
          {data && links.length === 0 && (
            <EmptyState icon={Link2} title="Aún no tienes enlaces" text="Crea un enlace corto para tu bio de Instagram, tus anuncios o tus mensajes, y mide cuántas personas lo tocan." />
          )}
          <div className="mkt-list" style={{ marginTop: 8 }}>
            {sorted.map((l) => {
              const url = origin ? publicLinkUrl(origin, l.slug) : `/go/${l.slug}`;
              return (
                <article key={l.id} className="mkt-item">
                  <div>
                    <h3>{l.label}</h3>
                    <p className="mono">{url}</p>
                    <div className="mkt-meta">
                      <span><MousePointerClick size={12} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {l.clicks} {l.clicks === 1 ? 'clic' : 'clics'}</span>
                      <span>Destino: {hostOf(l.destination)}</span>
                      {l.createdAt && <span>{new Date(l.createdAt).toLocaleDateString('es')}</span>}
                    </div>
                  </div>
                  <div className="mkt-item-actions">
                    <CopyButton id={`l-${l.id}`} text={url} copied={copied} onCopy={copy} />
                    <a className="mkt-btn" href={l.destination.startsWith('http') ? l.destination : `https://${l.destination}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir destino de ${l.label}`}><ExternalLink size={14} /></a>
                    {canWrite && confirmId !== l.id && (
                      <button type="button" className="mkt-btn is-danger" aria-label={`Eliminar ${l.label}`} onClick={() => setConfirmId(l.id)}><Trash2 size={14} /></button>
                    )}
                    {canWrite && confirmId === l.id && (
                      <>
                        <button type="button" className="mkt-btn is-danger" disabled={busy} onClick={() => remove(l.id)}>Eliminar</button>
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
