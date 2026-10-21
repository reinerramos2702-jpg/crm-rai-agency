import { describe, expect, it } from 'vitest';
import { buildReadiness, readinessSummary, type ReadinessInput } from '../campaign-readiness';

const base: ReadinessInput = {
  name: 'Sprint',
  brandInput: '',
  provider: 'deepseek',
  imageProvider: 'gemini',
  pipelineType: 'carousel',
  keys: { state: 'ready', data: ['deepseek', 'google'] },
  planner: { state: 'ready', data: { igHandle: '@marca', brandDocContent: 'doc', brandDocName: 'Manual.docx', businessName: 'Marca' } },
  igMode: { state: 'ready', data: 'simulated' },
};
const byId = (i: ReadinessInput) => Object.fromEntries(buildReadiness(i).map((x) => [x.id, x]));

describe('checklist de preparación', () => {
  it('todo listo cuando hay claves, marca e Instagram', () => {
    const items = buildReadiness({ ...base, brandInput: 'Texto' });
    expect(items.every((x) => x.status === 'ok')).toBe(true);
    expect(readinessSummary(items)).toEqual({ ok: 5, total: 5, attention: 0 });
  });

  it('pide nombre con una acción interna', () => {
    expect(byId({ ...base, name: '  ' }).name).toMatchObject({ status: 'warn', action: 'focus-name' });
  });

  it('avisa si falta la clave del modelo y enlaza a Claves de IA', () => {
    const r = byId({ ...base, provider: 'anthropic' });
    expect(r['llm-key']).toMatchObject({ status: 'warn', href: '/keys' });
  });

  it('pide voz y video solo en pipelines con video', () => {
    const video = byId({ ...base, pipelineType: 'ugc' });
    expect(video['media-keys'].status).toBe('warn');
    expect(video['media-keys'].detail).toContain('ElevenLabs');
    expect(byId({ ...base, pipelineType: 'ugc', keys: { state: 'ready', data: ['google', 'elevenlabs', 'deepseek'] } })['media-keys'].status).toBe('ok');
    expect(byId({ ...base, imageProvider: 'stabilityai' })['media-keys'].status).toBe('unknown');
  });

  it('propone cargar la marca de Configuración cuando existe', () => {
    expect(byId(base).brand).toMatchObject({ status: 'warn', action: 'load-brand' });
    const none = byId({ ...base, planner: { state: 'ready', data: { igHandle: '', brandDocContent: '', brandDocName: '', businessName: '' } } });
    expect(none.brand).toMatchObject({ status: 'warn', href: '/automatizacion' });
    expect(none.instagram).toMatchObject({ status: 'warn', href: '/automatizacion' });
  });

  it('distingue modo simulado de publicación real', () => {
    expect(byId(base).instagram.detail).toContain('simulado');
    expect(byId({ ...base, igMode: { state: 'ready', data: 'live' } }).instagram.detail).toContain('lista para publicar');
  });

  it('tolera cargas pendientes y errores de permiso sin marcar fallos', () => {
    const loading = byId({ ...base, keys: { state: 'loading' }, planner: { state: 'loading' }, igMode: { state: 'loading' } });
    expect(loading['llm-key'].status).toBe('pending');
    expect(loading.instagram.status).toBe('pending');
    const denied = byId({ ...base, keys: { state: 'error' }, planner: { state: 'error' }, igMode: { state: 'error' } });
    expect(denied['llm-key'].status).toBe('unknown');
    expect(denied.instagram.status).toBe('unknown');
    expect(denied.brand.href).toBe('/automatizacion');
  });
});
