/** Tipos del módulo Conversaciones. Reflejan los contratos de /api/contacts, /api/conversations, /api/notes, etc. */

export type MessageDirection = 'in' | 'out';
export type MessageSender = 'contact' | 'agent' | 'ai';

export interface Message {
  id: string;
  body: string;
  direction: MessageDirection;
  sender: MessageSender;
  createdAt: string;
}

export interface Conversation {
  id: string;
  channel: string;
  status: string;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string | null;
  messages: Message[];
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  tags: string[];
  conversations: Conversation[];
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
}

export interface ContactTask {
  id: string;
  title: string;
  done: boolean;
  dueAt: string | null;
  createdAt: string;
}

export interface ContactDetail extends Contact {
  notes: Note[];
  contactTasks: ContactTask[];
}

export interface Snippet {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ActivationLink {
  id: string;
  label: string;
  slug: string;
  destination: string;
  clicks: number;
  createdAt: string;
}

export interface SettingsState {
  slaFirstResponseMins: string;
  slaOverdueMins: string;
  aiCountsAsResponse: boolean;
}

/** Vistas apiladas en pantallas estrechas: lista → hilo → panel de contexto. */
export type ChatView = 'list' | 'thread' | 'rail';

export type TopTabId = 'chat' | 'manual' | 'snippets' | 'links' | 'analytics' | 'settings';
