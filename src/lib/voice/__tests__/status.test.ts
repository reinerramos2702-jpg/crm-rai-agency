import { describe, expect, it } from 'vitest';
import { readVoiceConfig, toPublicConfig } from '../config';
import { buildActivationChecklist } from '../status';

const status = (env: Record<string, string>, callsTotal = 0) => {
  const cfg = readVoiceConfig(env);
  return buildActivationChecklist({ config: toPublicConfig(cfg), callsTotal, webhookBase: cfg.publicBaseUrl });
};

const FULL = {
  RETELL_API_KEY: 'key_0123456789abcdef',
  VOICE_MODE: 'live',
  VOICE_KB_SECRET: 'secreto-compartido-123456',
  RETELL_VOICE_ID: 'voice_abc',
  VOICE_PUBLIC_URL: 'https://crm.example.com/',
};

describe('buildActivationChecklist', () => {
  it('por defecto está en modo simulado y lista todo lo que falta', () => {
    const s = status({});
    expect(s.mode).toBe('simulated');
    expect(s.envReady).toBe(false);
    expect(s.missingEnv).toEqual(expect.arrayContaining(['RETELL_API_KEY', 'VOICE_MODE=live', 'VOICE_KB_SECRET', 'RETELL_VOICE_ID', 'VOICE_PUBLIC_URL (https)']));
    expect(s.webhookUrl).toBeNull();
    expect(s.steps.map((x) => x.id)).toEqual(['llaves', 'numero', 'webhook', 'prueba']);
  });

  it('con todo configurado queda listo y expone la URL del webhook (sin barra doble)', () => {
    const s = status(FULL);
    expect(s.mode).toBe('live');
    expect(s.envReady).toBe(true);
    expect(s.missingEnv).toEqual([]);
    expect(s.webhookUrl).toBe('https://crm.example.com/api/voice/webhook');
    expect(s.steps.find((x) => x.id === 'numero')?.state).toBe('manual');
    expect(s.steps.find((x) => x.id === 'prueba')?.state).toBe('todo');
  });

  it('VOICE_MODE=live sin llave sigue simulado (cero gasto)', () => {
    const s = status({ VOICE_MODE: 'live' });
    expect(s.requestedMode).toBe('live');
    expect(s.mode).toBe('simulated');
  });

  it('un secreto corto no cuenta como listo y una URL http tampoco', () => {
    const s = status({ ...FULL, VOICE_KB_SECRET: 'corto', VOICE_PUBLIC_URL: 'http://localhost:3000' });
    expect(s.missingEnv).toEqual(expect.arrayContaining(['VOICE_KB_SECRET', 'VOICE_PUBLIC_URL (https)']));
    expect(s.webhookUrl).toBeNull();
  });

  it('las llamadas registradas completan número y prueba', () => {
    const s = status(FULL, 3);
    expect(s.steps.every((x) => x.state === 'ok')).toBe(true);
  });

  it('nunca incluye el valor de un secreto', () => {
    const json = JSON.stringify(status(FULL));
    expect(json).not.toContain(FULL.RETELL_API_KEY);
    expect(json).not.toContain(FULL.VOICE_KB_SECRET);
  });
});
