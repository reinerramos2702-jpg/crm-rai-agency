import React from 'react';
import { Avatar } from './Avatar';
import { previewOf, primaryConversation, statusMeta, timeAgo } from '../_lib/conv-model';
import type { Contact } from '../_lib/conv-types';

interface ConversationRowProps {
  contact: Contact;
  active: boolean;
  onSelect: (id: string) => void;
}

/** Fila de la lista: avatar, estado, última línea, hora y no leídos. Es un botón: se activa con Enter/Espacio. */
export function ConversationRow({ contact, active, onSelect }: ConversationRowProps) {
  const conv = primaryConversation(contact.conversations);
  const status = statusMeta(conv?.status ?? 'open');
  const preview = previewOf(contact);
  const unread = conv?.unreadCount ?? 0;
  const label = [
    contact.name,
    unread > 0 ? `${unread} sin leer` : null,
    conv ? status.label : 'Sin conversación',
    preview.text,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      className="cv-row"
      data-active={active || undefined}
      data-unread={unread > 0 || undefined}
      aria-current={active ? 'true' : undefined}
      aria-label={label}
      onClick={() => onSelect(contact.id)}
    >
      <span className="cv-row-avatar">
        <Avatar name={contact.name} />
        <span className={`fx-dot cv-row-dot cv-row-dot--${status.tone}`} aria-hidden="true" />
      </span>
      <span className="cv-row-main">
        <span className="cv-row-top">
          <span className="cv-row-name">{contact.name}</span>
          <span className="cv-row-time">{timeAgo(conv?.lastMessageAt ?? null)}</span>
        </span>
        <span className="cv-row-bottom">
          <span className="cv-row-preview">
            {preview.outbound && <span className="cv-row-you">Tú: </span>}
            {preview.text}
          </span>
          {unread > 0 && <span className="badge badge-gold cv-row-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        </span>
      </span>
    </button>
  );
}
