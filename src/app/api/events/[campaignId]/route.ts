import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { createRedisSubscriber, eventChannel } from '@/lib/redis';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[campaignId]?executionId=xxx
 *
 * Server-Sent Events stream con:
 *  - Snapshot inicial: eventos persistidos hasta ahora
 *  - Live: nuevos eventos vía Redis pub/sub
 *
 * Eventos: agent.started, asset.ready, agent.failed, execution.paused, task.completed
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const auth = await getAuth(req);
  if (!auth) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const executionId = url.searchParams.get('executionId');
  if (!executionId) return new Response('executionId required', { status: 400 });

  const exec = await prisma.execution.findFirst({
    where: { id: executionId, userId: auth.userId, campaignId: params.campaignId },
  });
  if (!exec) return new Response('Execution not found', { status: 404 });

  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createRedisSubscriber> | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // 1) Snapshot inicial
      const past = await prisma.event.findMany({
        where: { executionId },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
      for (const ev of past) {
        controller.enqueue(
          encoder.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`)
        );
      }
      controller.enqueue(encoder.encode(`event: snapshot.done\ndata: {}\n\n`));

      // 2) Live via pub/sub
      subscriber = createRedisSubscriber();
      await subscriber.subscribe(eventChannel(executionId));
      subscriber.on('message', (_channel, message) => {
        const data = JSON.parse(message);
        controller.enqueue(
          encoder.encode(`event: ${data.type}\ndata: ${message}\n\n`)
        );
      });

      // Keep-alive cada 25s
      keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      req.signal.addEventListener('abort', async () => {
        if (keepalive) clearInterval(keepalive);
        await subscriber?.quit();
        controller.close();
      });
    },
    async cancel() {
      if (keepalive) clearInterval(keepalive);
      await subscriber?.quit();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
