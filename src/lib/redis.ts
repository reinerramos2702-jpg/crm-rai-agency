import IORedis from 'ioredis';
import { Queue } from 'bullmq';

let redisConnection: IORedis | null = null;
let redisPub: IORedis | null = null;
let pipelineQueue: Queue | null = null;

function redisUrl() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is required for queue and SSE operations');
  return url;
}

// BullMQ requiere maxRetriesPerRequest: null.
export function getRedisConnection() {
  redisConnection ??= new IORedis(redisUrl(), {
    maxRetriesPerRequest: null,
  });
  return redisConnection;
}

export function createRedisSubscriber() {
  return new IORedis(redisUrl());
}

function getRedisPublisher() {
  redisPub ??= new IORedis(redisUrl());
  return redisPub;
}

export function getPipelineQueue() {
  pipelineQueue ??= new Queue('content-pipeline', {
    connection: getRedisConnection() as any,
    defaultJobOptions: {
      attempts: 1, // pausamos en fallo, no retry auto (decisión del usuario)
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
  return pipelineQueue;
}

// Canal pub/sub por execution
export function eventChannel(executionId: string) {
  return `exec:${executionId}:events`;
}

export async function publishEvent(
  executionId: string,
  event: { type: string; agentName?: string; taskId?: string; payload?: any }
) {
  await getRedisPublisher().publish(
    eventChannel(executionId),
    JSON.stringify({ ...event, ts: Date.now() })
  );
}
