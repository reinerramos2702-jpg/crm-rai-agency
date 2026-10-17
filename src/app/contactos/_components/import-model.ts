import { isEmail, normalize } from '../_shared/crm-text';

export const MAX_IMPORT_BYTES = 1_048_576; // 1 MB
export const MAX_IMPORT_ROWS = 500;

export interface NewContact {
  name: string;
  email: string;
  phone: string;
}

export interface ImportIssue {
  /** Número de línea del archivo (1 = encabezado). */
  line: number;
  reason: string;
}

export interface ImportPlan {
  valid: NewContact[];
  issues: ImportIssue[];
  /** Mensaje de error global (cabecera ausente, demasiadas filas…). */
  fatal: string | null;
}

const NAME_KEYS = ['nombre', 'nombre de contacto', 'name', 'contacto', 'full name'];
const EMAIL_KEYS = ['correo', 'correo electronico', 'email', 'e-mail', 'mail'];
const PHONE_KEYS = ['telefono', 'phone', 'celular', 'movil', 'whatsapp', 'tel'];

/** Comprueba tipo y tamaño antes de leer el archivo. */
export function validateImportFile(file: { name: string; size: number; type: string }): string | null {
  const lower = file.name.toLowerCase();
  const typeOk = file.type === '' || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.type === 'text/plain';
  if (!lower.endsWith('.csv') || !typeOk) return 'Solo se admiten archivos .csv.';
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > MAX_IMPORT_BYTES) return 'El archivo supera 1 MB. Divídelo en partes más pequeñas.';
  return null;
}

function findColumn(header: readonly string[], keys: readonly string[]): number {
  return header.findIndex((h) => keys.includes(normalize(h)));
}

/** Teléfono limpio: conserva dígitos, «+» inicial, espacios, guiones y paréntesis. */
function cleanPhone(raw: string): string {
  return raw.replace(/[^\d+\s().-]/g, '').trim().slice(0, 30);
}

/** Convierte filas CSV (la primera es el encabezado) en contactos válidos y un listado de problemas. */
export function planImport(rows: readonly (readonly string[])[]): ImportPlan {
  const [header, ...body] = rows;
  if (!header) return { valid: [], issues: [], fatal: 'El archivo no tiene filas.' };
  const nameCol = findColumn(header, NAME_KEYS);
  const emailCol = findColumn(header, EMAIL_KEYS);
  const phoneCol = findColumn(header, PHONE_KEYS);
  if (nameCol < 0) return { valid: [], issues: [], fatal: 'Falta la columna «Nombre» en la primera fila.' };
  if (body.length > MAX_IMPORT_ROWS) {
    return { valid: [], issues: [], fatal: `Máximo ${MAX_IMPORT_ROWS} contactos por archivo (tiene ${body.length}).` };
  }

  const valid: NewContact[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  body.forEach((cells, index) => {
    const line = index + 2;
    const name = (cells[nameCol] ?? '').trim().slice(0, 120);
    const email = emailCol >= 0 ? (cells[emailCol] ?? '').trim().slice(0, 160) : '';
    const phone = phoneCol >= 0 ? cleanPhone(cells[phoneCol] ?? '') : '';
    if (!name) { issues.push({ line, reason: 'Sin nombre' }); return; }
    if (email && !isEmail(email)) { issues.push({ line, reason: `Correo no válido (${email})` }); return; }
    const key = email ? normalize(email) : `${normalize(name)}|${phone}`;
    if (seen.has(key)) { issues.push({ line, reason: 'Repetido en el archivo' }); return; }
    seen.add(key);
    valid.push({ name, email, phone });
  });
  return { valid, issues, fatal: null };
}
