import type {
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { generatePortraitStrict } from '../leonardoApi';

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
 * Idempotent: if the ability already has ANY art asset (placeholder or
 * Leonardo), do nothing. This lets the seed pass run every session without
 * clobbering a real Leonardo asset that landed later.
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
  const id = opts.id ?? `art_${def.id}_placeholder_v1`;
  const svg = buildPlaceholderSvg(def, family);
  const asset: CanonicalArtAsset = {
    id,
    abilityId: def.id,
    provider: 'placeholder',
    assetUrl: svgToDataUrl(svg),
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
}

/** Build the Leonardo prompt for an ability's canonical art. */
export function buildLeonardoPrompt(input: LeonardoArtInput): {
  prompt: string;
  negativePrompt: string;
} {
  const { def, family } = input;
  const familyName = family?.name ?? 'martial';
  const themeHint = family?.visualTheme?.trim() || `${familyName} identity`;
  const tags = def.tags.length > 0 ? def.tags.join(', ') : def.role;

  // Anchored on the approved Figma benchmark direction — forged fantasy
  // iconography, painterly digital art, centered subject at 64px combat scale.
  const prompt = [
    'fantasy ability icon, painterly digital art, centered subject on subtle background',
    themeHint,
    `${familyName} family motif`,
    `role: ${def.role}`,
    `tags: ${tags}`,
    def.descriptionShort,
    'strong silhouette, small-size readable, premium collectible fantasy craftsmanship',
    'warm ember lighting, forged metal accents, embedded crystal detail',
    'no text, no UI, no borders, no card frame',
  ].join(', ');

  const negativePrompt = [
    'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
    'multiple subjects', 'ui panels', 'border', 'card frame',
    'photo realistic', 'sci-fi panels', 'steampunk gears',
    'flat spreadsheet', 'generic clipart',
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

  const asset: CanonicalArtAsset = {
    id,
    abilityId: input.def.id,
    provider: 'leonardo',
    sourcePromptVersion: opts.promptVersion ?? 'v1',
    assetUrl: dataUrl,
    status: 'approved',
    createdAt: now,
  };
  await store.saveArt(asset);
  return { asset, supersededId };
}
