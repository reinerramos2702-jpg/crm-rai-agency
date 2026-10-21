/** Formatos compartidos del módulo Agentes de IA. */

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min.toFixed(1)} min`;
  const hrs = Math.floor(min / 60);
  const rem = Math.round(min % 60);
  return `${hrs} h ${rem} min`;
}

export const CHANNEL_LABEL: Record<string, string> = {
  'Widget de chat (SMS chat)': 'Chat web',
  'Chat en tiempo real': 'Chat en vivo',
  'Llamadas de voz': 'Llamadas',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  email: 'Email',
  sms: 'SMS',
  manual: 'Manual',
};

export const CONVERSATION_STATUS: Record<string, { label: string; badge: string }> = {
  open: { label: 'Abierta', badge: 'badge-success' },
  pending: { label: 'Pendiente', badge: 'badge-warning' },
  closed: { label: 'Cerrada', badge: 'badge-muted' },
};
