'use strict';

/**
 * Free-tier models on OpenCode Zen.
 *
 * These are accessible without a real API key using the "public" bearer
 * token (the same behavior as the opencode CLI when no key is configured).
 * The list mirrors the models Zen itself reports under GET /models.
 *
 * Note: Free models may collect usage data for model improvement.
 * Do not submit sensitive/confidential data when using free endpoints.
 */
const FALLBACK_FREE_MODELS = [
  {
    id: 'opencode/deepseek-v4-flash-free',
    name: 'DeepSeek V4 Flash Free',
    provider: 'deepseek',
    family: 'deepseek-v4',
    free: true,
    description: 'Fast, efficient model from DeepSeek. Optimized for coding tasks.',
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: 'opencode/big-pickle',
    name: 'Big Pickle',
    provider: 'big-pickle',
    family: 'big-pickle',
    free: true,
    description: 'Experimental free model for testing and feedback.',
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: 'opencode/mimo-v2.5-free',
    name: 'MiMo V2.5 Free',
    provider: 'mimo',
    family: 'mimo-v2.5',
    free: true,
    description: 'Latest MiMo V2.5 model, free tier.',
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: 'opencode/nemotron-3-ultra-free',
    name: 'Nemotron 3 Ultra Free',
    provider: 'nvidia',
    family: 'nemotron-3',
    free: true,
    description: 'Free tier of NVIDIA Nemotron 3 Ultra.',
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: 'opencode/north-mini-code-free',
    name: 'North Mini Code',
    provider: 'north',
    family: 'north',
    free: true,
    description: 'Compact code-focused model from North, free tier.',
    supportsStreaming: true,
    supportsTools: true,
  },
];

// FREE_MODELS sẽ được sync live từ models.opencode.ai/api.json khi khởi động.
// Giữ hardcode làm fallback khi offline.
let FREE_MODELS = [...FALLBACK_FREE_MODELS];

const ALL_MODELS = [...FREE_MODELS];

/**
 * Maps various model ID aliases to the canonical opencode/ prefixed ID.
 * Lets clients omit the "opencode/" prefix.
 */
const MODEL_ALIASES = {};

for (const model of ALL_MODELS) {
  MODEL_ALIASES[model.id] = model.id;
  const shortId = model.id.replace('opencode/', '');
  MODEL_ALIASES[shortId] = model.id;
  if (shortId.endsWith('-free')) {
    const withoutFree = shortId.replace('-free', '');
    MODEL_ALIASES[withoutFree] = model.id;
  }
}

/**
 * Resolve any model ID alias to the canonical ID (with opencode/ prefix).
 * Unknown ids pass through unchanged so they can reach Zen verbatim.
 */
function resolveModelId(modelId) {
  if (!modelId) return null;
  return MODEL_ALIASES[modelId] || modelId;
}

/**
 * Check if a model is known to be free on OpenCode Zen.
 */
function isFreeModel(modelId) {
  const canonicalId = resolveModelId(modelId);
  if (!canonicalId) return false;
  return FREE_MODELS.some((m) => m.id === canonicalId);
}

/**
 * Get model metadata by ID.
 */
function getModelInfo(modelId) {
  const canonicalId = resolveModelId(modelId);
  if (!canonicalId) return null;
  return ALL_MODELS.find((m) => m.id === canonicalId) || null;
}

async function refreshFreeModels() {
  try {
    const { syncFreeModels } = require('./syncModels');
    const live = await syncFreeModels();
    if (live && live.length > 0) {
      // Mutate arrays in-place để giữ reference cho module đã require
      FREE_MODELS.length = 0;
      FREE_MODELS.push(...live);
      ALL_MODELS.length = 0;
      ALL_MODELS.push(...FREE_MODELS);
      // Clear old aliases
      for (const k of Object.keys(MODEL_ALIASES)) delete MODEL_ALIASES[k];
      for (const model of ALL_MODELS) {
        MODEL_ALIASES[model.id] = model.id;
        const shortId = model.id.replace('opencode/', '');
        MODEL_ALIASES[shortId] = model.id;
        if (shortId.endsWith('-free')) {
          const withoutFree = shortId.replace('-free', '');
          MODEL_ALIASES[withoutFree] = model.id;
        }
      }
      console.log(`[models] Synced ${FREE_MODELS.length} free models from models.opencode.ai/api.json`);
      return true;
    }
  } catch (e) {
    console.warn('[models] Sync failed, keep fallback:', e.message);
  }
  return false;
}

module.exports = {
  FREE_MODELS,
  FALLBACK_FREE_MODELS,
  ALL_MODELS,
  MODEL_ALIASES,
  resolveModelId,
  isFreeModel,
  getModelInfo,
  refreshFreeModels,
  get FREE_MODELS_LIVE() { return FREE_MODELS; },
};
