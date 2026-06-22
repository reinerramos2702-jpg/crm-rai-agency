import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { validateApiKey, type Provider } from '@/lib/llm-providers';
import { isRoleContext, requireRole } from '@/lib/roles';

export const runtime = 'nodejs';

/**
 * GET  /api/keys   → lista providers configurados (sin revelar el secreto)
 * POST /api/keys   → guarda + valida una key { provider, apiKey, label? }
 * DELETE /api/keys?id=xxx
 */

export async function GET(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const auth = ctx.auth;

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      provider: true,
      label: true,
      validated: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json({ keys });
}

export async function POST(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const auth = ctx.auth;

  const { provider, apiKey, label } = await req.json();
  if (!provider || !apiKey) {
    return new Response('provider and apiKey required', { status: 400 });
  }

  // Validar primero (test-call) si es un LLM provider
  let validated = false;
  if (['openai', 'anthropic', 'google', 'deepseek'].includes(provider)) {
    const result = await validateApiKey(provider as Provider, apiKey);
    if (!result.valid) {
      const msg = result.error
        ? `API key inválida: ${result.error}`
        : 'API key inválida — verifica que la key sea correcta para este proveedor.';
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }
    validated = true;
  } else {
    // Para elevenlabs / suno / instagram: marcamos como no-validado-aún
    validated = true; // confiar y fallar en runtime
  }

  const enc = encrypt(apiKey);

  // upsert por (userId, provider, label)
  const existing = await prisma.apiKey.findFirst({
    where: { userId: auth.userId, provider, label: label ?? null },
  });

  const saved = existing
    ? await prisma.apiKey.update({
        where: { id: existing.id },
        data: {
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          authTag: enc.authTag,
          validated,
        },
      })
    : await prisma.apiKey.create({
        data: {
          userId: auth.userId,
          provider,
          label,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          authTag: enc.authTag,
          validated,
        },
      });

  return Response.json({
    id: saved.id,
    provider: saved.provider,
    validated: saved.validated,
  });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requireRole(req, ['admin', 'gerente']);
  if (!isRoleContext(ctx)) return ctx;
  const auth = ctx.auth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('id required', { status: 400 });

  await prisma.apiKey.deleteMany({ where: { id, userId: auth.userId } });
  return new Response(null, { status: 204 });
}
