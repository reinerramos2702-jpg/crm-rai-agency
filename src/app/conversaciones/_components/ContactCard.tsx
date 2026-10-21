import React from 'react';
import { Mail, Phone, Tag } from 'lucide-react';
import { Avatar } from './Avatar';
import type { ContactDetail } from '../_lib/conv-types';

/** Datos del contacto, siempre visibles arriba del panel derecho. */
export function ContactCard({ detail }: { detail: ContactDetail }) {
  return (
    <div className="cv-contact-card">
      <Avatar name={detail.name} size="lg" />
      <div className="cv-contact-info">
        <strong className="cv-contact-name">{detail.name}</strong>
        <ul className="cv-contact-lines">
          {detail.email && <li><Mail size={12} aria-hidden="true" /><span>{detail.email}</span></li>}
          {detail.phone && <li><Phone size={12} aria-hidden="true" /><span>{detail.phone}</span></li>}
          {detail.source && <li><Tag size={12} aria-hidden="true" /><span>Origen: {detail.source}</span></li>}
        </ul>
        {detail.tags.length > 0 && (
          <ul className="cv-tags" aria-label="Etiquetas">
            {detail.tags.map((tag) => <li key={tag} className="badge badge-muted">{tag}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
