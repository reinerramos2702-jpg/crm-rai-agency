'use client';

import { useState } from 'react';
import { Bot, ChevronDown, ClipboardCheck, ListChecks, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { briefFilledCount, BRIEF_FIELDS } from '@/lib/campaign-brief';
import { suggestReplies } from '@/lib/campaign-suggestions';
import type { ReadinessItem } from '@/lib/campaign-readiness';
import { ChatLog } from './ChatLog';
import { Composer } from './Composer';
import { PlanSummary } from './PlanSummary';
import { ReadinessChecklist } from './ReadinessChecklist';
import type { Attachments } from './hooks/useAttachments';
import type { Chat } from './hooks/useCampaignChat';
import type { CampaignForm } from './hooks/useCampaignForm';
import type { Research } from './hooks/useResearch';

interface ChatPanelProps {
  cf: CampaignForm;
  chat: Chat;
  research: Research;
  attachments: Attachments;
  readiness: { items: ReadinessItem[]; ok: number; total: number; attention: number };
  onReadinessAction: (action: NonNullable<ReadinessItem['action']>) => void;
  onAttachClick: () => void;
}

type Panel = 'ready' | 'summary';

/** Panel derecho: encabezado, preparación y resumen del plan, conversación y compositor. */
export function ChatPanel({ cf, chat, research, attachments, readiness, onReadinessAction, onAttachClick }: ChatPanelProps) {
  const [panel, setPanel] = useState<Panel | null>('ready');
  const { form } = cf;
  const filled = briefFilledCount(cf.brief);
  const toggle = (next: Panel) => setPanel(panel === next ? null : next);

  const greetingExtra =
    (research.inventory.length > 0 ? ` Tengo ${research.inventory.filter((d) => d.hasContent).length} días con assets.` : '') +
    (research.adsLibraryResult ? ` Analicé ${research.adsLibraryResult.adsFound} anuncios de ${form.adsLibraryBrand}.` : '');

  return (
    <div className="cn-chat">
      <div className="cn-chat-head" data-tour="cn-chat-head">
        <div className="cn-chat-id">
          <span className="cn-chat-avatar" aria-hidden="true"><Bot size={14} color="var(--rai-purple)" /></span>
          <div>
            <span className="cn-chat-title">IA de Planificación</span>
            <span className="cn-chat-model">{form.provider} / {form.modelId}</span>
          </div>
        </div>
        {chat.messages.length >= 2 && (
          <button onClick={chat.finalizePlan} disabled={chat.finalizing} className="btn btn-primary">
            {chat.finalizing ? <><Spinner size="sm" /> Extrayendo JSON...</> : <><Sparkles size={14} /> Generar Plan Maestro</>}
          </button>
        )}
      </div>

      <div className="cn-insight" data-tour="cn-insight">
        <div className="cn-insight-tabs" role="group" aria-label="Paneles de apoyo">
          <button type="button" aria-expanded={panel === 'ready'} aria-controls="cn-panel-ready" onClick={() => toggle('ready')}>
            <ListChecks size={13} aria-hidden="true" />
            Preparación
            <span className={`cn-count${readiness.attention > 0 ? ' is-warn' : ''}`}>{readiness.ok}/{readiness.total}</span>
            <ChevronDown size={12} className="cn-caret" aria-hidden="true" />
          </button>
          <button type="button" aria-expanded={panel === 'summary'} aria-controls="cn-panel-summary" onClick={() => toggle('summary')}>
            <ClipboardCheck size={13} aria-hidden="true" />
            Resumen del plan
            <span className="cn-count">{filled}/{BRIEF_FIELDS.length}</span>
            <ChevronDown size={12} className="cn-caret" aria-hidden="true" />
          </button>
        </div>
        {panel === 'ready' && (
          <div id="cn-panel-ready" className="cn-insight-body fx-field-in">
            <ReadinessChecklist items={readiness.items} onAction={onReadinessAction} />
          </div>
        )}
        {panel === 'summary' && (
          <div id="cn-panel-summary" className="cn-insight-body fx-field-in">
            <PlanSummary cf={cf} research={research} attachmentCount={attachments.files.length} messageCount={chat.messages.length} />
          </div>
        )}
      </div>

      <div ref={attachments.dropRef} className="cn-drop-zone" {...attachments.dropHandlers}>
        <ChatLog messages={chat.messages} busy={chat.busy} isDragging={attachments.isDragging} greetingExtra={greetingExtra} />
      </div>

      {chat.messages.length >= 2 && !chat.finalizing && (
        <div className="cn-foot">
          <ChevronDown size={12} color="var(--rai-gold)" aria-hidden="true" />
          <span className="cn-foot-text">
            Cuando el plan esté listo, haz clic en <strong>Generar Plan Maestro</strong>.
          </span>
        </div>
      )}

      <Composer
        value={chat.input}
        onChange={chat.setInput}
        onSend={chat.sendMessage}
        canSend={chat.canSend}
        busy={chat.busy}
        attachments={attachments}
        suggestions={suggestReplies(chat.messages)}
        onAttachClick={onAttachClick}
      />
    </div>
  );
}
