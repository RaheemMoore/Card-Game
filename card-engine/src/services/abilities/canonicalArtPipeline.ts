import type {
  AbilityArtCrops,
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { generatePortraitStrict } from '../leonardoApi';
import { getApprovedArt } from '../../data/abilities/visualManifest';

/**
 * Ability art pipeline. Two providers:
 *   - 'placeholder' — cheap, offline, family-themed SVG data URLs. Seeded
 *     automatically so every ability has *something* to show in the Codex.
 *   - 'leonardo'    — canonical illustrated art. Per Stage 0 decision #8,
 *     Leonardo calls fire only after Raheem's per-family approval, batched.
 *
 * Both paths write CanonicalArtAsset rows through the store. Only one asset
 * per ability carries status='approved' — subsequent generations promote to
 * approved while the previous approved row is marked status='replaced' so
 * the history stays queryable.
 */

// Family accent palette. Kept out of families.ts because it's UI-adjacent
// (Figma is the source of truth for real colors; this is a coarse fallback).
const FAMILY_PALETTE: Record<string, { primary: string; secondary: string; glyph: string }> = {
  martial:    { primary: '#8a1c1c', secondary: '#4a1010', glyph: '⚔' },
  fire:       { primary: '#c2410c', secondary: '#7c2d12', glyph: '🜂' },
  nature:     { primary: '#14532d', secondary: '#052e16', glyph: '❦' },
  holy:       { primary: '#b8860b', secondary: '#7c5a05', glyph: '☼' },
  necromancy: { primary: '#4c1d95', secondary: '#2e1065', glyph: '☠' },
  tech:       { primary: '#1e40af', secondary: '#0c1e5c', glyph: '⚙' },
  defense:    { primary: '#3f3f46', secondary: '#18181b', glyph: '🛡' },
  beast:      { primary: '#78350f', secondary: '#3c1a06', glyph: '☾' },
};

const DEFAULT_PALETTE = { primary: '#3f3f46', secondary: '#18181b', glyph: '✦' };

function paletteFor(family: AbilityFamily | undefined): { primary: string; secondary: string; glyph: string } {
  if (!family) return DEFAULT_PALETTE;
  return FAMILY_PALETTE[family.id] ?? DEFAULT_PALETTE;
}

/**
 * Build a small square SVG that reads as an ability tile placeholder:
 * radial family-color gradient + centered glyph + ability initial. Renders
 * cleanly at 64px combat scale (see spec §11 Figma benchmarks).
 */
export function buildPlaceholderSvg(def: AbilityDefinition, family: AbilityFamily | undefined): string {
  const p = paletteFor(family);
  const initial = def.displayName.trim().charAt(0).toUpperCase() || '?';
  // Not a full SVG document — a tile-sized square with viewBox 0 0 64 64.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <radialGradient id="g" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${p.primary}"/>
      <stop offset="100%" stop-color="${p.secondary}"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="64" height="64" rx="8" fill="url(#g)"/>
  <rect x="0" y="0" width="64" height="64" rx="8" fill="none" stroke="#00000055" stroke-width="1"/>
  <text x="50%" y="42%" text-anchor="middle" dominant-baseline="middle" fill="#faeaca" font-family="serif" font-size="26" opacity="0.55">${p.glyph}</text>
  <text x="50%" y="76%" text-anchor="middle" dominant-baseline="middle" fill="#faeaca" font-family="serif" font-size="14" font-weight="bold">${initial}</text>
</svg>`;
}

/** Wrap SVG markup in a data URL suitable for <img src=…>. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface RegisterPlaceholderOptions {
  /** Deterministic id override for tests. */
  id?: string;
  /** Deterministic now() override for tests. */
  now?: string;
}

/**
 * Idempotent: if the ability already has ANY art asset (placeholder,
 * approved manifest, or Leonardo), do nothing.
 *
 * Two paths depending on the ability slug:
 *   - Approved manifest hit (Gate 7A: ember-cleave, aegis-ward) → register
 *     a `provider='manual'` asset with the three canonical crops from
 *     `/public/assets/abilities/approved/<slug>/`.
 *   - Otherwise → family-tinted placeholder SVG in all three crops so the
 *     Codex / Battle rail always has something readable.
 */
export async function registerPlaceholderArt(
  store: AbilityStore,
  def: AbilityDefinition,
  family: AbilityFamily | undefined,
  opts: RegisterPlaceholderOptions = {},
): Promise<CanonicalArtAsset | null> {
  const existing = store.getArtForAbility(def.id);
  if (existing) return null;

  const now = opts.now ?? new Date().toISOString();
  const approved = getApprovedArt(def.slug);

  if (approved) {
    const asset: CanonicalArtAsset = {
      id: opts.id ?? `art_${def.id}_manifest_v1`,
      abilityId: def.id,
      provider: 'manual',
      assetUrl: approved.combat.url,
      thumbnailUrl: approved.combat.thumbnailUrl,
      assets: approved,
      status: 'approved',
      createdAt: now,
    };
    await store.saveArt(asset);
    return asset;
  }

  const svg = buildPlaceholderSvg(def, family);
  const svgUrl = svgToDataUrl(svg);
  const crops: AbilityArtCrops = {
    combat: { url: svgUrl },
    detail: { url: svgUrl },
    relic: { url: svgUrl },
  };
  const asset: CanonicalArtAsset = {
    id: opts.id ?? `art_${def.id}_placeholder_v1`,
    abilityId: def.id,
    provider: 'placeholder',
    assetUrl: svgUrl,
    assets: crops,
    status: 'approved',
    createdAt: now,
  };
  await store.saveArt(asset);
  return asset;
}

/* ------------------------------------------------------------------ */
/* Leonardo path — GATED. Requires explicit per-family Raheem approval */
/* per Stage 0 decision #8. The callsite (admin panel or a CLI script)  */
/* is responsible for that approval; this function trusts the caller.   */
/* ------------------------------------------------------------------ */

export interface LeonardoArtInput {
  def: AbilityDefinition;
  version: AbilityVersion;
  family: AbilityFamily | undefined;
  /**
   * Which presentation role this generation targets — drives composition
   * hints (combat = tightly-cropped icon, detail = wider hero scene, relic =
   * ceremonial framed). Defaults to 'combat' to preserve legacy behaviour.
   */
  crop?: 'combat' | 'detail' | 'relic';
}

/**
 * Family-appropriate lighting + material accents. The previous global
 * "warm ember / forged metal / crystal" line poisoned tech / holy / nature
 * generations; each family now supplies its own atmosphere.
 */
const FAMILY_ATMOSPHERE: Record<string, string> = {
  fire:       'warm ember lighting, glowing coals and molten steel accents',
  martial:    'forged metal accents, tempered edges, disciplined stance',
  nature:     'soft dappled forest light, moss and living-wood accents',
  holy:       'clean radiant light, gilded halo accents, cathedral glow',
  necromancy: 'cold indigo underglow, bone and shadow accents, wisps of soul-smoke',
  tech:       'clean cobalt luminance, brushed alloy panels, embedded circuitry glow',
  defense:    'steady steel-blue light, tempered plating and rune-etched sigils',
  beast:      'moonlit shadows, fur and fang accents, low predatory light',
};

const DEFAULT_ATMOSPHERE = 'balanced fantasy studio lighting, painterly material accents';

/**
 * Family-specific negatives. `tech` needs "sci-fi panels" out of its
 * exclusion list or Leonardo strips the identity we're asking for. Every
 * family still excludes text, UI, borders, and card frames globally.
 */
const GLOBAL_NEGATIVES = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'multiple subjects', 'ui panels', 'border', 'card frame',
  'photo realistic', 'flat spreadsheet', 'generic clipart',
];
const FAMILY_NEGATIVES_EXTRA: Record<string, string[]> = {
  fire:       ['sci-fi panels', 'steampunk gears'],
  martial:    ['sci-fi panels', 'steampunk gears'],
  nature:     ['sci-fi panels', 'steampunk gears', 'chrome finish'],
  holy:       ['sci-fi panels', 'grimdark gore'],
  necromancy: ['sci-fi panels', 'cheerful pastels'],
  tech:       ['steampunk gears', 'medieval leather', 'wood grain'],
  defense:    ['sci-fi panels', 'steampunk gears'],
  beast:      ['sci-fi panels', 'steampunk gears', 'chrome finish'],
};

const CROP_COMPOSITION: Record<NonNullable<LeonardoArtInput['crop']>, string[]> = {
  combat: [
    'fantasy ability icon',
    'tightly cropped centered subject on subtle background',
    'strong silhouette readable at 64 pixels',
    'square 1:1 composition',
  ],
  detail: [
    'fantasy ability hero illustration',
    'medium-wide painterly scene with dramatic lighting',
    'clear focal subject with ambient environment',
    'landscape 13:10 composition, room to breathe on all sides',
  ],
  relic: [
    'ceremonial relic illustration',
    'symmetrical hero framing, subject slightly elevated within the frame',
    'iconic silhouette wreathed in atmospheric glow',
    'square 1:1 composition, ornate but subject-first',
  ],
};

/** Build the Leonardo prompt for an ability's canonical art. */
export function buildLeonardoPrompt(input: LeonardoArtInput): {
  prompt: string;
  negativePrompt: string;
} {
  const { def, family, crop = 'combat' } = input;
  const familyId = family?.id ?? 'martial';
  const familyName = family?.name ?? 'Martial';
  const themeHint = family?.visualTheme?.trim() || `${familyName} identity`;
  const tags = def.tags.length > 0 ? def.tags.join(', ') : def.role;
  const atmosphere = FAMILY_ATMOSPHERE[familyId] ?? DEFAULT_ATMOSPHERE;

  const prompt = [
    ...CROP_COMPOSITION[crop],
    'painterly digital art, premium collectible fantasy craftsmanship',
    themeHint,
    `${familyName} family motif`,
    `role: ${def.role}`,
    `tags: ${tags}`,
    def.descriptionShort,
    atmosphere,
    'no text, no UI, no borders, no card frame',
  ].join(', ');

  const negativePrompt = [
    ...GLOBAL_NEGATIVES,
    ...(FAMILY_NEGATIVES_EXTRA[familyId] ?? []),
  ].join(', ');

  return { prompt, negativePrompt };
}

export interface LeonardoResult {
  asset: CanonicalArtAsset;
  supersededId?: string;
}

/**
 * Fire Leonardo for a single ability. Callers MUST have Raheem's per-family
 * approval for the containing family before calling this. Any prior approved
 * art for the ability is marked 'replaced' so the history remains queryable.
 */
export async function generateCanonicalArt(
  store: AbilityStore,
  input: LeonardoArtInput,
  opts: RegisterPlaceholderOptions & {
    /** Optional promptVersion tag stored on the asset for audit. */
    promptVersion?: string;
  } = {},
): Promise<LeonardoResult> {
  const { prompt, negativePrompt } = buildLeonardoPrompt(input);
  const now = opts.now ?? new Date().toISOString();
  const id = opts.id ?? `art_${input.def.id}_leonardo_${Date.now()}`;

  // Mark any prior approved asset as replaced BEFORE the new call so a
  // failure mid-flight leaves the library in a clean state (prior asset
  // still queryable via history but no longer 'approved').
  const prior = store.getArtForAbility(input.def.id);
  let supersededId: string | undefined;
  if (prior && prior.status === 'approved') {
    await store.saveArt({ ...prior, status: 'replaced' });
    supersededId = prior.id;
  }

  const dataUrl = await generatePortraitStrict(prompt, negativePrompt);

  // Until the three-crop Leonardo pipeline lands (see canonical prompt
  // cleanup, Phase 6 of Gate 7A), a single generated image fills all three
  // presentation roles. Downstream consumers use getArtCrops() which is
  // safe either way.
  const singleCrop = { url: dataUrl };
  const asset: CanonicalArtAsset = {
    id,
    abilityId: input.def.id,
    provider: 'leonardo',
    sourcePromptVersion: opts.promptVersion ?? 'v1',
    assetUrl: dataUrl,
    assets: { combat: singleCrop, detail: singleCrop, relic: singleCrop },
    status: 'approved',
    createdAt: now,
  };
  await store.saveArt(asset);
  return { asset, supersededId };
}
