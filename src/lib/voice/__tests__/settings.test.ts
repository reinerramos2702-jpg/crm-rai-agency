import { describe, expect, it } from 'vitest';
import { DEFAULT_CALL_RULES } from '@/lib/agent-wizard';
import {
  DEFAULT_VOICE_SETTINGS, describeHours, isWithinBusinessHours, parseStoredVoiceSettings, settingsFromCallRules,
  validateVoiceSettings, withDefaults,
} from '../settings';

const valid = () => structuredClone(DEFAULT_VOICE_SETTINGS);

describe('validateVoiceSettings', () => {
  it('acepta los valores por defecto', () => {
    expect(validateVoiceSettings(valid()).ok).toBe(true);
  });

  it('exige un número válido cuando la transferencia está activa y lo normaliza a E.164', () => {
    const s = valid();
    s.transfer = { enabled: true, number: '0412', when: 'x' };
    const bad = validateVoiceSettings(s);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => e.field === 'transfer.number')).toBe(true);

    s.transfer.number = '+58 412-123 4567';
    const good = validateVoiceSettings(s);
    expect(good.ok && good.data.transfer.number).toBe('+584121234567');
  });

  it('rechaza horario invertido o sin días', () => {
    const a = valid();
    a.hours.from = '18:00';
    a.hours.to = '08:00';
    expect(validateVoiceSettings(a).ok).toBe(false);
    const b = valid();
    b.hours.days = [];
    expect(validateVoiceSettings(b).ok).toBe(false);
  });

  it('acota tope, minutos y palabras de escalamiento', () => {
    const a = valid();
    a.monthlyCapUsd = 0;
    expect(validateVoiceSettings(a).ok).toBe(false);
    const b = valid();
    b.maxCallMinutes = 61;
    expect(validateVoiceSettings(b).ok).toBe(false);
    const c = valid();
    c.escalationKeywords = Array.from({ length: 21 }, (_, i) => `p${i}`);
    expect(validateVoiceSettings(c).ok).toBe(false);
    const d = valid();
    d.language = 'xx' as never;
    expect(validateVoiceSettings(d).ok).toBe(false);
  });

  it('rechaza basura y no lanza', () => {
    expect(validateVoiceSettings(null).ok).toBe(false);
    expect(validateVoiceSettings('hola').ok).toBe(false);
    expect(validateVoiceSettings({}).ok).toBe(false);
  });
});

describe('lectura tolerante', () => {
  it('JSON inválido o incompleto cae a valores por defecto', () => {
    expect(parseStoredVoiceSettings(null)).toEqual(DEFAULT_VOICE_SETTINGS);
    expect(parseStoredVoiceSettings('{no json')).toEqual(DEFAULT_VOICE_SETTINGS);
    expect(parseStoredVoiceSettings(JSON.stringify({ monthlyCapUsd: 40 })).monthlyCapUsd).toBe(40);
    expect(parseStoredVoiceSettings(JSON.stringify({ monthlyCapUsd: -4 }))).toEqual(DEFAULT_VOICE_SETTINGS);
  });

  it('withDefaults mezcla objetos anidados', () => {
    const s = withDefaults({ hours: { from: '09:00' } });
    expect(s.hours.from).toBe('09:00');
    expect(s.hours.to).toBe(DEFAULT_VOICE_SETTINGS.hours.to);
  });
});

describe('isWithinBusinessHours (America/Caracas, UTC-4)', () => {
  const s = valid();
  it('lunes 10:00 Caracas está dentro del horario', () => {
    expect(isWithinBusinessHours(s, new Date('2026-10-19T14:00:00Z'))).toBe(true);
  });
  it('lunes 19:00 Caracas está fuera', () => {
    expect(isWithinBusinessHours(s, new Date('2026-10-19T23:00:00Z'))).toBe(false);
  });
  it('domingo está fuera aunque la hora coincida', () => {
    expect(isWithinBusinessHours(s, new Date('2026-10-18T14:00:00Z'))).toBe(false);
  });
  it('sin restricción de horario siempre atiende; zona inválida no bloquea', () => {
    expect(isWithinBusinessHours({ hours: { ...s.hours, enabled: false } }, new Date('2026-10-18T03:00:00Z'))).toBe(true);
    expect(isWithinBusinessHours({ hours: { ...s.hours, timezone: 'No/Existe' } }, new Date())).toBe(true);
  });
  it('describeHours es legible', () => {
    expect(describeHours(s)).toContain('lunes');
    expect(describeHours(s)).toContain('08:00 a 18:00');
  });
});

describe('settingsFromCallRules', () => {
  it('reutiliza las reglas del asistente sin duplicar lógica', () => {
    const out = settingsFromCallRules({ ...DEFAULT_CALL_RULES, transferEnabled: true, transferPhone: '+584121234567', maxMinutes: 12, recording: true }, { language: 'es-419' });
    expect(out.transfer.enabled).toBe(true);
    expect(out.maxCallMinutes).toBe(12);
    expect(out.recording).toBe(true);
    expect(out.language).toBe('es-419');
    expect(validateVoiceSettings(out).ok).toBe(true);
  });
});
