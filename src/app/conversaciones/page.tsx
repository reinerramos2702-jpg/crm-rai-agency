'use client';

import React, { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { AnalyticsTab } from './_components/AnalyticsTab';
import { ChatTab } from './_components/ChatTab';
import { LinksTab } from './_components/LinksTab';
import { ManualTab } from './_components/ManualTab';
import { NewContactDialog } from './_components/NewContactDialog';
import { SettingsTab } from './_components/SettingsTab';
import { SnippetsTab } from './_components/SnippetsTab';
import { TopTabs } from './_components/TopTabs';
import { useInbox } from './_hooks/use-inbox';
import { useMediaQuery } from './_hooks/use-media-query';
import { appendToDraft } from './_lib/conv-model';
import type { ChatView, TopTabId } from './_lib/conv-types';

/**
 * Conversaciones (bandeja unificada). Esta página solo coordina: pestaña activa,
 * contacto seleccionado, borradores y el diálogo de alta. El resto vive en `_components` y `_hooks`.
 */
export default function ConversacionesPage() {
  const [tab, setTab] = useState<TopTabId>('chat');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ChatView>('list');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);

  const inbox = useInbox();
  const twoPanes = useMediaQuery('(min-width: 700px)');
  // Con espacio para lista + hilo se abre sola la primera conversación; en móvil se parte de la lista.
  const activeId = selectedId ?? (twoPanes ? inbox.contacts[0]?.id ?? null : null);
  const draft = activeId ? drafts[activeId] ?? '' : '';

  const setDraft = useCallback(
    (value: string) => {
      if (activeId) setDrafts((prev) => ({ ...prev, [activeId]: value }));
    },
    [activeId],
  );

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setView('thread');
  }, []);

  function insertSnippet(body: string) {
    if (!activeId) {
      toast.error('Abre una conversación para insertar el fragmento.');
      return;
    }
    setDraft(appendToDraft(draft, body));
    setTab('chat');
    setView('thread');
    toast.success('Fragmento insertado en el mensaje');
  }

  function created(contactId: string) {
    setShowNew(false);
    setTab('chat');
    select(contactId);
    void inbox.refresh();
  }

  return (
    <div className="cv-page">
      <header className="cv-head">
        <h1 className="cv-title">Conversaciones</h1>
        <TopTabs active={tab} onChange={setTab} />
      </header>

      <div id="cv-tabpanel" className="cv-body" role="tabpanel" aria-labelledby={`cv-tab-${tab}`}>
        {tab === 'chat' && (
          <ChatTab
            inbox={inbox}
            activeId={activeId}
            onSelect={select}
            view={view}
            onView={setView}
            draft={draft}
            onDraft={setDraft}
            onNewContact={() => setShowNew(true)}
          />
        )}
        {tab === 'manual' && <ManualTab />}
        {tab === 'snippets' && <SnippetsTab onUse={insertSnippet} />}
        {tab === 'links' && <LinksTab />}
        {tab === 'analytics' && <AnalyticsTab summary={inbox.summary} loading={inbox.loading} />}
        {tab === 'settings' && <SettingsTab />}
      </div>

      {showNew && <NewContactDialog onClose={() => setShowNew(false)} onCreated={created} />}
    </div>
  );
}
