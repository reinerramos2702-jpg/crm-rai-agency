'use client';

import { getCached, setCached } from '@/lib/swr-cache';
import {
  applyDeleted, applyUpdated,
  type PaymentAction, type PaymentPatch, type PaymentsResponse,
} from '@/lib/payments-view';

/** Ventana de pagos recientes que se filtra en el navegador (el tope de la API es 500). */
export const LIST_URL = '/api/payments?limit=300';

export const detailUrl = (id: string) => `/api/payments/${id}`;

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function failure(data: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof data.error === 'string' ? data.error : fallback);
}

export async function postTransition(id: string, action: PaymentAction, refundAmountCents?: number): Promise<void> {
  const res = await fetch(`${detailUrl(id)}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(refundAmountCents ? { refundAmountCents } : {}) }),
  });
  if (!res.ok) throw failure(await readJson(res), 'No se pudo aplicar la acción');
}

export async function deletePayment(id: string): Promise<void> {
  const res = await fetch(detailUrl(id), { method: 'DELETE' });
  if (!res.ok) throw failure(await readJson(res), 'No se pudo eliminar el pago');
}

export function createPaymentRequest(body: Record<string, unknown>): Promise<Response> {
  return fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function errorMessage(e: unknown, fallback = 'Error inesperado'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/** Refleja un cambio en la lista cacheada (si existe) para que al volver se vea al instante. */
export function patchListCache(id: string, patch: PaymentPatch): void {
  const hit = getCached<PaymentsResponse>(LIST_URL);
  if (hit) setCached(LIST_URL, applyUpdated(hit.data, id, patch));
}

export function removeFromListCache(id: string): void {
  const hit = getCached<PaymentsResponse>(LIST_URL);
  if (hit) setCached(LIST_URL, applyDeleted(hit.data, id));
}
