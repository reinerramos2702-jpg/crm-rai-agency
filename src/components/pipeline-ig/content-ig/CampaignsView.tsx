'use client';

import React from 'react';
import { ArrowRight, ChevronRight, Instagram, Sparkles } from 'lucide-react';
import { fmtShortDate } from './utils';
import type { Campaign } from './types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  /** Muestra el aviso de configuración incompleta. */
  showSetupBanner: boolean;
  setupDone: number;
  setupTotal: number;
  onOpen: (campaign: Campaign) => void;
  onPlan: () => void;
  onConfig: () => void;
}

const STEPS = [
  { title: 'Configura', text: 'Marca, tono y tu cuenta de Instagram.' },
  { title: 'Planea', text: 'La IA arma hasta 30 días de piezas.' },
  { title: 'Programa', text: 'Revisas el calendario y el CRM publica.' },
];

function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: (campaign: Campaign) => void }) {
  const total = campaign.totalPieces || campaign.days.length;
  const published = campaign.published || 0;
  const ratio = total > 0 ? Math.min(1, published / total) : 0;
  return (
    <li className="card ig-camp">
      <div className="ig-camp-main">
        <h3 className="ig-camp-name">
          <Instagram size={16} aria-hidden="true" />
          <button type="button" className="ig-camp-open" onClick={() => onOpen(campaign)}>
            {campaign.name || 'Campaña sin nombre'}
            <span className="fx-sr-only"> · abrir calendario</span>
          </button>
        </h3>
        <p className="ig-camp-meta">
          {fmtShortDate(campaign.startDate)} → {fmtShortDate(campaign.endDate)} · {total} piezas · Modelo: {campaign.model}
        </p>
        <p className="ig-camp-folder">Carpeta: <code>{campaign.folderName}</code></p>
      </div>
      <div className="ig-camp-side">
        <div className="ig-camp-count" aria-label={`${published} de ${total} publicados`}>
          <strong>{published}/{total}</strong>
          <span>publicados</span>
        </div>
        <ChevronRight size={20} aria-hidden="true" className="ig-camp-chevron" />
      </div>
      <div className="ig-progress" role="progressbar" aria-label="Avance de publicación" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
        <span style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </li>
  );
}

export function CampaignsView({ campaigns, showSetupBanner, setupDone, setupTotal, onOpen, onPlan, onConfig }: CampaignsViewProps) {
  return (
    <div>
      {showSetupBanner && (
        <div className="rai-banner" role="status">
          <div>
            <strong>Completa tu configuración</strong>
            <span> — {setupDone} de {setupTotal} secciones listas. Con tu marca lista, la IA planea contenido mucho más preciso.</span>
          </div>
          <button type="button" className="rai-banner-btn" onClick={onConfig}>Configurar <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      )}
      {campaigns.length === 0 ? (
        <div className="card rai-empty ig-empty">
          <div className="rai-halo" aria-hidden="true"><Instagram size={30} /></div>
          <h2 className="ig-empty-title">Aún no tienes campañas de contenido</h2>
          <p className="ig-empty-text">
            Planea 30 días de contenido para Instagram en una sola sesión. La IA te guía paso a paso:
            define tu marca, elige pilares, genera hooks, captions y visuales. Todo automático.
          </p>
          <ol className="rai-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rai-step"><span className="rai-step-n">{i + 1}</span><div><strong>{s.title}</strong><p>{s.text}</p></div></li>
            ))}
          </ol>
          <button type="button" className="primary ig-cta" onClick={onPlan}>
            <Sparkles size={16} aria-hidden="true" /> Planear mi primer mes de contenido
          </button>
        </div>
      ) : (
        <section aria-label="Campañas de contenido">
          <div className="ig-head">
            <h2 className="ig-head-title">Campañas de contenido</h2>
            <button type="button" className="primary ig-cta" onClick={onPlan}>
              <Sparkles size={14} aria-hidden="true" /> Nueva campaña
            </button>
          </div>
          <ul className="ig-camp-list">
            {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} onOpen={onOpen} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
