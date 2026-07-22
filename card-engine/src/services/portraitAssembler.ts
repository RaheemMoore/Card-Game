import type { CharacterSheet } from '../types/characterSheet';
import type { ArchetypeName } from '../types/card';
import type { ElementName } from '../types/bible';
import type { CardAbilityReference } from '../types/abilities';
import { ELEMENT_VISUAL_LANGUAGE } from '../data/elementVisualLanguage';
import { getEnvironmentDescriptor } from '../data/archetypeEnvironments';
import { hookPosePrefix, hookMandatorySegment, hookNarrativeAnchor } from './portrait/archetypeHooks';
import { getDefinition, getCurrentVersion } from './abilities/registry';
import {
  BASE_NEGATIVE,
  PORTRAIT_PROMPT_MAX,
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
 * Bare-chest gate (Raheem 2026-07-21, refined): a bare male chest may render
 * ONLY at the Ascendant peak, and even then only ~20% of the time — "it's cool
 * sometimes," not a default. Women stay covered at every rank. The 20% is rolled
 * ONCE and LOCKED onto hiddenFate (bareChestRoll) at Foundation so a regen does
 * not flip-flop the render. This gate simply reads that locked roll.
 */
function allowsBareChest(sheet: CharacterSheet): boolean {
  return (
    sheet.rank === 'Ascendant' &&
    sheet.hiddenFate.sex === 'male' &&
    sheet.hiddenFate.bareChestRoll === true
  );
}

/**
 * Bible §Rank-continuity guardrail — appended after the identity block. Kept
 * compact (the long-form version is redundant with BASE_NEGATIVE's anti-slim /
 * anti-shirtless list) so the identity block fits the tight Leonardo budget.
 * The "reduce clothing" ban is dropped in the bare-chest-allowed branch so it
 * doesn't fight the open-robe cue.
 */
const BODY_PRESERVATION_CLAUSE =
  'preserve this exact body — do NOT slim, muscle-up, de-age, or reduce clothing';
const BODY_PRESERVATION_CLAUSE_BARE =
  'preserve this exact body — do NOT slim, muscle-up, or de-age';

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
const COMPACT_STYLE_LEAD =
  'painterly fantasy action card art, mid-action pose (never a static portrait), cloth and hair ' +
  'in motion, cinematic lighting';

// Per-archetype style override. Druid alone renders PHOTOREAL (Raheem
// 2026-07-21: "real skin textures unlike the painted fantasy feel of the other
// cards"). Applied at EVERY rank (not just Foundation) so Character Reference
// skin-rendering stays coherent across a tier-up.
// Kept close to COMPACT_STYLE_LEAD's length (~122) so the weapon + environment
// still fit the 1450 budget — the load-bearing signal is "photoreal skin", not
// a verbose material list (materials are covered by the render + wardrobe).
const DRUID_STYLE_LEAD =
  'PHOTOREALISTIC render, real skin texture with visible pores and subsurface detail, ' +
  'naturalistic forest lighting, lifelike materials, mid-action pose (never static), hair in motion';

function styleLeadFor(archetype: ArchetypeName): string {
  return archetype === 'Druid' ? DRUID_STYLE_LEAD : COMPACT_STYLE_LEAD;
}

const MODESTY_STYLE_TAIL =
  'MODEST powerful presentation — real armor / robes / coats / regalia, fully-opaque garments ' +
  'that do not cling to or emphasize chest or groin, camera at eye level, dignified composed ' +
  'expression (never sultry or seductive)';

// Ascendant-male bare-chest variant: chest may be bared, but groin stays covered
// and the expression is still dignified (never sexualized).
const MODESTY_STYLE_TAIL_BARE =
  'MODEST powerful presentation — real armor / robes / coats / regalia, lower body and groin ' +
  'fully covered and never emphasized, camera at eye level, dignified composed heroic ' +
  'expression (never sultry or seductive)';

// ---------------------------------------------------------------------------
// Prefix builders — mirror services/claudeApi.ts generateCardText post-parse
// assembly, but sourced from the sheet instead of Claude's JSON.
// ---------------------------------------------------------------------------

/** First comma-clause of a verbose hiddenFate field, capped — keeps the
 *  identity lead tight so element + background + pose all fit the budget. */
function firstClause(s: string | undefined, max = 52): string {
  if (!s) return '';
  const c = s.split(',')[0].trim();
  return c.slice(0, max);
}

function buildSexPrefix(sex: string): string {
  if (!sex) return '';
  const detail =
    sex === 'female'
      ? 'clearly female, feminine face and build'
      : sex === 'male'
        ? 'clearly male, masculine face and build'
        : sex === 'nonbinary' || sex === 'androgynous'
          ? 'androgynous, ambiguous male/female read'
          : 'as written';
  return `${sex} character (${detail})`;
}

function buildPosePrefix(sheet: CharacterSheet): string {
  if (sheet.pose) {
    return `REQUIRED POSE: ${sheet.pose}. No T-pose, no orb-per-fist, no symmetrical arms. `;
  }
  const form = ARCHETYPE_NON_HUMAN_FORMS[sheet.archetype];
  const isRootedMortal = form === null;
  // Weapon-forward on tier-up: the locked weapon VANISHED at Forged/Ascended
  // because the fallback action was transformation-only. Lead every tier-up
  // action with using the weapon so it always renders (the weapon clause below
  // carries the exact silhouette).
  const weaponLead = sheet.weapon ? 'clearly WIELDING their weapon mid-strike, ' : '';
  let action: string;
  if (sheet.rank === 'Ascendant') {
    // Ascendant escalation WITHOUT "world crumbles" (cataclysm removed — it drove
    // Leonardo off-path). Peak power = the transformation + element at maximum.
    action = isRootedMortal
      ? `${weaponLead}mid-ULTIMATE signature attack at absolute peak power — character stays HUMAN, power erupting through their weapon, armor, and ancestral relics at maximum scale`
      : `${weaponLead}mid-ULTIMATE signature attack at absolute peak power — the archetype transformation fully manifests per: ${compactForm(form!)}`;
  } else if (sheet.rank === 'Forged') {
    action = isRootedMortal
      ? `${weaponLead}mid-signature-power-move at legendary scale — character stays HUMAN, no wings/tails/bat-mist — power manifests through their weapons (element crackling along the edge), armor (glowing runes), and ancestral relics (heirloom pieces radiating power) — environment loud in reaction`
      : `${weaponLead}mid-signature-power-move at legendary scale — the archetype-specific transformation begins to manifest per: ${compactForm(form!)} — aura extending far beyond the body`;
  } else {
    action = `${weaponLead}mid-signature-move with element already erupting`;
  }
  return `RANK-SCALED ACTION: ${action}. Absolutely NO T-pose, NO orb-per-fist, NO symmetrical arms — the same person from Foundation but the action escalates with rank. `;
}

function buildElementPrefix(sheet: CharacterSheet): string {
  const element = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[element];
  const isFireFamily = FIRE_FAMILY_ELEMENTS.includes(element);
  // Manifestation-forward AND rank-scaled: the element must DOMINATE the frame
  // at every tier, growing with rank. At Forged/Ascendant the element was
  // vanishing entirely (the tier-up prompt let it get out-competed), so it now
  // scales up and carries its OWN lighting so the scene can't drift to daylight.
  const scale =
    sheet.rank === 'Ascendant'
      ? 'at CATACLYSMIC MAXIMUM, the whole scene collapsing into the element'
      : sheet.rank === 'Forged'
        ? 'escalating dramatically, extending far beyond the body'
        : 'erupting';
  const nonFire = !isFireFamily ? ` ZERO fire, NO warm ember/orange.` : '';
  return (
    `ELEMENT SPECTACLE — ${element} power VISIBLY ${scale} from the character; the environment REACTS ` +
    `(this element MUST DOMINATE the frame): ${firstClause(v.motion, 80)}; lighting ` +
    `${firstClause(v.lighting, 64)}; only in ${element} colors ${v.primaryColors}.${nonFire}`
  );
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
  // COMPACT identity lead — first-clause of each field so the whole subject
  // description stays ~150 chars, leaving budget for element + background +
  // pose. Ancestry (skin) + body mass + age lead; the "never remove" fields
  // (disability, scars) come before facial/hair so they survive truncation.
  const parts = [
    firstClause(f.skinTone), // ancestry first — the anti-white-default anchor
    firstClause(f.bodyType),
    f.age,
    firstClause(f.disabilityOrCondition),
    firstClause(f.scars),
    firstClause(f.facialStructure),
    firstClause(f.hair),
  ].filter((s) => s && s.trim().length > 0);
  // Note: the tier-up IDENTITY_IMPERATIVE re-lock is a SEPARATE low-priority
  // segment (not appended here) so the core anchors + weapon survive a tight
  // Ascendant budget; continuity is also carried by the init-image on tier-up.
  const preservation = allowsBareChest(sheet) ? BODY_PRESERVATION_CLAUSE_BARE : BODY_PRESERVATION_CLAUSE;
  return `SUBJECT (hold this exact person): ${parts.join(', ')}. ${preservation}`;
}

function buildWardrobeClause(sheet: CharacterSheet): string {
  const fashion = sheet.hiddenFate.fashion;
  if (!fashion) return '';
  // Ascendant-male bare-chest branch: the outer layer is worn OPEN over a bare
  // chest, so we describe the parted outer layer + armor/regalia (never a closed
  // chest garment) — the open-robe positive cue in the segment stack does the
  // rest. Groin/lower body stays covered via MODESTY_STYLE_TAIL_BARE.
  if (allowsBareChest(sheet)) {
    const pieces: string[] = [];
    if (fashion.outerLayer) pieces.push(`a ${fashion.outerLayer} worn open over the shoulders`);
    else if (fashion.primaryGarment) pieces.push(`a ${fashion.primaryGarment} worn open`);
    if (fashion.armor) pieces.push(`shoulder and forearm pieces of ${fashion.armor}`);
    if (pieces.length === 0) return '';
    return `wearing ${pieces.join(', ')}, chest bared beneath the open layer`;
  }
  // Covered case — only the coverage-critical layers (footwear/accessory/hair
  // are dropped so the specific BACKGROUND still fits after this on a
  // maximally-detailed character). Leads with a hard coverage cue (the model
  // strips fit torsos otherwise, negatives notwithstanding).
  const pieces: string[] = [];
  if (fashion.primaryGarment) pieces.push(`wearing ${fashion.primaryGarment}`);
  if (fashion.armor) pieces.push(`armored in ${fashion.armor}`);
  if (fashion.outerLayer) pieces.push(`${fashion.outerLayer} over the shoulders`);
  if (pieces.length === 0) return '';
  return `dressed in ${pieces.join(', ')}`;
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

/**
 * ELEMENT SCENE PALETTE — placed FIRST so it survives truncation and sets the
 * whole scene's colour + power level. It is RANK-SCALED with a deliberately
 * WIDE spread (Raheem 2026-07-21): Foundation is intentionally restrained/local
 * so Forged and Ascended have real room to grow — the three tiers were reading
 * as copies because Foundation was already maxed out. The element is ALWAYS
 * present (never absent), but its DOMINANCE climbs with rank. Aligns with the
 * reference docs (Tier I functional/restrained → Tier II proven → Tier III
 * mythic). Skin tone is explicitly protected from the element tint.
 */
function buildElementScenePalette(sheet: CharacterSheet): string {
  const v = ELEMENT_VISUAL_LANGUAGE[sheet.resolvedElement];
  const el = sheet.resolvedElement;
  // When companions are present the overwhelming element must radiate from the
  // character rather than CONSUME the whole frame, or the background legion has
  // no room to render (observed: Ascendant vortex crowded the legion out).
  const hasCompanions = Boolean(sheet.companion && sheet.companion.trim());
  const power =
    sheet.rank === 'Ascendant'
      ? hasCompanions
        ? `OVERWHELMING POWER — ${el} radiating from and around the character at mythic scale (the background stays readable behind them)`
        : `OVERWHELMING POWER — the whole scene consumed by ${el} at mythic cataclysmic scale`
      : sheet.rank === 'Forged'
        ? `ESCALATING POWER — ${el} strong around the character, spreading and more violent`
        : `EARLY RESTRAINED POWER — ${el} clearly present but CONTAINED, an intimate local scene`;
  return (
    `SCENE — ${power}; rendered in ${el} colours ${v.primaryColors}; ${firstClause(v.atmosphere, 50)}; ` +
    `NO neutral/washed-out background; the character's skin stays its TRUE colour, never greyed or desaturated`
  );
}

function buildCompanionClause(sheet: CharacterSheet): string {
  if (!sheet.companion || !sheet.companion.trim()) return '';
  // Subordinate + background per env doc §2.1 — companions must never compete
  // with the hero silhouette. Rank-scaling (none → few → legion) is already
  // baked into the phrase by companionPresence() at the caller.
  return `BACKGROUND COMPANIONS (behind and smaller than the character, out of focus, subordinate — NEVER a second main figure): ${sheet.companion}`;
}

function buildWeaponClause(sheet: CharacterSheet): string {
  if (!sheet.weapon || !sheet.weapon.trim()) return '';
  // The weapon is a defining silhouette — placed with the pose so the action
  // reads as USING it. §4.4: never "the same sword with a different glow". The
  // weapon is wreathed in the element so it CARRIES the element instead of
  // competing with it for the frame.
  return `WEAPON (held and in use, defining silhouette): ${sheet.weapon}, wreathed in visible ${sheet.resolvedElement} energy`;
}

function buildBackgroundClause(sheet: CharacterSheet): string {
  const f = sheet.hiddenFate;
  // Prefer the curated per-archetype environment family (locked at Foundation,
  // rank-scaled) when one is set; fall back to the Claude-authored scene fields
  // for legacy cards / archetypes without an environment pool.
  const curated = f.environmentId
    ? getEnvironmentDescriptor(sheet.archetype, f.environmentId, sheet.rank)
    : '';
  const parts = curated
    ? [curated, f.weather]
    : [f.environmentDetails, f.weather];
  const kept = parts.filter((s) => s && s.trim().length > 0);
  const setting = kept.length > 0 ? kept.join(', ') : 'an atmospheric painterly environment';
  // Element mood + colour already come from the scene-palette lead — here we only
  // add the SPECIFIC setting + a rank-scaled drama beat (env reference §2.3), kept
  // compact so pose + weapon still fit ahead of it. (No atmosphere dup.)
  const rankMood =
    sheet.rank === 'Ascendant'
      ? ', at its most dramatic and consequential'
      : sheet.rank === 'Forged'
        ? ', heavier and more consequential'
        : '';
  return `BACKGROUND (required, never blank/studio, never bright daylight): ${setting}${rankMood}, painterly environmental depth`;
}

// ---------------------------------------------------------------------------
// Negative prompt — mirrors the deterministic negative assembly in claudeApi.
// ---------------------------------------------------------------------------

/**
 * The non-negotiable negatives, kept SHORT and placed FIRST so they always
 * survive the 400-char cap. Root cause of the topless-render bug (2026-07-21):
 * the modesty terms live ~640 chars into BASE_NEGATIVE, which is ~1500 chars;
 * truncating to 400 dropped them entirely. These lead now so nudity /
 * sexualization can never be truncated off, whatever the element tails add.
 */
// Explicit/sexualized content only (Raheem 2026-07-21: a bare muscular male
// chest is allowed — it looks great — so anti-shirtless terms were removed).
// These still catch female toplessness (bare breasts / exposed nipples), crop
// tops / bare midriff, cleavage, crotch emphasis, and underwear-as-costume.
const CRITICAL_NEGATIVES =
  'nudity, topless woman, exposed nipples, visible nipples, bare breasts, cleavage, deep neckline, ' +
  'underboob, sideboob, bare midriff, exposed belly, crop top, crotch bulge, bulge emphasis, ' +
  'underwear as clothing, lingerie, bikini armor, chainmail bikini, sexualized, pin-up, suggestive';

/**
 * Anti-shirtless block, injected into the reserved negative lead for EVERY
 * combination except Ascendant + male (allowsBareChest). Keeps Foundation
 * "super modest," Forged covered, and women covered at all ranks. Placed ahead
 * of CRITICAL_NEGATIVES so it can never truncate. (Raheem 2026-07-21.)
 */
const COVERED_CHEST_NEGATIVES =
  'shirtless, bare chest, bare-chested, bare torso, exposed chest, naked torso, ' +
  'open robe exposing chest, open-chest armor, no shirt, exposed pecs, exposed abs';

/**
 * In the bare-chest-allowed branch, strip any coverage tokens BASE_NEGATIVE
 * would otherwise contribute so they can't silently re-ban a bared chest if the
 * lead shrinks or the cap grows later. Today they truncate off anyway, but this
 * makes the intent explicit rather than incidental.
 */
const COVERAGE_TOKENS_TO_STRIP: readonly string[] = [
  'shirtless hero', 'shirtless', 'bare-chested', 'bare chest', 'bare torso',
  'exposed abs', 'exposed pecs', 'exposed chest', 'open-chest armor', 'no shirt', 'topless',
];
function stripListTokens(negative: string, tokens: readonly string[]): string {
  let out = negative;
  for (const token of tokens) {
    // Remove the token as a comma-delimited list item (with optional surrounding
    // spaces), collapsing the separators it leaves behind.
    out = out.replace(new RegExp(`\\s*,?\\s*${token.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*(?=,|$)`, 'gi'), '');
  }
  return out.replace(/,\s*,/g, ',').replace(/^\s*,\s*/, '').trim();
}

function stripCoverageTokens(negative: string): string {
  return stripListTokens(negative, COVERAGE_TOKENS_TO_STRIP);
}

/**
 * Druid-only negative SUBTRACTION (Raheem 2026-07-21). Phoenix reads moss-skin,
 * lichen, fungal caps, bark-plating, and antler-growths as "deformed / bad
 * anatomy" and sands them off, fighting the close-to-nature look. Dropping
 * these four for Druid ONLY frees that growth. All modesty + count tokens
 * (extra fingers/limbs, duplicate) are kept — only these growth-suppressors go.
 */
const DRUID_GROWTH_SUPPRESSORS: readonly string[] = [
  'deformed', 'disfigured', 'bad anatomy', 'bad proportions',
];

/**
 * Anti-"lame render" negatives — also reserved (right after modesty) so they
 * survive the cap. These target the three failures Raheem flagged: a static
 * mannequin pose, a blank/studio background, and no visible element.
 */
const SPECTACLE_NEGATIVES =
  'static portrait pose, standing still, hands at sides, stiff mannequin, ' +
  'plain background, blank background, studio backdrop, white background, empty backdrop, ' +
  'no elemental effect, no visible power, no magic, ' +
  'washed-out, desaturated, neutral tan background, beige scene, sepia tone, muted flat palette, grey daylight scene';

/**
 * Leonardo accepts far more than the self-imposed 400 the legacy path uses.
 * The assembler uses a roomier cap so the modesty + spectacle reserves AND a
 * healthy slice of BASE_NEGATIVE all survive.
 */
const ASSEMBLER_NEGATIVE_MAX = 1000;

function buildNegativePrompt(sheet: CharacterSheet): string {
  const element = sheet.resolvedElement;
  const isFireFamily = FIRE_FAMILY_ELEMENTS.includes(element);
  const warmGlowNegatives = isFireFamily
    ? ''
    : ', ember-red glow, warm ember lighting, orange rim light, fire aura, warm orange highlights, burning ember effect, glowing coals, molten glow, heat shimmer, flame-lit surface, ember-red inner glow, warm ember on armor, bright daylight, harsh sunlight, clear blue sky, sunny daytime, midday sun';
  const elementDriftBans = sheet.isEvolution ? buildElementDriftBans(element) : '';
  // Vampire — hard daylight ban at every rank (Bible §Vampire §14 avoid). Kept
  // in the reserved lead so it can never truncate off.
  const archetypeBans = sheet.archetype === 'Vampire'
    ? ', daylight, sunlight, daytime sky, bright noon, sunny meadow, blue midday sky'
    : '';
  const bareChest = allowsBareChest(sheet);
  // Reserved lead (never truncated): anti-shirtless (covered case only) →
  // modesty → anti-lame → element drift bans. Then fill with as much of
  // BASE_NEGATIVE as fits, then the warm-glow tail. In the bare-chest-allowed
  // case the anti-shirtless block is dropped AND the coverage tokens are
  // stripped from the base fill so nothing fights the open-robe cue.
  const chestLead = bareChest ? '' : `${COVERED_CHEST_NEGATIVES}, `;
  const lead = `${chestLead}${CRITICAL_NEGATIVES}, ${SPECTACLE_NEGATIVES}${elementDriftBans}${archetypeBans}`;
  const remaining = Math.max(ASSEMBLER_NEGATIVE_MAX - lead.length - warmGlowNegatives.length, 60);
  let baseSource = bareChest ? stripCoverageTokens(BASE_NEGATIVE) : BASE_NEGATIVE;
  if (sheet.archetype === 'Druid') baseSource = stripListTokens(baseSource, DRUID_GROWTH_SUPPRESSORS);
  const base = truncateToLimit(baseSource, remaining);
  return truncateToLimit(`${lead}, ${base}${warmGlowNegatives}`, ASSEMBLER_NEGATIVE_MAX);
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
  // Priority order — every non-negotiable (dynamic style, the person's
  // ancestry/body, a dynamic pose, the element ERUPTING, and a real
  // background) sits ahead of the optional fill so all five always survive
  // the budget. The earlier failure rendered a static, element-less mannequin
  // on a blank backdrop because element/background/style were in the truncated
  // tail — this ordering fixes that.
  const bareChest = allowsBareChest(sheet);
  // High-priority chest cue — negatives alone don't hold on Phoenix, so the
  // covered case gets an explicit coverage cue and the allowed (Ascendant male)
  // case gets an explicit open-robe / bare-chest cue. Placed right after the sex
  // prefix so it survives the 1450 budget.
  const chestCue = bareChest
    ? 'open outer robe/coat parted to reveal a bare muscular chest, no shirt beneath the open layer'
    : 'chest and torso FULLY COVERED, high closed neckline, opaque garment closed at the chest';
  const segments = [
    buildElementScenePalette(sheet), // element colors the WHOLE image — highest priority
    styleLeadFor(sheet.archetype), // dynamic action framing (Druid = photoreal)
    buildSexPrefix(sheet.hiddenFate.sex),
    chestCue, // rank+sex-gated chest coverage (covered by default, bared only at Ascendant male)
    // (diversity axis + separate element "hook" omitted — the scene palette,
    // the element-wreathed weapon, and the closer already bookend the element.)
    buildIdentityBlock(sheet), // compact ancestry/body/age anchors
    hookNarrativeAnchor(sheet), // per-archetype narrative axis (Seraph path) — none by default
    hookMandatorySegment(sheet), // per-archetype must-render segment (Mech mech) — none by default
    // dynamic action pose — an archetype hook may override the generic prefix
    hookPosePrefix(sheet) ?? buildPosePrefix(sheet),
    buildWeaponClause(sheet), // curated weapon (evolves per rank), element-wreathed — MUST render
    buildCompanionClause(sheet), // rank-scaled servants/units — high enough to survive + render
    buildWardrobeClause(sheet), // garments (modesty is in the negatives)
    buildBackgroundClause(sheet), // the SPECIFIC setting (element mood comes from the palette lead)
    bareChest ? MODESTY_STYLE_TAIL_BARE : MODESTY_STYLE_TAIL,
    // Lower-priority tail — truncates harmlessly. The tier-up identity re-lock is
    // redundant with the anchors above + the init-image; the element clause is
    // redundant with the scene-palette lead + closer. Cataclysm removed
    // (2026-07-21) — "world CRUMBLES" drove Leonardo off-path.
    sheet.isEvolution ? IDENTITY_IMPERATIVE_CLAUSE : '',
    buildElementPrefix(sheet),
    sheet.storyMotifs.length > 0
      ? `story details woven into the frame: ${sheet.storyMotifs.join(', ')}`
      : '',
    buildAbilitySpectacle(sheet.abilityRefs),
  ].filter((s) => s && s.trim().length > 0);

  // Reserve the composition closer so the head-in-frame anchor ALWAYS lands.
  // The element is REPEATED here (bookends the prompt). When companions are
  // present the framing PULLS BACK so the legion behind is actually visible —
  // the default tight waist-up shot left no room for them to render.
  const framing = sheet.companion && sheet.companion.trim()
    ? 'the character large in the foreground with the companions clearly visible behind them, entire head in frame, 3/4 body, wide background with depth'
    : COMPOSITION_CLOSER;
  const reserved = `, ${framing}, ${sheet.resolvedElement} power filling the frame`;
  const body = truncateToLimit(segments.join(', '), PORTRAIT_PROMPT_MAX - reserved.length);

  return {
    portraitPrompt: `${body}${reserved}`,
    negativePrompt: buildNegativePrompt(sheet),
  };
}
