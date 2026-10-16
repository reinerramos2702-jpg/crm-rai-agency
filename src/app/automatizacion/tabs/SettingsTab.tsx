'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ExternalLink, Loader2, Settings as SettingsIcon, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonLine } from '@/components/ui/Skeleton';
import { errorMessage } from '../api';
import { BackupCard } from '../components/BackupCard';
import { PrefsCard } from '../components/PrefsCard';
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
  const [saving, setSaving] = useState<'enabled' | 'email' | null>(null);
  const [email, setEmail] = useState('');

  const hasSettings = settings !== null;
  const savedEmail = settings?.automationNotifyEmail ?? '';
  useEffect(() => {
    if (hasSettings) setEmail(savedEmail);
  }, [hasSettings, savedEmail]);

  async function persist(kind: 'enabled' | 'email', patch: Partial<SettingsT>, success: string) {
    setSaving(kind);
    try {
      await save(patch);
      toast.success(success);
    } catch (e: unknown) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  const enabled = settings?.automationsEnabled ?? true;
  const emailChanged = savedEmail !== email.trim();

  return (
    <div className="st-grid" data-tour="settings">
      <h2 className="st-section-title">Motor</h2>
      <div className="st-card">
        <div className="st-card-head">
          <div>
            <h3 className="st-card-title"><Zap size={16} /> Motor de automatización</h3>
            <p className="st-card-text">
              Interruptor general. Si lo desactivas, ningún flujo se ejecutará (ni por eventos ni por el cron), aunque esté
              marcado como «Activo». Útil para pausar todo de golpe.
            </p>
          </div>
          {loading ? (
            <SkeletonLine width={96} height={36} />
          ) : (
            <div className="st-card-side">
              <span className="st-state">
                <span className={`fx-dot ${enabled ? 'fx-dot--ok' : 'fx-dot--danger'}`} aria-hidden="true" />
                {enabled ? 'Activado' : 'Pausado'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="Motor de automatización"
                className="au-switch"
                disabled={saving === 'enabled'}
                onClick={() => void persist('enabled', { automationsEnabled: !enabled }, enabled ? 'Automatización pausada globalmente.' : 'Automatización activada.')}
              >
                <span className="au-switch-knob" />
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 className="st-section-title">Notificaciones</h2>
      <div className="st-card">
        <h3 className="st-card-title"><Bell size={16} /> Correo de alertas internas</h3>
        <p className="st-card-text">
          Dirección donde recibirás un resumen si un flujo crítico falla repetidamente (el envío por correo llega pronto; hoy se
          usa como referencia para tus webhooks de notificación).
        </p>
        <div className="st-inline">
          <input type="email" placeholder="gerencia@tuempresa.com" aria-label="Correo de alertas" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button
            type="button"
            className="au-btn au-btn--soft"
            disabled={saving === 'email' || !emailChanged}
            onClick={() => void persist('email', { automationNotifyEmail: email.trim() || null }, 'Correo de notificaciones guardado.')}
          >
            {saving === 'email' ? <Loader2 size={14} className="au-spin" /> : null} Guardar
          </button>
        </div>
      </div>
      <div className="st-card">
        <div className="st-card-head">
          <div>
            <h3 className="st-card-title"><ExternalLink size={16} /> Webhook de notificaciones (n8n)</h3>
            <p className="st-card-text">
              Los pasos «Enviar notificación» usan la URL de Configuración general → Conexión n8n.
              {settings?.n8nWebhookUrl ? ' Ya está configurada.' : ' Aún no está configurada: esos pasos se registrarán como omitidos.'}
            </p>
          </div>
          {!loading && (
            <span className="st-state">
              <span className={`fx-dot ${settings?.n8nWebhookUrl ? 'fx-dot--ok' : 'fx-dot--warn'}`} aria-hidden="true" />
              {settings?.n8nWebhookUrl ? 'Conectado' : 'Sin configurar'}
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
