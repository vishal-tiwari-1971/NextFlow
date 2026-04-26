const DEFAULT_PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const DEFAULT_FALLBACK_MODELS = ['gemini-2.0-flash-lite', 'gemini-1.5-flash'];
const DEFAULT_MAX_RETRIES_PER_MODEL = Number(process.env.GEMINI_MAX_RETRIES_PER_MODEL || 2);
const DEFAULT_INITIAL_BACKOFF_MS = Number(process.env.GEMINI_INITIAL_BACKOFF_MS || 1200);
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 512);
const MODELS_CACHE_TTL_MS = Number(process.env.GEMINI_MODELS_CACHE_TTL_MS || 10 * 60 * 1000);

type GeminiRequestOptions = {
  apiKey: string;
  prompt: string;
  imageUrls?: string[];
};

type GeminiPart =
  | {
      text: string;
    }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeModelName = (modelName: string) => modelName.replace(/^models\//, '').trim();

const parseModelListResponse = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return (data.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
    .map((model) => normalizeModelName(model.name ?? ''))
    .filter(Boolean);
};

let cachedModels: { values: string[]; expiresAt: number } | null = null;

const fetchAvailableModels = async (apiKey: string): Promise<string[]> => {
  const now = Date.now();

  if (cachedModels && cachedModels.expiresAt > now) {
    return cachedModels.values;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );

  if (!response.ok) {
    cachedModels = { values: [], expiresAt: now + MODELS_CACHE_TTL_MS };
    return [];
  }

  const modelNames = parseModelListResponse(await response.json());
  cachedModels = { values: modelNames, expiresAt: now + MODELS_CACHE_TTL_MS };

  return modelNames;
};

const getModels = async (apiKey: string) => {
  const customFallbacks = (process.env.GEMINI_MODEL_FALLBACKS || '')
    .split(',')
    .map((item) => normalizeModelName(item))
    .filter(Boolean);

  const configuredModels = [
    normalizeModelName(DEFAULT_PRIMARY_MODEL),
    ...(customFallbacks.length > 0 ? customFallbacks : DEFAULT_FALLBACK_MODELS),
  ].filter(Boolean);

  const availableModels = await fetchAvailableModels(apiKey);

  // Prefer configured models that are actually available.
  const preferredAvailable = configuredModels.filter((model) => availableModels.includes(model));

  // If all configured models are invalid, fall back to any available generateContent-capable models.
  const discoveredFallbacks = availableModels.filter((model) => !preferredAvailable.includes(model));

  const orderedModels = [
    ...preferredAvailable,
    ...discoveredFallbacks,
    // Keep configured list as a last resort in case ListModels fails.
    ...configuredModels,
  ];

  return [...new Set(orderedModels)];
};

const extractGeminiText = (response: unknown): string => {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid Gemini response format.');
  }

  const data = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini response did not include any text.');
  }

  return text;
};

const isRetryableStatus = (status: number) => status === 429 || status === 503;
const isModelUnavailableStatus = (status: number) => status === 404;

const toBase64 = async (url: string): Promise<{ data: string; mimeType: string } | null> => {
  try {
    const imageResponse = await fetch(url, {
      cache: 'no-store',
    });

    if (!imageResponse.ok) {
      return null;
    }

    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      data: base64,
      mimeType,
    };
  } catch {
    return null;
  }
};

const buildGeminiParts = async (prompt: string, imageUrls: string[] = []): Promise<GeminiPart[]> => {
  if (imageUrls.length === 0) {
    return [{ text: prompt }];
  }

  const parts: GeminiPart[] = [{ text: prompt }];

  for (const imageUrl of imageUrls) {
    const base64Payload = await toBase64(imageUrl);

    if (!base64Payload) {
      continue;
    }

    parts.push({
      inline_data: {
        mime_type: base64Payload.mimeType,
        data: base64Payload.data,
      },
    });
  }

  return parts;
};

export const generateGeminiText = async ({ apiKey, prompt, imageUrls = [] }: GeminiRequestOptions): Promise<string> => {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is empty.');
  }

  const models = await getModels(apiKey);
  const parts = await buildGeminiParts(prompt, imageUrls);

  if (models.length === 0) {
    throw new Error('No Gemini models are available for generateContent.');
  }

  let lastError: Error | null = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES_PER_MODEL; attempt += 1) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts,
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
            },
          }),
        },
      );

      if (response.ok) {
        return extractGeminiText(await response.json());
      }

      const errorText = await response.text();
      const retryable = isRetryableStatus(response.status);
      const unavailableModel = isModelUnavailableStatus(response.status);
      const hasRetryAttempts = attempt < DEFAULT_MAX_RETRIES_PER_MODEL;
      const hasMoreModels = modelIndex < models.length - 1;

      lastError = new Error(
        `Gemini request failed on ${model} (status ${response.status}): ${errorText}`,
      );

      if (retryable && hasRetryAttempts) {
        const jitter = Math.floor(Math.random() * 300);
        const delay = DEFAULT_INITIAL_BACKOFF_MS * 2 ** attempt + jitter;
        await sleep(delay);
        continue;
      }

      if (unavailableModel && hasMoreModels) {
        break;
      }

      if (retryable && hasMoreModels) {
        break;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('Gemini request failed after all retries and model fallbacks.');
};