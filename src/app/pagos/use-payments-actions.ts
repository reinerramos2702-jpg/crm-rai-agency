'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { getCached, invalidate } from '@/lib/swr-cache';
import {
  applyCreated, applyDeleted, applyUpdated, optimisticPatch, paymentsToCsv, toDayString,
  type PaymentRow, type PaymentsResponse,
} from '@/lib/payments-view';
import type { NewPaymentInput } from './CreatePaymentModal';
import { LIST_URL, createPaymentRequest, detailUrl, errorMessage, postTransition } from './payments-client';

const EMPTY_DATA: PaymentsResponse = {
  payments: [],
  summary: { paidCents: 0, pendingCents: 0, refundedCents: 0, statusCounts: {} },
};

const latest = () => getCached<PaymentsResponse>(LIST_URL)?.data ?? EMPTY_DATA;

interface Deps {
  mutate: (next: PaymentsResponse) => void;
  refresh: () => Promise<void>;
}

/** Acciones de la lista con cambio optimista: la pantalla responde al instante y se revierte si falla. */
export function usePaymentsActions({ mutate, refresh }: Deps) {
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  const mark = useCallback((id: string, on: boolean) => {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const approve = useCallback(async (p: PaymentRow) => {
    const patch = optimisticPatch(p, 'approve', new Date().toISOString());
    if (!patch) return;
    if (!window.confirm(`¿Aprobar el pago ${p.reference}? Quedará registrado como cobrado.`)) return;
    mark(p.id, true);
    mutate(applyUpdated(latest(), p.id, patch));
    try {
      await postTransition(p.id, 'approve');
      invalidate(detailUrl(p.id));
      toast.success('Pago aprobado');
      void refresh();
    } catch (e) {
      mutate(applyUpdated(latest(), p.id, { status: p.status, paidAt: p.paidAt }));
      toast.error(errorMessage(e, 'No se pudo aprobar el pago'));
    } finally {
      mark(p.id, false);
    }
  }, [mark, mutate, refresh]);

  const create = useCallback(async (input: NewPaymentInput) => {
    const tempId = `tmp-${Date.now()}`;
    const temp: PaymentRow = {
      id: tempId, reference: 'Registrando…', amountCents: input.amountCents, currency: input.currency,
      method: input.method, status: input.status, createdAt: new Date().toISOString(), paidAt: null,
      transactionRef: input.transactionRef, guest: input.guest, booking: input.booking, site: null,
    };
    mark(tempId, true);
    mutate(applyCreated(latest(), temp));
    try {
      const res = await createPaymentRequest(input.body);
      const json = (await res.json().catch(() => ({}))) as { payment?: PaymentRow; error?: string };
      if (!res.ok || !json.payment) throw new Error(json.error ?? 'No se pudo crear el pago');
      const real: PaymentRow = { ...json.payment, guest: input.guest, booking: input.booking, site: null };
      const cur = latest();
      mutate({ ...cur, payments: cur.payments.map((p) => (p.id === tempId ? real : p)) });
      toast.success('Pago creado');
      void refresh();
    } catch (e) {
      mutate(applyDeleted(latest(), tempId));
      toast.error(errorMessage(e, 'No se pudo crear el pago'));
    } finally {
      mark(tempId, false);
    }
  }, [mark, mutate, refresh]);

  const copyReference = useCallback((p: PaymentRow) => {
    navigator.clipboard.writeText(p.reference).then(
      () => toast.success('Referencia copiada'),
      () => toast.error('No se pudo copiar la referencia'),
    );
  }, []);

  const exportCsv = useCallback((rows: PaymentRow[]) => {
    if (rows.length === 0) return;
    const blob = new Blob(['﻿', paymentsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagos-${toDayString(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} ${rows.length === 1 ? 'pago exportado' : 'pagos exportados'}`);
  }, []);

  return { busy, approve, create, copyReference, exportCsv };
}
