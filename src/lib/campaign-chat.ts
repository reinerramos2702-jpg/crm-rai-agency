/**
 * Utilidades puras del chat de planificación: protocolo de stream del SDK de IA,
 * mensajes de error legibles y formato de adjuntos.
 */

export type StreamEvent = { type: 'text'; text: string } | { type: 'error'; message: string };

function parseLine(line: string): StreamEvent | null {
  // Protocolo del Vercel AI SDK: «0:» = fragmento de texto, «3:» = error, el resto es metadato que se ignora.
  if (line.startsWith('0:')) {
    try {
      const piece: unknown = JSON.parse(line.slice(2));
      return typeof piece === 'string' ? { type: 'text', text: piece } : null;
    } catch {
      return null;
    }
  }
  if (line.startsWith('3:')) {
    try {
      const err: unknown = JSON.parse(line.slice(2));
      const message =
        typeof err === 'string' ? err : (err as { message?: string } | null)?.message || 'Error desconocido del modelo.';
      return { type: 'error', message };
    } catch {
      return null;
    }
  }
  return null;
}

/** Analizador incremental: conserva la línea incompleta entre fragmentos de red. */
export function createStreamParser() {
  let pending = '';
  return {
    push(chunk: string): StreamEvent[] {
      pending += chunk;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      return lines.flatMap((l) => {
        const ev = l.trim() ? parseLine(l) : null;
        return ev ? [ev] : [];
      });
    },
    flush(): StreamEvent[] {
      const rest = pending;
      pending = '';
      const ev = rest.trim() ? parseLine(rest) : null;
      return ev ? [ev] : [];
    },
  };
}

/** Mensaje comprensible para un error HTTP del endpoint de chat. */
export function chatErrorMessage(status: number, bodyText: string, provider: string): string {
  let msg = `Error ${status} al contactar la IA.`;
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
      msg = parsed.error || parsed.message || bodyText;
    } catch {
      msg = bodyText;
    }
  }
  if (status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (/no api key/i.test(msg)) {
    return `No hay API key configurada para "${provider}". Ve a "Claves de IA" y agrega una.`;
  }
  return msg;
}

export const NO_RESPONSE_MESSAGE =
  'La IA no devolvió respuesta. Verifica tu API key en "Claves de IA" e inténtalo de nuevo.';

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export type FileKind = 'image' | 'video' | 'audio' | 'archive' | 'pdf' | 'text' | 'other';

export function fileKind(mime: string, name: string): FileKind {
  const n = name.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (n.endsWith('.zip') || n.endsWith('.rar')) return 'archive';
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.txt') || n.endsWith('.md')) return 'text';
  return 'other';
}

const KIND_EMOJI: Record<FileKind, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  archive: '📦',
  pdf: '📄',
  text: '📝',
  other: '📎',
};

/** Marca textual del archivo dentro del mensaje enviado a la IA. */
export function fileIcon(mime: string, name: string): string {
  return KIND_EMOJI[fileKind(mime, name)];
}

export interface AttachmentInfo {
  name: string;
  sizeBytes: number;
  type: string;
  content?: string;
}

/** Solo se leen como texto los archivos livianos de formatos legibles. */
export const MAX_TEXT_FILE_BYTES = 50 * 1024;
const TEXT_MIME_PREFIXES = ['text/', 'application/json', 'application/xml'];
const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json'];

export function isReadableText(file: { type: string; name: string; size: number }): boolean {
  const readable =
    TEXT_MIME_PREFIXES.some((t) => file.type.startsWith(t)) || TEXT_EXTENSIONS.some((e) => file.name.endsWith(e));
  return readable && file.size <= MAX_TEXT_FILE_BYTES;
}

/** Texto final del mensaje: lo escrito más el bloque de adjuntos (con fragmento del contenido si es legible). */
export function buildUserMessage(input: string, files: AttachmentInfo[]): string {
  let content = input.trim();
  if (files.length > 0) {
    const lines = files.map((f) => {
      const base = `${fileIcon(f.type, f.name)} ${f.name} (${formatSize(f.sizeBytes)})`;
      return f.content ? `${base}\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\`` : base;
    });
    content += `\n\n[Archivos adjuntos]\n${lines.join('\n')}`;
  }
  return content;
}

/** Aviso suave de longitud (no bloquea): los mensajes muy largos consumen más tokens. */
export const SOFT_CHAR_LIMIT = 4_000;
export const COUNTER_FROM = 500;
