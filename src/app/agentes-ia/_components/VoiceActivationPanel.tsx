'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { VoiceDraft } from '@/lib/agent-wizard';
import { useCachedJson } from '@/lib/use-cached-json';
import {
  DEFAULT_VOICE_SETTINGS, parseStoredVoiceSettings, settingsFromCallRules, voiceSettingsKey, type VoiceSettings,
} from '@/lib/voice/settings';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ActivationCard } from '../voz/_components/ActivationCard';
import { saveVoiceSettings } from '../voz/_components/use-voice-settings';
import type { VoiceStatusResponse } from '../voz/_components/types';
import { VOICE_CENTER_HREF } from './NewAgentButtons';
import '../voz/voz.css';

/**
 * Último paso del asistente de voz: reutiliza la tarjeta de activación del Centro de voz.
 * Modo en vivo → «Activar con Retell»; modo simulado → «Guardar en modo simulado».
 * Las reglas del asistente siembran los ajustes de voz (sin duplicar lógica).
 */
export function VoiceActivationPanel({ agentId, draft }: { agentId: string; draft: VoiceDraft }) {
  const { data: status } = useCachedJson<VoiceStatusResponse>('/api/voice/status', { ttlMs: 20_000 });
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const workspaceId = status?.workspaceId;

  useEffect(() => {
    if (!workspaceId) return;
    let base = DEFAULT_VOICE_SETTINGS;
    try {
      base = parseStoredVoiceSettings(window.localStorage.getItem(voiceSettingsKey(workspaceId)));
    } catch {
      // Sin almacenamiento local: se parte de los valores por defecto.
    }
    setSettings(settingsFromCallRules(draft.rules, { language: draft.language, speed: draft.speed, greeting: draft.greeting }, base));
  }, [workspaceId, draft.rules, draft.language, draft.speed, draft.greeting]);

  if (!status || !settings) return <SkeletonCard lines={3} />;
  const agent = { id: agentId, name: draft.name, status: 'suggested', isPrimary: false, knowledgeBases: draft.kbIds.length, providerName: '' };

  return (
    <div className="vz" style={{ display: 'grid', gap: 12 }}>
      <ActivationCard status={status} agent={agent} settings={settings} onSaveSettings={(s) => saveVoiceSettings(status.workspaceId, s)} />
      <Link href={VOICE_CENTER_HREF} className="ag-btn ag-btn--ghost" style={{ justifySelf: 'start' }}>
        Ir al Centro de voz <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
