import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS, activePreset, applyCreated, applyDeleted, applyUpdated, canApprove, filterPayments,
  hasActiveFilters, normalizeText, optimisticPatch, paidDelta, paymentsToCsv, rangeForPreset,
  relativeTime, sortPayments, statusCounts, totalCount, totalsByCurrency,
  type PaymentRow, type PaymentsResponse,
} from '../payments-view';

const NOW = new Date(2026, 9, 16, 12, 0, 0).getTime();
const iso = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h, 0, 0).toISOString();

function row(over: Partial<PaymentRow> & { id: string }): PaymentRow {
  return {
    reference: `PAY-${over.id}`, amountCents: 10_000, currency: 'USD', method: 'cash', status: 'paid',
    createdAt: iso(2026, 10, 10), paidAt: null, transactionRef: null, guest: null, booking: null, site: null,
    ...over,
  };
}

const ROWS: PaymentRow[] = [
  row({ id: 'a', reference: 'PAY-AAA', guest: { id: 'g1', firstName: 'José', lastName: 'Pérez' }, method: 'card', createdAt: iso(2026, 10, 15) }),
  row({ id: 'b', reference: 'PAY-BBB', status: 'pending', method: 'transfer', amountCents: 25_000, transactionRef: 'TX-9001', createdAt: iso(2026, 10, 14) }),
  row({ id: 'c', reference: 'PAY-CCC', status: 'refunded', refundedAmountCents: 5_000, createdAt: iso(2026, 9, 1), booking: { id: 'b1', reference: 'RES-77' } }),
  row({ id: 'd', reference: 'PAY-DDD', status: 'failed', currency: 'DOP', notes: 'Depósito de Ángela', createdAt: iso(2026, 10, 1) }),
];

describe('normalizeText', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizeText('  José PÉREZ Ñandú ')).toBe('jose perez nandu');
  });
});

describe('filterPayments', () => {
  it('sin filtros devuelve todo y mantiene el orden', () => {
    expect(filterPayments(ROWS, EMPTY_FILTERS).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('busca sin tildes en huésped, notas, referencias y reserva', () => {
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: 'jose perez' }).map((p) => p.id)).toEqual(['a']);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: 'angela' }).map((p) => p.id)).toEqual(['d']);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: 'tx-9001' }).map((p) => p.id)).toEqual(['b']);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: 'res-77' }).map((p) => p.id)).toEqual(['c']);
  });

  it('exige todas las palabras y trata el texto vacío como sin filtro', () => {
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: 'jose zzz' })).toEqual([]);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, query: '   ' })).toHaveLength(4);
  });

  it('filtra por estado y método', () => {
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, status: 'pending' }).map((p) => p.id)).toEqual(['b']);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, method: 'card' }).map((p) => p.id)).toEqual(['a']);
    expect(filterPayments(ROWS, { ...EMPTY_FILTERS, status: 'paid', method: 'transfer' })).toEqual([]);
  });

  it('el rango de fechas incluye el día final completo', () => {
    const f = { ...EMPTY_FILTERS, from: '2026-10-14', to: '2026-10-15' };
    expect(filterPayments(ROWS, f).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('acepta un rango invertido', () => {
    const f = { ...EMPTY_FILTERS, from: '2026-10-15', to: '2026-10-14' };
    expect(filterPayments(ROWS, f).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('usa la fecha de cobro si existe', () => {
    const r = row({ id: 'z', createdAt: iso(2026, 8, 1), paidAt: iso(2026, 10, 15) });
    expect(filterPayments([r], { ...EMPTY_FILTERS, from: '2026-10-15', to: '2026-10-15' })).toHaveLength(1);
  });

  it('no muta la lista de entrada', () => {
    const copy = [...ROWS];
    filterPayments(ROWS, { ...EMPTY_FILTERS, status: 'paid' });
    expect(ROWS).toEqual(copy);
  });
});

describe('hasActiveFilters', () => {
  it('detecta filtros y permite ignorar el estado', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'paid' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: 'paid' }, true)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: ' x ' })).toBe(true);
  });
});

describe('sortPayments', () => {
  it('ordena de más reciente a más antiguo sin mutar', () => {
    const shuffled = [ROWS[2], ROWS[0], ROWS[3], ROWS[1]];
    expect(sortPayments(shuffled).map((p) => p.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(shuffled.map((p) => p.id)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('desempata por id de forma estable', () => {
    const same = iso(2026, 10, 5);
    const out = sortPayments([row({ id: 'y', createdAt: same }), row({ id: 'x', createdAt: same })]);
    expect(out.map((p) => p.id)).toEqual(['x', 'y']);
  });

  it('una lista vacía queda vacía', () => {
    expect(sortPayments([])).toEqual([]);
  });
});

describe('statusCounts', () => {
  it('cuenta ignorando el filtro de estado pero respetando el resto', () => {
    expect(statusCounts(ROWS, { ...EMPTY_FILTERS, status: 'paid' })).toEqual({ paid: 1, pending: 1, refunded: 1, failed: 1 });
    expect(statusCounts(ROWS, { ...EMPTY_FILTERS, method: 'cash' })).toEqual({ refunded: 1, failed: 1 });
  });
});

describe('totalsByCurrency', () => {
  it('suma por moneda y estado', () => {
    const t = totalsByCurrency(ROWS);
    expect(t.map((x) => x.currency)).toEqual(['DOP', 'USD']);
    const usd = t.find((x) => x.currency === 'USD')!;
    expect(usd).toMatchObject({ count: 3, paidCents: 10_000, pendingCents: 25_000, refundedCents: 5_000 });
  });

  it('lista vacía = sin totales', () => {
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe('fechas', () => {
  it('rangeForPreset calcula atajos en hora local', () => {
    expect(rangeForPreset('today', NOW)).toEqual({ from: '2026-10-16', to: '2026-10-16' });
    expect(rangeForPreset('7d', NOW)).toEqual({ from: '2026-10-10', to: '2026-10-16' });
    expect(rangeForPreset('30d', NOW)).toEqual({ from: '2026-09-17', to: '2026-10-16' });
    expect(rangeForPreset('month', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-16' });
  });

  it('activePreset reconoce el atajo vigente', () => {
    expect(activePreset(rangeForPreset('7d', NOW), NOW)).toBe('7d');
    expect(activePreset({ from: '2026-01-01', to: '2026-01-02' }, NOW)).toBeNull();
    expect(activePreset({ from: '', to: '' }, NOW)).toBeNull();
  });

  it('relativeTime habla en español', () => {
    const at = (ms: number) => new Date(NOW - ms).toISOString();
    expect(relativeTime(at(10_000), NOW)).toBe('ahora');
    expect(relativeTime(at(5 * 60_000), NOW)).toBe('hace 5 min');
    expect(relativeTime(at(3 * 3_600_000), NOW)).toBe('hace 3 h');
    expect(relativeTime(iso(2026, 10, 15, 20), NOW)).toBe('ayer');
    expect(relativeTime(iso(2026, 10, 12), NOW)).toBe('hace 4 d');
    expect(relativeTime('no-es-fecha', NOW)).toBe('');
  });

  it('relativeTime devuelve la fecha corta pasada una semana', () => {
    expect(relativeTime(iso(2026, 9, 1), NOW)).toMatch(/2026/);
  });
});

describe('paidDelta', () => {
  const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

  it('compara los últimos 30 días con los 30 anteriores', () => {
    const rows = [
      row({ id: '1', createdAt: daysAgo(5), amountCents: 15_000 }),
      row({ id: '2', createdAt: daysAgo(40), amountCents: 10_000 }),
    ];
    expect(paidDelta(rows, NOW, true)).toEqual({ pct: 50, direction: 'up' });
  });

  it('indica descenso', () => {
    const rows = [
      row({ id: '1', createdAt: daysAgo(5), amountCents: 5_000 }),
      row({ id: '2', createdAt: daysAgo(40), amountCents: 10_000 }),
    ];
    expect(paidDelta(rows, NOW, true)).toEqual({ pct: -50, direction: 'down' });
  });

  it('devuelve null si el dato no existe', () => {
    const only = [row({ id: '1', createdAt: daysAgo(5) })];
    expect(paidDelta(only, NOW, true)).toBeNull();
    expect(paidDelta([], NOW, true)).toBeNull();
    const rows = [row({ id: '1', createdAt: daysAgo(5) }), row({ id: '2', createdAt: daysAgo(40) })];
    expect(paidDelta(rows, NOW, false)).toBeNull();
    const mixed = [...rows, row({ id: '3', createdAt: daysAgo(6), currency: 'DOP' })];
    expect(paidDelta(mixed, NOW, true)).toBeNull();
  });
});

describe('paymentsToCsv', () => {
  it('genera cabecera, escapa comillas y neutraliza fórmulas', () => {
    const csv = paymentsToCsv([
      row({ id: '1', reference: 'PAY-1', amountCents: 12_345, guest: { id: 'g', firstName: 'Ana "La" María', lastName: null }, transactionRef: '=SUM(A1)' }),
    ]);
    const [head, line] = csv.split('\r\n');
    expect(head).toBe('Referencia,Huésped,Reserva,Método,Estado,Moneda,Monto,Fecha,Transacción');
    expect(line).toContain('"Ana ""La"" María"');
    expect(line).toContain('123.45');
    expect(line).toContain("'=SUM(A1)");
    expect(line).toContain('Efectivo,Pagado,USD');
  });

  it('sin filas solo trae la cabecera', () => {
    expect(paymentsToCsv([]).split('\r\n')).toHaveLength(1);
  });
});

describe('transiciones optimistas', () => {
  it('respeta la máquina de estados', () => {
    expect(canApprove('pending')).toBe(true);
    expect(canApprove('under_review')).toBe(true);
    expect(canApprove('paid')).toBe(false);
    expect(optimisticPatch({ status: 'paid', amountCents: 100 }, 'approve', 'x')).toBeNull();
    expect(optimisticPatch({ status: 'pending', amountCents: 100 }, 'reject', 'x')).toEqual({ status: 'failed' });
  });

  it('aprobar y reembolsar rellenan las fechas y el monto', () => {
    expect(optimisticPatch({ status: 'pending', amountCents: 100 }, 'approve', 'T')).toEqual({ status: 'paid', paidAt: 'T', approvedAt: 'T' });
    expect(optimisticPatch({ status: 'paid', amountCents: 100 }, 'refund', 'T')).toEqual({ status: 'refunded', refundedAt: 'T', refundedAmountCents: 100 });
  });
});

describe('cambios optimistas sobre la caché', () => {
  const base: PaymentsResponse = {
    payments: [row({ id: 'p', status: 'pending', amountCents: 20_000 })],
    summary: { paidCents: 0, pendingCents: 20_000, refundedCents: 0, statusCounts: { pending: 1 } },
  };

  it('applyCreated añade al inicio y actualiza el resumen', () => {
    const out = applyCreated(base, row({ id: 'n', status: 'paid', amountCents: 5_000 }));
    expect(out.payments.map((p) => p.id)).toEqual(['n', 'p']);
    expect(out.summary).toMatchObject({ paidCents: 5_000, pendingCents: 20_000, statusCounts: { pending: 1, paid: 1 } });
    expect(totalCount(out.summary)).toBe(2);
    expect(base.payments).toHaveLength(1);
  });

  it('applyUpdated mueve el monto entre pendiente y cobrado', () => {
    const out = applyUpdated(base, 'p', { status: 'paid' });
    expect(out.summary).toMatchObject({ paidCents: 20_000, pendingCents: 0, statusCounts: { pending: 0, paid: 1 } });
    expect(out.payments[0].status).toBe('paid');
    expect(applyUpdated(base, 'nope', { status: 'paid' })).toBe(base);
  });

  it('applyDeleted quita la fila y descuenta del resumen', () => {
    const out = applyDeleted(base, 'p');
    expect(out.payments).toEqual([]);
    expect(out.summary.pendingCents).toBe(0);
    expect(totalCount(out.summary)).toBe(0);
  });
});
