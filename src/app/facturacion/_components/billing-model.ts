// Lógica PURA de Facturación (sin React ni red): se prueba con Vitest.

import type { PaymentRow } from '@/lib/payments-view';

export type ChipTone = 'muted' | 'warning' | 'success' | 'gold' | 'error';

/** Tono del distintivo de un pago según su estado. */
export function paymentTone(status: string): ChipTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
    case 'under_review':
      return 'warning';
    case 'failed':
      return 'error';
    case 'refunded':
      return 'gold';
    default:
      return 'muted';
  }
}

/** Moneda única de un conjunto de pagos; null si hay varias (no se pueden sumar) o ninguna. */
export function singleCurrency(rows: ReadonlyArray<Pick<PaymentRow, 'currency'>>): string | null {
  if (rows.length === 0) return null;
  const first = rows[0].currency;
  return rows.every((r) => r.currency === first) ? first : null;
}

/** Fecha corta en español («17 oct 2026»); «—» si la fecha no es válida. */
export function shortDate(iso: string, locale = 'es'): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Total de pagos registrados a partir del conteo por estado. */
export function totalPayments(statusCounts: Readonly<Record<string, number>>): number {
  return Object.values(statusCounts).reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
}
