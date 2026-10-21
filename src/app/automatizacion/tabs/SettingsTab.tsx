'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, ExternalLink, FileJson, Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { BackupCard } from '../components/BackupCard';
import { EngineCard } from '../components/EngineCard';
import { NotifyCard } from '../components/NotifyCard';
import { PrefsCard } from '../components/PrefsCard';
import { SafetyCard } from '../components/SafetyCard';
import { SoonCards } from '../components/SoonCards';
import type { SettingsT } from '../types';
import type { useAutomations } from '../use-automations';

interface SettingsTabProps {
  settings: SettingsT | null;
  loading: boolean;
  save: (patch: Partial<SettingsT>) => Promise<void>;
  data: ReturnType<typeof useAutomations>;
}

interface SectionDef {
  id: string;
  title: string;
  text: string;
  icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
  { id: 'st-motor', title: 'Motor', text: 'El interruptor general de todos los flujos.', icon: Zap },
  { id: 'st-seguridad', title: 'Seguridad', text: 'Protecciones antes de escribir a clientes reales.', icon: ShieldCheck },
  { id: 'st-notificaciones', title: 'Notificaciones', text: 'Avisos y webhook de salida.', icon: Bell },
  { id: 'st-experiencia', title: 'Tu experiencia', text: 'Cómo ves el módulo en este navegador.', icon: SlidersHorizontal },
  { id: 'st-datos', title: 'Datos', text: 'Respaldo e importación de flujos.', icon: FileJson },
  { id: 'st-proximamente', title: 'Próximamente', text: 'Lo que viene en el motor.', icon: Sparkles },
];

function Section({ def, children }: { def: SectionDef; children: React.ReactNode }) {
  const Icon = def.icon;
  return (
    <section id={def.id} className="st-section" aria-labelledby={`${def.id}-title`}>
      <header className="au-st-section-head">
        <span className="st-section-ico" aria-hidden="true"><Icon size={16} /></span>
        <div>
          <h2 id={`${def.id}-title`} className="au-st-section-title">{def.title}</h2>
          <p className="st-section-text">{def.text}</p>
        </div>
      </header>
      <div className="st-section-body">{children}</div>
    </section>
  );
}

function sectionOf(id: string): SectionDef {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}

export default function SettingsTab({ settings, loading, save, data }: SettingsTabProps) {
  const hasWebhook = !!settings?.n8nWebhookUrl;
  return (
    <div className="st-layout" data-tour="settings">
      <nav className="st-index" aria-label="Secciones de configuración">
        <ul>
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <li key={id}>
              <a href={`#${id}`}><Icon size={14} aria-hidden="true" /> {title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="au-st-grid">
        <Section def={sectionOf('st-motor')}>
          <EngineCard settings={settings} loading={loading} save={save} workflows={data.workflows} />
        </Section>

        <Section def={sectionOf('st-seguridad')}>
          <SafetyCard settings={settings} workflows={data.workflows} />
        </Section>

        <Section def={sectionOf('st-notificaciones')}>
          <NotifyCard settings={settings} save={save} />
          <div className="au-st-card">
            <div className="st-card-head">
              <div>
                <h3 className="st-card-title"><ExternalLink size={16} aria-hidden="true" /> Webhook de notificaciones (n8n)</h3>
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
                <SettingsIcon size={14} aria-hidden="true" /> Ir a Configuración general
              </Link>
            </div>
          </div>
        </Section>

        <Section def={sectionOf('st-experiencia')}>
          <PrefsCard />
        </Section>

        <Section def={sectionOf('st-datos')}>
          <BackupCard workflows={data.workflows} createWorkflow={data.createWorkflow} />
        </Section>

        <Section def={sectionOf('st-proximamente')}>
          <SoonCards />
        </Section>
      </div>
    </div>
  );
}
