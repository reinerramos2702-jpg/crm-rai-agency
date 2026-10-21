/** Separador más probable según la primera línea (coma, punto y coma o tabulador). */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best = ',';
  let bestCount = 0;
  for (const candidate of [',', ';', '\t']) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) { best = candidate; bestCount = count; }
  }
  return best;
}

/** Analiza CSV (comillas dobles, saltos dentro de comillas, CRLF, BOM). Descarta filas totalmente vacías. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  const endCell = () => { row.push(cell); cell = ''; };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') { cell += '"'; i += 1; } else { quoted = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === '\n') {
      endRow();
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) endRow();
  return rows;
}

const NUMERIC_LIKE = /^[+-]?[\d\s().-]+$/;

/**
 * Celda segura para hojas de cálculo: neutraliza fórmulas (= @ tab, y +/- salvo teléfonos/números)
 * y entrecomilla cuando hace falta (OWASP: CSV injection).
 */
export function escapeCsvCell(value: string): string {
  let v = value;
  const first = v.charAt(0);
  const risky = first === '=' || first === '@' || first === '\t' || first === '\r'
    || ((first === '+' || first === '-') && !NUMERIC_LIKE.test(v));
  if (risky) v = `'${v}`;
  return /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
}
