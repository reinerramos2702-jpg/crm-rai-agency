/**
 * Extrae los copys por día de una respuesta del asistente (Nodo 5).
 * Busca encabezados como «Tema 3», «Día 3», «Caption 3» o «### Copy 3» y
 * devuelve el texto de cada bloque. Si no encuentra encabezados, devuelve [].
 */

const HEADING_WORD = /^(?:caption|copy|tema|d[ií]a|post|carrusel)\s*(\d{1,2})(?!\d)/i;

/** Número de día si la línea es un encabezado («### Tema 3», «**Día 3**», «Caption 3: …»). */
function headingDay(line: string): number | null {
  const match = HEADING_WORD.exec(line.replace(/^[\s#*_>-]+/, ''));
  return match ? Number(match[1]) : null;
}

function cleanBlock(block: string): string {
  return block
    .split('\n')
    .filter((line) => !/^\s*(?:[-*_]{3,}|─{3,}|═{3,})\s*$/.test(line))
    .filter((line) => !/^\s*(?:[*_]{0,3})ALTO TOTAL/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Resultado indexado por día (0 = día 1); `null` donde no hay copy. */
export function splitCopysFromChat(text: string, total = 7): Array<string | null> {
  const found: Array<{ day: number; start: number; end: number }> = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const day = headingDay(line);
    if (day !== null && day >= 1 && day <= total) {
      found.push({ day, start: offset, end: offset + line.length });
    }
    offset += line.length + 1;
  }
  const result: Array<string | null> = Array.from({ length: total }, () => null);
  found.forEach((h, i) => {
    const block = cleanBlock(text.slice(h.end, found[i + 1]?.start ?? text.length));
    if (block && result[h.day - 1] === null) result[h.day - 1] = block;
  });
  return result;
}

/** Busca, de la respuesta más reciente a la más antigua, la primera con al menos `min` copys. */
export function findCopysInMessages(
  messages: ReadonlyArray<{ role: string; content: string }>,
  total = 7,
  min = 2,
): Array<string | null> | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'assistant') continue;
    const parsed = splitCopysFromChat(messages[i].content, total);
    if (parsed.filter(Boolean).length >= min) return parsed;
  }
  return null;
}
