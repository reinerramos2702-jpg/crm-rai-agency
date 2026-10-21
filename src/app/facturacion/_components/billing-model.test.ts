import { describe, expect, it } from 'vitest';
import { paymentTone, shortDate, singleCurrency, totalPayments } from './billing-model';
import { BILLING_TABS, INTEGRATIONS, tabById } from './billing-tabs';

describe('paymentTone', () => {
  it('asigna un tono a cada estado conocido', () => {
    expect(paymentTone('paid')).toBe('success');
    expect(paymentTone('pending')).toBe('warning');
    expect(paymentTone('under_review')).toBe('warning');
    expect(paymentTone('failed')).toBe('error');
    expect(paymentTone('refunded')).toBe('gold');
  });
  it('usa el tono neutro para estados desconocidos o cancelados', () => {
    expect(paymentTone('cancelled')).toBe('muted');
    expect(paymentTone('otro')).toBe('muted');
  });
});

describe('singleCurrency', () => {
  it('devuelve la moneda cuando todas coinciden', () => {
    expect(singleCurrency([{ currency: 'USD' }, { currency: 'USD' }])).toBe('USD');
  });
  it('devuelve null con varias monedas o sin filas', () => {
    expect(singleCurrency([{ currency: 'USD' }, { currency: 'EUR' }])).toBeNull();
    expect(singleCurrency([])).toBeNull();
  });
});

describe('shortDate', () => {
  it('formatea fechas ISO válidas', () => {
    expect(shortDate('2026-10-17T12:00:00.000Z')).toMatch(/17/);
  });
  it('devuelve un guion con fechas inválidas', () => {
    expect(shortDate('no-es-fecha')).toBe('—');
  });
});

describe('totalPayments', () => {
  it('suma los conteos por estado e ignora valores no finitos', () => {
    expect(totalPayments({ paid: 3, pending: 2, refunded: 1 })).toBe(6);
    expect(totalPayments({ paid: Number.NaN, pending: 2 })).toBe(2);
    expect(totalPayments({})).toBe(0);
  });
});

describe('datos de pestañas', () => {
  it('tiene 10 pestañas con ids únicos y solo Transacciones con datos reales', () => {
    expect(BILLING_TABS).toHaveLength(10);
    expect(new Set(BILLING_TABS.map((t) => t.id)).size).toBe(10);
    expect(BILLING_TABS.filter((t) => t.live).map((t) => t.id)).toEqual(['transactions']);
  });
  it('tabById devuelve la primera pestaña si el id no existe', () => {
    expect(tabById('inexistente').id).toBe(BILLING_TABS[0].id);
    expect(tabById('coupons').id).toBe('coupons');
  });
  it('todas las integraciones se declaran como no conectadas con un motivo', () => {
    expect(INTEGRATIONS.map((i) => i.id)).toEqual(['paypal', 'stripe', 'mercadopago']);
    for (const i of INTEGRATIONS) expect(i.reason.length).toBeGreaterThan(10);
  });
});
