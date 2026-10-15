/** Cableado de producción del runner: prisma + publicador por workspace + auditoría. */
import { prisma } from './db';
import { logAudit } from './audit';
import { createPublisherFor } from './instagram-publisher';
import { getPublishMode } from './scheduled-posts';
import type { RunnerDb, RunnerDeps } from './publish-runner';

export function productionDeps(): RunnerDeps {
  return {
    db: prisma as unknown as RunnerDb,
    publisherFor: createPublisherFor,
    audit: (e) => logAudit({ ...e, entityType: 'scheduled_post' }),
    mode: getPublishMode(),
  };
}
