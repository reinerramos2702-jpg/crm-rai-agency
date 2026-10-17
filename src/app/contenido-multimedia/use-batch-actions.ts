'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { MAX_BATCH_DOWNLOADS, buildCsv, linksText, suggestFileName } from '@/lib/media-actions';
import type { MediaItem } from '@/lib/media-types';
import { copyText, downloadRemote, downloadText } from './browser-actions';

/** Acciones en lote sobre los activos seleccionados (solo lo que funciona hoy con los datos existentes). */
export function useBatchActions(selectedItems: readonly MediaItem[], tagItems: (ids: readonly string[], tag: string) => void) {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    const files = selectedItems.flatMap((i) => (i.url ? [{ url: i.url, name: suggestFileName(i) }] : []));
    if (files.length === 0) {
      toast.error('Ninguno de los seleccionados tiene un archivo descargable.');
      return;
    }
    if (files.length > MAX_BATCH_DOWNLOADS) {
      toast.error(`Descarga hasta ${MAX_BATCH_DOWNLOADS} a la vez. Para el resto usa «Copiar enlaces» o la lista .csv.`);
      return;
    }
    setBusy(true);
    let opened = 0;
    for (const file of files) {
      const result = await downloadRemote(file.url, file.name);
      if (result === 'opened') opened += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setBusy(false);
    toast.success(opened > 0 ? `${files.length - opened} descargados; ${opened} se abrieron en otra pestaña.` : 'Descarga completa.');
  }, [selectedItems]);

  const copyLinks = useCallback(() => {
    const text = linksText(selectedItems);
    if (!text) {
      toast.error('Ninguno de los seleccionados tiene enlace.');
      return;
    }
    void copyText(text, 'Enlaces copiados, uno por línea.');
  }, [selectedItems]);

  const csv = useCallback(() => {
    downloadText(buildCsv(selectedItems), `biblioteca-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  }, [selectedItems]);

  const tag = useCallback(
    (value: string) => {
      tagItems(selectedItems.map((i) => i.id), value);
      toast.success(`Etiqueta añadida a ${selectedItems.length}.`);
    },
    [selectedItems, tagItems],
  );

  return { busy, download, copyLinks, csv, tag };
}
