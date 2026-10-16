import React from 'react';
import { MessageSquare } from 'lucide-react';
import { CHANNEL_LABEL, CONVERSATION_STATUS, fmtDate } from './format';

export interface DashboardConversation {
  id: string;
  contact: { id: string; name: string };
  channel: string;
  status: string;
  agent: { id: string; name: string; kind: string } | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  aiMessageCount: number;
}

export function ConversationsTable({ rows }: { rows: DashboardConversation[] }) {
  if (rows.length === 0) {
    return (
      <div className="ag-empty-inline">
        <MessageSquare size={28} style={{ marginBottom: 8 }} />
        <p>Aún no hay conversaciones atendidas por agentes de IA.</p>
      </div>
    );
  }
  return (
    <div className="ag-table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Contacto</th>
            <th>Agente</th>
            <th>Canal</th>
            <th>Último mensaje</th>
            <th>Mensajes IA</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const st = CONVERSATION_STATUS[c.status] ?? { label: c.status, badge: 'badge-muted' };
            return (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.contact.name}</td>
                <td className="muted" style={{ fontSize: 13 }}>{c.agent?.name || '—'}</td>
                <td className="muted" style={{ fontSize: 13 }}>{CHANNEL_LABEL[c.channel] ?? c.channel}</td>
                <td className="muted ag-cell-trunc" style={{ fontSize: 13 }}>{c.lastMessagePreview || '—'}</td>
                <td>{c.aiMessageCount}</td>
                <td><span className={st.badge}>{st.label}</span></td>
                <td className="muted" style={{ fontSize: 13 }}>{fmtDate(c.lastMessageAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
