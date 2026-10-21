export interface SuggestionMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Ideas para abrir la conversación (también las usan las plantillas vacías). */
export const STARTER_REPLIES = [
  'Mi marca vende…, mi audiencia es…',
  'Quiero 30 días de contenido para Instagram',
  'Tengo fotos y videos que organizar por día',
];

const MAX_SUGGESTIONS = 3;

interface Rule {
  test: RegExp;
  replies: string[];
}

/** Reglas por tema de la última pregunta de la IA, de la más específica a la más general. */
const RULES: Rule[] = [
  {
    test: /plan maestro|calendario (completo|de 30)|todo listo/i,
    replies: ['Se ve bien, ajusta solo el día 1 y cierra el plan', 'Cambia el tono de los últimos 5 días a más directo'],
  },
  {
    test: /pilares/i,
    replies: ['Aprobados los pilares, continúa con el calendario', 'Cambia el último pilar por uno enfocado en ventas'],
  },
  {
    test: /objetivo|meta|lograr/i,
    replies: ['Mi objetivo principal es conseguir más mensajes por WhatsApp', 'Quiero aumentar reservas y ventas directas'],
  },
  {
    test: /audiencia|público|cliente ideal|a quién/i,
    replies: ['Mi público tiene entre 25 y 45 años y compra por Instagram', 'Son familias locales que deciden con recomendaciones'],
  },
  {
    test: /tono|voz de marca|estilo/i,
    replies: ['Tono cercano y profesional, sin tecnicismos', 'Divertido y directo, con frases cortas'],
  },
  {
    test: /frecuencia|cuántas piezas|cuántos días|tamaño del (lote|batch)/i,
    replies: ['30 días, una pieza diaria', '15 días, una pieza cada dos días'],
  },
  {
    test: /fotos|videos|carpeta|assets|material/i,
    replies: ['Tengo fotos reales: úsalas como base', 'No tengo material, propón los briefs visuales'],
  },
];

/** Respuestas sugeridas según el estado de la conversación. Siempre devuelve entre 1 y 3. */
export function suggestReplies(messages: SuggestionMessage[]): string[] {
  const last = messages[messages.length - 1];
  if (!last) return STARTER_REPLIES;
  if (last.role === 'user') return [];

  const text = last.content.trim();
  if (!text) return [];
  if (text.startsWith('⚠️')) return ['Inténtalo de nuevo', 'Continúa desde donde te quedaste'];

  const out: string[] = [];
  for (const rule of RULES) {
    if (!rule.test.test(text)) continue;
    for (const reply of rule.replies) if (!out.includes(reply)) out.push(reply);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  if (out.length === 0) out.push('Continúa', 'Dame una versión más corta');
  return out.slice(0, MAX_SUGGESTIONS);
}
