import React from 'react';
import { formatClock, senderLabel } from '../_lib/conv-model';
import type { Message } from '../_lib/conv-types';

/** Burbuja de mensaje. El texto se pinta como texto plano (React lo escapa); los saltos de línea se conservan por CSS. */
export function MessageBubble({ message }: { message: Message }) {
  const out = message.direction === 'out';
  return (
    <li className="cv-msg" data-dir={out ? 'out' : 'in'}>
      <div className="cv-bubble">
        <p className="cv-bubble-text">{message.body}</p>
        <span className="cv-bubble-meta">
          {senderLabel(message)} · <time dateTime={message.createdAt}>{formatClock(message.createdAt)}</time>
        </span>
      </div>
    </li>
  );
}
