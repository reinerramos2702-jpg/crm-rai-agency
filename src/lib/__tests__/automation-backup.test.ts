import { describe, expect, it } from 'vitest';
import { WORKFLOW_TEMPLATES } from '../automations/templates';
import { MAX_IMPORT_FLOWS, backupFileName, buildBackup, parseBackup } from '../automation-backup';

const sample = WORKFLOW_TEMPLATES.slice(0, 3).map((t) => ({ name: t.name, description: t.description, trigger: t.trigger, steps: t.steps }));

describe('buildBackup y parseBackup', () => {
  it('exporta y vuelve a importar sin pérdidas', () => {
    const text = JSON.stringify(buildBackup(sample, new Date('2026-10-16T10:00:00Z')));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.flows).toHaveLength(3);
      expect(result.flows[0]).toEqual(sample[0]);
    }
  });

  it('acepta una lista simple de flujos', () => {
    expect(parseBackup(JSON.stringify(sample)).ok).toBe(true);
  });

  it('rechaza JSON roto, vacío y sin flujos', () => {
    expect(parseBackup('{no')).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' });
    expect(parseBackup('{}')).toMatchObject({ ok: false });
    expect(parseBackup('[]')).toMatchObject({ ok: false });
  });

  it('rechaza disparadores y pasos inválidos con un mensaje claro', () => {
    const badTrigger = JSON.stringify([{ name: 'X', trigger: { type: 'otro', config: {} }, steps: [] }]);
    expect(parseBackup(badTrigger)).toMatchObject({ ok: false, error: expect.stringContaining('disparador') });
    const badStep = JSON.stringify([{ name: 'X', trigger: { type: 'contact.created' }, steps: [{ type: 'magia', config: {} }] }]);
    expect(parseBackup(badStep)).toMatchObject({ ok: false, error: expect.stringContaining('paso') });
    expect(parseBackup(JSON.stringify([{ trigger: { type: 'contact.created' } }]))).toMatchObject({ ok: false, error: expect.stringContaining('nombre') });
  });

  it('limita la cantidad de flujos', () => {
    const many = Array.from({ length: MAX_IMPORT_FLOWS + 1 }, () => sample[0]);
    expect(parseBackup(JSON.stringify(many))).toMatchObject({ ok: false });
  });

  it('usa pasos vacíos y config vacía por defecto', () => {
    const result = parseBackup(JSON.stringify([{ name: 'Solo disparador', trigger: { type: 'contact.created' } }]));
    expect(result).toEqual({
      ok: true,
      flows: [{ name: 'Solo disparador', description: null, trigger: { type: 'contact.created', config: {} }, steps: [] }],
    });
  });
});

describe('backupFileName', () => {
  it('incluye la fecha', () => {
    expect(backupFileName(new Date('2026-10-16T10:00:00Z'))).toBe('flujos-automatizacion-2026-10-16.json');
  });
});
