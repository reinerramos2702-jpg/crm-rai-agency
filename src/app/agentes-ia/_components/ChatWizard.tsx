'use client';

import React, { useCallback, useState } from 'react';
import { useDraft } from '@/lib/use-draft';
import {
  CHAT_STEPS, DEFAULT_CHAT_DRAFT, goalLabel, isChatDraft, toneLabel, validateAll, validateChatStep, wizardDraftKey,
  type ChatDraft,
} from '@/lib/agent-wizard';
import { WizardShell } from './WizardShell';
import { WizardAside } from './WizardAside';
import { ChatStepBody } from './ChatSteps';
import { ReviewStep } from './ReviewStep';
import { useCreateAgent } from './use-create-agent';

const DRAFT_KEY = wizardDraftKey('chat');

export function ChatWizard() {
  const [draft, setDraft] = useState<ChatDraft>(DEFAULT_CHAT_DRAFT);
  const [step, setStep] = useState(0);
  const { recovered, savedAt, acceptRecovered, discardRecovered, clear } = useDraft<ChatDraft>(DRAFT_KEY, draft, {
    initial: DEFAULT_CHAT_DRAFT,
    validate: isChatDraft,
  });
  const { state, create } = useCreateAgent('chat');
  const patch = useCallback((p: Partial<ChatDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  const stepId = CHAT_STEPS[step].id;
  const last = stepId === 'revisar';
  const issues = validateChatStep(stepId, draft);

  const onCreate = async () => {
    if (await create(draft)) clear();
  };

  return (
    <WizardShell
      variant="chat"
      title="Nuevo agente de chat"
      steps={CHAT_STEPS}
      step={step}
      onStep={setStep}
      issues={last ? [] : issues}
      recovered={recovered}
      onRestore={() => { if (recovered) setDraft(recovered.data); acceptRecovered(); }}
      onDiscard={discardRecovered}
      savedAt={savedAt}
      aside={
        <WizardAside
          variant="chat"
          name={draft.name}
          chips={[goalLabel(draft.goal), toneLabel(draft.tone), `${draft.kbIds.length} ${draft.kbIds.length === 1 ? 'base' : 'bases'}`]}
          bubbleLabel="Así saludará"
          bubble={draft.welcome}
        />
      }
    >
      {last ? (
        <ReviewStep
          variant="chat"
          issues={validateAll('chat', draft)}
          state={state}
          onCreate={onCreate}
          rows={[
            ['Nombre', draft.name],
            ['Negocio', draft.business],
            ['Objetivo', goalLabel(draft.goal)],
            ['Tono', toneLabel(draft.tone)],
            ['Bases de conocimiento', String(draft.kbIds.length)],
            ['Canales', draft.channels.join(', ')],
          ]}
        />
      ) : (
        <ChatStepBody stepId={stepId} draft={draft} patch={patch} />
      )}
    </WizardShell>
  );
}
