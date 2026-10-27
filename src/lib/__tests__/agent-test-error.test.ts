import { describe, expect, it } from 'vitest';
import { parseTestError } from '../agent-test-error';
import { PROVIDER_NAMES, providerName } from '../llm-provider-names';

describe('parseTestError', () => {
  it('extrae el mensaje y el código de un cuerpo JSON del endpoint', () => {
    const raw = JSON.stringify({ error: 'Falta la clave de OpenAI.', code: 'missing_api_key' });
    expect(parseTestError(raw)).toEqual({ message: 'Falta la clave de OpenAI.', code: 'missing_api_key' });
  });

  it('sin código reconocido devuelve code null', () => {
    expect(parseTestError('{"error":"Agente no encontrado","code":"otro"}')).toEqual({ message: 'Agente no encontrado', code: null });
  });

  it('texto que no es JSON se muestra tal cual', () => {
    expect(parseTestError('Error de la IA (openai/gpt-4o-mini): timeout')).toEqual({
      message: 'Error de la IA (openai/gpt-4o-mini): timeout',
      code: null,
    });
  });

  it('JSON roto o vacío no lanza y da un mensaje por defecto', () => {
    expect(parseTestError('{no es json').message).toBe('{no es json');
    expect(parseTestError('   ').message).toBe('No se pudo obtener respuesta del agente.');
  });
});

describe('providerName', () => {
  it('nombra al proveedor, no al modelo', () => {
    expect(providerName('openai')).toBe('OpenAI');
    expect(PROVIDER_NAMES.anthropic).toBe('Anthropic');
  });

  it('un proveedor desconocido se devuelve igual', () => {
    expect(providerName('otro')).toBe('otro');
  });
});
