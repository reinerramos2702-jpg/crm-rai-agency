import React from 'react';
import { avatarTone, initials } from '../_shared/crm-text';
import { formatDateTime, relativeTime } from '../_shared/crm-time';
import type { Contact } from './contact-model';

interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  onToggle: (id: string) => void;
}

const MAX_TAGS = 3;

function Dash() {
  return <span className="crm-dash" aria-label="Sin dato">—</span>;
}

/** Fila de contacto; en móvil el CSS la convierte en tarjeta (cada celda lleva su `data-label`). */
export function ContactRow({ contact, selected, onToggle }: ContactRowProps) {
  const { id, name, email, phone, tags } = contact;
  const extra = tags.length - MAX_TAGS;
  return (
    <tr className={`crm-row${selected ? ' is-selected' : ''}`}>
      <td className="col-check">
        <input type="checkbox" checked={selected} onChange={() => onToggle(id)} aria-label={`Seleccionar a ${name}`} />
      </td>
      <td className="col-name">
        <div className="crm-cell-person">
          <span className="crm-avatar" data-tone={avatarTone(name)} aria-hidden="true">{initials(name)}</span>
          <span>
            <strong>{name}</strong>
            {email && <small>{email}</small>}
          </span>
        </div>
      </td>
      <td data-label="Teléfono" className={phone ? undefined : 'is-empty'}>
        {phone ? <a className="crm-link" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a> : <Dash />}
      </td>
      <td data-label="Correo" className={email ? undefined : 'is-empty'}>
        {email ? <a className="crm-link" href={`mailto:${email}`}>{email}</a> : <Dash />}
      </td>
      <td data-label="Empresa" className="is-empty"><Dash /></td>
      <td data-label="Creado" className="col-date">{formatDateTime(contact.createdAt)}</td>
      <td data-label="Actividad" className="col-date" title={formatDateTime(contact.lastActivityAt)}>
        {relativeTime(contact.lastActivityAt)}
      </td>
      <td data-label="Etiquetas" className={tags.length ? 'col-tags' : 'col-tags is-empty'}>
        {tags.length === 0 ? <Dash /> : (
          <span className="crm-cell-tags">
            {tags.slice(0, MAX_TAGS).map((t) => <span key={t} className="crm-tag" title={t}>{t}</span>)}
            {extra > 0 && <span className="crm-tag crm-tag--more" title={tags.slice(MAX_TAGS).join(', ')}>+{extra}</span>}
          </span>
        )}
      </td>
    </tr>
  );
}
