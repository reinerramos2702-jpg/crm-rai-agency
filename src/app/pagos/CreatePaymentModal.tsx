'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { HelpTip } from '@/components/ui/HelpTip';
import { useCachedJson } from '@/lib/use-cached-json';
import { PAYMENT_METHODS, PAYMENT_STATUS_LABELS } from '@/lib/payments-view';

export interface NewPaymentInput {
  body: Record<string, unknown>;
  guest: { id: string; firstName: string; lastName: string | null } | null;
  booking: { id: string; reference: string } | null;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
  transactionRef: string | null;
}

interface Props {
  onClose: () => void;
  onSubmit: (input: NewPaymentInput) => void;
}

type GuestOpt = { id: string; firstName: string; lastName: string | null };
type BookingOpt = { id: string; reference: string };

const INITIAL = {
  guestId: '', bookingId: '', amount: '', currency: 'USD',
  method: 'cash', status: 'pending', transactionRef: '', notes: '',
};

export function CreatePaymentModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState(INITIAL);
  const guests = useCachedJson<{ guests: GuestOpt[] }>('/api/guests', { ttlMs: 60_000 });
  const bookings = useCachedJson<{ bookings: BookingOpt[] }>('/api/bookings', { ttlMs: 60_000 });
  const guestList = guests.data?.guests ?? [];
  const bookingList = bookings.data?.bookings ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) { toast.error('Indica un monto mayor que cero.'); return; }
    const amountCents = Math.round(amount * 100);
    onSubmit({
      body: {
        ...form, amountCents,
        guestId: form.guestId || undefined,
        bookingId: form.bookingId || undefined,
      },
      guest: guestList.find((g) => g.id === form.guestId) ?? null,
      booking: bookingList.find((b) => b.id === form.bookingId) ?? null,
      amountCents, currency: form.currency, method: form.method, status: form.status,
      transactionRef: form.transactionRef.trim() || null,
    });
  }

  return (
    <div className="pg-backdrop" onClick={onClose}>
      <div className="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pg-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="pg-modal-head">
          <h3 id="pg-modal-title">Nuevo pago</h3>
          <button type="button" className="ghost btn-icon" onClick={onClose} aria-label="Cerrar"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="pg-modal-form">
          <div className="pg-form-grid">
            <div className="form-group">
              <label className="label" htmlFor="pg-amount">Monto *</label>
              <input id="pg-amount" className="input" type="number" inputMode="decimal" step="0.01" min="0" value={form.amount} onChange={set('amount')} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="pg-currency">Moneda</label>
              <select id="pg-currency" className="input" value={form.currency} onChange={set('currency')}>
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="pg-method">Método</label>
              <select id="pg-method" className="input" value={form.method} onChange={set('method')}>
                {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="pg-status">
                Estado inicial <HelpTip content="«Pendiente» espera aprobación. «Pagado» marca el pago como cobrado de inmediato." />
              </label>
              <select id="pg-status" className="input" value={form.status} onChange={set('status')}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="pg-guest">Huésped (opcional)</label>
              <select id="pg-guest" className="input" value={form.guestId} onChange={set('guestId')}>
                <option value="">Sin huésped</option>
                {guestList.map((g) => <option key={g.id} value={g.id}>{`${g.firstName} ${g.lastName ?? ''}`.trim()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="pg-booking">Reserva (opcional)</label>
              <select id="pg-booking" className="input" value={form.bookingId} onChange={set('bookingId')}>
                <option value="">Sin reserva</option>
                {bookingList.map((b) => <option key={b.id} value={b.id}>{b.reference}</option>)}
              </select>
            </div>
            <div className="form-group pg-span">
              <label className="label" htmlFor="pg-tx">
                Referencia de transacción <HelpTip content="Identificador externo: número de transferencia, comprobante o ID de la pasarela." />
              </label>
              <input id="pg-tx" className="input" value={form.transactionRef} onChange={set('transactionRef')} placeholder="TX-2026-001" />
            </div>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="pg-notes">Notas</label>
            <textarea id="pg-notes" className="input" rows={3} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="pg-modal-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary">Registrar pago</button>
          </div>
        </form>
      </div>
    </div>
  );
}
