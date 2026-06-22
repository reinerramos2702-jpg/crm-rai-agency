import { prisma } from './db';

export interface AuditPayload {
  workspaceId: string;
  userId: string;
  action: string; // ej. 'guest.created', 'booking.cancelled', 'payment.approved'
  entityType: string; // ej. 'guest', 'booking', 'payment', 'site', 'room'
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Registra un evento en el audit log global.
 * Nunca lanza — fallar silenciosamente al loggear no debe tumbar el request principal.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        workspaceId: payload.workspaceId,
        userId: payload.userId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        meta: (payload.meta ?? {}) as object,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[audit] no se pudo registrar evento', payload.action, err);
  }
}

/** Genera referencia legible tipo PAY-A3F7K2 o BK-9P2X4L (6 chars alfanuméricos). */
export function generateReference(prefix: 'PAY' | 'BK'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}
