/**
 * Lógica pura de borradores de formulario guardados en localStorage.
 * El sobre lleva versión y fecha para poder caducar (7 días) y descartar
 * contenido con otra forma. Sin dependencias de React.
 */

export const DRAFT_ENVELOPE_VERSION = 1;
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Tolerancia ante relojes desajustados: un borrador «del futuro» más allá de esto se descarta. */
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface StoredDraft<T> {
  data: T;
  savedAt: number;
}

export type DraftValidator<T> = (value: unknown) => value is T;

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** JSON con claves ordenadas: dos borradores iguales dan el mismo texto aunque cambie el orden de campos. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return val;
    const record = val as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((k) => [k, record[k]]));
  });
}

export function serializeDraft<T>(data: T, now: number = Date.now()): string {
  return JSON.stringify({ v: DRAFT_ENVELOPE_VERSION, savedAt: now, data });
}

interface ParseOptions<T> {
  validate: DraftValidator<T>;
  now?: number;
  ttlMs?: number;
}

/** Devuelve el borrador si el texto es un sobre válido, vigente y con la forma esperada; si no, `null`. */
export function parseDraft<T>(raw: string | null, options: ParseOptions<T>): StoredDraft<T> | null {
  if (!raw) return null;
  const { validate, now = Date.now(), ttlMs = DRAFT_TTL_MS } = options;

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof envelope !== 'object' || envelope === null) return null;

  const { v, savedAt, data } = envelope as Record<string, unknown>;
  if (v !== DRAFT_ENVELOPE_VERSION) return null;
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null;
  if (savedAt > now + MAX_FUTURE_SKEW_MS) return null;
  if (now - savedAt > ttlMs) return null;
  if (!validate(data)) return null;

  return { data, savedAt };
}

function browserStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Lee y valida un borrador. Si lo guardado ya no sirve (caducado, corrupto), lo elimina. */
export function readDraft<T>(
  key: string,
  options: ParseOptions<T>,
  storage: DraftStorage | null = browserStorage(),
): StoredDraft<T> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    const parsed = parseDraft(raw, options);
    if (!parsed) storage.removeItem(key);
    return parsed;
  } catch {
    return null;
  }
}

/** Guarda un borrador. Devuelve `false` si el almacenamiento no está disponible o está lleno. */
export function writeDraft<T>(
  key: string,
  data: T,
  now: number = Date.now(),
  storage: DraftStorage | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, serializeDraft(data, now));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(key: string, storage: DraftStorage | null = browserStorage()): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Sin almacenamiento disponible: no hay nada que borrar.
  }
}

/** «menos de un minuto», «5 minutos», «2 horas», «1 día»… para decir «hace …». */
export function formatDraftAge(savedAt: number, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - savedAt) / 60_000));
  if (minutes < 1) return 'menos de un minuto';
  if (minutes < 60) return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hora' : `${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 día' : `${days} días`;
}
