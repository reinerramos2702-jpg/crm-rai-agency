import { describe, expect, it } from 'vitest';
import {
  CHAT_STEPS, DEFAULT_CALL_RULES, DEFAULT_CHAT_DRAFT, DEFAULT_VOICE_DRAFT, VOICE_STEPS, VOICES, VOICE_LANGUAGES,
  composeAgentPayload, composeCallRules, hasBlocking, isChatDraft, isVoiceDraft, parseVoiceLocalConfig, progressPercent,
  stepsFor, toVoiceLocalConfig, validateAll, validateChatStep, validateVoiceStep, voiceConfigKey, wizardDraftKey,
  type ChatDraft, type VoiceDraft,
} from '../agent-wizard';

const chat = (p: Partial<ChatDraft> = {}): ChatDraft => ({ ...DEFAULT_CHAT_DRAFT, ...p });
const voice = (p: Partial<VoiceDraft> = {}): VoiceDraft => ({ ...DEFAULT_VOICE_DRAFT, ...p });

describe('pasos y progreso', () => {
  it('chat tiene 5 pasos y voz 5 pasos, ambos terminan en revisar', () => {
    expect(CHAT_STEPS.map((s) => s.id)).toEqual(['identidad', 'objetivo', 'entrenamiento', 'canales', 'revisar']);
    expect(VOICE_STEPS.map((s) => s.id)).toEqual(['voz', 'objetivo', 'conocimiento', 'reglas', 'revisar']);
    expect(stepsFor('voice')).toBe(VOICE_STEPS);
    expect(stepsFor('chat')).toBe(CHAT_STEPS);
  });

  it('el progreso cuenta el paso actual y se acota', () => {
    expect(progressPercent(0, 5)).toBe(20);
    expect(progressPercent(4, 5)).toBe(100);
    expect(progressPercent(9, 5)).toBe(100);
    expect(progressPercent(-3, 5)).toBe(20);
    expect(progressPercent(0, 0)).toBe(0);
  });

  it('las claves de borrador están versionadas y separadas por tipo', () => {
    expect(wizardDraftKey('chat')).toBe('rai-agent-wizard-chat-v1');
    expect(wizardDraftKey('voice')).not.toBe(wizardDraftKey('chat'));
    expect(voiceConfigKey('abc')).toContain('abc');
  });
});

describe('validación suave', () => {
  it('solo el nombre bloquea; lo demás avisa', () => {
    expect(hasBlocking(validateChatStep('identidad', chat({ name: '' })))).toBe(true);
    expect(hasBlocking(validateChatStep('identidad', chat({ name: 'A' })))).toBe(true);
    expect(hasBlocking(validateChatStep('identidad', chat({ name: 'x'.repeat(61) })))).toBe(true);
    const ok = validateChatStep('identidad', chat({ name: 'Lucía' }));
    expect(hasBlocking(ok)).toBe(false);
    expect(ok.some((i) => i.field === 'business' && i.level === 'warn')).toBe(true);
  });

  it('avisa si no hay conocimiento ni canales, sin bloquear', () => {
    const t = validateChatStep('entrenamiento', chat({ name: 'Lucía' }));
    expect(t.some((i) => i.field === 'kbIds')).toBe(true);
    expect(hasBlocking(t)).toBe(false);
    expect(validateChatStep('entrenamiento', chat({ kbIds: ['kb1'] })).some((i) => i.field === 'kbIds')).toBe(false);
    expect(validateChatStep('canales', chat({ channels: [] })).length).toBe(1);
  });

  it('voz: transferencia, horario, duración y aviso legal', () => {
    const rules = (p: Partial<typeof DEFAULT_CALL_RULES>) => voice({ rules: { ...DEFAULT_CALL_RULES, ...p } });
    expect(validateVoiceStep('reglas', rules({ transferEnabled: true, transferPhone: 'abc' })).some((i) => i.field === 'transferPhone')).toBe(true);
    expect(validateVoiceStep('reglas', rules({ transferEnabled: true, transferPhone: '+58 412 1234567' })).some((i) => i.field === 'transferPhone')).toBe(false);
    expect(validateVoiceStep('reglas', rules({ hoursFrom: '18:00', hoursTo: '08:00' })).some((i) => i.field === 'hours')).toBe(true);
    expect(validateVoiceStep('reglas', rules({ days: [] })).some((i) => i.field === 'days')).toBe(true);
    expect(validateVoiceStep('reglas', rules({ maxMinutes: 0 })).some((i) => i.field === 'maxMinutes')).toBe(true);
    expect(validateVoiceStep('reglas', rules({ recording: true, consent: false })).some((i) => i.field === 'consent')).toBe(true);
    expect(validateVoiceStep('reglas', rules({ aiDisclosure: false })).some((i) => i.field === 'aiDisclosure')).toBe(true);
    expect(validateVoiceStep('reglas', voice())).toEqual([]);
  });

  it('voz: saludo corto o excesivo avisa', () => {
    expect(validateVoiceStep('objetivo', voice({ greeting: 'Hola' })).some((i) => i.field === 'greeting')).toBe(true);
    expect(validateVoiceStep('objetivo', voice({ greeting: 'a'.repeat(300), goalDetail: 'x'.repeat(30) })).some((i) => i.field === 'greeting')).toBe(true);
  });

  it('validateAll reúne todos los pasos', () => {
    expect(hasBlocking(validateAll('chat', chat()))).toBe(true);
    expect(hasBlocking(validateAll('chat', chat({ name: 'Lucía' })))).toBe(false);
    expect(hasBlocking(validateAll('voice', voice({ name: 'Voz' })))).toBe(false);
  });
});

describe('validadores de borrador', () => {
  it('aceptan los valores por defecto y rechazan formas ajenas', () => {
    expect(isChatDraft(DEFAULT_CHAT_DRAFT)).toBe(true);
    expect(isVoiceDraft(DEFAULT_VOICE_DRAFT)).toBe(true);
    expect(isChatDraft(DEFAULT_VOICE_DRAFT)).toBe(false);
    expect(isVoiceDraft(DEFAULT_CHAT_DRAFT)).toBe(false);
    expect(isChatDraft(null)).toBe(false);
    expect(isChatDraft([])).toBe(false);
    expect(isChatDraft({ ...DEFAULT_CHAT_DRAFT, tone: 'raro' })).toBe(false);
    expect(isChatDraft({ ...DEFAULT_CHAT_DRAFT, kbIds: [1] })).toBe(false);
    expect(isVoiceDraft({ ...DEFAULT_VOICE_DRAFT, rules: { ...DEFAULT_CALL_RULES, days: ['lun'] } })).toBe(false);
    expect(isVoiceDraft({ ...DEFAULT_VOICE_DRAFT, language: 'fr-FR' })).toBe(false);
  });

  it('la voz por defecto existe en el catálogo', () => {
    expect(VOICES.some((v) => v.id === DEFAULT_VOICE_DRAFT.voiceId)).toBe(true);
    expect(VOICE_LANGUAGES.some((l) => l.id === DEFAULT_VOICE_DRAFT.language)).toBe(true);
  });
});

describe('composición del agente', () => {
  it('chat: usa campos existentes y recorta espacios', () => {
    const p = composeAgentPayload('chat', chat({ name: '  Lucía ', business: 'Hidromáticos', goal: 'ventas', goalDetail: 'Pide el teléfono.', businessInfo: ' Abrimos de 8 a 5 ' }));
    expect(p.name).toBe('Lucía');
    expect(p.personality).toContain('Nombre del agente: Lucía');
    expect(p.personality).toContain('Hidromáticos');
    expect(p.objective).toContain('Ventas y captación');
    expect(p.objective).toContain('Pide el teléfono.');
    expect(p.additionalInfo).toBe('Abrimos de 8 a 5');
    expect(p.channels).toEqual(DEFAULT_CHAT_DRAFT.channels);
  });

  it('voz: canal de llamadas, estilo hablado y reglas en la info adicional', () => {
    const p = composeAgentPayload('voice', voice({ name: 'Voz', business: 'Hidromáticos', businessInfo: 'Tarifas: 10 USD' }));
    expect(p.channels).toEqual(['Llamadas de voz']);
    expect(p.personality).toContain('Estilo de voz');
    expect(p.personality).toContain('Español (Venezuela)');
    expect(p.additionalInfo).toContain('Tarifas: 10 USD');
    expect(p.additionalInfo).toContain('REGLAS DE LLAMADA');
    expect(p.welcomeMessage).toBe(DEFAULT_VOICE_DRAFT.greeting);
    expect(p.fallbackMessage).toContain('devolverá la llamada');
  });

  it('las reglas describen horario, transferencia, buzón, límite y aviso', () => {
    const text = composeCallRules({ ...DEFAULT_CALL_RULES, transferEnabled: true, transferPhone: '+584121234567', recording: true });
    expect(text).toContain('lunes, martes, miércoles, jueves, viernes');
    expect(text).toContain('08:00 a 18:00');
    expect(text).toContain('+584121234567');
    expect(text).toContain('Buzón de voz');
    expect(text).toContain('10 minutos');
    expect(text).toContain('inteligencia artificial');
    expect(text).toContain('consentimiento');
    const off = composeCallRules({ ...DEFAULT_CALL_RULES, hoursEnabled: false, transferEnabled: false, voicemailEnabled: false, aiDisclosure: false });
    expect(off).toContain('cualquier hora');
    expect(off).toContain('No transfieras');
    expect(off).not.toContain('Buzón de voz');
  });
});

describe('configuración de voz local', () => {
  it('ida y vuelta y rechazo de basura', () => {
    const cfg = toVoiceLocalConfig(voice({ voiceId: 'mateo' }), 1000);
    expect(parseVoiceLocalConfig(JSON.stringify(cfg))).toEqual(cfg);
    expect(parseVoiceLocalConfig(null)).toBeNull();
    expect(parseVoiceLocalConfig('no es json')).toBeNull();
    expect(parseVoiceLocalConfig(JSON.stringify({ ...cfg, speed: 'turbo' }))).toBeNull();
  });
});
