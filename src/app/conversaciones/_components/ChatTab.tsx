'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ContextRail } from './ContextRail';
import { ConversationList } from './ConversationList';
import { DEFAULT_RAIL_TAB, type RailTabId } from './rail-config';
import { ThreadEmpty } from './ThreadEmpty';
import { ThreadPane } from './ThreadPane';
import { ThreadSkeleton } from './ThreadSkeleton';
import { InlineError } from './InlineError';
import { useContactDetail } from '../_hooks/use-contact-detail';
import { useContactExtras } from '../_hooks/use-contact-extras';
import type { useInbox } from '../_hooks/use-inbox';
import { useSendMessage } from '../_hooks/use-send-message';
import { filterContacts } from '../_lib/conv-model';
import type { ChatView, Message } from '../_lib/conv-types';

interface ChatTabProps {
  inbox: ReturnType<typeof useInbox>;
  activeId: string | null;
  onSelect: (id: string) => void;
  view: ChatView;
  onView: (view: ChatView) => void;
  draft: string;
  onDraft: (value: string) => void;
  onNewContact: () => void;
}

/** Pestaña «Conversaciones»: lista, hilo y panel de contexto. En pantallas estrechas se apilan como vistas. */
export function ChatTab({ inbox, activeId, onSelect, view, onView, draft, onDraft, onNewContact }: ChatTabProps) {
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [railTab, setRailTab] = useState<RailTabId>(DEFAULT_RAIL_TAB);

  const { refresh } = inbox;
  const thread = useContactDetail(activeId, inbox.markRead);
  const { appendMessage } = thread;
  const extras = useContactExtras(activeId, thread.patch);

  const onSent = useCallback(
    (message: Message) => {
      appendMessage(message);
      void refresh();
    },
    [appendMessage, refresh],
  );
  const { sending, send } = useSendMessage(thread.conversation?.id ?? null, onSent);

  const visible = useMemo(() => filterContacts(inbox.contacts, query, unreadOnly), [inbox.contacts, query, unreadOnly]);

  async function submitDraft() {
    if (await send(draft, 'agent')) onDraft('');
  }

  let center: React.ReactNode;
  if (!activeId) center = <ThreadEmpty onNew={onNewContact} hasContacts={inbox.contacts.length > 0} />;
  else if (thread.loading) center = <ThreadSkeleton onBack={() => onView('list')} />;
  else if (!thread.detail) {
    center = (
      <section className="cv-col cv-thread cv-thread--error">
        <button type="button" className="ghost cv-icon-btn cv-back" aria-label="Volver a la lista de conversaciones" onClick={() => onView('list')}>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <InlineError
          title="No se pudo cargar la conversación"
          message={thread.error ?? 'Inténtalo de nuevo.'}
          onRetry={() => void thread.refresh()}
          busy={thread.revalidating}
        />
      </section>
    );
  } else {
    center = (
      <ThreadPane
        detail={thread.detail}
        conversation={thread.conversation}
        error={thread.error}
        revalidating={thread.revalidating}
        onRetry={() => void thread.refresh()}
        draft={draft}
        onDraft={onDraft}
        sending={sending}
        onSend={() => void submitDraft()}
        onSimulate={() => void send('Gracias, lo reviso y te confirmo.', 'contact')}
        onBack={() => onView('list')}
        onOpenRail={() => onView('rail')}
      />
    );
  }

  return (
    <div className="cv-shell" data-view={view}>
      <ConversationList
        contacts={visible}
        total={inbox.contacts.length}
        unread={inbox.summary.unread}
        hasData={inbox.hasData}
        loading={inbox.loading}
        error={inbox.error}
        revalidating={inbox.revalidating}
        query={query}
        onQuery={setQuery}
        unreadOnly={unreadOnly}
        onUnreadOnly={setUnreadOnly}
        activeId={activeId}
        onSelect={onSelect}
        onNew={onNewContact}
        onRetry={() => void inbox.refresh()}
      />
      {center}
      <ContextRail
        detail={thread.detail}
        loading={activeId !== null && thread.loading}
        error={thread.error}
        onRetry={() => void thread.refresh()}
        tab={railTab}
        onTab={setRailTab}
        extras={extras}
        onBack={() => onView('thread')}
      />
    </div>
  );
}
