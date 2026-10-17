import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABELS,
  DEFAULT_GALLERY_FILTERS,
  GALLERY_TEMPLATES,
  categoryOf,
  countByCategory,
  filterGallery,
  readinessOf,
  templateRequirements,
} from '../automation-template-gallery';
import { ACTION_META, CONDITION_META, TRIGGER_META } from '../automations/ui-meta';

describe('GALLERY_TEMPLATES', () => {
  it('tiene ids únicos y todas tienen categoría conocida', () => {
    const ids = GALLERY_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of GALLERY_TEMPLATES) expect(CATEGORY_LABELS[categoryOf(t)]).toBeTruthy();
  });

  it('solo usa disparadores, condiciones y acciones que el motor conoce, con ids de paso únicos', () => {
    for (const t of GALLERY_TEMPLATES) {
      expect(TRIGGER_META[t.trigger.type], t.id).toBeDefined();
      const stepIds = t.steps.map((s) => s.id);
      expect(new Set(stepIds).size, t.id).toBe(stepIds.length);
      for (const s of t.steps) {
        if (s.type === 'action') expect(ACTION_META[s.config.action as keyof typeof ACTION_META], t.id).toBeDefined();
        if (s.type === 'condition') expect(CONDITION_META[s.config.check as keyof typeof CONDITION_META], t.id).toBeDefined();
      }
    }
  });

  it('las plantillas de estado de cita usan config.to (lo que evalúa el motor)', () => {
    const t = GALLERY_TEMPLATES.find((x) => x.id === 'servicios_cita_cancelada');
    expect(t?.trigger).toEqual({ type: 'appointment.status_changed', config: { to: 'cancelled' } });
  });
});

describe('filterGallery y countByCategory', () => {
  it('filtra por categoría, negocio y texto (incluida la categoría)', () => {
    const citas = filterGallery(GALLERY_TEMPLATES, { ...DEFAULT_GALLERY_FILTERS, category: 'citas' });
    expect(citas.length).toBeGreaterThanOrEqual(4);
    expect(citas.every((t) => categoryOf(t) === 'citas')).toBe(true);
    expect(filterGallery(GALLERY_TEMPLATES, { ...DEFAULT_GALLERY_FILTERS, niche: 'mayoreo' }).every((t) => t.niche === 'mayoreo')).toBe(true);
    expect(filterGallery(GALLERY_TEMPLATES, { ...DEFAULT_GALLERY_FILTERS, query: 'reseña' }).map((t) => t.id)).toContain('servicios_solicitud_resena');
    expect(filterGallery(GALLERY_TEMPLATES, { ...DEFAULT_GALLERY_FILTERS, query: 'reputacion' }).length).toBeGreaterThan(0);
    expect(filterGallery(GALLERY_TEMPLATES, { ...DEFAULT_GALLERY_FILTERS, query: 'zzzz' })).toEqual([]);
  });

  it('los contadores suman el total', () => {
    const c = countByCategory(GALLERY_TEMPLATES, { query: '', niche: 'todas' });
    const sum = c.ventas + c.citas + c.seguimiento + c.reputacion + c.atencion + c.pedidos;
    expect(c.todas).toBe(GALLERY_TEMPLATES.length);
    expect(sum).toBe(c.todas);
  });
});

describe('templateRequirements', () => {
  const welcome = GALLERY_TEMPLATES.find((t) => t.id === 'retail_bienvenida_lead')!;
  const milestone = GALLERY_TEMPLATES.find((t) => t.id === 'retail_vip_recompra')!;
  const slack = GALLERY_TEMPLATES.find((t) => t.id === 'retail_sla_vencido')!;

  it('exige n8n cuando hay envíos y refleja si está configurado', () => {
    expect(templateRequirements(welcome, { webhookConfigured: false }).find((r) => r.id === 'n8n')?.state).toBe('missing');
    expect(templateRequirements(welcome, { webhookConfigured: true }).find((r) => r.id === 'n8n')?.state).toBe('ready');
    expect(templateRequirements(welcome, { webhookConfigured: null }).find((r) => r.id === 'n8n')?.state).toBe('manual');
  });

  it('nombra el canal real de los pasos', () => {
    expect(templateRequirements(slack, { webhookConfigured: true }).find((r) => r.id === 'channel')?.label).toContain('Slack');
  });

  it('el hito pide elegir el flujo fuente y es programado', () => {
    const ids = templateRequirements(milestone, { webhookConfigured: true }).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['cron', 'source']));
  });

  it('readinessOf resume', () => {
    expect(readinessOf([]).label).toBe('Lista para usar');
    expect(readinessOf(templateRequirements(welcome, { webhookConfigured: false })).tone).toBe('warn');
    expect(readinessOf(templateRequirements(welcome, { webhookConfigured: true })).tone).toBe('ok');
  });
});
