import { z } from 'zod';

/**
 * MASTER JSON SCHEMA v2.0
 * ======================
 * Contrato entre la Secuencia 1 (planificación) y el Orquestador.
 * Inmutable durante ejecución; cada agente lee y devuelve outputs append-only.
 * 
 * v2.0 agrega:
 * - publicationMode por item
 * - existingAssets y agentAction
 * - competitorInsights
 * - campos de n8n y Instagram
 */

export const PublicationModeSchema = z.enum([
  'auto_instagram',  // publicación 100% automática
  'manual_push',     // notificación push para publicar manualmente
  'schedule_only',   // solo programar, sin publicar
]);

export const ContentItemSchema = z.object({
  id: z.string(),
  dayNumber: z.number().int().min(1).max(31).optional(),
  scheduledFor: z.string().datetime().optional(), // ISO 8601
  angle: z.string(),
  goal: z.string().optional(),
  scriptBrief: z.string(),
  visualBrief: z.string(),
  durationSec: z.number().optional(),
  pipelineType: z.enum(['ugc', 'avatar_reel', 'static_ads', 'carousel']),
  publicationMode: PublicationModeSchema.default('manual_push'),
  // Si hay assets existentes detectados en la carpeta local
  existingAssets: z.array(z.object({
    localPath: z.string(),
    type: z.enum(['image', 'video', 'audio']),
    visionAnalysis: z.any().optional(),
  })).optional(),
  // Instrucción al agente: 'create' | 'enhance' (si hay assets) | 'skip'
  agentAction: z.enum(['create', 'enhance', 'skip']).default('create'),
  caption: z.string().optional(),      // copy para Instagram
  hashtags: z.array(z.string()).optional(),
  callToAction: z.string().optional(),
});

export const MasterJsonSchema = z.object({
  version: z.literal('2.0'),
  campaignId: z.string(),
  workspaceId: z.string(),
  inventoryPath: z.string().optional(), // ruta carpeta raíz local
  brand: z.object({
    name: z.string(),
    tone: z.string(),
    voice: z.string(),
    colors: z.array(z.string()).optional(),
    audience: z.string(),
    products: z.string(),
    forbiddenTopics: z.string().optional(),
    instagramHandle: z.string().optional(),
  }),
  pipelineType: z.enum(['ugc', 'avatar_reel', 'static_ads', 'carousel']),
  batchSize: z.number().int().min(1).max(31),
  items: z.array(ContentItemSchema),
  modelConfig: z.object({
    copyAgent: z.object({ provider: z.string(), modelId: z.string() }),
    visualAgent: z.object({
      imageProvider: z.enum(['gemini', 'openai', 'stabilityai']),
      modelId: z.string().optional(),
    }),
    audioAgent: z.object({ ttsProvider: z.enum(['elevenlabs', 'openai', 'google']) }),
    videoAgent: z.object({ provider: z.enum(['gemini', 'runway', 'pika']) }),
    musicAgent: z.object({ provider: z.string() }).optional(),
  }),
  n8nWebhookUrl: z.string().url().optional(),
  igPageId: z.string().optional(),
  competitorInsights: z.object({
    painPoints: z.array(z.string()),
    contentThemes: z.array(z.string()),
    avoidTopics: z.array(z.string()),
    opportunities: z.array(z.string()),
    toneAnalysis: z.string(),
    rawSummary: z.string(),
  }).optional(),
  competitorUrls: z.array(z.string().url()).optional(),
  createdAt: z.string().datetime(),
});

export type MasterJson = z.infer<typeof MasterJsonSchema>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
export type PublicationMode = z.infer<typeof PublicationModeSchema>;

export type AgentOutput = {
  agent: string;
  status: 'success' | 'failed' | 'skipped' | 'ok';
  data?: Record<string, unknown>;
  assets?: Array<{ kind: string; url: string; metadata?: Record<string, unknown> }>;
  costUsd?: number;
  errorMessage?: string;
  itemId?: string;
  startedAt?: string;
  finishedAt?: string;
};

// Alias de compatibilidad con el código existente (v1.0)
export const MasterJson = MasterJsonSchema;
export const ContentItem = ContentItemSchema;
export const AgentOutput = null; // solo tipo
