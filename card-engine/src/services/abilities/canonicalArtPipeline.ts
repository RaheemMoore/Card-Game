import type {
  AbilityArtCrops,
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { generatePortraitStrict } from '../leonardoApi';
import { getApprovedArt, APPROVED_ABILITY_ART } from '../../data/abilities/visualManifest';

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
 * Two paths depending on the ability slug:
 *   - Approved manifest hit (Gate 7A: ember-cleave, aegis-ward) → register
 *     a `provider='manual'` asset with the three canonical crops from
 *     `/public/assets/abilities/approved/<slug>/`. Backfills stale
 *     `provider='placeholder'` rows on already-seeded accounts.
 *   - Otherwise → family-tinted placeholder SVG in all three crops so the
 *     Codex / Battle rail always has something readable.
 *
 * Idempotent for the placeholder branch, and for manifest hits whose row
 * is already up-to-date. Skips if a real Leonardo asset has landed since.
 */
export async function registerPlaceholderArt(
  store: AbilityStore,
  def: AbilityDefinition,
  family: AbilityFamily | undefined,
  opts: RegisterPlaceholderOptions = {},
): Promise<CanonicalArtAsset | null> {
  const existing = store.getArtForAbility(def.id);
  const now = opts.now ?? new Date().toISOString();
  const approved = getApprovedArt(def.slug);

  if (approved) {
    // Skip the write when the existing row is already the approved manifest
    // asset (idempotent). Also skip when a real Leonardo asset has landed
    // — don't clobber post-manifest generations.
    const alreadyManifest =
      existing?.provider === 'manual' &&
      existing.assets?.combat.url === approved.combat.url &&
      existing.assets?.detail.url === approved.detail.url &&
      existing.assets?.relic.url === approved.relic.url;
    if (alreadyManifest) return null;
    if (existing?.provider === 'leonardo') return null;

    // Otherwise write / backfill. Keep the same asset id when upgrading a
    // placeholder so the Supabase row updates in place instead of creating
    // an orphan.
    const asset: CanonicalArtAsset = {
      id: opts.id ?? existing?.id ?? `art_${def.id}_manifest_v1`,
      abilityId: def.id,
      provider: 'manual',
      assetUrl: approved.combat.url,
      thumbnailUrl: approved.combat.thumbnailUrl,
      assets: approved,
      status: 'approved',
      createdAt: existing?.createdAt ?? now,
    };
    await store.saveArt(asset);
    return asset;
  }

  if (existing) return null;

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

/**
 * Idempotent backfill for the approved manifest. Walks every slug in
 * APPROVED_ABILITY_ART, finds the matching definition, and upgrades its
 * art row to `provider='manual'` with the three canonical crops.
 *
 * Runs on every app boot (see PersistenceGate) — critical for accounts
 * that had definitions seeded BEFORE Gate 7A landed, where the ordinary
 * seed pass is skipped because `getAllDefinitions().length !== 0`. Safe:
 * skips rows that already match, skips rows that have been superseded
 * by a Leonardo asset, and swallows admin-write RLS rejections silently.
 */
export interface BackfillResult {
  upgraded: number;
  skipped: number;
  errors: number;
}

export async function backfillApprovedArt(store: AbilityStore): Promise<BackfillResult> {
  const result: BackfillResult = { upgraded: 0, skipped: 0, errors: 0 };
  const defs = store.getAllDefinitions();
  for (const slug of Object.keys(APPROVED_ABILITY_ART)) {
    const def = defs.find((d) => d.slug === slug);
    if (!def) {
      result.skipped++;
      continue;
    }
    const family = def.familyIds[0] ? store.getFamily(def.familyIds[0]) : undefined;
    try {
      const written = await registerPlaceholderArt(store, def, family);
      if (written) result.upgraded++;
      else result.skipped++;
    } catch (err) {
      // Non-admin sessions can't write library rows — RLS rejects. That's
      // fine; an admin session (or a subsequent migration) will heal it.
      result.errors++;
      // eslint-disable-next-line no-console
      console.info(`[abilities] approved-art backfill skipped for ${slug}:`, err);
    }
  }
  return result;
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
 * Family-appropriate lighting + material accents. Rewritten to derive from
 * the Element Visual Language Bible (Raheem 2026-07-19) so ability art
 * uses the same locked palette / lighting / materials as character art.
 * The specific phrase "warm ember lighting" was removed — Raheem flagged
 * it globally as leaking into non-fire generations.
 */
const FAMILY_ATMOSPHERE: Record<string, string> = {
  fire:       'red-orange-yellow flame, licking-tongue texture, heat shimmer, ember particles, curling smoke; lava / magma / burning wood / obsidian materials; bright core with dark outer edges; sky tinged red-orange',
  martial:    'clean neutral studio light, forged metal accents, tempered edges, disciplined stance, no elemental glow',
  nature:     'sunbeams and dappled canopy light, vivid forest greens and earth brown, bark / roots / vines / moss materials, growing organic shapes',
  holy:       'radiant gold and white radiance, sacred fire and feathery light, ivory silk and gold-thread materials, halo-crowned symmetrical composition',
  necromancy: 'pale blue and ghost-white spirit-glow, translucent wispy ethereal texture, cool low-key contrast, veil-cloth and ectoplasm materials',
  tech:       'circuit-cyan and hologram-teal underglow, brushed alloy panels, embedded circuitry, HUD light, geometric hard-edge shapes',
  defense:    'steady steel-blue light, tempered plating and rune-etched sigils, brushed metal texture, no elemental glow',
  beast:      'moonlit shadow and natural sun/moon light, tawny brown / forest green / bone white palette, fur / sinew / tooth / claw / hide materials, no magical glow — feral physical energy only',
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
 * approval for the containing family before calling this.
 *
 * Phase 4 lifecycle fix: the prior 'approved' asset is left untouched.
 * The new asset lands as 'candidate' and must be explicitly promoted via
 * promoteCandidateArt() before it becomes 'approved'. A failed Leonardo
 * call therefore leaves the library exactly as it was.
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

  // Snapshot the currently approved asset only for reporting — do NOT
  // mutate it before the Leonardo call. Callers still need the ID so
  // reviewers can compare candidate vs current.
  const prior = store.getArtForAbility(input.def.id);
  const supersededId = prior && prior.status === 'approved' ? prior.id : undefined;

  const { dataUrl } = await generatePortraitStrict(prompt, negativePrompt);

  const singleCrop = { url: dataUrl };
  const asset: CanonicalArtAsset = {
    id,
    abilityId: input.def.id,
    provider: 'leonardo',
    sourcePromptVersion: opts.promptVersion ?? 'v1',
    assetUrl: dataUrl,
    assets: { combat: singleCrop, detail: singleCrop, relic: singleCrop },
    status: 'candidate',
    createdAt: now,
  };
  await store.saveArt(asset);
  return { asset, supersededId };
}

/**
 * Human-approves a candidate art asset. Atomically flips the candidate
 * to 'approved' and the prior approved (if any) to 'replaced', preserving
 * both in art history. Returns the new approved asset for callers that
 * want to refresh caches.
 */
export async function promoteCandidateArt(
  store: AbilityStore,
  candidateId: string,
): Promise<CanonicalArtAsset> {
  const found = findArtById(store, candidateId);
  if (!found) throw new Error(`Candidate art ${candidateId} not found`);
  if (found.status !== 'candidate') {
    throw new Error(`Cannot promote art ${candidateId} — status is ${found.status}, expected candidate`);
  }
  const prior = store.getArtForAbility(found.abilityId);
  if (prior && prior.status === 'approved' && prior.id !== found.id) {
    await store.saveArt({ ...prior, status: 'replaced' });
  }
  const approved: CanonicalArtAsset = { ...found, status: 'approved' };
  await store.saveArt(approved);
  return approved;
}

/**
 * Rejects a candidate — leaves the prior approved asset untouched and
 * marks the candidate 'rejected' so it stays queryable in art history.
 */
export async function rejectCandidateArt(
  store: AbilityStore,
  candidateId: string,
): Promise<CanonicalArtAsset> {
  const found = findArtById(store, candidateId);
  if (!found) throw new Error(`Candidate art ${candidateId} not found`);
  if (found.status !== 'candidate') {
    throw new Error(`Cannot reject art ${candidateId} — status is ${found.status}, expected candidate`);
  }
  const rejected: CanonicalArtAsset = { ...found, status: 'rejected' };
  await store.saveArt(rejected);
  return rejected;
}

function findArtById(store: AbilityStore, artId: string): CanonicalArtAsset | undefined {
  // No direct getter on AbilityStore; scan getAllArt() which every impl
  // exposes for the review UI.
  return store.getAllArt().find((a) => a.id === artId);
}
