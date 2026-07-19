import type { ArchetypeName, Rank } from '../types/card';
import { generatePlaceholderPortrait } from './portraitGenerator';

const LEONARDO_API_BASE = '/api/leonardo';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

/**
 * Leonardo model registry — production API IDs pulled from
 * cloud.leonardo.ai/api/rest/v2/models on 2026-07-19.
 *
 * All entries are painterly / fantasy-illustration styles that fit the card
 * aesthetic. Phoenix 1.0 is the historical default and current baseline.
 * The rest exist so we can A/B test which model handles our multi-clause
 * Bible-driven prompts best without changing aesthetic family.
 */
export const LEONARDO_MODELS = {
  phoenix_1_0: {
    id: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
    displayName: 'Phoenix 1.0',
    supportsAlchemy: true,
  },
  // M3.6 test round 1 revealed Concept Art and Illustrative Albedo are
  // Kino-family models under the hood — Kino 2.1 does NOT support Alchemy.
  // Flagged accordingly so the request body omits the alchemy field.
  concept_art: {
    id: 'dd29ac47-ea88-4720-8678-b8633245c09c',
    displayName: 'Concept Art',
    supportsAlchemy: false,
  },
  lucid_origin: {
    id: '7b592283-e8a7-4c5a-9ba6-d18c31f258b9',
    displayName: 'Lucid Origin',
    supportsAlchemy: true,
  },
  illustrative_albedo: {
    id: '2067ae52-33fd-4a82-bb92-c2c55e7d2786',
    displayName: 'Illustrative Albedo',
    supportsAlchemy: false,
  },
} as const;

export type LeonardoModelKey = keyof typeof LEONARDO_MODELS;

/**
 * Default model + resolution for card portraits. Bumped 512→768 to match
 * the resolution of Raheem's reference favorites and reveal more detail.
 */
export const DEFAULT_MODEL: LeonardoModelKey = 'phoenix_1_0';
const IMAGE_SIZE = 768;

async function uploadInitImage(
  apiKey: string,
  imageDataUrl: string,
): Promise<string> {
  const ext = imageDataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';

  const presignRes = await fetch(`${LEONARDO_API_BASE}/init-image`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ extension: ext }),
  });

  if (!presignRes.ok) {
    throw new Error(`Init image presign failed (${presignRes.status})`);
  }

  const presignData = await presignRes.json();
  const { id, url, fields } = presignData.uploadInitImage;

  const base64 = imageDataUrl.split(',')[1];

  const uploadRes = await fetch('/api/s3-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, fields, base64, ext }),
  });
  if (!uploadRes.ok && uploadRes.status !== 204) {
    const errText = await uploadRes.text();
    throw new Error(`Init image upload failed (${uploadRes.status}): ${errText}`);
  }

  console.info(`Leonardo init image uploaded — id: ${id}`);
  return id;
}

async function submitGeneration(
  apiKey: string,
  prompt: string,
  negativePrompt: string,
  modelKey: LeonardoModelKey,
  initImageId?: string,
  initStrength?: number,
): Promise<{ generationId: string; cost: string }> {
  const model = LEONARDO_MODELS[modelKey];
  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    modelId: model.id,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    num_images: 1,
    alchemy: model.supportsAlchemy,
  };

  if (initImageId) {
    body.init_image_id = initImageId;
    // 0.45 is the sweet spot for tier-ups: strong enough to keep the same face
    // and skin tone, loose enough to let the prompt drive aging + new modifiers.
    // Lycanthrope overrides with ~0.30 so the model can morph human → wolf across ranks.
    body.init_strength = initStrength ?? 0.45;
  }

  const response = await fetch(`${LEONARDO_API_BASE}/generations`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Leonardo submit failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const job = data.sdGenerationJob;
  const cost = job.cost?.amount ?? 'unknown';
  console.info(`Leonardo generation submitted — cost: $${cost}${initImageId ? ' (img2img)' : ''}`);
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
      throw new Error(`Leonardo poll failed (${response.status})`);
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (generation.status === 'COMPLETE') {
      const images = generation.generated_images;
      if (!images || images.length === 0) {
        throw new Error('Leonardo returned no images');
      }
      // Leonardo returns url: null when nsfw content moderation blocks an image.
      // Fantasy prompts (blood, undead, "burning") trip this often — treat as a
      // generation failure so callers can fall back or preserve prior art.
      const first = images[0];
      const url: unknown = first?.url;
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        const nsfw = first?.nsfw ? ' (nsfw filter)' : '';
        throw new Error(`Leonardo returned no usable image URL${nsfw}`);
      }
      return url;
    }

    if (generation.status === 'FAILED') {
      throw new Error('Leonardo generation failed');
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('Leonardo generation timed out');
}

async function fetchAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Leonardo image (${response.status})`);
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
 * Runs the Leonardo pipeline and throws on any failure. Returns a valid image
 * data URL or throws. Use this when the caller wants to keep a previous portrait
 * instead of accepting a placeholder (e.g. tier-up).
 */
export async function generatePortraitStrict(
  prompt: string,
  negativePrompt: string,
  initImageDataUrl?: string,
  initStrength?: number,
  modelKey: LeonardoModelKey = DEFAULT_MODEL,
): Promise<{ dataUrl: string; modelKey: LeonardoModelKey }> {
  // In production the /api/leonardo proxy injects a server-side LEONARDO_API_KEY,
  // so the client no longer needs one. Dev still uses the vite proxy which
  // passes VITE_LEONARDO_API_KEY through unchanged.
  const apiKey = import.meta.env.VITE_LEONARDO_API_KEY ?? '';

  let initImageId: string | undefined;
  if (initImageDataUrl && !initImageDataUrl.startsWith('linear-gradient')) {
    try {
      initImageId = await uploadInitImage(apiKey, initImageDataUrl);
    } catch (err) {
      console.warn('Init image upload failed, falling back to text-only generation:', err);
    }
  }

  const { generationId } = await submitGeneration(
    apiKey,
    prompt,
    negativePrompt,
    modelKey,
    initImageId,
    initStrength,
  );
  const imageUrl = await pollForResult(apiKey, generationId);
  const dataUrl = await fetchAsDataUrl(imageUrl);
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Leonardo returned non-image data URL');
  }
  return { dataUrl, modelKey };
}

/**
 * Per-archetype init_strength for tier-up / regen. Default 0.45 works for the
 * standard "same face, aged and hardened" pattern. Lycanthrope drops to 0.15
 * so the model has room to break the human silhouette (bodybuilder chest,
 * human hands) that the Foundation image otherwise anchors — the four locked
 * textual anchors (fur color, moon phase, eye color, identity token) carry
 * identity instead. Was 0.30 initially, but the first two Forged generations
 * kept clean human abs and no claws — needed to weaken CR further.
 */
export function getInitStrengthForArchetype(archetype: ArchetypeName): number {
  if (archetype === 'Lycanthrope') return 0.15;
  return 0.45;
}

export async function generatePortrait(
  prompt: string,
  negativePrompt: string,
  archetype: ArchetypeName,
  rank: Rank,
  initImageDataUrl?: string,
  initStrength?: number,
  modelKey: LeonardoModelKey = DEFAULT_MODEL,
): Promise<{ dataUrl: string; modelKey: LeonardoModelKey }> {
  try {
    return await generatePortraitStrict(prompt, negativePrompt, initImageDataUrl, initStrength, modelKey);
  } catch (err) {
    console.error('Leonardo API error, using placeholder:', err);
    return { dataUrl: generatePlaceholderPortrait(archetype, rank), modelKey };
  }
}

/**
 * A/B test pool for the M3.6 model comparison. Round-robins across four
 * painterly / illustrative Leonardo models so we can compare quality on
 * the same style of prompt without user preference bias. Storage in
 * localStorage keeps the rotation stable across page reloads.
 */
// M3.7 direction — Phoenix 1.0 only while we dial the action / eruption
// prompt. Concept Art and Illustrative Albedo don't support Alchemy;
// Lucid Origin is held back for a follow-up round after Phoenix's aesthetic
// is confirmed dialed.
const AB_TEST_POOL: LeonardoModelKey[] = [
  'phoenix_1_0',
];
const AB_TEST_KEY = 'card-engine-ab-test-cursor';

export function pickAbTestModel(): LeonardoModelKey {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(AB_TEST_KEY) : null;
  const cursor = raw ? (parseInt(raw, 10) || 0) : 0;
  const model = AB_TEST_POOL[cursor % AB_TEST_POOL.length];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AB_TEST_KEY, String((cursor + 1) % AB_TEST_POOL.length));
  }
  return model;
}
