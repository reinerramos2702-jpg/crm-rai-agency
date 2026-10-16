import { describe, expect, it } from 'vitest';
import { WORKFLOW_TEMPLATES } from '../automations/templates';
import {
  buildFlowPreview,
  countByNiche,
  filterTemplates,
  matchesQuery,
  normalizeText,
  sortTemplates,
  templateTags,
  triggerKindLabel,
} from '../automation-templates';

const byId = (id: string) => WORKFLOW_TEMPLATES.find((t) => t.id === id)!;

describe('normalizeText', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizeText('  Reactivación DE Cliente ')).toBe('reactivacion de cliente');
  });
});

describe('matchesQuery y filterTemplates', () => {
  it('encuentra sin tildes y por varias palabras', () => {
    expect(matchesQuery(byId('servicios_reactivacion_inactivo'), 'reactivacion')).toBe(true);
    expect(matchesQuery(byId('servicios_reactivacion_inactivo'), 'reactivacion servicios')).toBe(true);
    expect(matchesQuery(byId('servicios_reactivacion_inactivo'), 'mayoreo')).toBe(false);
  });

  it('busca también por disparador y por acción', () => {
    expect(filterTemplates(WORKFLOW_TEMPLATES, 'cita proxima', 'todas').map((t) => t.id)).toContain('servicios_recordatorio_24h');
    expect(filterTemplates(WORKFLOW_TEMPLATES, 'crear tarea', 'todas').length).toBeGreaterThan(3);
  });

  it('combina categoría y búsqueda; vacío devuelve todo', () => {
    expect(filterTemplates(WORKFLOW_TEMPLATES, '', 'todas')).toHaveLength(WORKFLOW_TEMPLATES.length);
    const retail = filterTemplates(WORKFLOW_TEMPLATES, '', 'retail');
    expect(retail.length).toBeGreaterThan(0);
    expect(retail.every((t) => t.niche === 'retail')).toBe(true);
    expect(filterTemplates(WORKFLOW_TEMPLATES, 'zzz', 'todas')).toEqual([]);
  });
});

describe('countByNiche', () => {
  it('suma las categorías y respeta la búsqueda', () => {
    const all = countByNiche(WORKFLOW_TEMPLATES, '');
    expect(all.todas).toBe(all.servicios + all.retail + all.mayoreo);
    const filtered = countByNiche(WORKFLOW_TEMPLATES, 'vip');
    expect(filtered.todas).toBe(filtered.retail);
    expect(filtered.todas).toBeGreaterThan(0);
  });
});

describe('sortTemplates', () => {
  it('recomendado conserva el orden y no muta la entrada', () => {
    expect(sortTemplates(WORKFLOW_TEMPLATES, 'recomendado')).toBe(WORKFLOW_TEMPLATES);
    const first = WORKFLOW_TEMPLATES[0].id;
    sortTemplates(WORKFLOW_TEMPLATES, 'nombre');
    expect(WORKFLOW_TEMPLATES[0].id).toBe(first);
  });

  it('ordena por nombre y por cantidad de pasos', () => {
    const names = sortTemplates(WORKFLOW_TEMPLATES, 'nombre').map((t) => t.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
    const asc = sortTemplates(WORKFLOW_TEMPLATES, 'pasos-asc').map((t) => t.steps.length);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortTemplates(WORKFLOW_TEMPLATES, 'pasos-desc').map((t) => t.steps.length);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });
});

describe('buildFlowPreview', () => {
  it('empieza por el disparador y mantiene el orden de los pasos', () => {
    const preview = buildFlowPreview(byId('retail_agradecimiento_cross_sell'));
    expect(preview.map((s) => s.kind)).toEqual(['trigger', 'action', 'delay', 'action', 'action']);
    expect(preview[0].detail).toBe('Etiqueta: compra_confirmada');
    expect(preview[2].title).toBe('Esperar 3 días');
  });

  it('describe condiciones y etiquetas múltiples', () => {
    const preview = buildFlowPreview(byId('mayoreo_actualizacion_pedido'));
    expect(preview[0].detail).toContain('pedido_enviado');
    const withCondition = buildFlowPreview(byId('servicios_seguimiento_post_cita'));
    expect(withCondition[1]).toMatchObject({ kind: 'condition', detail: 'post_cita_enviado' });
  });

  it('toda plantilla tiene vista previa con títulos', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const preview = buildFlowPreview(t);
      expect(preview).toHaveLength(t.steps.length + 1);
      expect(preview.every((s) => s.title.length > 0)).toBe(true);
    }
  });
});

describe('etiquetas', () => {
  it('resume acciones únicas y tipo de disparador', () => {
    expect(templateTags(byId('retail_bienvenida_lead'))).toHaveLength(3);
    expect(triggerKindLabel(byId('retail_bienvenida_lead'))).toBe('Por evento');
    expect(triggerKindLabel(byId('servicios_recordatorio_24h'))).toBe('Programada');
  });
});
