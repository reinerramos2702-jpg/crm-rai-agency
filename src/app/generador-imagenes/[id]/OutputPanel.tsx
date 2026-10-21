'use client';

import React from 'react';
import { CalendarClock, ClipboardCopy, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { allCopysText, exportFileName, toCsv, toJson, toTxt, type ExportPiece } from '@/lib/grid-export';
import { copyToClipboard, downloadText } from '../utils';

interface OutputPanelProps {
  gridName: string;
  pieces: ExportPiece[];
  onSchedule: () => void;
}

/** Salida de la grilla: copiar o descargar los copys y enviar la semana al planificador. */
export function OutputPanel({ gridName, pieces, onSchedule }: OutputPanelProps) {
  const withCopy = pieces.filter((p) => p.caption).length;
  const images = pieces.reduce((acc, p) => acc + p.imageUrls.length, 0);
  const empty = withCopy === 0;

  async function copyAll() {
    const ok = await copyToClipboard(allCopysText(pieces));
    toast[ok ? 'success' : 'error'](ok ? `${withCopy} copys copiados` : 'No se pudo copiar: usa una descarga');
  }

  function download(kind: 'txt' | 'csv' | 'json') {
    const name = exportFileName(gridName, kind);
    if (kind === 'txt') downloadText(toTxt(gridName, pieces), name, 'text/plain');
    else if (kind === 'csv') downloadText(toCsv(pieces), name, 'text/csv');
    else downloadText(toJson(gridName, pieces), name, 'application/json');
  }

  return (
    <div className="gw-output">
      <p className="muted gw-output-sum">
        <strong>{withCopy}</strong> de {pieces.length} días con copy · <strong>{images}</strong> imagen{images === 1 ? '' : 'es'}
      </p>

      <section className="gw-output-block">
        <p className="label gw-label">Copys</p>
        <button className="btn-secondary" onClick={() => void copyAll()} disabled={empty}>
          <ClipboardCopy size={15} /> Copiar todos los copys
        </button>
        <div className="gw-output-files" role="group" aria-label="Descargar copys">
          {(['txt', 'csv', 'json'] as const).map((kind) => (
            <button key={kind} className="btn-ghost btn-sm" onClick={() => download(kind)} disabled={empty}>
              <FileDown size={13} /> .{kind}
            </button>
          ))}
        </div>
        <p className="muted gw-output-note">Las imágenes se descargan una a una desde la pestaña Imágenes.</p>
      </section>

      <section className="gw-output-block">
        <p className="label gw-label">Publicación</p>
        <button className="btn-primary" onClick={onSchedule} disabled={empty} data-tour="gi-schedule">
          <CalendarClock size={15} /> Enviar a Contenido IG
        </button>
        <p className="muted gw-output-note">
          Verás un resumen día por día antes de confirmar. En modo simulado nada se publica en Instagram.
        </p>
      </section>
    </div>
  );
}
