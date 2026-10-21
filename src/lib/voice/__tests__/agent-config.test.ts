import { describe, expect, it } from 'vitest';
import { composeCallRules, DEFAULT_CALL_RULES } from '@/lib/agent-wizard';
import {
  buildVoiceAgentSpec, effectiveGreeting, externalNameFor, providerLanguage, stripCallRulesBlock, TOOL_END, TOOL_KB, TOOL_TRANSFER,
  type BuildSpecInput, type CrmAgentInput,
} from '../agent-config';
import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '../settings';

const agent: CrmAgentInput = {
  id: 'agt_1',
  name: 'Recepción',
  kind: 'voice',
  personality: 'SECCIÓN 1 — IDENTIDAD\nNombre del agente: Sofía',
  objective: 'SECCIÓN 1 — INTENCIONES\nAtender consultas.',
  additionalInfo: `Hotel con 20 habitaciones.\n\n${composeCallRules(DEFAULT_CALL_RULES)}`,
  welcomeMessage: 'Hola, gracias por llamar. ¿En qué puedo ayudarte?',
  fallbackMessage: 'No tengo esa información; tomo un mensaje.',
};
const config = { publicBaseUrl: 'https://crm.example.com', defaultVoiceId: 'voice_abc', llmModel: 'gpt-4.1-mini', kbSecret: 'secreto-compartido-123456' };
const kbs = [{ name: 'Tarifas', description: 'Precios', itemCount: 12 }];
const input = (over: Partial<BuildSpecInput> = {}, settings?: Partial<VoiceSettings>): BuildSpecInput => ({
  agent, knowledgeBases: kbs, config, settings: { ...structuredClone(DEFAULT_VOICE_SETTINGS), ...settings }, ...over,
});

describe('buildVoiceAgentSpec', () => {
  it('construye el agente con webhook por agente, idioma y herramientas', () => {
    const r = buildVoiceAgentSpec(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { spec } = r;
    expect(spec.externalName).toBe(externalNameFor('agt_1'));
    expect(spec.webhookUrl).toBe('https://crm.example.com/api/voice/webhook?agent=agt_1');
    expect(spec.language).toBe('es-419');
    expect(spec.voiceId).toBe('voice_abc');
    expect(spec.maxCallMs).toBe(8 * 60_000);
    const names = spec.tools.map((t) => t.name);
    expect(names).toContain(TOOL_END);
    expect(names).toContain(TOOL_KB);
    expect(names).not.toContain(TOOL_TRANSFER);
    const kb = spec.tools.find((t) => t.kind === 'knowledge');
    expect(kb && kb.kind === 'knowledge' && kb.url).toBe('https://crm.example.com/api/voice/kb-search?agent=agt_1');
  });

  it('añade la herramienta de transferencia con el número normalizado', () => {
    const r = buildVoiceAgentSpec(input({}, { transfer: { enabled: true, number: '+58 412 123 4567', when: 'Cuando pidan una persona.' } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = r.spec.tools.find((x) => x.kind === 'transfer');
    expect(t && t.kind === 'transfer' && t.number).toBe('+584121234567');
    expect(r.spec.prompt).toContain(TOOL_TRANSFER);
  });

  it('sin base de conocimiento no expone la herramienta ni exige el secreto', () => {
    const r = buildVoiceAgentSpec(input({ knowledgeBases: [], config: { ...config, kbSecret: null } }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.tools.some((t) => t.kind === 'knowledge')).toBe(false);
      expect(r.spec.prompt).toContain('No tienes base de conocimiento conectada');
    }
  });

  it('reporta todo lo que falta, sin lanzar', () => {
    const r = buildVoiceAgentSpec(input({ config: { ...config, publicBaseUrl: null, defaultVoiceId: null, kbSecret: null } }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join(' ')).toContain('VOICE_PUBLIC_URL');
      expect(r.errors.join(' ')).toContain('RETELL_VOICE_ID');
      expect(r.errors.join(' ')).toContain('VOICE_KB_SECRET');
    }
  });

  it('exige https y agente de voz', () => {
    const http = buildVoiceAgentSpec(input({ config: { ...config, publicBaseUrl: 'http://localhost:3000' } }));
    expect(http.ok).toBe(false);
    const chat = buildVoiceAgentSpec(input({ agent: { ...agent, kind: 'chat' } }));
    expect(chat.ok).toBe(false);
  });

  it('una voz definida en los ajustes gana sobre la del entorno', () => {
    const r = buildVoiceAgentSpec(input({}, { providerVoiceId: 'voice_custom' }));
    expect(r.ok && r.spec.voiceId).toBe('voice_custom');
  });

  it('el prompt incluye horario, hora actual, escalamiento y no duplica las reglas viejas del asistente', () => {
    const r = buildVoiceAgentSpec(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.spec.prompt).toContain('{{current_time_America/Caracas}}');
    expect(r.spec.prompt).toContain('REGLAS OPERATIVAS');
    expect(r.spec.prompt).toContain('"reclamo"');
    expect(r.spec.prompt).toContain('Hotel con 20 habitaciones.');
    expect(r.spec.prompt).not.toContain('REGLAS DE LLAMADA');
  });

  it('con grabación apagada pide solo atributos básicos al proveedor', () => {
    const off = buildVoiceAgentSpec(input({}, { recording: false }));
    const on = buildVoiceAgentSpec(input({}, { recording: true }));
    expect(off.ok && off.spec.recording).toBe(false);
    expect(on.ok && on.spec.recording).toBe(true);
  });
});

describe('effectiveGreeting', () => {
  it('añade el aviso de IA antes de la pregunta final', () => {
    const g = effectiveGreeting({ ...DEFAULT_VOICE_SETTINGS, greeting: 'Hola, gracias por llamar. ¿En qué puedo ayudarte?', aiDisclosure: true, recording: false }, null);
    expect(g).toBe('Hola, gracias por llamar. Soy un asistente de inteligencia artificial. ¿En qué puedo ayudarte?');
  });
  it('no repite el aviso si el saludo ya lo menciona y añade el aviso de grabación', () => {
    const g = effectiveGreeting({ ...DEFAULT_VOICE_SETTINGS, greeting: 'Hola, soy una IA del hotel.', aiDisclosure: true, recording: true }, null);
    expect(g.match(/inteligencia artificial/g)).toBeNull();
    expect(g).toContain('puede ser grabada');
  });
  it('sin avisos devuelve el saludo tal cual y usa el del agente si no hay uno', () => {
    expect(effectiveGreeting({ ...DEFAULT_VOICE_SETTINGS, greeting: 'Hola.', aiDisclosure: false, recording: false }, null)).toBe('Hola.');
    expect(effectiveGreeting({ ...DEFAULT_VOICE_SETTINGS, greeting: '', aiDisclosure: false, recording: false }, 'Bienvenido.')).toBe('Bienvenido.');
  });
});

describe('utilidades', () => {
  it('stripCallRulesBlock quita solo el bloque del asistente', () => {
    const out = stripCallRulesBlock('Datos.\n\nREGLAS DE LLAMADA\n- a\n- b\n\nOtro párrafo.');
    expect(out).toBe('Datos.\n\nOtro párrafo.');
  });
  it('providerLanguage mapea es-VE a es-419', () => {
    expect(providerLanguage('es-VE')).toBe('es-419');
    expect(providerLanguage('pt-BR')).toBe('pt-BR');
  });
});
