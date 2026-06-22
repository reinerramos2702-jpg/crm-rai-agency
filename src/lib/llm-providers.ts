import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { LanguageModelV1 } from 'ai';
import { prisma } from './db';
import { decrypt } from './crypto';

export type Provider = 'openai' | 'anthropic' | 'google' | 'deepseek';

export const SUPPORTED_MODELS: Record<Provider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  ],
  google: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],
  deepseek: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
};

/**
 * Resuelve la API key del usuario para un provider determinado.
 * Fallback a env del operador si el user no tiene la suya.
 */
export async function resolveApiKey(userId: string, provider: Provider): Promise<string | null> {
  const stored = await prisma.apiKey.findFirst({
    where: { userId, provider, validated: true },
    orderBy: { createdAt: 'desc' },
  });
  if (stored) {
    return decrypt(stored.ciphertext, stored.iv, stored.authTag);
  }
  // Fallback env
  const envMap: Record<Provider, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
  };
  return envMap[provider] || null;
}

export async function getLLM(
  userId: string,
  provider: Provider,
  modelId: string
): Promise<LanguageModelV1> {
  const apiKey = await resolveApiKey(userId, provider);
  if (!apiKey) throw new Error(`No API key for ${provider}`);

  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey })(modelId);
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case 'deepseek':
      return createDeepSeek({ apiKey })(modelId);
  }
}

/**
 * Test-call rápido para validar una API key recién cargada.
 * Retorna { valid, error? } con el motivo real del fallo.
 */
export async function validateApiKey(
  provider: Provider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  const { generateText } = await import('ai');

  try {
    switch (provider) {
      case 'openai': {
        const model = createOpenAI({ apiKey })('gpt-4o-mini');
        await generateText({ model, prompt: 'ping', maxTokens: 5 });
        break;
      }
      case 'anthropic': {
        const model = createAnthropic({ apiKey })('claude-haiku-4-5');
        await generateText({ model, prompt: 'ping', maxTokens: 5 });
        break;
      }
      case 'google': {
        // Intenta modelos en orden de disponibilidad
        const modelos = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
        let lastErr = '';
        let ok = false;
        for (const m of modelos) {
          try {
            const model = createGoogleGenerativeAI({ apiKey })(m);
            await generateText({ model, prompt: 'ping', maxTokens: 5 });
            ok = true;
            break;
          } catch (e) {
            lastErr = (e as Error).message;
            // Si el error es de auth/key invalida, no seguir probando
            const isAuthErr =
              lastErr.includes('API_KEY_INVALID') ||
              lastErr.includes('invalid api key') ||
              lastErr.includes('401') ||
              lastErr.includes('403');
            if (isAuthErr) break;
          }
        }
        if (!ok) {
          const hint = !apiKey.startsWith('AIzaSy')
            ? ' (Las keys de Google AI Studio deben comenzar con AIzaSy - obtenla en aistudio.google.com)'
            : '';
          return { valid: false, error: lastErr + hint };
        }
        break;
      }
      case 'deepseek': {
        const model = createDeepSeek({ apiKey })('deepseek-chat');
        await generateText({ model, prompt: 'ping', maxTokens: 5 });
        break;
      }
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}
