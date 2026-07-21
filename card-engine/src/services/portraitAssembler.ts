import type { CharacterSheet } from '../types/characterSheet';
import type { ElementName, HiddenFate } from '../types/bible';
import type { CardAbilityReference } from '../types/abilities';
import { ELEMENT_VISUAL_LANGUAGE } from '../data/elementVisualLanguage';
import { getDefinition, getCurrentVersion } from './abilities/registry';
import {
  BASE_NEGATIVE,
  PORTRAIT_PROMPT_MAX,
  NEGATIVE_PROMPT_MAX,
  ELEMENT_SPECTACLE_BY_RANK,
  ARCHETYPE_NON_HUMAN_FORMS,
  buildElementDriftBans,
  truncateToLimit,
} from './claudeApi';

/**
 * The Image Engine (2026-07-21 image/lore decoupling).
 *
 * A pure, deterministic function: CharacterSheet in, Leonardo
 * {portraitPrompt, negativePrompt} out. It reads the sheet's identity
 * substrate (hiddenFate), render context (archetype/rank/element/pose), and
 * resolved storyMotifs — and NEVER receives cardName/nameAndTitle/lore, so it
 * cannot corrupt the character while staging the picture.
 *
 * This lifts the image-assembly that used to be braided into the Claude call
 * in services/claudeApi.ts (the sexPrefix→…→elementPrefix stack plus the
 * Claude-authored portraitPrompt tail) into TypeScript. Because it is
 * deterministic it cannot drop a field, cannot fight lore it never sees, and
 * cannot re-invent identity — the three failures that dogged the monolith.
 *
 * Prototype scope: wired for Necromancer only. Vampire/Lycanthrope carry
 * archetype-specific prefixes (feral form, gothic setting, pack backdrop)
 * that still live on the legacy path; generalising those is the full-cast
 * follow-up. This assembler covers the generic + rooted-mortal + non-human
 * archetypes.
 */

const FIRE_FAMILY_ELEMENTS: readonly ElementName[] = ['Fire', 'Blood', 'Ash', 'Holy'] as const;

/**
 * Bible §Rank-continuity guardrail — appended after the identity block. Kept
 * compact (the long-form version is redundant with BASE_NEGATIVE's anti-slim /
 * anti-shirtless list) so the identity block fits the tight Leonardo budget.
 */
const BODY_PRESERVATION_CLAUSE =
  'preserve this exact body — do NOT slim, muscle-up, de-age, or reduce clothing';

/** Tier-up only — Leonardo weights early clauses heavier, so this re-locks identity. */
const IDENTITY_IMPERATIVE_CLAUSE =
  'IDENTITY IMPERATIVE — the SAME person as the previous rank: same skin tone, ' +
  'hair color and texture, ancestry, and facial structure, aged and hardened, not a look-alike';

/**
 * Archetype non-human-form strings run ~1500 chars — far too large to inline
 * into a pose/cataclysm clause within the 1450 budget. This keeps the
 * load-bearing lead (e.g. Necromancer's "SACRIFICED THEIR FLESH … TRADED for
 * BONE") and drops the rest, which the pose pool + negatives already carry.
 */
function compactForm(form: string, maxLen = 240): string {
  if (form.length <= maxLen) return form;
  const cut = form.slice(0, maxLen);
  const lastPunct = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '), cut.lastIndexOf(', '));
  return `${lastPunct > maxLen * 0.5 ? cut.slice(0, lastPunct) : cut}…`;
}

const COMPOSITION_CLOSER =
  'entire head fully in frame, eyes and forehead visible, waist-up 3/4 body composition centered';

/**
 * Compact style opener. The full STYLE_ANCHOR in claudeApi.ts is 1922 chars —
 * larger than the whole 1450-char Leonardo budget — because it was written as
 * guidance for Haiku to compress, not as a literal prefix. The deterministic
 * assembler can't paste that, so this distils its load-bearing essence:
 * painterly fantasy action, power channelling through the body (not physique
 * display), waist-up framing, and the modesty / anti-sexualization stance
 * (also hard-enforced by BASE_NEGATIVE). Kept short so identity + element +
 * composition all survive the budget.
 */
const COMPACT_STYLE_OPENER =
  'painterly fantasy action card illustration, semi-realistic, character mid-signature ' +
  'power move with the element channelling through their own body (not physique display), ' +
  'kinetic pose with cloth and hair in motion, the world reacting in the element\'s materials, ' +
  'MODEST powerful presentation — real armor / robes / coats / regalia, fully-opaque garments ' +
  'that do not cling to or emphasize chest or groin, camera at eye level, dignified composed ' +
  'expression (never sultry or seductive)';

// ---------------------------------------------------------------------------
// Prefix builders — mirror services/claudeApi.ts generateCardText post-parse
// assembly, but sourced from the sheet instead of Claude's JSON.
// ---------------------------------------------------------------------------

function buildSexPrefix(sex: string): string {
  if (!sex) return '';
  const detail =
    sex === 'female'
      ? 'Visible breasts, hip line, feminine facial features, feminine musculature. Do NOT default to a masculine warrior body.'
      : sex === 'male'
        ? 'Visible masculine features, jawline, shoulders, chest.'
        : sex === 'nonbinary' || sex === 'androgynous'
          ? 'Androgynous features, ambiguous silhouette, defying easy male/female read.'
          : 'Respect the sex written above; do not substitute.';
  return `REQUIRED SEX: ${sex}. Render clear ${sex} presentation. ${detail} `;
}

function buildAxisPrefix(diversityAxis: string): string {
  return diversityAxis
    ? `REQUIRED CHARACTER: ${diversityAxis}. This body type IS the character; do not substitute. `
    : '';
}

function buildCataclysmPrefix(sheet: CharacterSheet): string {
  if (sheet.rank !== 'Ascendant') return '';
  const form = ARCHETYPE_NON_HUMAN_FORMS[sheet.archetype];
  if (form === null) {
    return (
      'ASCENDANT CATACLYSM (Bible §Ascendant — MANDATORY): the world CRUMBLES around ' +
      'them, reality tears open, the sky shatters, the environment collapses toward the ' +
      'element. The character stays HUMAN — no wings, no tails, no bat-mist, no bone-form ' +
      '— but their POWER DISPLAY expands catastrophically THROUGH THEIR GEAR: signature ' +
      'weapons blaze with element-energy, armor reveals hidden power (runes ignited, plates ' +
      'radiating element-color from within), ancestral relics erupt with lineage-power. ' +
      'Same face + body class + skin + hair as Forged. This is cosmic transcendence ' +
      'expressed through their tools of power. '
    );
  }
  return (
    `ASCENDANT CATACLYSM (Bible §Ascendant): the world CRUMBLES around them as the ${sheet.archetype} ` +
    `transformation FULLY MANIFESTS per: ${compactForm(form, 150)}. Same person as Forged — the ` +
    'power display expands, the identity does not. '
  );
}

function buildPosePrefix(sheet: CharacterSheet): string {
  if (sheet.pose) {
    return `REQUIRED POSE: ${sheet.pose}. No T-pose, no orb-per-fist, no symmetrical arms. `;
  }
  const form = ARCHETYPE_NON_HUMAN_FORMS[sheet.archetype];
  const isRootedMortal = form === null;
  let action: string;
  if (sheet.rank === 'Ascendant') {
    // The transformation detail lives in the Ascendant cataclysm prefix above —
    // do NOT repeat the (compacted, still ~240-char) form here, or the doubled
    // text truncates the identity block. Keep the pose action short.
    action = isRootedMortal
      ? 'mid-ULTIMATE cataclysmic action — character stays HUMAN, power erupts through weapons, armor, and ancestral relics — the world CRUMBLES around them'
      : 'mid-ULTIMATE cataclysmic action — the archetype transformation from the cataclysm directive above fully manifests — the world CRUMBLES around them';
  } else if (sheet.rank === 'Forged') {
    action = isRootedMortal
      ? 'mid-signature-power-move at legendary scale — character stays HUMAN, no wings/tails/bat-mist — power manifests through their weapons (element crackling along the edge), armor (glowing runes), and ancestral relics (heirloom pieces radiating power) — environment loud in reaction'
      : `mid-signature-power-move at legendary scale — the archetype-specific transformation begins to manifest per: ${compactForm(form!)} — aura extending far beyond the body`;
  } else {
    action = 'mid-signature-move with element already erupting';
  }
  return `RANK-SCALED ACTION: ${action}. Absolutely NO T-pose, NO orb-per-fist, NO symmetrical arms — the same person from Foundation but the action escalates with rank. `;
}

function buildElementPrefix(sheet: CharacterSheet): string {
  const element = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[element];
  const isFireFamily = FIRE_FAMILY_ELEMENTS.includes(element);
  // Colors FIRST — the full assembleElementLockdown puts COLORS near the end,
  // where budget truncation deletes them. This compact, colors-first clause
  // guarantees the element palette (the single most important element cue)
  // always survives, then adds materials + motion.
  const compactLockdown =
    `colors ${v.primaryColors}, ${v.secondaryColors}; materials ${v.materials}; motion ${v.motion}`;
  // Anti-fire lock LEADS the element clause (not trails it) so it survives
  // truncation — Void/Shadow/etc. Necromancers must never render fire.
  const nonFire = !isFireFamily
    ? `ZERO connection to fire — NO warm ember, NO orange, everything in the ${element} palette. `
    : '';
  const continuity = sheet.isEvolution
    ? `RANK CONTINUITY: same ${element} palette, materials, and lighting as Foundation — do NOT drift to warm ember or fire-orange. `
    : '';
  return `REQUIRED ELEMENT (${element}): ${nonFire}${compactLockdown}. ${continuity}`;
}

// ---------------------------------------------------------------------------
// Tail builders — replace the Claude-authored portraitPrompt with a template.
// ---------------------------------------------------------------------------

/**
 * The identity ANCHORS only — the eight Bible §Rank-continuity locked fields
 * plus the preservation guardrail (and, on tier-up, the imperative re-lock).
 * Wardrobe is a SEPARATE, lower-priority segment (buildWardrobeClause) so that
 * for a maximally-detailed character the body/skin/scars anchors and the
 * element colors always survive the budget ahead of exact garment names.
 */
function buildIdentityBlock(sheet: CharacterSheet): string {
  const f = sheet.hiddenFate;
  // Order matters under truncation: the Bible §Rank-continuity "never remove"
  // fields (disability, scars) come BEFORE facial/hair so they survive a tight
  // Ascendant budget — "disability removed" / "scars erased" are hard rejects.
  const identityParts = [
    f.age,
    f.sex,
    f.bodyType,
    f.skinTone,
    f.disabilityOrCondition,
    f.scars,
    f.facialStructure,
    f.hair,
  ].filter((s) => s && s.trim().length > 0);
  let block = `SAME PERSON RULE: ${identityParts.join(', ')}. ${BODY_PRESERVATION_CLAUSE}`;
  if (sheet.isEvolution) block += `. ${IDENTITY_IMPERATIVE_CLAUSE}`;
  return block;
}

function buildWardrobeClause(f: HiddenFate): string {
  const fashion = f.fashion;
  if (!fashion) return '';
  const pieces: string[] = [];
  if (fashion.primaryGarment) pieces.push(`wearing ${fashion.primaryGarment}`);
  if (fashion.armor) pieces.push(`armored in ${fashion.armor}`);
  if (fashion.outerLayer) pieces.push(`${fashion.outerLayer} over the shoulders`);
  if (fashion.footwear) pieces.push(fashion.footwear);
  if (fashion.signatureAccessory) pieces.push(fashion.signatureAccessory);
  const hair = f.hairDetail;
  if (hair && (hair.texture || hair.color || hair.style)) {
    pieces.push(`${hair.texture} ${hair.color} hair ${hair.style}`.replace(/\s+/g, ' ').trim());
  }
  return pieces.join(', ');
}

function buildAbilitySpectacle(refs: readonly CardAbilityReference[]): string {
  if (!refs || refs.length === 0) return '';
  const signatures: string[] = [];
  for (const ref of refs) {
    const def = getDefinition(ref.abilityId);
    if (!def) continue;
    const version = getCurrentVersion(ref.abilityId);
    const effectSummary = version?.effects.map((e) => e.type.replace(/_/g, ' ')).join(', ') ?? '';
    signatures.push(`${def.displayName} (${def.descriptionShort}${effectSummary ? `; ${effectSummary}` : ''})`);
  }
  if (signatures.length === 0) return '';
  return `the character's abilities manifest visibly in the pose and effects: ${signatures.join('; ')}`;
}

function buildEnvironmentClause(f: HiddenFate): string {
  const parts = [f.weather, f.lighting, f.environmentDetails].filter((s) => s && s.trim().length > 0);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// Negative prompt — mirrors the deterministic negative assembly in claudeApi.
// ---------------------------------------------------------------------------

function buildNegativePrompt(sheet: CharacterSheet): string {
  const element = sheet.resolvedElement;
  const isFireFamily = FIRE_FAMILY_ELEMENTS.includes(element);
  const warmGlowNegatives = isFireFamily
    ? ''
    : ', ember-red glow, warm ember lighting, orange rim light, fire aura, warm orange highlights, burning ember effect, glowing coals, molten glow, heat shimmer, flame-lit surface, ember-red inner glow, warm ember on armor';
  const elementDriftBans = sheet.isEvolution ? buildElementDriftBans(element) : '';
  // Drift bans lead — the most targeted fix — so they survive truncation.
  const appendedTails = elementDriftBans + warmGlowNegatives;
  const base = truncateToLimit(
    BASE_NEGATIVE,
    Math.max(NEGATIVE_PROMPT_MAX - appendedTails.length, 120),
  );
  return truncateToLimit(base + appendedTails, NEGATIVE_PROMPT_MAX);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface AssembledPortrait {
  portraitPrompt: string;
  negativePrompt: string;
}

/**
 * Deterministically assemble the Leonardo portrait + negative prompt from a
 * CharacterSheet. Pure — no I/O, no Claude, no randomness (any per-forge
 * variety — pose, diversity axis — was already resolved into the sheet by
 * the caller). Same sheet in ⇒ same prompt out, every time.
 */
export function assemblePortraitPrompt(sheet: CharacterSheet): AssembledPortrait {
  // Segments in PRIORITY order. Leonardo weights early tokens heavier and
  // truncation drops from the end, so order == importance. Identity sits
  // AHEAD of the verbose element lockdown so Bible §Rank-continuity anchors
  // always survive; the element's redundant AVOID tail (also covered by the
  // negatives) is what gets cut for long-lockdown elements, not the person.
  const segments = [
    buildSexPrefix(sheet.hiddenFate.sex), // M5.0 — sex first, highest weight
    buildAxisPrefix(sheet.diversityAxis),
    buildCataclysmPrefix(sheet),
    buildPosePrefix(sheet),
    buildIdentityBlock(sheet), // anchors — must survive
    buildElementPrefix(sheet), // element accuracy (anti-fire + colors first)
    buildWardrobeClause(sheet.hiddenFate), // locked garb — after anchors + colors
    // Story-specific detail is prioritised over the generic style/spectacle
    // fill — it is the lore→image handoff the decoupling exists to carry.
    sheet.storyMotifs.length > 0
      ? `story details woven into the frame: ${sheet.storyMotifs.join(', ')}`
      : '',
    ELEMENT_SPECTACLE_BY_RANK[sheet.rank],
    buildAbilitySpectacle(sheet.abilityRefs),
    buildEnvironmentClause(sheet.hiddenFate),
    COMPACT_STYLE_OPENER,
  ].filter((s) => s && s.trim().length > 0);

  // Reserve the composition closer so the head-in-frame anchor ALWAYS lands,
  // no matter how verbose the element/identity ahead of it.
  const reserved = `, ${COMPOSITION_CLOSER}`;
  const body = truncateToLimit(segments.join(', '), PORTRAIT_PROMPT_MAX - reserved.length);

  return {
    portraitPrompt: `${body}${reserved}`,
    negativePrompt: buildNegativePrompt(sheet),
  };
}
