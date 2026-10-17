import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, parsePrefs } from './card-prefs';
import {
  OPPORTUNITY_TEMPLATES, buildOpportunity, emptyForm, filterOpportunities, forecast, groupByStage,
  opportunitiesToCsv, sortOpportunities, totals, validateForm, type Opportunity,
} from './opportunity-model';
import { STAGES, isStageId, stageById } from './stages';

function opp(over: Partial<Opportunity> & { id: string }): Opportunity {
  return {
    name: 'Trato', stageId: 'nuevo', status: 'open', value: 0, contactId: null, contactName: 'Ana', email: '', phone: '',
    owner: '', business: '', source: '', closeDate: '', tags: [], createdAt: '2026-10-01T00:00:00.000Z', ...over,
  };
}

describe('etapas', () => {
  it('mantiene seis etapas con probabilidad creciente', () => {
    expect(STAGES).toHaveLength(6);
    const probs = STAGES.map((s) => s.probability);
    expect([...probs].sort((a, b) => a - b)).toEqual(probs);
    expect(isStageId('propuesta')).toBe(true);
    expect(isStageId('otra')).toBe(false);
    expect(stageById('negociacion').label).toBe('En Negociación');
  });
});

describe('formulario', () => {
  it('exige contacto y nombre y valida correo, importe y fecha', () => {
    expect(Object.keys(validateForm(emptyForm())).sort()).toEqual(['contactName', 'name']);
    const errors = validateForm(emptyForm({ contactName: 'Ana', name: 'X', email: 'mal', value: 'abc', closeDate: '17/10/2026' }));
    expect(Object.keys(errors).sort()).toEqual(['closeDate', 'email', 'value']);
    expect(validateForm(emptyForm({ contactName: 'Ana', name: 'X', value: '1.250,00', closeDate: '2026-10-30' }))).toEqual({});
  });
  it('construye la oportunidad con importe numérico y etiquetas únicas', () => {
    const o = buildOpportunity(
      emptyForm({ contactName: ' Ana ', name: ' Web ', value: '€ 1.250,50', tags: 'vip, VIP , web,, ', stageId: 'propuesta' }),
      'id-1', new Date('2026-10-17T10:00:00Z'),
    );
    expect(o).toMatchObject({ id: 'id-1', name: 'Web', contactName: 'Ana', value: 1250.5, stageId: 'propuesta', tags: ['vip', 'web'] });
    expect(o.createdAt).toBe('2026-10-17T10:00:00.000Z');
  });
  it('las plantillas traen etapa válida', () => {
    for (const t of OPPORTUNITY_TEMPLATES) expect(isStageId(t.form.stageId ?? 'nuevo')).toBe(true);
  });
});

describe('lista y tablero', () => {
  const list = [
    opp({ id: '1', name: 'Hotel Muévete', stageId: 'nuevo', value: 100, tags: ['vip'], closeDate: '2026-11-05', createdAt: '2026-10-03T00:00:00.000Z' }),
    opp({ id: '2', name: 'Café Quadro', stageId: 'nuevo', value: 300, status: 'won', createdAt: '2026-10-05T00:00:00.000Z' }),
    opp({ id: '3', name: 'Évento', stageId: 'reserva', value: 50, closeDate: '2026-10-20', createdAt: '2026-10-04T00:00:00.000Z' }),
  ];
  it('filtra por texto sin tildes y por estado', () => {
    expect(filterOpportunities(list, { q: 'evento', status: '' }).map((o) => o.id)).toEqual(['3']);
    expect(filterOpportunities(list, { q: '', status: 'won' }).map((o) => o.id)).toEqual(['2']);
    expect(filterOpportunities(list, { q: 'VIP', status: 'open' }).map((o) => o.id)).toEqual(['1']);
  });
  it('ordena sin mutar', () => {
    const copy = [...list];
    expect(sortOpportunities(list, 'recent').map((o) => o.id)).toEqual(['2', '3', '1']);
    expect(sortOpportunities(list, 'value').map((o) => o.id)).toEqual(['2', '1', '3']);
    expect(sortOpportunities(list, 'close').map((o) => o.id)).toEqual(['3', '1', '2']);
    expect(sortOpportunities(list, 'name').map((o) => o.id)).toEqual(['2', '3', '1']);
    expect(list).toEqual(copy);
  });
  it('agrupa por etapa y totaliza', () => {
    const groups = groupByStage(list);
    expect(groups.nuevo.map((o) => o.id)).toEqual(['1', '2']);
    expect(groups.consulta).toEqual([]);
    expect(totals(groups.nuevo)).toEqual({ count: 2, value: 400 });
    expect(totals([])).toEqual({ count: 0, value: 0 });
  });
  it('exporta CSV con etapa y estado legibles', () => {
    const lines = opportunitiesToCsv([list[1] ?? opp({ id: 'x' })]).split('\r\n');
    expect(lines[0]).toContain('Etapa');
    expect(lines[1]).toContain('Nuevo Lead');
    expect(lines[1]).toContain('Ganado');
  });
});

describe('pronóstico', () => {
  const now = new Date(2026, 9, 17); // 17 oct 2026
  const list = [
    opp({ id: 'a', value: 1000, stageId: 'propuesta', closeDate: '2026-10-30' }), // 55 %
    opp({ id: 'b', value: 200, stageId: 'nuevo', closeDate: '2026-11-02' }), // 10 %
    opp({ id: 'c', value: 400, stageId: 'reserva', closeDate: '2026-12-31' }), // 95 %
    opp({ id: 'd', value: 999, stageId: 'reserva', closeDate: '2026-10-10', status: 'lost' }),
    opp({ id: 'e', value: 999, stageId: 'reserva', closeDate: '2027-01-01' }),
    opp({ id: 'f', value: 999, stageId: 'reserva' }),
  ];
  it('reparte por mes y trimestre, solo oportunidades abiertas con fecha', () => {
    const [month, next, quarter] = forecast(list, now);
    expect(month).toMatchObject({ id: 'month', count: 1, value: 1000, weighted: 550, avgProbability: 55 });
    expect(next).toMatchObject({ id: 'next', count: 1, value: 200, weighted: 20, avgProbability: 10 });
    expect(quarter).toMatchObject({ id: 'quarter', count: 3, value: 1600 });
    expect(quarter?.weighted).toBeCloseTo(550 + 20 + 380);
  });
  it('sin datos devuelve ceros', () => {
    for (const p of forecast([], now)) expect(p).toMatchObject({ count: 0, value: 0, weighted: 0, avgProbability: 0 });
  });
});

describe('preferencias de tarjeta', () => {
  it('usa valores por defecto ante datos ausentes o corruptos', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{no json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('42')).toEqual(DEFAULT_PREFS);
  });
  it('respeta lo válido e ignora lo desconocido', () => {
    const p = parsePrefs(JSON.stringify({ design: 'compact', fields: { value: false, tags: 'sí', raro: true } }));
    expect(p.design).toBe('compact');
    expect(p.fields.value).toBe(false);
    expect(p.fields.tags).toBe(true);
    expect(parsePrefs(JSON.stringify({ design: 'enorme' })).design).toBe('default');
  });
});
