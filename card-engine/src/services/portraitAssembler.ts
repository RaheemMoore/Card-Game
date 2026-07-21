import type { CharacterSheet } from '../types/characterSheet';
import type { ElementName, HiddenFate } from '../types/bible';
import type { CardAbilityReference } from '../types/abilities';
import { assembleElementLockdown } from '../data/elementVisualLanguage';
import { getDefinition, getCurrentVersion } from './abilities/registry';
import {
  STYLE_ANCHOR,
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

/** Bible §Rank-continuity guardrail — appended verbatim after the identity block. */
const BODY_PRESERVATION_CLAUSE =
  'this body is preserved as written, do NOT substitute a slim young hero body, ' +
  'do NOT remove or reduce clothing, do NOT slim or muscle-up or de-age this ' +
  'character, action does NOT mean shirtless or bodybuilder anatomy';

/** Tier-up only — Leonardo weights early clauses heavier, so this re-locks identity. */
const IDENTITY_IMPERATIVE_CLAUSE =
  'IDENTITY IMPERATIVE — same character as the previous rank: same skin tone ' +
  '(do NOT lighten, do NOT darken, do NOT shift undertone), same hair color and ' +
  'texture (do NOT restyle to a different color, may show age-silvering only), ' +
  'same ethnicity and ancestry cues, same facial structure and eye color. This ' +
  'is a portrait of the SAME PERSON aged and hardened, not a similar-looking one';

const COMPOSITION_CLOSER =
  'entire head fully in frame, eyes and forehead visible, waist-up 3/4 body composition centered';

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
    `ASCENDANT CATACLYSM (Bible §Ascendant — MANDATORY) for ${sheet.archetype}: the world ` +
    'CRUMBLES around them, reality tears open, the sky shatters, the environment collapses ' +
    `toward the element. The archetype-specific transformation FULLY MANIFESTS per: ${form}. ` +
    'Same face + body class + skin + hair as Forged (Bible §Rank continuity) but the ' +
    'transformation is complete and the power display expands catastrophically. This is NOT a ' +
    "Forged card with slight variation — this is the archetype's canonical cosmic transcendence. "
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
    action = isRootedMortal
      ? 'mid-ULTIMATE cataclysmic action — character stays HUMAN, power erupts through weapons, armor, and ancestral relics — the world CRUMBLES around them'
      : `mid-ULTIMATE cataclysmic action — the archetype-specific transformation fully manifests per: ${form} — the world CRUMBLES around them — reality tearing open — Bible §Ascendant CATACLYSM`;
  } else if (sheet.rank === 'Forged') {
    action = isRootedMortal
      ? 'mid-signature-power-move at legendary scale — character stays HUMAN, no wings/tails/bat-mist — power manifests through their weapons (element crackling along the edge), armor (glowing runes), and ancestral relics (heirloom pieces radiating power) — environment loud in reaction'
      : `mid-signature-power-move at legendary scale — the archetype-specific transformation begins to manifest per: ${form} — aura extending far beyond the body — environment loud in reaction`;
  } else {
    action = 'mid-signature-move with element already erupting';
  }
  return `RANK-SCALED ACTION: ${action}. Absolutely NO T-pose, NO orb-per-fist, NO symmetrical arms — the same person from Foundation but the action escalates with rank. `;
}

function buildElementPrefix(sheet: CharacterSheet): string {
  const element = sheet.resolvedElement;
  const isFireFamily = FIRE_FAMILY_ELEMENTS.includes(element);
  const nonFireCatchAll = !isFireFamily
    ? `This character has ZERO connection to fire. NO warm-glow armor. NO ember on the plates. NO orange highlights on the gear. NO fire-lit skin. Everything is ${element} palette — see the element lockdown above. If you see fire anywhere in the frame, you have failed this Bible. `
    : '';
  const continuity = sheet.isEvolution
    ? `RANK CONTINUITY: this character's element visual at Foundation was ${element} with LOCKED palette, materials, and lighting per the Element Visual Language Bible. At ${sheet.rank} the SAME palette + SAME materials + SAME lighting persist — do NOT drift toward Phoenix defaults, warm ember, or fire-orange. ${nonFireCatchAll}`
    : nonFireCatchAll;
  return `REQUIRED ELEMENT (${element}): ${assembleElementLockdown(element)}. ${continuity}`;
}

// ---------------------------------------------------------------------------
// Tail builders — replace the Claude-authored portraitPrompt with a template.
// ---------------------------------------------------------------------------

function buildIdentityBlock(sheet: CharacterSheet): string {
  const f = sheet.hiddenFate;
  const identityParts = [
    f.age,
    f.sex,
    f.bodyType,
    f.skinTone,
    f.facialStructure,
    f.hair,
    f.disabilityOrCondition,
    f.scars,
  ].filter((s) => s && s.trim().length > 0);
  let block = `SAME PERSON RULE: ${identityParts.join(', ')}`;

  const wardrobe = buildWardrobeClause(f);
  if (wardrobe) block += `, ${wardrobe}`;

  block += `. ${BODY_PRESERVATION_CLAUSE}`;
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
  const sexPrefix = buildSexPrefix(sheet.hiddenFate.sex);
  const axisPrefix = buildAxisPrefix(sheet.diversityAxis);
  const cataclysmPrefix = buildCataclysmPrefix(sheet);
  const posePrefix = buildPosePrefix(sheet);
  const elementPrefix = buildElementPrefix(sheet);

  const tail = [
    STYLE_ANCHOR,
    buildIdentityBlock(sheet),
    ELEMENT_SPECTACLE_BY_RANK[sheet.rank],
    buildAbilitySpectacle(sheet.abilityRefs),
    sheet.storyMotifs.length > 0
      ? `story details woven into the frame: ${sheet.storyMotifs.join(', ')}`
      : '',
    buildEnvironmentClause(sheet.hiddenFate),
    COMPOSITION_CLOSER,
  ]
    .filter((s) => s && s.trim().length > 0)
    .join(', ');

  const raw = `${sexPrefix}${axisPrefix}${cataclysmPrefix}${posePrefix}${elementPrefix}${tail}`;
  return {
    portraitPrompt: truncateToLimit(raw, PORTRAIT_PROMPT_MAX),
    negativePrompt: buildNegativePrompt(sheet),
  };
}
