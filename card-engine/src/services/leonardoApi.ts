import type { ArchetypeName, Rank } from '../types/card';
import { generatePlaceholderPortrait } from './portraitGenerator';

const LEONARDO_API_BASE = '/api/leonardo';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

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
  initImageId?: string,
): Promise<{ generationId: string; cost: string }> {
  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt,
    modelId: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
    width: 512,
    height: 512,
    num_images: 1,
    alchemy: true,
  };

  if (initImageId) {
    body.init_image_id = initImageId;
    // 0.45 is the sweet spot for tier-ups: strong enough to keep the same face
    // and skin tone, loose enough to let the prompt drive aging + new modifiers.
    body.init_strength = 0.45;
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
): Promise<string> {
  const apiKey = import.meta.env.VITE_LEONARDO_API_KEY;
  if (!apiKey) {
    throw new Error('No Leonardo API key configured');
  }

  let initImageId: string | undefined;
  if (initImageDataUrl && !initImageDataUrl.startsWith('linear-gradient')) {
    try {
      initImageId = await uploadInitImage(apiKey, initImageDataUrl);
    } catch (err) {
      console.warn('Init image upload failed, falling back to text-only generation:', err);
    }
  }

  const { generationId } = await submitGeneration(apiKey, prompt, negativePrompt, initImageId);
  const imageUrl = await pollForResult(apiKey, generationId);
  const dataUrl = await fetchAsDataUrl(imageUrl);
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Leonardo returned non-image data URL');
  }
  return dataUrl;
}

export async function generatePortrait(
  prompt: string,
  negativePrompt: string,
  archetype: ArchetypeName,
  rank: Rank,
  initImageDataUrl?: string,
): Promise<string> {
  try {
    return await generatePortraitStrict(prompt, negativePrompt, initImageDataUrl);
  } catch (err) {
    console.error('Leonardo API error, using placeholder:', err);
    return generatePlaceholderPortrait(archetype, rank);
  }
}
