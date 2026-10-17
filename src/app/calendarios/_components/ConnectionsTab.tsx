'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Cloud, EyeOff, Mail, RotateCw, type LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { sendJson } from './calendar-api';
import { useCalendarSettings } from './use-calendar-data';

interface Provider {
  id: string;
  name: string;
  text: string;
  icon: LucideIcon;
}

const PROVIDERS: readonly Provider[] = [
  { id: 'google', name: 'Google Calendar', text: 'Sincroniza tus eventos de Google Calendar con este CRM.', icon: CalendarIcon },
  { id: 'outlook', name: 'Microsoft Outlook', text: 'Sincroniza calendarios de Outlook y Microsoft 365.', icon: Mail },
  { id: 'icloud', name: 'Apple Calendar (iCloud)', text: 'Sincroniza los calendarios de tu cuenta de iCloud.', icon: Cloud },
];

/**
 * Pestaña «Conexiones». Todavía no existe sincronización con calendarios externos: cada proveedor se
 * muestra con su estado real («No conectado») y sin botón activo. Nunca se simula una conexión.
 */
export function ConnectionsTab() {
  const settings = useCalendarSettings();
  const [saving, setSaving] = useState(false);

  async function togglePrivate() {
    if (settings.hideDetails === null || saving) return;
    setSaving(true);
    const error = await sendJson('/api/settings', 'POST', { calendarHideEventDetails: !settings.hideDetails });
    if (error) toast.error(error);
    else { toast.success('Configuración guardada.'); await settings.refresh(); }
    setSaving(false);
  }

  return (
    <div className="cal-cq">
      <section aria-labelledby="cal-conn-title" className="cal-conn">
        <div className="cal-panel-head">
          <h2 id="cal-conn-title" className="cal-card-title">Calendarios externos</h2>
        </div>
        <p className="cal-conn-lead muted">
          Aún no hay sincronización con calendarios externos. Estos proveedores aparecerán como conectados cuando la función esté disponible.
        </p>
        <div className="cal-grid cal-grid--providers">
          {PROVIDERS.map(({ id, name, text, icon: Icon }) => (
            <article key={id} className="card cal-provider" aria-labelledby={`cal-prov-${id}`}>
              <div className="cal-card-top">
                <span className="cal-card-icon" aria-hidden="true"><Icon size={18} /></span>
                <div className="cal-card-id">
                  <h3 id={`cal-prov-${id}`} className="cal-card-name">{name}</h3>
                  <span className="cal-card-type cal-provider-state">
                    <span className="fx-dot" aria-hidden="true" /> No conectado
                  </span>
                </div>
              </div>
              <p className="cal-card-desc">{text}</p>
              <div className="cal-card-foot">
                <button type="button" className="secondary btn-sm" disabled aria-describedby={`cal-soon-${id}`}>Conectar</button>
                <span id={`cal-soon-${id}`} className="cal-soon">Disponible próximamente</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card cal-privacy" aria-labelledby="cal-privacy-title">
        <span className="cal-card-icon" aria-hidden="true"><EyeOff size={18} /></span>
        <div className="cal-privacy-body">
          <h2 id="cal-privacy-title" className="cal-card-name">Modo privado</h2>
          <p id="cal-privacy-desc" className="cal-card-desc">
            Oculta los detalles de los eventos sincronizados desde calendarios externos (solo se mostrará «Ocupado»).
            Se guarda desde ya y se aplicará cuando conectes un calendario externo.
          </p>
        </div>
        <div className="cal-privacy-ctl">
          {settings.loading ? (
            <SkeletonLine width={44} height={24} />
          ) : settings.failed ? (
            <button type="button" className="ghost btn-sm" onClick={() => void settings.refresh()}>
              <RotateCw size={12} aria-hidden="true" /> Reintentar
            </button>
          ) : (
            <button
              type="button" role="switch" aria-checked={settings.hideDetails === true} aria-labelledby="cal-privacy-title"
              aria-describedby="cal-privacy-desc" disabled={saving}
              className={`rai-switch${settings.hideDetails ? ' is-on' : ''}`} onClick={() => void togglePrivate()}
            >
              <span className="rai-switch-knob" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
