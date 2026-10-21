'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Building2, RotateCw, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCachedJson } from '@/lib/use-cached-json';
import { ConfirmDialog } from '../_components/ConfirmDialog';
import { Breadcrumbs, DetailHeader } from '../_components/DetailHeader';
import { DetailSkeleton } from '../_components/DetailSkeleton';
import { RoomsSection } from '../_components/RoomsSection';
import { SiteEditForm } from '../_components/SiteEditForm';
import { SiteInfo } from '../_components/SiteInfo';
import { invalidateSites, sendJson } from '../_components/sites-api';
import type { SiteDetail, SiteMetrics } from '../_components/site-model';

interface DetailResponse {
  site: SiteDetail;
  metrics?: SiteMetrics;
}

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const detail = useCachedJson<DetailResponse>(`/api/sites/${encodeURIComponent(id)}`, { ttlMs: 10_000 });
  const { refresh } = detail;
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reload = useCallback(async () => { await refresh(); }, [refresh]);

  if (detail.loading) return <DetailSkeleton />;

  const site = detail.data?.site;
  if (!site) {
    const notFound = detail.error === 'HTTP 404';
    return (
      <div className="container st-page">
        <Breadcrumbs name={notFound ? 'No encontrado' : 'Sitio'} />
        <EmptyState
          icon={notFound ? Building2 : TriangleAlert}
          title={notFound ? 'Sitio no encontrado' : 'No se pudo cargar el sitio'}
          text={notFound
            ? 'Puede que se haya eliminado o que el enlace no sea correcto.'
            : 'Revisa tu conexión e inténtalo de nuevo. No se perdió ningún dato.'}
          action={(
            <>
              {!notFound && (
                <button type="button" className="primary" onClick={() => void refresh()}>
                  <RotateCw size={14} aria-hidden="true" /> Reintentar
                </button>
              )}
              <Link href="/sitios" className="btn btn-secondary">Volver a sitios</Link>
            </>
          )}
        />
      </div>
    );
  }

  const dependents = site.rooms.length + site._count.bookings;

  return (
    <div className="container st-page">
      <Breadcrumbs name={site.name} />

      {detail.error && (
        <p className="st-banner st-banner--err" role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>No se pudo actualizar el sitio. Mostrando lo último guardado.</span>
          <button type="button" className="ghost btn-sm" onClick={() => void refresh()}>Reintentar</button>
        </p>
      )}

      <DetailHeader
        site={site} metrics={detail.data?.metrics} editing={editing}
        onEdit={() => setEditing(true)} onDelete={() => setConfirmDelete(true)}
      />

      {editing ? (
        <SiteEditForm site={site} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); void reload(); }} />
      ) : (
        <SiteInfo site={site} />
      )}

      <RoomsSection siteId={site.id} rooms={site.rooms} onChanged={reload} />

      {confirmDelete && (dependents > 0 ? (
        <ConfirmDialog
          tone="primary"
          title="Este sitio no se puede eliminar"
          description={`Tiene ${site.rooms.length} ${site.rooms.length === 1 ? 'habitación' : 'habitaciones'} y ${site._count.bookings} ${site._count.bookings === 1 ? 'reserva' : 'reservas'} asociadas. Solo se eliminan sitios vacíos.`}
          confirmLabel={site.status === 'closed' ? 'Entendido' : 'Marcar como cerrado'} busyLabel="Guardando…"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            if (site.status === 'closed') { setConfirmDelete(false); return null; }
            const res = await sendJson<{ site: { id: string } }>(`/api/sites/${site.id}`, 'PATCH', { status: 'closed' });
            if (!res.ok) return res.error;
            invalidateSites();
            toast.success('Sitio marcado como cerrado');
            setConfirmDelete(false);
            await reload();
            return null;
          }}
        >
          <p className="st-banner">Para conservar el histórico, cámbialo a estado «Cerrado» en lugar de eliminarlo.</p>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          title={`¿Eliminar «${site.name}»?`}
          description="Se eliminará el sitio de forma permanente. Esta acción no se puede deshacer."
          confirmLabel="Eliminar sitio" busyLabel="Eliminando…"
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            const res = await sendJson<{ ok: boolean }>(`/api/sites/${site.id}`, 'DELETE');
            if (!res.ok) return res.error;
            invalidateSites();
            toast.success('Sitio eliminado');
            router.push('/sitios');
            return null;
          }}
        />
      ))}
    </div>
  );
}
