'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Plus, Download, RotateCw, TriangleAlert, SearchX } from 'lucide-react';
import { HelpTip } from '@/components/ui/HelpTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { useCachedJson } from '@/lib/use-cached-json';
import {
  EMPTY_FILTERS, filterPayments, hasActiveFilters, paidDelta, sortPayments, statusCounts, totalCount, totalsByCurrency,
  type PaymentFilters, type PaymentsResponse,
} from '@/lib/payments-view';
import { CreatePaymentModal } from './CreatePaymentModal';
import { KpiSkeleton, TableSkeleton } from './PaymentsSkeleton';
import { PaymentsFilters } from './PaymentsFilters';
import { PaymentsKpis } from './PaymentsKpis';
import { PaymentsTable } from './PaymentsTable';
import { LIST_URL } from './payments-client';
import { usePaymentsActions } from './use-payments-actions';
import './pagos.css';

const PAGE_SIZE = 25;

export default function PagosPage() {
  const { data, error, loading, revalidating, refresh, mutate } = useCachedJson<PaymentsResponse>(LIST_URL, { ttlMs: 20_000 });
  const { busy, approve, create, copyReference, exportCsv } = usePaymentsActions({ mutate, refresh });
  const [filters, setFilters] = useState<PaymentFilters>(EMPTY_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showCreate, setShowCreate] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [syncing, setSyncing] = useState(false);
  const dataRef = useRef(data);
  const hadData = useRef(false);
  dataRef.current = data;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Pulso sutil cuando termina una actualización por detrás y ya había datos en pantalla.
  useEffect(() => {
    if (revalidating) { hadData.current = dataRef.current !== undefined; return; }
    if (!hadData.current || error) return;
    hadData.current = false;
    setSyncing(true);
    const t = setTimeout(() => setSyncing(false), 1300);
    return () => clearTimeout(t);
  }, [revalidating, error]);

  const query = useDeferredValue(filters.query);
  const rows = useMemo(() => sortPayments(data?.payments ?? []), [data]);
  const effective = useMemo(() => ({ ...filters, query }), [filters, query]);
  const facet = useMemo(() => filterPayments(rows, { ...effective, status: '' }), [rows, effective]);
  const filtered = useMemo(() => (effective.status ? facet.filter((p) => p.status === effective.status) : facet), [facet, effective.status]);

  const summary = data?.summary;
  const total = summary ? totalCount(summary) : 0;
  const loadedAll = rows.length >= total;
  const otherActive = hasActiveFilters(effective, true);
  const useServerCounts = !!summary && !otherActive && !loadedAll;
  const counts = useMemo(
    () => (useServerCounts && summary ? summary.statusCounts : statusCounts(rows, effective)),
    [useServerCounts, summary, rows, effective],
  );
  const delta = useMemo(() => paidDelta(rows, now, loadedAll), [rows, now, loadedAll]);
  const selection = useMemo(() => totalsByCurrency(filtered), [filtered]);
  const active = hasActiveFilters(filters);

  function change(patch: Partial<PaymentFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  }

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;
  const paidText = selection.filter((t) => t.paidCents > 0).map((t) => formatMoney(t.paidCents, t.currency)).join(' · ');

  let body: React.ReactNode;
  if (loading) {
    body = <TableSkeleton />;
  } else if (!data) {
    body = (
      <EmptyState
        icon={TriangleAlert} title="No se pudieron cargar los pagos"
        text="Revisa tu conexión e inténtalo de nuevo. No se perdió ningún dato."
        action={<button type="button" className="primary" onClick={() => void refresh()}><RotateCw size={14} /> Reintentar</button>}
      />
    );
  } else if (total === 0 && rows.length === 0) {
    body = (
      <EmptyState
        icon={CreditCard} title="Aún no hay pagos registrados"
        text="Registra el primer pago para empezar a llevar el control de cobros y comprobantes."
        action={<button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Registrar primer pago</button>}
      />
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX} title="Ningún pago coincide con los filtros"
        text="Prueba con otra búsqueda, amplía el rango de fechas o quita algún filtro."
        action={<button type="button" className="secondary" onClick={() => { setFilters(EMPTY_FILTERS); setVisible(PAGE_SIZE); }}>Limpiar filtros</button>}
      />
    );
  } else {
    body = (
      <>
        <PaymentsTable rows={shown} now={now} pendingIds={busy} onApprove={approve} onCopy={copyReference} />
        <div className="pg-foot">
          <span>Mostrando {shown.length} de {filtered.length} {filtered.length === 1 ? 'pago' : 'pagos'}{paidText && <> · Cobrado: <strong className="pg-num-inline">{paidText}</strong></>}</span>
          {remaining > 0 && (
            <button type="button" className="secondary pg-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Cargar más ({Math.min(remaining, PAGE_SIZE)} de {remaining})
            </button>
          )}
        </div>
        {!loadedAll && <p className="pg-note">Se muestran los {rows.length} pagos más recientes de {total}. Usa Exportar para llevarte lo filtrado.</p>}
      </>
    );
  }

  return (
    <div className="container pg-page">
      <div className="pg-head">
        <div>
          <div className="pg-title">
            <CreditCard size={20} color="var(--rai-gold)" aria-hidden="true" />
            <h1 className="h1">Pagos</h1>
            <HelpTip content="Centro de control de cobros: crear, aprobar, cobrar y reembolsar. Cada pago puede vincularse con un huésped, una reserva y un sitio." />
          </div>
          <p className="muted pg-lead">Estado de cobros y comprobantes de pago.</p>
        </div>
        <div className="pg-head-actions">
          <button type="button" className="ghost pg-refresh" aria-label="Actualizar pagos" title="Actualizar" disabled={revalidating} onClick={() => void refresh()}>
            <RotateCw size={14} className={revalidating ? 'pg-spin' : undefined} />
          </button>
          <button type="button" className="secondary" disabled={filtered.length === 0} onClick={() => exportCsv(filtered)}>
            <Download size={14} /> Exportar CSV
          </button>
          <button type="button" className="primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Nuevo pago
          </button>
        </div>
      </div>

      {summary ? <PaymentsKpis summary={summary} delta={delta} syncing={syncing} /> : loading ? <KpiSkeleton /> : null}

      {data ? (
        <PaymentsFilters
          filters={filters} counts={counts} totalAll={useServerCounts ? total : facet.length} active={active}
          now={now} onChange={change} onClear={() => { setFilters(EMPTY_FILTERS); setVisible(PAGE_SIZE); }}
        />
      ) : loading ? <div className="pg-skel-bar" aria-hidden="true"><SkeletonLine width="100%" height={40} /></div> : null}

      {error && data && (
        <div className="pg-banner" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> No se pudo actualizar; se muestran los últimos datos guardados.
          <button type="button" className="ghost" onClick={() => void refresh()}>Reintentar</button>
        </div>
      )}

      {body}

      {showCreate && <CreatePaymentModal onClose={() => setShowCreate(false)} onSubmit={(input) => { setShowCreate(false); void create(input); }} />}
    </div>
  );
}
