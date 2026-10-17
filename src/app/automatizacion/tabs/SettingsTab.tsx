'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { BackupCard } from '../components/BackupCard';
import { EngineCard } from '../components/EngineCard';
import { NotifyCard } from '../components/NotifyCard';
import { PrefsCard } from '../components/PrefsCard';
import { SafetyCard } from '../components/SafetyCard';
import { SoonCards } from '../components/SoonCards';
import type { SettingsT } from '../types';
import type { useAutomations } from '../use-automations';
import '../settings.css';

interface SettingsTabProps {
  settings: SettingsT | null;
  loading: boolean;
  save: (patch: Partial<SettingsT>) => Promise<void>;
  data: ReturnType<typeof useAutomations>;
}

export default function SettingsTab({ settings, loading, save, data }: SettingsTabProps) {
  const hasWebhook = !!settings?.n8nWebhookUrl;
  return (
    <div className="st-grid" data-tour="settings">
      <h2 className="st-section-title">Motor</h2>
      <EngineCard settings={settings} loading={loading} save={save} workflows={data.workflows} />

      <h2 className="st-section-title">Seguridad</h2>
      <SafetyCard settings={settings} workflows={data.workflows} />

      <h2 className="st-section-title">Notificaciones</h2>
      <NotifyCard settings={settings} save={save} />
      <div className="st-card">
        <div className="st-card-head">
          <div>
            <h3 className="st-card-title"><ExternalLink size={16} /> Webhook de notificaciones (n8n)</h3>
            <p className="st-card-text">
              Los pasos «Enviar notificación» usan la URL de Configuración general → Conexión n8n.
              {hasWebhook ? ' Ya está configurada.' : ' Aún no está configurada: esos pasos se registrarán como omitidos.'}
            </p>
          </div>
          {!loading && (
            <span className="st-state">
              <span className={`fx-dot ${hasWebhook ? 'fx-dot--ok' : 'fx-dot--warn'}`} aria-hidden="true" />
              {hasWebhook ? 'Conectado' : 'Sin configurar'}
            </span>
          )}
        </div>
        <div className="st-inline">
          <Link href="/settings" className="au-btn">
            <SettingsIcon size={14} /> Ir a Configuración general
          </Link>
        </div>
      </div>

      <h2 className="st-section-title">Tu experiencia</h2>
      <PrefsCard />

      <h2 className="st-section-title">Datos</h2>
      <BackupCard workflows={data.workflows} createWorkflow={data.createWorkflow} />

      <h2 className="st-section-title">Próximamente</h2>
      <SoonCards />
    </div>
  );
}
