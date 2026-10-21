import React from 'react';

interface MediaFooterProps {
  visible: number;
  total: number;
  truncated: boolean;
}

/** Pie con el estado real de la biblioteca: cuántos activos hay y qué todavía no se guarda en el servidor. */
export function MediaFooter({ visible, total, truncated }: MediaFooterProps) {
  return (
    <div className="mm-foot muted">
      <p>
        <strong>{visible}</strong> de {total} activo{total === 1 ? '' : 's'}
        {truncated ? ' · hay activos más antiguos sin listar' : ''}
      </p>
      <p>
        <span className="fx-dot fx-dot--warn" aria-hidden="true" />
        Subida de archivos pendiente: la biblioteca guarda referencias, no archivos, y todavía no calcula el espacio usado.
      </p>
      <p>Enlaces, etiquetas y vistas guardadas viven solo en este navegador.</p>
    </div>
  );
}
