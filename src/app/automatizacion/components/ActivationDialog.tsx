'use client';

import React from 'react';
import { AlertTriangle, Loader2, Send } from 'lucide-react';
import { analyzeFlow, channelLabel, type FlowLike } from '@/lib/automation-safety';
import { Dialog } from './Dialog';

interface ActivationDialogProps {
  flow: FlowLike & { name: string };
  /** `null` mientras se cargan los ajustes. */
  webhookConfigured: boolean | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmación previa a activar un flujo que escribe a clientes reales. */
export function ActivationDialog({ flow, webhookConfigured, busy = false, onCancel, onConfirm }: ActivationDialogProps) {
  const risk = analyzeFlow(flow);
  const channels = risk.channels.map(channelLabel).join(' y ');

  return (
    <Dialog
      title="¿Activar este flujo?"
      titleId="au-activate-title"
      size="sm"
      onClose={onCancel}
      icon={<span className="tp-icon" aria-hidden="true"><Send size={18} /></span>}
      footer={(close) => (
        <>
          <button type="button" className="au-btn au-btn--ghost" onClick={close}>Cancelar</button>
          <button type="button" className="au-btn au-btn--primary" data-autofocus onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={14} className="au-spin" /> : null} Sí, activar
          </button>
        </>
      )}
    >
      <p className="ad-lead"><strong>{flow.name}</strong> enviará mensajes a tus clientes ({channels}) a través de n8n cada vez que se dispare.</p>
      <ul className="ad-list">
        <li>Empieza a ejecutarse en cuanto ocurra su disparador; no hay vista previa del envío.</li>
        <li>Para detenerlo: pausa este flujo o apaga el motor en Configuración.</li>
        {risk.repeatRisk && (
          <li className="is-warn"><AlertTriangle size={13} aria-hidden="true" /> Es un flujo programado sin condición «NO TIENE la etiqueta»: podría escribirle de nuevo al mismo contacto pasadas 6 h.</li>
        )}
        {webhookConfigured === false && (
          <li className="is-warn"><AlertTriangle size={13} aria-hidden="true" /> n8n no está configurado: los envíos se registrarán como omitidos y nadie recibirá nada.</li>
        )}
      </ul>
    </Dialog>
  );
}
