'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Copy, Eye } from 'lucide-react';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { prefetchJson } from '@/lib/swr-cache';
import { canApprove, fullDate, guestName, paymentDate, relativeTime, type PaymentRow } from '@/lib/payments-view';
import { MethodChip, StatusPill } from './payment-meta';
import { detailUrl } from './payments-client';

interface Props {
  rows: PaymentRow[];
  now: number;
  pendingIds: ReadonlySet<string>;
  onApprove: (row: PaymentRow) => void;
  onCopy: (row: PaymentRow) => void;
}

export function PaymentsTable({ rows, now, pendingIds, onApprove, onCopy }: Props) {
  return (
    <div className="card pg-card">
      <div className="pg-tablewrap">
        <table className="table pg-table">
          <thead>
            <tr>
              <th scope="col">Referencia</th>
              <th scope="col">Huésped</th>
              <th scope="col">Método</th>
              <th scope="col">Fecha</th>
              <th scope="col">Estado</th>
              <th scope="col" className="pg-num">Monto</th>
              <th scope="col"><span className="fx-sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const date = paymentDate(p);
              const guest = guestName(p);
              const busy = pendingIds.has(p.id);
              return (
                <tr
                  key={p.id} className={`pg-row fx-reveal${busy ? ' is-busy' : ''}`}
                  onPointerEnter={() => prefetchJson(detailUrl(p.id), 15_000)}
                >
                  <td className="pg-c-ref" data-label="Referencia">
                    <Link href={`/pagos/${p.id}`} className="pg-ref">{p.reference}</Link>
                    {p.transactionRef && <span className="pg-sub" title="Referencia de transacción">{p.transactionRef}</span>}
                  </td>
                  <td className="pg-c-guest" data-label="Huésped">
                    {guest && p.guest ? <Link href={`/pasajeros/${p.guest.id}`} className="pg-link">{guest}</Link> : <span className="pg-dash">Sin huésped</span>}
                    {p.booking && <Link href={`/reservas/${p.booking.id}`} className="pg-sub pg-link-sub">Reserva {p.booking.reference}</Link>}
                  </td>
                  <td className="pg-c-method" data-label="Método"><MethodChip method={p.method} /></td>
                  <td className="pg-c-date" data-label="Fecha">
                    <time dateTime={date} title={fullDate(date)}>{relativeTime(date, now)}</time>
                  </td>
                  <td className="pg-c-status" data-label="Estado"><StatusPill status={p.status} /></td>
                  <td className={`pg-c-amount pg-num pg-amount pg-amount--${p.status}`} data-label="Monto">
                    {formatMoney(p.amountCents, p.currency)}
                  </td>
                  <td className="pg-c-actions">
                    <div className="pg-actions fx-reveal-actions">
                      {canApprove(p.status) && (
                        <button type="button" className="pg-act ghost" disabled={busy} onClick={() => onApprove(p)} aria-label={`Aprobar ${p.reference}`} title="Aprobar pago">
                          <Check size={14} aria-hidden="true" /> <span>Aprobar</span>
                        </button>
                      )}
                      <button type="button" className="pg-act pg-act-icon ghost" onClick={() => onCopy(p)} aria-label={`Copiar referencia ${p.reference}`} title="Copiar referencia">
                        <Copy size={14} aria-hidden="true" />
                      </button>
                      <Link href={`/pagos/${p.id}`} className="pg-act pg-act-icon pg-act-link" aria-label={`Ver detalle de ${p.reference}`} title="Ver detalle">
                        <Eye size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
