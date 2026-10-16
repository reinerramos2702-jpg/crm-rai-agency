/**
 * Exportación de una grilla: copys en .txt, .csv y .json, y nombre de archivo.
 * Lógica pura: arma el texto; la descarga la hace la interfaz.
 */

export interface ExportPiece {
  day: number;
  title: string;
  category: string;
  caption: string;
  imageUrls: string[];
}

interface ExportTheme {
  title?: string;
  category?: string;
  caption?: string;
}

interface ExportAsset {
  themeIndex: number;
  slideNumber: number;
  publicUrl: string;
}

export function buildPieces(themes: readonly ExportTheme[], assets: readonly ExportAsset[], total = 7): ExportPiece[] {
  return Array.from({ length: Math.max(1, total) }, (_, i) => ({
    day: i + 1,
    title: themes[i]?.title?.trim() ?? '',
    category: themes[i]?.category?.trim() ?? '',
    caption: themes[i]?.caption?.trim() ?? '',
    imageUrls: assets
      .filter((a) => a.themeIndex === i)
      .sort((a, b) => a.slideNumber - b.slideNumber)
      .map((a) => a.publicUrl),
  }));
}

/** Todos los copys en texto plano, listos para pegar. Omite los días sin copy. */
export function allCopysText(pieces: readonly ExportPiece[]): string {
  return pieces
    .filter((p) => p.caption)
    .map((p) => `DÍA ${p.day}${p.title ? ` · ${p.title}` : ''}\n\n${p.caption}`)
    .join('\n\n────────────\n\n');
}

export function toTxt(gridName: string, pieces: readonly ExportPiece[]): string {
  const body = allCopysText(pieces);
  return `${gridName}\n${'='.repeat(Math.min(gridName.length, 60))}\n\n${body}\n`;
}

/** Evita que una celda se interprete como fórmula al abrir el CSV en una hoja de cálculo. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(pieces: readonly ExportPiece[]): string {
  const header = ['dia', 'tema', 'categoria', 'copy', 'imagenes'];
  const rows = pieces.map((p) =>
    [String(p.day), p.title, p.category, p.caption, p.imageUrls.join(' | ')].map(csvCell).join(','),
  );
  // BOM para que Excel respete las tildes.
  return `\uFEFF${[header.join(','), ...rows].join('\r\n')}\r\n`;
}

export function toJson(gridName: string, pieces: readonly ExportPiece[]): string {
  return `${JSON.stringify({ grid: gridName, pieces }, null, 2)}\n`;
}

/** Nombre de archivo seguro: sin tildes, en minúsculas, con guiones y fecha. */
export function exportFileName(gridName: string, ext: string, date = new Date()): string {
  const slug =
    gridName
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'grilla';
  const iso = date.toISOString().slice(0, 10);
  return `${slug}-${iso}.${ext.replace(/^\./, '')}`;
}

export function imageFileName(gridName: string, themeIndex: number, slideNumber: number): string {
  return exportFileName(`${gridName} dia ${themeIndex + 1} slide ${slideNumber}`, 'png');
}
