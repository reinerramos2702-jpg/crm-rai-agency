'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, FileText, Upload, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatMoney } from '@/components/hotel/StatusBadges';
import { HelpTip } from '@/components/ui/HelpTip';
import { fullDate, statusLabel } from '@/lib/payments-view';

export interface PaymentDetail {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  approvedAt?: string | null;
  refundedAt?: string | null;
  refundedAmountCents: number;
  proofUrl: string | null;
  transactionRef: string | null;
  notes: string | null;
  internalComments: string | null;
  guest: { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null } | null;
  booking: { id: string; reference: string; checkInDate: string; checkOutDate: string } | null;
  site: { id: string; name: string } | null;
  events: Array<{
    id: string; action: string; fromStatus: string | null; toStatus: string | null;
    meta: Record<string, unknown>; createdAt: string;
  }>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pg-field">
      <span className="pg-field-label">{label}</span>
      <span className="pg-field-value">{value || <span className="pg-dash">—</span>}</span>
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  created: 'Creado', updated: 'Actualizado', approve: 'Aprobado', reject: 'Rechazado',
  cancel: 'Cancelado', review: 'Enviado a revisión', refund: 'Reembolsado',
};
const eventLabel = (action: string) => EVENT_LABELS[action] ?? action.replace(/_/g, ' ');

const day = (iso: string) => new Date(iso).toLocaleDateString('es-DO');

export function PaymentDetailCards({ payment: p }: { payment: PaymentDetail }) {
  return (
    <>
      <div className="pg-detail-grid">
        <section className="card" aria-labelledby="pg-rel">
          <h2 id="pg-rel" className="pg-card-title"><User size={14} aria-hidden="true" /> Relaciones</h2>
          <Field label="Huésped" value={p.guest && <Link href={`/pasajeros/${p.guest.id}`} className="pg-link">{`${p.guest.firstName} ${p.guest.lastName ?? ''}`.trim()}</Link>} />
          {p.guest?.email && <Field label="Correo" value={p.guest.email} />}
          {p.guest?.phone && <Field label="Teléfono" value={p.guest.phone} />}
          <Field label="Reserva" value={p.booking && <Link href={`/reservas/${p.booking.id}`} className="pg-link pg-mono">{p.booking.reference}</Link>} />
          {p.booking && <Field label="Estancia" value={`${day(p.booking.checkInDate)} → ${day(p.booking.checkOutDate)}`} />}
          <Field label="Sitio" value={p.site && <Link href={`/sitios/${p.site.id}`} className="pg-link">{p.site.name}</Link>} />
        </section>

        <section className="card" aria-labelledby="pg-det">
          <h2 id="pg-det" className="pg-card-title"><FileText size={14} aria-hidden="true" /> Detalles</h2>
          <Field label="Creado" value={fullDate(p.createdAt)} />
          {p.paidAt && <Field label="Cobrado" value={fullDate(p.paidAt)} />}
          {p.approvedAt && <Field label="Aprobado" value={fullDate(p.approvedAt)} />}
          {p.refundedAt && <Field label="Reembolsado" value={fullDate(p.refundedAt)} />}
          {p.refundedAt && <Field label="Monto reembolsado" value={formatMoney(p.refundedAmountCents, p.currency)} />}
          <Field
            label="Comprobante"
            value={p.proofUrl
              ? <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="pg-link">Ver documento</a>
              : <button type="button" className="ghost btn-sm" onClick={() => toast('La subida de comprobantes estará disponible próximamente.')}><Upload size={12} /> Subir comprobante</button>}
          />
          <Field label="Notas" value={p.notes} />
          <Field label="Comentarios internos" value={p.internalComments} />
        </section>
      </div>

      <section className="card pg-history" aria-labelledby="pg-hist">
        <h2 id="pg-hist" className="pg-card-title">
          <Activity size={14} aria-hidden="true" /> Historial de cambios
          <HelpTip content="Registro de todas las acciones sobre este pago: creación, aprobación, rechazo y reembolso. Útil para auditoría." />
        </h2>
        {p.events.length === 0 ? (
          <p className="pg-dash pg-empty-line">Sin eventos registrados</p>
        ) : (
          <ul className="pg-timeline">
            {p.events.map((ev) => (
              <li key={ev.id} className="pg-event">
                <div>
                  <div className="pg-event-name">{eventLabel(ev.action)}</div>
                  {ev.fromStatus && ev.toStatus && <div className="pg-sub">{statusLabel(ev.fromStatus)} → {statusLabel(ev.toStatus)}</div>}
                </div>
                <time className="pg-sub" dateTime={ev.createdAt} title={fullDate(ev.createdAt)}>{new Date(ev.createdAt).toLocaleString('es-DO')}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
