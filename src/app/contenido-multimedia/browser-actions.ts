'use client';

import toast from 'react-hot-toast';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Mensaje de error de una respuesta de la API (`{ error }`); cadena vacía si no trae ninguno. */
export async function readApiError(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  return isRecord(data) && typeof data.error === 'string' ? data.error : '';
}

/** true si el foco está en un campo donde las flechas y Esc son del propio campo. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

/** Copia texto al portapapeles; avisa con un mensaje claro si el navegador no lo permite. */
export async function copyText(text: string, okMessage: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
    return true;
  } catch {
    toast.error('No se pudo copiar. Tu navegador bloqueó el portapapeles.');
    return false;
  }
}

function triggerDownload(href: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Descarga un texto como archivo (CSV con BOM para que Excel respete las tildes). */
export function downloadText(content: string, fileName: string, mime: string): void {
  const blob = new Blob([mime.includes('csv') ? `${String.fromCharCode(0xfeff)}${content}` : content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Descarga un archivo remoto. Si el servidor no permite leerlo desde el navegador (CORS),
 * lo abre en una pestaña nueva para guardarlo desde allí.
 */
export async function downloadRemote(url: string, fileName: string): Promise<'downloaded' | 'opened'> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return 'downloaded';
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'opened';
  }
}

/** El documento de marca solo guarda su texto extraído: se descarga como .txt desde la API existente. */
export async function downloadBrandText(fileName: string): Promise<boolean> {
  try {
    const res = await fetch('/api/workspace/brand-doc', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    const text = isRecord(data) && typeof data.brandDocText === 'string' ? data.brandDocText : '';
    if (!text) throw new Error('vacío');
    downloadText(text, fileName.replace(/\.[a-z0-9]+$/i, '') + '.txt', 'text/plain');
    return true;
  } catch {
    toast.error('No se pudo leer el texto del documento de marca.');
    return false;
  }
}
