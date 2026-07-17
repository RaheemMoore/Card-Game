const LEONARDO_API_BASE = '/api/leonardo';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

const DEFAULT_MODEL_ID = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3';
const EMBLEM_WIDTH = 1024;
const EMBLEM_HEIGHT = 1024;

const PROMPT_HARD_LIMIT = 1500;

export interface EmblemGenerationResult {
  dataUrl: string;
  generationId: string;
  cost: string;
  charCount: number;
}

async function submitGeneration(
  apiKey: string,
  prompt: string,
): Promise<{ generationId: string; cost: string }> {
  const response = await fetch(`${LEONARDO_API_BASE}/generations`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      modelId: DEFAULT_MODEL_ID,
      width: EMBLEM_WIDTH,
      height: EMBLEM_HEIGHT,
      num_images: 1,
      alchemy: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Leonardo emblem submit failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const job = data.sdGenerationJob;
  const cost = job.cost?.amount ?? 'unknown';
  console.info(`Leonardo emblem submitted — cost: $${cost}, ${EMBLEM_WIDTH}x${EMBLEM_HEIGHT}`);
  return { generationId: job.generationId, cost };
}

async function pollForResult(
  apiKey: string,
  generationId: string,
): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${LEONARDO_API_BASE}/generations/${generationId}`,
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Leonardo emblem poll failed (${response.status})`);
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (generation.status === 'COMPLETE') {
      const images = generation.generated_images;
      if (!images || images.length === 0) {
        throw new Error('Leonardo returned no images');
      }
      const first = images[0];
      const url: unknown = first?.url;
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        const nsfw = first?.nsfw ? ' (nsfw filter)' : '';
        throw new Error(`Leonardo returned no usable emblem URL${nsfw}`);
      }
      return url;
    }

    if (generation.status === 'FAILED') {
      throw new Error('Leonardo emblem generation failed');
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Leonardo emblem generation timed out');
}

async function fetchAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch emblem image (${response.status})`);
  }
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error(`Fetched non-image content (${blob.type || 'unknown'})`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        resolve(result);
      } else {
        reject(new Error('FileReader produced non-image data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate an archetype selection emblem via Leonardo.
 *
 * Differences vs the portrait pipeline (services/leonardoApi.ts):
 * - 1024x1024 square (portraits are 512x512 5:7-ish)
 * - No Character Reference / init_image — emblems are fresh symbols
 * - No negative_prompt param — exclusions must be embedded at the end of
 *   `prompt` so that image-edit modes (which do not expose a negative field)
 *   still receive them
 *
 * Throws on any failure. Caller decides fallback behavior.
 */
export async function generateEmblem(prompt: string): Promise<EmblemGenerationResult> {
  const charCount = prompt.length;
  if (charCount > PROMPT_HARD_LIMIT) {
    throw new Error(
      `Emblem prompt too long: ${charCount} chars (limit ${PROMPT_HARD_LIMIT}). ` +
      `Trim before submitting.`,
    );
  }

  // Server-side LEONARDO_API_KEY overrides in prod (see leonardoApi.ts).
  const apiKey = import.meta.env.VITE_LEONARDO_API_KEY ?? '';

  const { generationId, cost } = await submitGeneration(apiKey, prompt);
  const imageUrl = await pollForResult(apiKey, generationId);
  const dataUrl = await fetchAsDataUrl(imageUrl);
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Leonardo returned non-image data URL');
  }

  return { dataUrl, generationId, cost, charCount };
}

export const EMBLEM_PROMPT_HARD_LIMIT = PROMPT_HARD_LIMIT;
export const EMBLEM_TARGET_MIN = 1250;
export const EMBLEM_TARGET_MAX = 1450;
