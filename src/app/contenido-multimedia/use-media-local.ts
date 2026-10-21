'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_MEDIA_VIEW, parseMediaView, type MediaView } from '@/lib/media-filter';
import {
  REFS_KEY,
  TAGS_KEY,
  VIEWS_KEY,
  VIEW_KEY,
  addRef,
  addSavedView,
  addTag,
  parseRefs,
  parseSavedViews,
  parseTags,
  removeRefs,
  removeSavedView,
  removeTag,
  type AddRefResult,
  type MediaRef,
  type SavedView,
  type TagMapMutable,
} from '@/lib/media-local';
import type { MediaKind } from '@/lib/media-types';

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin storage (modo privado o bloqueado): el cambio dura solo la sesión */
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Referencias por enlace, etiquetas y vistas guardadas. Viven SOLO en este navegador.
 * La lectura de localStorage ocurre en un efecto (nunca en el inicializador del estado)
 * para no romper la hidratación.
 */
export function useMediaLocal() {
  const [refs, setRefs] = useState<MediaRef[]>([]);
  const [tags, setTags] = useState<TagMapMutable>({});
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [view, setViewState] = useState<MediaView>(DEFAULT_MEDIA_VIEW);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRefs(parseRefs(read(REFS_KEY)));
    setTags(parseTags(read(TAGS_KEY)));
    setSavedViews(parseSavedViews(read(VIEWS_KEY)));
    setViewState(parseMediaView(read(VIEW_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) write(VIEW_KEY, view);
  }, [view, hydrated]);

  const updateView = useCallback((patch: Partial<MediaView>) => setViewState((v) => ({ ...v, ...patch })), []);

  const addReference = useCallback(
    (input: { url: string; title?: string; kind?: MediaKind }): AddRefResult => {
      const result = addRef(refs, input);
      if (result.ok) {
        setRefs(result.refs);
        write(REFS_KEY, result.refs);
      }
      return result;
    },
    [refs],
  );

  const removeReferences = useCallback(
    (ids: ReadonlySet<string>) => {
      const next = removeRefs(refs, ids);
      setRefs(next);
      write(REFS_KEY, next);
    },
    [refs],
  );

  const tagItems = useCallback(
    (ids: readonly string[], tag: string) => {
      const next = addTag(tags, ids, tag);
      setTags(next);
      write(TAGS_KEY, next);
    },
    [tags],
  );

  const untag = useCallback(
    (id: string, tag: string) => {
      const next = removeTag(tags, id, tag);
      setTags(next);
      write(TAGS_KEY, next);
    },
    [tags],
  );

  const saveView = useCallback(
    (name: string, current: MediaView) => {
      const next = addSavedView(savedViews, name, current);
      setSavedViews(next);
      write(VIEWS_KEY, next);
    },
    [savedViews],
  );

  const deleteView = useCallback(
    (name: string) => {
      const next = removeSavedView(savedViews, name);
      setSavedViews(next);
      write(VIEWS_KEY, next);
    },
    [savedViews],
  );

  return { hydrated, view, updateView, refs, tags, savedViews, addReference, removeReferences, tagItems, untag, saveView, deleteView };
}
