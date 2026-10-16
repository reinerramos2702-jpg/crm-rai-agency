'use client';

import React, { useCallback, useState } from 'react';
import { useDraft } from '@/lib/use-draft';
import {
  DEFAULT_VOICE_DRAFT, VOICE_STEPS, formatMinutes, goalLabel, isVoiceDraft, languageLabel, speedLabel, toneLabel,
  validateAll, validateVoiceStep, voiceLabel, wizardDraftKey, type VoiceDraft,
} from '@/lib/agent-wizard';
import { WizardShell } from './WizardShell';
import { WizardAside } from './WizardAside';
import { VoiceStepBody } from './VoiceSteps';
import { ReviewStep } from './ReviewStep';
import { VoiceComingSoon } from './VoiceComingSoon';
import { useCreateAgent } from './use-create-agent';

const DRAFT_KEY = wizardDraftKey('voice');
const yesNo = (v: boolean) => (v ? 'Sí' : 'No');

export function VoiceWizard() {
  const [draft, setDraft] = useState<VoiceDraft>(DEFAULT_VOICE_DRAFT);
  const [step, setStep] = useState(0);
  const { recovered, savedAt, acceptRecovered, discardRecovered, clear } = useDraft<VoiceDraft>(DRAFT_KEY, draft, {
    initial: DEFAULT_VOICE_DRAFT,
    validate: isVoiceDraft,
  });
  const { state, create } = useCreateAgent('voice');
  const patch = useCallback((p: Partial<VoiceDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  const stepId = VOICE_STEPS[step].id;
  const last = stepId === 'revisar';
  const r = draft.rules;

  const onCreate = async () => {
    if (await create(draft)) clear();
  };

  return (
    <WizardShell
      variant="voice"
      title="Nuevo agente de voz"
      steps={VOICE_STEPS}
      step={step}
      onStep={setStep}
      issues={last ? [] : validateVoiceStep(stepId, draft)}
      recovered={recovered}
      onRestore={() => { if (recovered) setDraft(recovered.data); acceptRecovered(); }}
      onDiscard={discardRecovered}
      savedAt={savedAt}
      aside={
        <WizardAside
          variant="voice"
          name={draft.name}
          chips={[voiceLabel(draft.voiceId), languageLabel(draft.language), speedLabel(draft.speed)]}
          bubbleLabel="Así contestará la llamada"
          bubble={draft.greeting}
          footnote="La telefonía real (número, SIP) se conecta en una fase posterior."
        />
      }
    >
      {last ? (
        <ReviewStep
          variant="voice"
          issues={validateAll('voice', draft)}
          state={state}
          onCreate={onCreate}
          extraAfter={<VoiceComingSoon />}
          rows={[
            ['Nombre', draft.name],
            ['Empresa', draft.business],
            ['Voz', `${voiceLabel(draft.voiceId)} · ${languageLabel(draft.language)}`],
            ['Tono y ritmo', `${toneLabel(draft.tone)} · ${speedLabel(draft.speed)}`],
            ['Objetivo', goalLabel(draft.goal)],
            ['Bases de conocimiento', String(draft.kbIds.length)],
            ['Horario', r.hoursEnabled ? `${r.hoursFrom} a ${r.hoursTo}` : 'Sin restricción'],
            ['Transferencia', r.transferEnabled ? r.transferPhone || 'Sin número' : 'No'],
            ['Duración máxima', formatMinutes(r.maxMinutes)],
            ['Aviso de IA / grabación', `${yesNo(r.aiDisclosure)} / ${yesNo(r.recording)}`],
          ]}
        />
      ) : (
        <VoiceStepBody stepId={stepId} draft={draft} patch={patch} />
      )}
    </WizardShell>
  );
}
