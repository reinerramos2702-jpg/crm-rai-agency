import React from 'react';
import { BellRing, MessagesSquare, Plus, Tags, Upload } from 'lucide-react';
import { PreviewEmpty, type EmptyBenefit } from '../_shared/PreviewEmpty';

export const CONTACT_TEMPLATES = ['Lead', 'Cliente', 'Proveedor'] as const;

const BENEFITS: readonly EmptyBenefit[] = [
  { icon: MessagesSquare, title: 'Conversaciones', text: 'Cada contacto reúne sus chats en un solo lugar.' },
  { icon: Tags, title: 'Etiquetas', text: 'Segmenta y dispara automatizaciones al etiquetar.' },
  { icon: BellRing, title: 'Seguimiento', text: 'Tareas y notas ligadas a cada persona.' },
];

function GhostRow() {
  return (
    <div className="crm-ghost-row">
      <i className="crm-ghost-dot" />
      <i /><i /><i /><i />
    </div>
  );
}

interface ContactsEmptyProps {
  onImport: () => void;
  onAdd: (tag?: string) => void;
}

/** Estado vacío con vista previa de filas y arranque rápido (importar, agregar o crear desde plantilla). */
export function ContactsEmpty({ onImport, onAdd }: ContactsEmptyProps) {
  return (
    <PreviewEmpty
      title="Aún no tienes contactos"
      text="Importa tu lista en CSV o agrega tu primer contacto. También puedes empezar con una plantilla que ya trae su etiqueta."
      ghosts={<><GhostRow /><GhostRow /><GhostRow /></>}
      actions={
        <>
          <button type="button" className="primary" onClick={() => onAdd()}>
            <Plus size={14} aria-hidden="true" /> Agregar contacto
          </button>
          <button type="button" className="secondary" onClick={onImport}>
            <Upload size={14} aria-hidden="true" /> Importar CSV
          </button>
          <span className="fx-sr-only" id="crm-templates-label">Crear desde plantilla</span>
          <span role="group" aria-labelledby="crm-templates-label" className="crm-empty-actions">
            {CONTACT_TEMPLATES.map((t) => (
              <button key={t} type="button" className="ghost btn-sm" onClick={() => onAdd(t)}>
                <Plus size={12} aria-hidden="true" /> {t}
              </button>
            ))}
          </span>
        </>
      }
      benefits={BENEFITS}
      bare
    />
  );
}
