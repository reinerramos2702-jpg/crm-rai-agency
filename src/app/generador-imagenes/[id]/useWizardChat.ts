'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import type { ChatMessage } from '../types';

interface UseWizardChatArgs {
  gridId: string;
  provider: string;
  modelId: string;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  /** Se llama al enviar (para marcar la grilla como modificada). */
  onSend: () => void;
  /** Se llama al terminar el flujo, con o sin texto. */
  onFinish: () => void;
}

function describeHttpError(status: number, body: string, provider: string): string {
  let message = `Error ${status} al contactar la IA.`;
  try {
    const parsed = JSON.parse(body);
    message = parsed.error || body || message;
  } catch {
    message = body || message;
  }
  if (status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (/no api key/i.test(message)) {
    return `No hay API key configurada para "${provider}". Ve a "Claves de IA" y agrega una.`;
  }
  return message;
}

/** Chat del wizard: envía el historial y lee la respuesta en streaming (protocolo `0:`/`3:` del AI SDK). */
export function useWizardChat({ gridId, provider, modelId, messages, setMessages, onSend, onFinish }: UseWizardChatArgs) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    onSend();

    const fail = (errMsg: string) => {
      toast.error(errMsg);
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errMsg}` }]);
      setBusy(false);
    };

    let res: Response;
    try {
      res = await fetch(`/api/content-grids/${gridId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, provider, modelId }),
      });
    } catch {
      toast.error('Error de red al contactar la IA.');
      setBusy(false);
      return;
    }

    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        // El cuerpo de error puede no estar disponible; se conserva el mensaje por estado HTTP.
      }
      fail(describeHttpError(res.status, body, provider));
      return;
    }

    if (!res.body) {
      fail('La IA no devolvió respuesta. Verifica tu API key en "Claves de IA".');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    let gotAnyText = false;
    let pending = '';
    setMessages([...next, { role: 'assistant', content: '' }]);

    const handleLine = (line: string) => {
      if (line.startsWith('0:')) {
        try {
          assistantText += JSON.parse(line.slice(2));
          gotAnyText = true;
          setMessages([...next, { role: 'assistant', content: assistantText }]);
        } catch {
          // Fragmento incompleto: se ignora hasta recibir el siguiente bloque.
        }
      } else if (line.startsWith('3:')) {
        try {
          const errPiece = JSON.parse(line.slice(2));
          const errText = typeof errPiece === 'string' ? errPiece : errPiece?.message || 'Error desconocido del modelo.';
          toast.error(`Error de la IA: ${errText}`);
          assistantText = `⚠️ ${errText}`;
          gotAnyText = true;
          setMessages([...next, { role: 'assistant', content: assistantText }]);
        } catch {
          // Fragmento de error malformado: no cancela el resto del stream.
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Un chunk puede cortar una línea a la mitad: se acumula hasta el salto de línea.
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) handleLine(line);
    }
    if (pending.trim()) handleLine(pending);

    if (!gotAnyText) {
      const errText = 'La IA no devolvió respuesta. Verifica tu API key en "Claves de IA".';
      toast.error(errText);
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errText}` }]);
    }

    setBusy(false);
    onFinish();
  }, [input, busy, messages, setMessages, gridId, provider, modelId, onSend, onFinish]);

  return { input, setInput, busy, send };
}
