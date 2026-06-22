import type { MasterJson } from './master-json-schema';

/**
 * Tabla de costos aproximada (USD).
 * VERIFY: estos números cambian; ajustar con docs oficiales.
 */
const COSTS = {
  llm: {
    'deepseek-chat': { input: 0.14 / 1_000_000, output: 0.28 / 1_000_000 }, // por token
    'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
    'claude-sonnet-4-5': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'gemini-2.5-flash': { input: 0.3 / 1_000_000, output: 2.5 / 1_000_000 },
    'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10 / 1_000_000 },
  },
  image: {
    'openai-image-gpt-image-1': 0.04, // por imagen
    'google-imagen-3': 0.03,
    'nano-banana': 0.025,
  },
  video: {
    'google-veo-3.1': 0.4, // por segundo
    'google-veo-3.0': 0.5,
  },
  voice: {
    elevenlabs: 0.18 / 1000, // por carácter
    'openai-tts': 15 / 1_000_000, // por carácter
  },
  music: {
    suno: 0.25, // por canción
  },
};

const APPROX_TOKENS_PER_SCRIPT = 800; // input ~300 + output ~500
const APPROX_IMAGES_PER_ITEM = {
  ugc: 5, // escenas
  avatar_reel: 3,
  static_ads: 1,
  carousel: 8,
};
const APPROX_VIDEO_SEC = {
  ugc: 30,
  avatar_reel: 45,
  static_ads: 0,
  carousel: 0,
};
const APPROX_CHARS_PER_VOICEOVER = 600;

export function estimateExecutionCost(master: MasterJson): {
  totalUsd: number;
  breakdown: Record<string, number>;
} {
  const n = master.items.length;
  const ptype = master.pipelineType;
  const breakdown: Record<string, number> = {};

  // Copy agent (LLM)
  const copyModel = master.modelConfig.copyAgent.modelId;
  const copyCost = (COSTS.llm as any)[copyModel] || COSTS.llm['deepseek-chat'];
  breakdown.copy = n * APPROX_TOKENS_PER_SCRIPT * (copyCost.input + copyCost.output) * 0.5;

  // Visual (imágenes)
  const imgs = APPROX_IMAGES_PER_ITEM[ptype];
  const imgProvider = master.modelConfig.visualAgent.imageProvider;
  const imgCost = (COSTS.image as any)[imgProvider] || COSTS.image['openai-image-gpt-image-1'];
  breakdown.visual = n * imgs * imgCost;

  // Video
  const vsec = APPROX_VIDEO_SEC[ptype];
  if (vsec > 0) {
    const videoProvider = master.modelConfig.videoAgent.provider;
    const vCost = (COSTS.video as any)[videoProvider] || COSTS.video['google-veo-3.1'];
    breakdown.video = n * vsec * vCost;
  }

  // Voice (solo si pipeline lleva audio narrado)
  if (ptype === 'ugc' || ptype === 'avatar_reel') {
    const ttsProvider = master.modelConfig.audioAgent.ttsProvider;
    const tCost = (COSTS.voice as any)[ttsProvider] || COSTS.voice.elevenlabs;
    breakdown.voice = n * APPROX_CHARS_PER_VOICEOVER * tCost;
  }

  // Music (opcional)
  if (master.modelConfig.musicAgent) {
    const mProvider = master.modelConfig.musicAgent.provider;
    const mCost = (COSTS.music as any)[mProvider] || COSTS.music.suno;
    breakdown.music = n * mCost;
  }

  const totalUsd = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { totalUsd: Math.round(totalUsd * 100) / 100, breakdown };
}

export function enforceHardCap(estimatedUsd: number): { ok: boolean; cap: number } {
  const cap = parseFloat(process.env.HARD_CAP_USD_PER_EXECUTION || '50');
  return { ok: estimatedUsd <= cap, cap };
}
