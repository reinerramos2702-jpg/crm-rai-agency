'use client';

import { useCallback, useRef, useState } from 'react';
import type { MediaItem } from '@/lib/media-types';

/**
 * Selección múltiple sobre la lista visible. Mayús + clic marca (o desmarca) todo el tramo
 * entre el último activo tocado y el actual, como en un gestor de archivos.
 */
export function useMediaSelection(visible: readonly MediaItem[]) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const anchor = useRef<string | null>(null);

  const toggle = useCallback(
    (id: string, range = false) => {
      const anchorId = anchor.current;
      anchor.current = id;
      setSelected((prev) => {
        const next = new Set(prev);
        const from = anchorId ? visible.findIndex((i) => i.id === anchorId) : -1;
        const to = visible.findIndex((i) => i.id === id);
        if (range && from >= 0 && to >= 0) {
          const adding = !prev.has(id);
          for (let i = Math.min(from, to); i <= Math.max(from, to); i += 1) {
            if (adding) next.add(visible[i].id);
            else next.delete(visible[i].id);
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [visible],
  );

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (visible.length > 0 && visible.every((i) => next.has(i.id))) visible.forEach((i) => next.delete(i.id));
      else visible.forEach((i) => next.add(i.id));
      return next;
    });
  }, [visible]);

  const clear = useCallback(() => {
    anchor.current = null;
    setSelected(new Set());
  }, []);

  const removeMany = useCallback((ids: ReadonlySet<string>) => {
    setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
  }, []);

  return { selected, toggle, toggleAll, clear, removeMany };
}
