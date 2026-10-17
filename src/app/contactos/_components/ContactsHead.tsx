import React from 'react';
import { Plus, Upload, RotateCw } from 'lucide-react';
import { plural } from '../_shared/crm-text';

interface ContactsHeadProps {
  total: number;
  loading: boolean;
  refreshing: boolean;
  onImport: () => void;
  onAdd: () => void;
  onRefresh: () => void;
}

export function ContactsHead({ total, loading, refreshing, onImport, onAdd, onRefresh }: ContactsHeadProps) {
  return (
    <div className="crm-head">
      <div className="crm-head-main">
        <h2 className="crm-head-title">Contactos</h2>
        <span className="badge badge-gold" aria-live="polite">
          {loading ? 'Cargando…' : plural(total, 'contacto', 'contactos')}
        </span>
      </div>
      <div className="crm-actions">
        <button type="button" className="ghost crm-icon-btn" aria-label="Actualizar la lista" onClick={onRefresh} disabled={refreshing}>
          <RotateCw size={15} aria-hidden="true" />
        </button>
        <button type="button" className="secondary" onClick={onImport}>
          <Upload size={14} aria-hidden="true" /> Importar
        </button>
        <button type="button" className="primary" onClick={onAdd}>
          <Plus size={14} aria-hidden="true" /> Agregar contacto
        </button>
      </div>
    </div>
  );
}
