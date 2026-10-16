'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  NO_RESPONSE_MESSAGE,
  buildUserMessage,
  chatErrorMessage,
  createStreamParser,
} from '@/lib/campaign-chat';
import type { Attachments } from './useAttachments';
import type { ChatMessage } from './useCampaignSession';

interface ChatInputs {
  campaignId: string | null;
  ensureCampaign: () => Promise<string | null>;
  provider: string;
  modelId: string;
  imageProvider: string;
  pipelineType: string;
  buildContext: () => string;
  attachments: Attachments;
  onFinalized: () => void;
}

/** Conversación con la IA de planificación: envío con stream, errores legibles y cierre del plan. */
export function useCampaignChat(inputs: ChatInputs) {
  const router = useRouter();
  const { campaignId, ensureCampaign, provider, modelId, imageProvider, pipelineType, buildContext, attachments, onFinalized } =
    inputs;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const canSend = !busy && !attachments.isReading && (input.trim().length > 0 || attachments.files.length > 0);

  const sendMessage = useCallback(
    async () => {
      const text = input.trim();
      const files = attachments.files;
      if ((!text && files.length === 0) || busy || attachments.isReading) return;

      const id = await ensureCampaign();
      if (!id) return;

      const userMsg: ChatMessage = { role: 'user', content: buildUserMessage(text, files) };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput('');
      attachments.clear();
      setBusy(true);

      let res: Response;
      try {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: id,
            messages: next,
            provider,
            modelId,
            contextSuffix: buildContext(),
            imageProvider,
            pipelineType,
          }),
        });
      } catch {
        toast.error('Error de red al contactar la IA. Verifica tu conexión.');
        setBusy(false);
        return;
      }

      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch {
          // La respuesta puede no incluir un cuerpo de error legible.
        }
        const errMsg = chatErrorMessage(res.status, bodyText, provider);
        toast.error(errMsg);
        setMessages([...next, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
        setBusy(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const parser = createStreamParser();
      let assistantText = '';
      let gotAnyText = false;
      setMessages([...next, { role: 'assistant', content: '' }]);

      const handle = (events: ReturnType<typeof parser.push>) => {
        for (const ev of events) {
          if (ev.type === 'text') {
            assistantText += ev.text;
            gotAnyText = true;
          } else {
            toast.error(`Error de la IA: ${ev.message}`);
            assistantText = `⚠️ ${ev.message}`;
            gotAnyText = true;
          }
          setMessages([...next, { role: 'assistant', content: assistantText }]);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        handle(parser.push(decoder.decode(value, { stream: true })));
      }
      handle(parser.flush());

      if (!gotAnyText) {
        toast.error(NO_RESPONSE_MESSAGE);
        setMessages([...next, { role: 'assistant', content: `⚠️ ${NO_RESPONSE_MESSAGE}` }]);
      }
      setBusy(false);
    },
    [input, attachments, busy, ensureCampaign, messages, provider, modelId, buildContext, imageProvider, pipelineType],
  );

  const finalizePlan = useCallback(async () => {
    if (!campaignId || messages.length < 2) return;
    setFinalizing(true);
    try {
      const res = await fetch('/api/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (res.ok) {
        onFinalized();
        toast.success('¡Plan maestro generado!');
        router.push(`/campaign/${campaignId}`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al finalizar');
        setFinalizing(false);
      }
    } catch {
      toast.error('Error de red');
      setFinalizing(false);
    }
  }, [campaignId, messages.length, onFinalized, router]);

  return { messages, setMessages, input, setInput, busy, finalizing, canSend, sendMessage, finalizePlan };
}

export type Chat = ReturnType<typeof useCampaignChat>;
