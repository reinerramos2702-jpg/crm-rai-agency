'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, Link2, MousePointerClick, Plus, Trash2 } from 'lucide-react';
import { useCachedJson } from '@/lib/use-cached-json';
import { EmptyState } from '@/components/ui/EmptyState';
import { hostOf, normalizeDestination, publicLinkUrl, sanitizeSlug, sortLinks, totalClicks, type LinkItem, type LinkSort } from '@/lib/marketing-links';
import { errorText, loadErrorText, refreshSummary, sendJson, useCopy, useOrigin, type Msg } from './shared';
import { CardTitle, CopyButton, InlineError, Note, StatusMsg } from './ui';
import { ListSkeleton } from './skeletons';

const URL_LINKS = '/api/activation-links';

interface LinksResponse {
  links: LinkItem[];
}

const clicksText = (n: number) => `${n.toLocaleString('es')} ${n === 1 ? 'clic' : 'clics'}`;

export default function LinksTab({ canWrite }: { canWrite: boolean }) {
  const { data, error, loading, refresh, revalidating, mutate } = useCachedJson<LinksResponse>(URL_LINKS);
  const { copied, copy } = useCopy();
  const origin = useOrigin();
  const [label, setLabel] = useState('');
  const [destination, setDestination] = useState('');
  const [slug, setSlug] = useState('');
  const [sort, setSort] = useState<LinkSort>('recent');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [listMsg, setListMsg] = useState<Msg | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const links = data?.links ?? [];
  const sorted = useMemo(() => sortLinks(links, sort), [links, sort]);
  const clicks = totalClicks(links);
  const maxClicks = useMemo(() => links.reduce((m, l) => Math.max(m, l.clicks), 0), [links]);
  const average = links.length > 0 ? Math.round((clicks / links.length) * 10) / 10 : 0;
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
      setMsg({ kind: 'error', text: errorText(e, 'No se pudo crear el enlace.') });
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setConfirmId(null);
    setListMsg(null);
    try {
      await sendJson(`${URL_LINKS}?id=${encodeURIComponent(id)}`, 'DELETE');
      mutate({ links: links.filter((l) => l.id !== id) });
      setListMsg({ kind: 'ok', text: 'Enlace eliminado.' });
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
        <section className="card" aria-labelledby="lnk-form">
          <CardTitle id="lnk-form" icon={Plus}>Nuevo enlace</CardTitle>
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
              <StatusMsg msg={msg} />
              <div className="mkt-actions"><button type="button" className="primary" disabled={busy} onClick={() => void create()}>{busy ? 'Creando…' : 'Crear enlace'}</button></div>
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
          <CardTitle id="lnk-list" icon={Link2} meta={data ? `${links.length} · ${clicksText(clicks)}` : undefined}>Tus enlaces</CardTitle>
          {data && links.length > 0 && (
            <div className="mkt-stats">
              <div className="mkt-stat"><strong>{links.length}</strong><span>Enlaces</span></div>
              <div className="mkt-stat"><strong>{clicks.toLocaleString('es')}</strong><span>Clics en total</span></div>
              <div className="mkt-stat"><strong>{average.toLocaleString('es')}</strong><span>Clics por enlace</span></div>
            </div>
          )}
          <div className="mkt-seg" role="group" aria-label="Ordenar enlaces">
            <button type="button" className="mkt-seg-btn" aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Recientes</button>
            <button type="button" className="mkt-seg-btn" aria-pressed={sort === 'clicks'} onClick={() => setSort('clicks')}>Más clics</button>
          </div>
          <div style={{ marginTop: 8 }}><StatusMsg msg={listMsg} /></div>
          {loading && <ListSkeleton rows={3} />}
          {error !== null && (
            <div style={{ marginTop: 12 }}>
              <InlineError
                title={data ? 'No se pudo actualizar la lista.' : 'No se pudieron cargar los enlaces.'}
                detail={`${loadErrorText(error)}${data ? ' Se muestra lo último guardado.' : ''}`}
                onRetry={() => void refresh()}
                retrying={revalidating}
              />
            </div>
          )}
          {data && links.length === 0 && (
            <EmptyState icon={Link2} title="Aún no tienes enlaces" text="Crea un enlace corto para tu bio de Instagram, tus anuncios o tus mensajes, y mide cuántas personas lo tocan." />
          )}
          <div className="mkt-list" style={{ marginTop: 8 }}>
            {sorted.map((l) => {
              const url = origin ? publicLinkUrl(origin, l.slug) : `/go/${l.slug}`;
              const share = maxClicks > 0 ? l.clicks / maxClicks : 0;
              return (
                <article key={l.id} className="mkt-item">
                  <div>
                    <h3>{l.label}</h3>
                    <p className="mono">{url}</p>
                    <div className="mkt-meta">
                      <span><MousePointerClick size={12} aria-hidden="true" /> {clicksText(l.clicks)}</span>
                      <span>Destino: {hostOf(l.destination)}</span>
                      {l.createdAt && <span>{new Date(l.createdAt).toLocaleDateString('es')}</span>}
                    </div>
                    <div className="mkt-share" role="img" aria-label={`${Math.round(share * 100)} % del enlace con más clics`}><span style={{ transform: `scaleX(${share})` }} /></div>
                  </div>
                  <div className="mkt-item-actions">
                    <CopyButton id={`l-${l.id}`} text={url} copied={copied} onCopy={copy} />
                    <a className="mkt-btn is-icon" href={l.destination.startsWith('http') ? l.destination : `https://${l.destination}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir destino de ${l.label}`}><ExternalLink size={14} aria-hidden="true" /></a>
                    {canWrite && confirmId !== l.id && (
                      <button type="button" className="mkt-btn is-icon is-danger" aria-label={`Eliminar ${l.label}`} onClick={() => setConfirmId(l.id)}><Trash2 size={14} aria-hidden="true" /></button>
                    )}
                    {canWrite && confirmId === l.id && (
                      <>
                        <button type="button" className="mkt-btn is-danger" disabled={busy} onClick={() => void remove(l.id)}>Eliminar</button>
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
