/**
 * Mensaje legible para un error del chat de prueba del agente. El endpoint responde JSON
 * ({ error, code }); el SDK de IA entrega ese cuerpo como texto en `error.message`.
 */
export interface TestChatError {
  message: string;
  /** `missing_api_key`: el workspace no tiene clave del proveedor → la pantalla enlaza a Claves de IA. */
  code: 'missing_api_key' | null;
}

export function parseTestError(raw: string): TestChatError {
  const text = (raw ?? '').trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { error?: unknown; code?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return { message: parsed.error.trim(), code: parsed.code === 'missing_api_key' ? 'missing_api_key' : null };
      }
    } catch {
      /* no era JSON: se muestra el texto tal cual */
    }
  }
  return { message: text || 'No se pudo obtener respuesta del agente.', code: null };
}
