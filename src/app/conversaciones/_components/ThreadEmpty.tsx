import React from 'react';
import { MessageSquare, UserPlus } from 'lucide-react';

/** Burbuja fantasma: anticipa cómo se verá un mensaje real. */
function GhostBubble({ side, width }: { side: 'in' | 'out'; width: string }) {
  return (
    <div className="cv-ghost-bubble" data-dir={side} style={{ width }}>
      <i /><i style={{ width: '62%' }} />
    </div>
  );
}

/** Estado vacío central del hilo, con vista previa y guía. */
export function ThreadEmpty({ onNew, hasContacts }: { onNew: () => void; hasContacts: boolean }) {
  return (
    <section className="cv-col cv-thread cv-empty" aria-labelledby="cv-empty-title">
      <div className="cv-empty-inner">
        <div className="cv-ghosts" aria-hidden="true">
          <GhostBubble side="in" width="62%" />
          <GhostBubble side="out" width="54%" />
          <GhostBubble side="in" width="70%" />
        </div>
        <span className="cv-empty-icon" aria-hidden="true"><MessageSquare size={22} /></span>
        <h2 id="cv-empty-title" className="cv-empty-title">Sin conversación seleccionada</h2>
        <p className="cv-empty-text">
          {hasContacts
            ? 'Selecciona una conversación de la lista o crea un contacto nuevo para ver sus mensajes aquí.'
            : 'Selecciona o crea un contacto: cada contacto abre su propia conversación con notas, tareas e historial.'}
        </p>
        <button type="button" className="primary" onClick={onNew}>
          <UserPlus size={14} aria-hidden="true" /> Nuevo contacto
        </button>
      </div>
    </section>
  );
}
