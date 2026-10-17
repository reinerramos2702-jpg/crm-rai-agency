import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUN_FILTERS,
  buildRunsCsv,
  buildRunsUrl,
  friendlyRunError,
  humanizeDetail,
  rangeSinceIso,
  redactUrls,
  summarizeCounts,
} from '../automation-runs';

const NOW = new Date(2026, 9, 16, 12, 0, 0);

describe('buildRunsUrl', () => {
  it('manda los filtros al servidor', () => {
    expect(buildRunsUrl(DEFAULT_RUN_FILTERS, { limit: 25 })).toBe('/api/automations/runs?limit=25');
    const url = buildRunsUrl({ status: 'error', workflowId: 'w1', range: '7d' }, { limit: 25, cursor: 'abc', now: NOW });
    expect(url).toContain('status=error');
    expect(url).toContain('workflowId=w1');
    expect(url).toContain('cursor=abc');
    expect(url).toContain(`since=${encodeURIComponent(new Date(NOW.getTime() - 7 * 86_400_000).toISOString())}`);
  });
  it('rangeSinceIso: hoy empieza a medianoche y todo no filtra', () => {
    expect(rangeSinceIso('todo', NOW)).toBeNull();
    expect(rangeSinceIso('hoy', NOW)).toBe(new Date(2026, 9, 16).toISOString());
  });
});

describe('summarizeCounts', () => {
  it('calcula tasa de éxito sobre ejecuciones terminadas', () => {
    expect(summarizeCounts({ success: 9, error: 1, skipped: 5, pending: 2 })).toEqual({ total: 17, success: 9, error: 1, skipped: 5, pending: 2, successRate: 90 });
  });
  it('sin terminadas no hay tasa', () => {
    expect(summarizeCounts({ skipped: 3 }).successRate).toBeNull();
    expect(summarizeCounts({}).total).toBe(0);
  });
});

describe('redactUrls y humanizeDetail', () => {
  it('oculta direcciones web', () => {
    expect(redactUrls('POST https://n8n.x.com/webhook/abc?key=1 listo')).toBe('POST [URL oculta] listo');
  });
  it('traduce los mensajes del motor sin filtrar la URL', () => {
    const ok = humanizeDetail('send_webhook: POST https://n8n.x.com/hook/secreto (whatsapp) → 200');
    expect(ok).toBe('Notificación entregada a n8n (canal WhatsApp).');
    expect(humanizeDetail('send_webhook: POST https://n8n.x.com/h (slack) → 502')).toContain('error 502');
    expect(humanizeDetail('send_webhook: sin URL de webhook configurada en Settings — paso omitido (placeholder)')).toContain('no hay webhook');
    expect(humanizeDetail('send_webhook: error de red — fetch failed')).toContain('fetch failed');
    expect(humanizeDetail('create_task: sin contacto')).toContain('necesita un contacto');
    expect(humanizeDetail('add_tag: agregado "vip"')).toBe('add_tag: agregado "vip"');
  });
  it('friendlyRunError ignora vacíos', () => {
    expect(friendlyRunError(null)).toBeNull();
    expect(friendlyRunError('  ')).toBeNull();
    expect(friendlyRunError('falló https://a.b/c')).toBe('falló [URL oculta]');
  });
});

describe('buildRunsCsv', () => {
  it('genera cabecera, BOM, escapes y neutraliza fórmulas', () => {
    const csv = buildRunsCsv(
      [
        {
          id: '1',
          workflowId: 'w',
          status: 'error',
          createdAt: '2026-10-16T10:00:00.000Z',
          workflow: { name: '=HYPERLINK("x")' },
          contactName: 'Ana, "la jefa"',
          trigger: { type: 'contact.created' },
          result: { log: [{ step: 'a', ok: true, detail: '' }, { step: 'b', ok: false, detail: '' }] },
          error: 'falló https://x.y/z',
        },
      ],
      { error: 'Error' }
    );
    expect(csv.startsWith('\uFEFFFecha,Flujo,Estado')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"Ana, ""la jefa"""');
    expect(csv).toContain(',2,1,falló [URL oculta]');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});
