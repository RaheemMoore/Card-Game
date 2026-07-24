import type { CharacterSheet } from '../types/characterSheet';
import type { ArchetypeName, Rank } from '../types/card';
import type { ElementName, HiddenFate } from '../types/bible';
import type { CardAbilityReference } from '../types/abilities';
import type { ImageEngineSnapshot } from '../types/archetypeProposal';
import { ELEMENT_VISUAL_LANGUAGE } from '../data/elementVisualLanguage';
import { getEnvironmentDescriptor, getEnvironmentPool } from '../data/archetypeEnvironments';
import { getWeaponPool } from '../data/archetypeWeapons';
import { getPosePool } from '../data/archetypePoses';
import { getCompanionPool } from '../data/archetypeCompanions';
import { hookPosePrefix, hookMandatorySegment, hookNarrativeAnchor } from './portrait/archetypeHooks';
import { formsForGate, formsFor } from './imageEngine/formFamilies';
import { getDefinition, getCurrentVersion } from './abilities/registry';
import {
  BASE_NEGATIVE,
  PORTRAIT_PROMPT_MAX,
  ARCHETYPE_NON_HUMAN_FORMS,
  buildElementDriftBans,
  truncateToLimit,
} from './imageEngine/imageConstants';

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

// Fire-family = elements allowed warm-ember/orange glow (they skip the
// anti-warm-glow negatives). 'Holy' removed 2026-07-23 (Raheem: Holy is radiant
// like LIGHT, not warm-ember — so it now renders cool/radiant, not fire-orange).
// 'Ash' is intentionally NOT here: it's a live element still but queued for
// removal in the element-restructure batch, so it's left out to avoid warm-tint.
const FIRE_FAMILY_ELEMENTS: readonly ElementName[] = ['Fire', 'Blood'] as const;

/**
 * Bare-chest gate — DISABLED game-wide (Raheem 2026-07-23): NO shirtless / bare
 * chest for ANY character at ANY rank. There are plenty of striking armor / robe
 * / regalia options; nobody is ever undressed. Always returns false so every
 * render routes through the fully-covered branch. (The old ~20%-at-Ascendant-male
 * roll is retired; `bareChestRoll` is forced false in characterSheetFactory.)
 */
function allowsBareChest(_sheet: CharacterSheet): boolean {
  return false;
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
 * Compact style opener — the LIVE style lead every assembled prompt opens with.
 * It distils the load-bearing essence of the old 1922-char STYLE_ANCHOR (removed
 * from claudeApi.ts in the 2026-07-22 cleanup — it was Haiku-compression guidance
 * for a portraitPrompt Claude no longer writes, not a literal prefix): painterly
 * fantasy action, power channelling through the body (not physique display),
 * waist-up framing, and the modesty / anti-sexualization stance (also hard-enforced
 * by BASE_NEGATIVE). Kept short so identity + element + composition all survive the
 * 1450-char budget. Exported so the Archetype Workshop can display the real lead.
 */
// 2026-07-23 (Raheem, EMPHATIC): the WHOLE game is painterly fantasy art — NO
// archetype renders photoreal, INCLUDING Druid (this reverses the 2026-07-21
// Druid-photoreal rule). "This is a fantasy card game. I want fantasy art."
// Kept compact (~125 chars) so wardrobe + background still fit the budget; the
// anti-photoreal enforcement lives in PAINTERLY_NEGATIVES, not here.
export const COMPACT_STYLE_LEAD =
  'painterly hand-painted fantasy card art, mid-action pose (never a static portrait), cloth and hair ' +
  'in motion, cinematic lighting';

function styleLeadFor(_archetype: ArchetypeName): string {
  return COMPACT_STYLE_LEAD;
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

// ---- Vampire form-family (2026-07-23) — the ELEMENT gates the form pair, and a
// stable per-character seed picks one of the two. Wired live here (replaces the
// generic Blood-Sovereign at Forged/Ascendant); Foundation stays on the ~1/3
// feral gate. Void is the Ascension-trade form. Concepts from formFamilies.ts. ----
type VampireForm = { Forged: string; Ascendant: string };
const VAMPIRE_FORM_PAIRS: Record<string, [VampireForm, VampireForm]> = {
  Blood: [
    {
      Forged: 'the BLOOD-SOVEREIGN manifesting — an upright regal vampire lord, great leathery bat-wings beginning to spread, crimson power welling from within, a few bats and blood-mist gathering, fully clothed in dark ornate regalia',
      Ascendant: 'the full BLOOD-SOVEREIGN — a regal winged bat-lord, huge leathery wings spread wide, crimson radiance pouring from within, mist and a swarm of bats swirling in attendance beneath a blood-moon; commanding and UPRIGHT, never a crouching feral beast',
    },
    {
      Forged: 'the CRIMSON KNIGHT manifesting — a vampire warlord in blood-forged plate beaded with wet red, a blade beginning to wreathe in its own crimson aura, regal and armored',
      Ascendant: 'the full CRIMSON KNIGHT — a towering blood-warlord in crimson blood-forged plate running wet, a great blade wreathed in a crimson aura, a blood-moon behind; a crusader turned, regal and armored, NOT feral',
    },
  ],
  Shadow: [
    {
      Forged: 'the NOSFERATU manifesting — gaunt and hollow-eyed, fingers lengthening into talons, rat-fangs, plague-shadow beginning to cling; ancient and wrong, the monster not the count',
      Ascendant: 'the full NOSFERATU — a gaunt bald plague-horror, hollow black eyes, long taloned fingers, rat-fangs, plague-shadow clinging like a shroud; ancient, wrong, terrifying — NOT a handsome count',
    },
    {
      Forged: 'the MIST-SWARM manifesting — the body\'s edges dissolving into bats and crimson vapor, a half-formed face and a reaching hand still solid',
      Ascendant: 'the full MIST-SWARM — barely a body at all, a storm of bats and crimson vapor coalescing into a half-formed face and reaching hands, dissolving at every edge; a being of swarm and mist, not solid flesh',
    },
  ],
  Nocturne: [
    {
      Forged: 'the GOTHIC SOVEREIGN manifesting — immaculate black finery, a high-collared crimson-lined cloak rising, pale aristocratic menace, one fang at a knowing smile',
      Ascendant: 'the full GOTHIC SOVEREIGN — the archetypal count in immaculate black finery and a high-collared crimson-lined cloak, pale patrician menace, a candlelit gothic hall and a blood-moon behind; elegant and deadly, a DISTINCT face and ancestry (NOT a copy of any famous Dracula actor)',
    },
    {
      Forged: 'the COURT-DECADENT manifesting — draped decadence, a half-lidded hypnotic gaze, a goblet of blood-wine in hand, rose-and-rot opulence gathering',
      Ascendant: 'the full COURT-DECADENT — a hypnotic ballroom seducer draped in decadent finery, half-lidded gaze, a goblet of blood-wine, a rose-and-rot opulent hall behind under candlelight; seductive menace, fully clothed',
    },
  ],
  Void: [
    {
      Forged: 'the HOLLOW SOVEREIGN manifesting — regalia beginning to be worn by an ABSENCE, patches of the body going to starless void-black, reality fraying at the edges, cold pinprick eyes',
      Ascendant: 'the HOLLOW SOVEREIGN — a crown and a red-lined cloak worn by NOTHING, a body-shaped ABSENCE of starless black, reality fraying and tearing at the silhouette, two cold pinpricks of light for eyes; regal oblivion, a void where a vampire should be',
    },
    {
      Forged: 'the STAR-EATER manifesting — the chest beginning to collapse into a light-bending well, faint constellations drawn inward, the hunger turning cosmic',
      Ascendant: 'the STAR-EATER — a collapsing event-horizon for a torso, light bending and pouring inward, the blood-moon swallowed into a black-hole maw in the chest, constellations spiraling down the throat; a cosmic horror that drinks stars, not blood',
    },
  ],
};

/** Which form of the element's pair to render. Image-first (2026-07-24): the
 *  player's chosen form id (hiddenFate.speciesForm) decides it deterministically
 *  — the FORM_FAMILIES order matches VAMPIRE_FORM_PAIRS (index 0/1). Cards forged
 *  before the form pin (no speciesForm) fall back to the legacy per-character
 *  hash so their look never shifts. */
function vampirePairIndex(sheet: CharacterSheet): 0 | 1 {
  const id = sheet.hiddenFate.speciesForm;
  if (id) {
    const i = formsForGate('Vampire', sheet.resolvedElement).findIndex((f) => f.id === id);
    if (i === 0 || i === 1) return i;
  }
  const seed = `${sheet.hiddenFate.skinTone ?? ''}${sheet.hiddenFate.age ?? ''}${sheet.hiddenFate.sex ?? ''}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2) as 0 | 1;
}

/** The element-gated Vampire form string for this rank (Forged/Ascendant). */
function vampireFormFor(sheet: CharacterSheet): string {
  const pair = VAMPIRE_FORM_PAIRS[sheet.resolvedElement] ?? VAMPIRE_FORM_PAIRS.Blood;
  const form = pair[vampirePairIndex(sheet)];
  return sheet.rank === 'Ascendant' ? form.Ascendant : form.Forged;
}

function buildPosePrefix(sheet: CharacterSheet): string {
  if (sheet.pose) {
    return `REQUIRED POSE: ${sheet.pose}. No T-pose, no orb-per-fist, no symmetrical arms. `;
  }
  // Form-family override at Forged/Ascendant (Foundation keeps its normal path):
  // Vampire regal forms replace the generic non-human form string here (keeping
  // the element palette). Necromancer forms are handled by a SCENE override
  // (buildNecromancerFormScene) so the pose keeps the generic bone reinforcement.
  const form = sheet.rank !== 'Foundation' && sheet.archetype === 'Vampire'
    ? vampireFormFor(sheet)
    : ARCHETYPE_NON_HUMAN_FORMS[sheet.archetype];
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

/**
 * Archetype-specific element MANIFESTATION (2026-07-22). The element is NOT a
 * generic aura on everyone — it manifests through the archetype's VESSEL: a Mech
 * WIELDS it as weaponry, a Beastmaster's summoned ANIMAL is made of it, everyone
 * else RADIATES it from the body. Fixes mechs glowing in the chest instead of the
 * mech firing the weapon.
 */
function elementVessel(archetype: ArchetypeName, element: ElementName, scale: string): string {
  switch (archetype) {
    case 'Mech Pilot':
      // Nanite is the exception: it IS the swarm, not a big mech wielding it.
      if (element === 'Nanite')
        return `a huge SWARM of MANY small and medium nanite-robots (NO single big mech) forming weapons and shields in mid-air around the pilot; the swarm ${scale}`;
      return `the towering war-MECH WIELDS ${element} as its armament — ${element} cannons, blades, thrusters and ordnance firing and channeling FROM THE MECH ITSELF (NOT a glow on the human pilot); the mech's ${element} weaponry ${scale}`;
    case 'Beastmaster':
      return `the summoned beast IS ${element} — a great animal formed entirely OF ${element} prowling at their side, the ${element} taking animal shape, ${scale}`;
    default:
      return `${element} power VISIBLY ${scale} from the character`;
  }
}

function buildElementPrefix(sheet: CharacterSheet): string {
  if (isElementless(sheet.archetype)) {
    return (
      `GROUNDED GEAR (NOT an element) — the character's tools, weapons and devices are REAL mundane machinery of ` +
      `brass, copper, steel, glass and leather, practical and hand-made — NO glowing energy, NO arcane aura, ` +
      `NO magic VFX, NO neon, NO holograms`
    );
  }
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
  // 2026-07-22 element-visual rework (art-prompt-director + LEONARDO_PLAYBOOK.md):
  // lead with MATERIALS (biggest distinctiveness lever) + TEXTURES so no two
  // elements share substance (Fire dry-char vs Blood wet-drip), then motion/lighting/color.
  return (
    `ELEMENT SPECTACLE — ${elementVessel(sheet.archetype, element, scale)}; the environment REACTS ` +
    `(this element MUST DOMINATE the frame): made of ${firstClause(v.materials, 44)}; ${firstClause(v.textures, 30)}; ` +
    `${firstClause(v.motion, 64)}; lighting ${firstClause(v.lighting, 52)}; only in ${element} colors ${v.primaryColors}.${nonFire}`
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
  // Android that has SHED human form (Ascendant): identity is NOT a human face/body —
  // it is machine lineage (serial/manufacture marks + chosen purpose). Forcing "hold
  // this exact person" here is what kept rendering a humanoid robot / sexy fembot
  // (a Bible FAILURE — "human-looking end-state is a failure for Android").
  if (sheet.archetype === 'Android' && sheet.rank === 'Ascendant') {
    return 'SUBJECT: a POST-HUMAN machine-being — NOT a person, NO human face, NO human head, NO humanoid two-arm-two-leg body. Identity is carried ONLY by its stamped serial/manufacture-marks and chosen-purpose emblem, never by human features.';
  }
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
  // A post-human Android (Ascendant) is a MACHINE STRUCTURE, not a clothed figure —
  // any garment/chassis-shell wording re-implies a humanoid body (the fembot bug).
  if (sheet.archetype === 'Android' && sheet.rank === 'Ascendant') return '';
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
  // primaryGarment is asserted by the chest-coverage cue (2026-07-23) — do not
  // repeat it here; spend the budget on armor + outer layer instead.
  if (fashion.armor) pieces.push(`armored in ${fashion.armor}`);
  if (fashion.outerLayer) pieces.push(`${fashion.outerLayer} over the shoulders`);
  if (pieces.length === 0 && fashion.primaryGarment) pieces.push(`wearing ${fashion.primaryGarment}`);
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
/**
 * Archetypes with NO element — their power is BUILT, not channeled. The
 * assembler must NOT inject an element scene-palette / spectacle / weapon-wreath
 * for these, or the arcane palette hijacks the whole card (validated 2026-07-23:
 * `Tech` turned every Human Calling into a teal sci-fi soldier). Human renders in
 * a grounded gaslamp-fantasy steampunk palette instead.
 */
const ELEMENTLESS_ARCHETYPES: ReadonlySet<ArchetypeName> = new Set<ArchetypeName>(['Human']);
function isElementless(archetype: ArchetypeName): boolean {
  return ELEMENTLESS_ARCHETYPES.has(archetype);
}

/**
 * The no-element scene for Human — sets the old-school gaslamp/steampunk RENDER
 * TONE (no magic) but does NOT dictate a workshop SETTING; the coupled
 * environment (buildBackgroundClause) supplies the actual place, so the
 * Infiltrator gets fog rooftops and the Pacifist a sanctuary, not a forge.
 */
function buildElementlessScenePalette(sheet: CharacterSheet): string {
  const mood =
    sheet.rank === 'Ascendant'
      ? 'a legendary, larger-than-life moment'
      : sheet.rank === 'Forged'
        ? 'a charged, consequential moment'
        : 'an intimate, grounded moment';
  return (
    `SCENE — a grounded OLD-SCHOOL GASLAMP-FANTASY STEAMPUNK world (absolutely NO elemental magic, NO glowing ` +
    `arcane energy, NO neon, NO holograms, NO sci-fi chrome), ${mood}; rendered in warm brass, aged copper, ` +
    `oiled leather, soot and gaslight tones; the character's skin stays its TRUE colour`
  );
}

// Human Calling index (order in HUMAN.variants, load-bearing) for the special
// camo-blend behavior.
const HUMAN_INFILTRATOR_INDEX = 4;
function isHumanInfiltrator(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Human' && sheet.hiddenFate.fashionVariantIndex === HUMAN_INFILTRATOR_INDEX;
}

/**
 * The Infiltrator (Raheem 2026-07-23: "a camo background of a guy trying to
 * disappear and doing a good job"). The SCENE itself is a camouflage field the
 * ghillie-suited operative dissolves into — highest-priority segment so the
 * blend actually renders instead of a generic hooded figure.
 */
function buildInfiltratorCamoScene(sheet: CharacterSheet): string {
  const hidden =
    sheet.rank === 'Ascendant'
      ? 'almost impossible to spot — a master ghost, all but vanished'
      : sheet.rank === 'Forged'
        ? 'very hard to spot, mostly dissolved into the pattern'
        : 'hard to spot, half-dissolved into the pattern';
  return (
    `SCENE — a dense CAMOUFLAGE field (mottled woodland foliage, ferns, moss, broken branches and dappled shadow in ` +
    `muted grey-green-brown camo tones); the character wears a FULL GHILLIE CAMO SUIT patterned and textured to MATCH ` +
    `this exact background, so they are DISAPPEARING into it and doing it WELL — ${hidden}, a broken-up silhouette low ` +
    `among the foliage; ONLY the eyes and a sliver of face barely readable, everything else camouflaged; a grounded ` +
    `gaslamp-fantasy world, NO magic, NO glow, NO neon; the character's skin stays its TRUE colour`
  );
}

// Monk VIOLENCE variant indices (order in MONK.variants: 0 Peace, 1 Fire,
// 2 Water, 3 Wind, 4 Earth). At Ascendant these reach the ALL-FOUR culmination.
const MONK_VIOLENCE_INDICES: ReadonlySet<number> = new Set([1, 2, 3, 4]);
function isMonkAllFourAscendant(sheet: CharacterSheet): boolean {
  return (
    sheet.archetype === 'Monk' &&
    sheet.rank === 'Ascendant' &&
    sheet.hiddenFate.fashionVariantIndex !== undefined &&
    MONK_VIOLENCE_INDICES.has(sheet.hiddenFate.fashionVariantIndex)
  );
}

/**
 * Monk VIOLENCE Ascendant culmination (Raheem 2026-07-23): the grandmaster
 * commands ALL FOUR elements at once, rendered as wild ELEMENTAL CHAOS raging
 * across the whole background (NOT an organized quadrant mandala — Raheem: "just
 * elemental chaos with all 4 going crazy"). The monk stands calm at the eye of
 * the storm. Owns the scene clause (highest priority) so the single-element
 * palette can't flood the frame.
 */
function buildMonkAllFourScene(): string {
  return (
    `SCENE — MONK VIOLENCE ASCENDANT, ALL-FOUR GRANDMASTER in wild ELEMENTAL CHAOS: a single grandmaster warrior-monk ` +
    `centered and foreground, fully clothed, standing CALM and disciplined at the still eye of the storm, while ALL ` +
    `FOUR ELEMENTS rage and collide in a churning MAELSTROM across the whole background, all going crazy at once — ` +
    `roaring FIRE and ember-sparks, crashing WATER waves and spray, howling WIND and whipping debris, and shattering ` +
    `EARTH with flying rock and stone-shards — every one of the four clearly present and unleashed, swirling and ` +
    `clashing around the master; each element keeps its OWN vivid colour even in the chaos (do NOT blend to muddy ` +
    `grey-brown); painterly hand-painted fantasy card art, NOT photoreal; NO glowing fists, the monk composed and not engulfed`
  );
}

/**
 * Monk PEACE Ascendant culmination (Raheem 2026-07-23): the fantasy-Buddha
 * transcends into a serene celestial COSMIC BEING. Forced as a scene override
 * because the plain cosmic palette + Ascendant power language kept rendering a
 * muscular caped SUPERHERO instead of a serene robed Buddha (validated fail).
 */
function buildMonkPeaceCosmicScene(): string {
  return (
    `SCENE — MONK PEACE ASCENDANT, serene CELESTIAL COSMIC BUDDHA: a calm enlightened FANTASY-BUDDHA monk in tranquil ` +
    `meditative LOTUS poise, hands resting in a peaceful mudra, draped in a flowing layered SAFFRON-AND-STARFIELD ` +
    `MEDITATION ROBE of loose cloth (robes, NOT a superhero bodysuit, NOT a cape, NOT spandex, NOT a chiseled muscular ` +
    `hero, NOT a power stance), a long mala prayer-bead strand, a painted third-eye, faint constellation-lines glowing ` +
    `softly under the skin; a great galaxy-disc COSMIC NIMBUS of slowly orbiting stars haloing the head (never ` +
    `feathered angel wings, never an angel halo, never a caster); seated serene amid a deep-space void of wheeling ` +
    `galaxies and glowing nebulae; utterly calm and vast; painterly hand-painted fantasy card art, NOT photoreal; the ` +
    `body keeps its TRUE build (a stout or aged Buddha stays stout/aged, never slimmed into a hero)`
  );
}

const MONK_PEACE_INDEX = 0;
function isMonkPeaceCosmic(sheet: CharacterSheet): boolean {
  return (
    sheet.archetype === 'Monk' &&
    sheet.rank === 'Ascendant' &&
    sheet.hiddenFate.fashionVariantIndex === MONK_PEACE_INDEX
  );
}

// ---- Seraph three-path scene overrides (2026-07-23) ----------------------
// The path anchor lives LOW in segment order and lost to the element palette
// (the Twilight split washed out; the Fallen figure drifted to a red devil).
// These OWN the high-priority scene clause so the flagship figure renders —
// same fix as the Monk Peace-cosmic / all-four overrides. Foundation stays
// undeclared austerity (no override fires below the gate rank).
function isSeraphTwilight(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Seraph' && sheet.narrativeAxisPath === 'Balanced' && sheet.rank !== 'Foundation';
}
function isSeraphFallenAscendant(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Seraph' && sheet.narrativeAxisPath === 'Fallen' && sheet.rank === 'Ascendant';
}
function isSeraphGoodAscendant(sheet: CharacterSheet): boolean {
  return (
    sheet.archetype === 'Seraph' &&
    sheet.rank === 'Ascendant' &&
    sheet.narrativeAxisPath !== 'Fallen' &&
    sheet.narrativeAxisPath !== 'Balanced'
  );
}

/** Twilight (Balanced): a SINGLE figure hard-split down the exact centerline,
 *  both halves at EQUAL luminance so neither floods (the validated failure). */
function buildSeraphTwilightScene(sheet: CharacterSheet): string {
  const scale =
    sheet.rank === 'Ascendant'
      ? 'full asymmetric SPLIT-CROWN regalia, mismatched wings at full span'
      : 'exactly ONE ceremonial piece per side worn over a plain robe base';
  return (
    `SCENE — SERAPH TWILIGHT (Balanced path): a SINGLE figure HARD-SPLIT down the EXACT vertical centerline into ` +
    `two EQUAL halves — one body, one head, split head-to-toe, a razor-sharp seam dividing the face, chest and ` +
    `regalia straight down the middle (${scale}). The LEFT half is a radiant gold-and-white angel — one brilliant ` +
    `white-feathered wing, half a burning gold halo, gold-veined ivory regalia, a gold-lit left eye — its glow ` +
    `CONTAINED to the left side, matte and controlled, NOT blooming or bleeding past the seam. The RIGHT half is a ` +
    `charred obsidian FALLEN angel — one wing of burnt black feathers dissolving into ash, half a shattered dark ` +
    `halo, blackened tarnished regalia, molten-obsidian BLACK light bleeding UP through cracks, a black-fire right ` +
    `eye — self-illuminated by its own cold black light at EQUAL strength to the left. BOTH halves read at FULL, ` +
    `EQUAL brightness; neither floods nor washes out the other; a stark, deliberate 50/50 light-versus-dark ` +
    `division that reads at a glance. Painterly hand-painted fantasy card art, NOT photoreal; the skin stays its ` +
    `TRUE colour on both sides; NO red horned devil, NO fire-orange, NO two separate people, NO two heads — ONE person split`
  );
}

/** Fallen Ascendant: a majestic ruined angel — beats the red-devil prior. */
function buildSeraphFallenScene(): string {
  return (
    `SCENE — SERAPH FALLEN ASCENDANT, a CORRUPTED but MAJESTIC ruined angel at full commitment: great wings of ` +
    `charred blackened feathers dissolving into ash and black glass, a shattered or inverted halo, full obsidian ` +
    `regalia of blackened tarnished gold with molten-obsidian BLACK light bleeding UP through the cracks, dark ` +
    `black-fire eyes — a beautiful, tragic, VIVID ruin of a heaven-born being. Radiance is REPLACED by cold molten ` +
    `black light; the air is heavy with falling ash and thin sulfur haze. Painterly hand-painted fantasy card art, ` +
    `NOT photoreal; the body keeps its TRUE build, age and ancestry (never slimmed or beautified into a generic ` +
    `young demon). ABSOLUTELY NEVER a red horned devil, NEVER cartoon devil-horns, NEVER a sexy demoness, NEVER ` +
    `fire-orange or campfire flame (this is molten obsidian + black light), NEVER a pentagram or inverted cross`
  );
}

/** Good Ascendant: a radiant winged guardian — not a plate paladin. */
function buildSeraphGoodScene(): string {
  return (
    `SCENE — SERAPH GOOD ASCENDANT, a radiant divine GUARDIAN at full commitment: full flowing regalia of gold and ` +
    `white with cascading layered ceremonial cloth, great wings of brilliant white light, an intact burning gold ` +
    `halo, VIVID divine radiance washing warm-gold light across the scene. A guardian-ANGEL of service and burden, ` +
    `NOT a knight in plate armour and NOT a generic paladin — the divinity reads through wings, halo, sacred ` +
    `vestment and celestial light, not a suit of armour. Painterly hand-painted fantasy card art, NOT photoreal; ` +
    `the body keeps its TRUE build, age and ancestry (elders, heavyset and scrawny all belong — never auto-slimmed ` +
    `or de-aged into a beautiful young angel)`
  );
}

// Vampire RADICAL forms (Shadow → Nosferatu/Mist-Swarm, Void → Hollow-Sovereign/
// Star-Eater) fight the handsome-count prior and lose as a pose-action — they need
// to OWN the scene clause (validated 2026-07-23). The regal forms (Blood/Nocturne)
// stay on the pose-action path (they agree with the prior and render well).
function isVampireRadicalForm(sheet: CharacterSheet): boolean {
  return (
    sheet.archetype === 'Vampire' &&
    sheet.rank !== 'Foundation' &&
    (sheet.resolvedElement === 'Shadow' || sheet.resolvedElement === 'Void')
  );
}
function buildVampireRadicalScene(sheet: CharacterSheet): string {
  const idx = vampirePairIndex(sheet);
  const asc = sheet.rank === 'Ascendant';
  const tail = 'painterly hand-painted fantasy card art, NOT photoreal';
  if (sheet.resolvedElement === 'Shadow') {
    return idx === 0
      ? `SCENE — VAMPIRE NOSFERATU: a gaunt, bald, hollow-eyed PLAGUE-HORROR vampire — long taloned skeletal fingers, rat-fangs, sunken cheeks, sickly grey-pale skin, plague-shadow clinging like a tattered shroud; a MONSTER, NOT a handsome count, NOT in fine court clothing — dark ragged wrappings covering the torso; ${asc ? 'full monstrous horror under a blood-moon' : 'the horror manifesting'}; ${tail}`
      : `SCENE — VAMPIRE MIST-SWARM: barely a solid body — a swirling STORM OF BATS and crimson vapor coalescing into a half-formed face and reaching hands, dissolving at every edge into wings and mist, only fragments solid; NOT a whole person, NOT a handsome count; ${asc ? 'a vast swarm filling the frame under a blood-moon' : 'the body beginning to dissolve into the swarm'}; ${tail}`;
  }
  // Void
  return idx === 0
    ? `SCENE — VAMPIRE HOLLOW SOVEREIGN: a crown and a red-lined cloak worn by NOTHING — a body-shaped ABSENCE of starless void-black where the vampire should be, reality fraying and tearing at the silhouette's edges, two cold pinprick lights for eyes; regal OBLIVION, an empty void wearing fine regalia, NOT a solid person; deep-black void filling the frame; ${tail}`
    : `SCENE — VAMPIRE STAR-EATER: a cosmic-horror vampire whose torso is a collapsing EVENT-HORIZON — light bending and pouring inward, a black-hole maw in the chest swallowing a blood-moon, constellations spiraling down into it; a being that DRINKS STARS not blood, NOT a normal humanoid count; deep-space black filling the frame; ${tail}`;
}

// ---- Druid wildshape form-family (2026-07-23, expanded per Raheem: "they were
// supposed to be able to BREAK human form") — element-gated: Nature/Earth/Water/
// Spirit = the good forms, Poison = the corrupted set (incl. the Blood+Nature
// Bloodmaw). A stable identity-seed picks one; it deepens across rank —
// Foundation (green-touched human) → Forged (half hybrid) → Ascendant (the human
// form FULLY BROKEN into a non-human creature of living plant-matter).
//
// Druid's lane vs its neighbours: Beastmaster SUMMONS a separate elemental beast
// (stays human); Lycan BECOMES a flesh wolf (lunar). The Druid's OWN body
// wildshapes into a creature made ENTIRELY of bark/vine/bloom — and that creature
// can be PLANT-shaped (tree-titan, bramble colossus) OR ANIMAL-shaped (a bear/
// stag/wolf/raptor grown of plant-matter). Always plant-substance, always still
// them (face legible in the bark, hair as foliage). Owns the SCENE. ----
// TWO LANES (Raheem 2026-07-23: "we absolutely have to RETAIN these forms as
// well — cordyceps is one of my favorites"). HUMANOID plant-beings stay an
// upright, deeply-transformed plant-PERSON at Ascendant (the beloved antlered
// flower-druid / gaunt cordyceps look). CREATURE wildshapes fully break the
// human form into a non-human beast GROWN of plant-matter. The seed picks across
// both, so a Druid set yields ~60% plant-beings + ~40% full beasts.
const DRUID_HUMANOID_FORMS: readonly string[] = [
  'a TOWERING TREE-BEING of gnarled oak and hanging moss — branch-limbs, a canopy crown, roots trailing from the feet',
  'a FLOWERING WILDBLOOM being — blossoms and petals erupting from the body, ANTLERS of flowering branch, a crown of wildflowers, bloom-heavy vines, drifting pollen',
  'a MOSS-AND-LICHEN being — deep soft moss and damp lichen over the whole body, a verdant hooded shape',
  'a BRAMBLE-THORN colossus — woody thorn-vines and briar wrapping the body as living armor, a crown of thorns',
  'a WATER-PLANT being — dripping kelp-fronds, river-reeds and lily-pads for hair and limbs, wet and glistening',
  'a DESERT-SUCCULENT being — thick spined cactus-flesh, waxy succulent leaves and desert-bloom flowers',
];
// Quadrupedal mammals only — they render with FULL fur/bark coverage. A winged
// raptor form was dropped: Phoenix rendered it as a bare-chested winged man
// (a recurring M5.7 modesty failure the negatives could not beat). Wolf AND stag
// dropped for the same reason — Phoenix renders every non-bear beast as a bare-
// torso upright were-creature no coverage cue can beat. Only the BEAR reliably
// covers (dense fur over the whole torso). The antlered-majesty desire is served
// by the humanoid antlered flower-druid instead.
const DRUID_CREATURE_FORMS: readonly string[] = [
  'a great BEAR grown entirely of bark, bramble and thorn — moss across its back, blossoms in its pelt, thick fur over the WHOLE body',
];
const DRUID_GOOD_FORMS: readonly string[] = [...DRUID_HUMANOID_FORMS, ...DRUID_CREATURE_FORMS];
const DRUID_CORRUPTED_FORMS: readonly string[] = [
  'a CORDYCEPS-CORRUPTED being — pale twisted parasitic-fungus STALKS erupting from the head, neck and shoulders, the body hollowed and PUPPETED by the fungus, sickly grey-green, gaunt and WRONG (a diseased horror, NOT a healthy green nature-druid)',
  'a CARRION-BLOOM BLIGHT being — rotting brown-black corpse-flowers, blighted purple-black foliage, oozing rot, drifting flies, a decayed diseased plant-corpse (NOT a healthy green druid)',
  '__BLOODMAW__', // handled specially (rank-bleeding palette)
];
// Image-first: parallel FORM_FAMILIES ids in the SAME ORDER as the pools above,
// so the player's chosen wildshape (hiddenFate.speciesForm) selects it.
const DRUID_GOOD_FORM_IDS: readonly string[] = [
  'tree_being', 'wildbloom', 'moss_lichen', 'bramble_thorn', 'water_plant', 'desert_succulent', 'bark_bear',
];
const DRUID_CORRUPTED_FORM_IDS: readonly string[] = ['cordyceps', 'carrion_bloom', 'bloodmaw'];
function formSeed(sheet: CharacterSheet): number {
  const s = `${sheet.hiddenFate.skinTone ?? ''}${sheet.hiddenFate.age ?? ''}${sheet.hiddenFate.sex ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/** Image-first (2026-07-24): pick a form-family pool INDEX from the player's
 *  pinned form id (hiddenFate.speciesForm). The archetype's FORM_FAMILIES order
 *  MUST match the SCENE pool order (documented at each pool). Cards forged before
 *  the pin (no speciesForm / unknown id) fall back to the stable per-character
 *  formSeed so their look never shifts. */
function pickFormIndex(sheet: CharacterSheet, poolLength: number): number {
  const id = sheet.hiddenFate.speciesForm;
  if (id) {
    const i = formsFor(sheet.archetype).findIndex((f) => f.id === id);
    if (i >= 0 && i < poolLength) return i;
  }
  return formSeed(sheet) % poolLength;
}
/** Pick a pool index from the player's pinned form id against a parallel id list
 *  (for pools split into sub-sets, e.g. Druid good vs corrupted). Fallback: seed. */
function pickIndexByIds(sheet: CharacterSheet, ids: readonly string[]): number {
  const id = sheet.hiddenFate.speciesForm;
  const i = id ? ids.indexOf(id) : -1;
  return i >= 0 ? i : formSeed(sheet) % ids.length;
}
function isDruidForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Druid';
}
function buildDruidFormScene(sheet: CharacterSheet): string {
  const corrupted = sheet.resolvedElement === 'Poison';
  const set = corrupted ? DRUID_CORRUPTED_FORMS : DRUID_GOOD_FORMS;
  const ids = corrupted ? DRUID_CORRUPTED_FORM_IDS : DRUID_GOOD_FORM_IDS;
  const pick = set[pickIndexByIds(sheet, ids)];
  const bloodmaw = pick === '__BLOODMAW__';
  const creature = DRUID_CREATURE_FORMS.includes(pick); // corrupted forms are never creatures
  const wind = 'ACCOMPANIED BY WIND — leaves, petals and pollen on a visible wind-current, foliage and any cloak lifted';
  // Raheem 2026-07-23, "meet in the middle": a PLANT-BEING (no human skin) DRESSED
  // in druidic regalia. Both at once — the not-human, made-of-plant body he loves,
  // PLUS regalia over the torso for modesty. ("Made entirely of plant-matter" alone
  // induced a bare plant-skin torso; regalia alone lost the plant-being look.)
  const plantBeing = 'the body itself is a PLANT-BEING of bark, wood, moss and vine — NO human skin anywhere';
  const regalia = 'DRESSED IN full druidic regalia — a CLOSED-FRONT high-collared robe and layered vestments worn OVER the plant-body, covering the CHEST, torso and midriff COMPLETELY (a closed buttoned/wrapped robe, NOT an open mantle, NOT a bare-chested cloak) — NO bare torso, NO bare midriff, NO exposed abs or pecs';
  // Foundation/Forged coverage (still partly human at those tiers — robed for modesty).
  const robes = 'the druid WEARS full druidic robes and regalia (a bark-fiber robe, moss-lined tunic, mantle and cloak) that FULLY COVER the chest, torso, midriff, arms and legs (NO bare chest, NO bare midriff, NO exposed abs)';
  // Bible §rank-continuity — identity carried the way the Necromancer lich keeps its hair.
  const identity = "the bark-and-leaf face stays LEGIBLE as the character and their hair grows foliage in its true colour, unmistakably still them";

  if (sheet.rank === 'Ascendant') {
    // CREATURE lane: the human form fully breaks into a full beast whose DENSE
    // fur/bark is the coverage (bear, stag). HUMANOID lane: a PLANT-BEING (no human
    // skin) in regalia — the beloved antlered flower-druid / gaunt cordyceps look,
    // now clothed. Antler ban is lifted at Ascendant (rank-conditional archetypeBans).
    if (bloodmaw) {
      return (
        `SCENE — OVERWHELMING POWER: a PLANT-BEING druid overgrown into a CARNIVOROUS PLANT-BEING — venus-flytrap maws, pitcher pods and sundew tendrils, the growth BLOOD-GORGED crimson and dripping arterial sap; ` +
        `${plantBeing}, ${regalia}; ${identity}; ${wind}; painterly hand-painted fantasy card art, NOT photoreal`
      );
    }
    if (creature) {
      return (
        `SCENE — OVERWHELMING POWER: the druid has FULLY BROKEN HUMAN FORM into ${pick}; ` +
        `a NON-HUMAN beast whose ENTIRE body is densely covered in thick fur, bark, moss and leaf — NO bare skin, NO smooth exposed torso, NO human chest or abs anywhere; ` +
        `the beast's colouring and markings ECHO the character (their hair-colour in its mane/pelt), unmistakably still them; ` +
        `${wind}; painterly hand-painted fantasy card art, NOT photoreal`
      );
    }
    return (
      `SCENE — OVERWHELMING POWER: a PLANT-BEING druid overgrown into ${pick} — ` +
      `${plantBeing}, ${regalia}; a living crown or branch-antlers rising above the regalia; ` +
      `${identity}; ${wind}; painterly hand-painted fantasy card art, NOT photoreal`
    );
  }

  // Foundation / Forged = a ROBED druid with partial overgrowth. Keep the
  // no-antler/horn/wing ban here (that is where the deer-druid & angel cliché
  // drifted). For CREATURE forms the beast stays LATENT (a robed druid with the
  // first plant growth), so the lower tiers never drift into a shirtless were-beast.
  const stage = sheet.rank === 'Forged' ? 'HALF-OVERGROWN' : 'in the FIRST STAGE of overgrowth';
  const tail = `${robes}; NO antlers, NO horns, NO wings; painterly hand-painted fantasy card art, NOT photoreal`;
  if (bloodmaw) {
    const bleed =
      sheet.rank === 'Forged' ? 'the maws REDDENING and beginning to drip blood-sap, red creeping through the green'
      : 'green with the first RED HINTS at the maw-edges';
    return `SCENE — DRUID BLOODMAW (the one carnivorous CORRUPTED plant-druid, the only Blood+Nature card): a ROBED druid ${stage} into a CARNIVOROUS PLANT-BEING — venus-flytrap MAWS, pitcher-plant pods, sundew tendrils growing over the robes; ${bleed}; ${wind}; ${tail}`;
  }
  if (creature) {
    return `SCENE — DRUID WILDSHAPE (latent): a ROBED druid ${stage} toward becoming ${pick} — bark, leaf and vine spreading over the robes, the beast-shape only BEGINNING to stir (still human-shaped and fully ROBED, the beast NOT yet formed); ${wind}; ${tail}`;
  }
  return `SCENE — DRUID PLANT-FORM: a ROBED druid ${stage} into ${pick}; ${wind}; ${tail}`;
}

// ---- Necromancer form-family (2026-07-23) — a FORM choice (not element-gated),
// picked by a stable identity-seed, deepening across rank (Forged=manifesting →
// Ascendant=full). Owns the SCENE so the SPECIFIC form renders (Death Knight vs
// Skeletal Magus vs Shadow Wraith vs Lich vs living), preserving the bone-identity
// rules (hair on the skull, body-type via purple shadow-muscle, soul-light). ----
// The Necromancer sacrifices souls to become MORE than human (Raheem): these are
// NON-HUMAN beings MADE OF bone or shadow — the armor/regalia IS fused bone, not
// clothing on a person. They fight the living-human identity block, so they own
// the SCENE (which still carries the element as soul-light so the palette holds).
const NECROMANCER_FORMS: readonly string[] = [
  'a SKELETAL DEATH KNIGHT of FUSED BONE — a bare skull head with soul-light eye-sockets, bone-plate over a skeleton, a bone blade; NOT a human in armor, the being IS bone',
  'a SKELETON MAGE of BARE BONE — a skull head with soul-light sockets, exposed ribs, skeletal hands, tattered robes on the bones; NOT a living human',
  'an INCORPOREAL SHADOW WRAITH of living darkness — a skull-like void-face with soul-light eyes, no solid body, trailing into black smoke; NOT a human, pure shadow',
  'a crowned SKELETON LICH-KING of BARE BONE — a crowned skull with soul-light sockets, a skeletal body in tattered royal robes, a bone scepter; NOT a human',
];
function isNecromancerForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Necromancer' && sheet.rank !== 'Foundation';
}
/** Necromancer non-human form scene — includes the element (soul-light tinted by
 *  it + the rank power phrase) so the element palette + tests still hold. */
function buildNecromancerFormScene(sheet: CharacterSheet): string {
  const el = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[el];
  const power =
    sheet.rank === 'Ascendant' ? 'OVERWHELMING POWER' : sheet.rank === 'Forged' ? 'ESCALATING POWER' : 'EARLY RESTRAINED POWER';
  const pick = NECROMANCER_FORMS[pickFormIndex(sheet, NECROMANCER_FORMS.length)];
  // Compact — painterly (style lead), no-bare-chest (negatives) and body
  // preservation (identity block) are handled elsewhere; keep BACKGROUND in budget.
  return `SCENE — ${power}: soul SACRIFICED to become NON-HUMAN — ${pick}. Soul-light in ${el} colours ${firstClause(v.primaryColors, 24)}, NO neutral background`;
}

// ---- Beastmaster beast-form family (2026-07-23) — the Beastmaster stays fully
// HUMAN; the "form" is the SUMMONED BEAST. It is NOT a normal animal with a tint
// but an apex creature whose entire body is COMPOSED OF the element. A stable
// identity-seed picks the species within the element (so a set has variety), and
// the beast scales in size + number across rank. This fights Phoenix's "normal
// animal + glow" prior, so it owns the SCENE (carrying the rank power phrase +
// element colours so the palette + rank tests still hold). Species are curated
// per Beastmaster element (elements.ts): Beast/Earth/Wind/Water/Spirit + Ice. ----
const BEASTMASTER_BEASTS: Partial<Record<ElementName, readonly string[]>> = {
  Beast: [
    'DIRE WOLF the size of a warhorse, all raw muscle, fang and bristling fur',
    'SABERTOOTH GREAT-CAT with immense curved fangs, coiled mid-pounce',
    'great TUSKED WAR-BOAR, scarred and snorting, hooves tearing the ground',
  ],
  Earth: [
    'DIRE BEAR of living rock and moss, boulder-plates grinding along its back',
    'WAR-RHINO of granite, its cracked-stone hide shedding gravel',
    'mountainous TORTOISE-TITAN, a mossy crag of a shell on its back',
  ],
  Wind: [
    'colossal STORM-RAPTOR eagle woven from living wind and torn cloud',
    'coiling WIND-SERPENT, translucent, air rushing visibly through it',
    'GALE-STALLION at full gallop, mane and body of rushing wind',
  ],
  Water: [
    'coiling RIVER-SERPENT of clear rushing water, current visible inside it',
    'great ORCA-BEAST arcing in a curl of surging whitewater',
    'WATER-HOUND of flowing whitewater, spray trailing from its flanks',
  ],
  Spirit: [
    'translucent SPIRIT-STAG, ghost-antlers blazing with soft soul-light',
    'luminous SPECTRAL TIGER, ghost-fire striping its half-seen flanks',
    'great SPECTRAL OWL of drifting soul-light, wings of pale flame',
  ],
  Ice: [
    'frost-furred MAMMOTH, tusks of blue glacier-ice, breath fogging',
    'glacial DIRE-WOLF of packed snow and ice-crystal, frost cracking off it',
    'crystalline ICE-ELK, antlers of jagged clear frost',
  ],
};
// Parallel ids for the element-gated apex beasts (SAME ORDER as BEASTMASTER_BEASTS)
// so the player's companion-style pick (hiddenFate.summonId) selects the species.
const BEASTMASTER_BEAST_IDS: Partial<Record<ElementName, readonly string[]>> = {
  Beast: ['dire_wolf', 'sabertooth', 'war_boar'],
  Earth: ['dire_bear', 'war_rhino', 'tortoise_titan'],
  Wind: ['storm_raptor', 'wind_serpent', 'gale_stallion'],
  Water: ['river_serpent', 'orca_beast', 'water_hound'],
  Spirit: ['spirit_stag', 'spectral_tiger', 'spectral_owl'],
  Ice: ['frost_mammoth', 'glacial_wolf', 'ice_elk'],
};
/** The Beastmaster's choosable apex beasts for an element ({id, label}), or [].
 *  label = the beast name (the leading CAPS word), title-cased. */
export function beastmasterSummonOptions(element: ElementName): { id: string; label: string }[] {
  const beasts = BEASTMASTER_BEASTS[element];
  const ids = BEASTMASTER_BEAST_IDS[element];
  if (!beasts || !ids) return [];
  return ids.map((id, i) => {
    // Grab the leading run of CAPS words (the beast name), e.g. "DIRE WOLF",
    // "TUSKED WAR-BOAR", ignoring a lowercase lead like "great "/"coiling ".
    const name = (beasts[i].match(/[A-Z][A-Z-]+(?:\s+[A-Z][A-Z-]+)?/)?.[0] ?? beasts[i]).toLowerCase();
    return { id, label: name.charAt(0).toUpperCase() + name.slice(1) };
  });
}
function beastmasterSpeciesIndex(sheet: CharacterSheet, poolLength: number): number {
  const id = sheet.hiddenFate.summonId;
  const ids = BEASTMASTER_BEAST_IDS[sheet.resolvedElement];
  const i = id && ids ? ids.indexOf(id) : -1;
  return i >= 0 ? i : formSeed(sheet) % poolLength;
}
function isBeastmasterForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Beastmaster' && Boolean(BEASTMASTER_BEASTS[sheet.resolvedElement]);
}
function buildBeastmasterScene(sheet: CharacterSheet): string {
  const el = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[el];
  const species = BEASTMASTER_BEASTS[el]![beastmasterSpeciesIndex(sheet, BEASTMASTER_BEASTS[el]!.length)];
  const power =
    sheet.rank === 'Ascendant' ? 'OVERWHELMING POWER' : sheet.rank === 'Forged' ? 'ESCALATING POWER' : 'EARLY RESTRAINED POWER';
  const beast =
    sheet.rank === 'Ascendant' ? `a COLOSSAL ${species}, towering, a whole PACK of them massing behind`
    : sheet.rank === 'Forged' ? `a huge ${species} looming beside the beastmaster, the bond blazing`
    : `a ${species}, prowling at the beastmaster's side`;
  return `SCENE — ${power}: a fully-HUMAN beastmaster commands ${beast}; the beast's ENTIRE BODY is COMPOSED OF ${el} (${firstClause(v.materials, 28)}) — NOT a normal animal with a glow, the animal IS ${el}; in ${el} colours ${firstClause(v.primaryColors, 22)}, NO neutral background`;
}

// ---- Lycanthrope form-family (2026-07-24) — Guardians of the Moon Goddess, NOT
// cursed monsters (Bible: identityThrough Duality, "not only an animal", rank ≠
// size/muscle/aggression/dominance). Two axes + a rank-driven progression:
//   • PACK ROLE (seed-picked) — Hunter/Moonkeeper/Scout/Lorekeeper/Guardian/Warden.
//     Role tools/emblem stay visible even in wolf-form (Bible: role inferable).
//   • MOON PHASE (rolled, moonPhaseSeed) — sets WHERE the FOUNDATION card starts on
//     the human→wolf journey (new=human tells … full=already a full wolf). Raheem.
//   • RANK drives the transformation to completion: ALL Lycans END in FULL wolf
//     form by Ascendant (Raheem). The Ascendant wolf is a MAJESTIC GUARDIAN (lunar
//     apotheosis), never a snarling brute — that honors the Bible's "rank ≠ dominance".
// Modesty: the shifted levels (2–4) are DENSE FUR head-to-toe + a torn transformation
// harness — fur is the coverage (same lesson as the Druid bear). The element gets a
// STRIKING lunar manifestation (Raheem). Owns the SCENE so the specific form renders.
const LYCAN_PACK_ROLES: readonly string[] = [
  "a HUNTER of the pack — a bone-tipped hunting spear in hand, trophy-tokens and trail-marks on a reinforced harness",
  "a MOONKEEPER HEALER — a herb-and-remedy satchel and a moon-silver charm at the throat, calm and tending",
  "a SCOUT of the boundary — light and swift, a curved signal-horn and territory trail-marks, alert and watchful",
  "a LOREKEEPER — a pack-knot tapestry-cloak and a bone-etched story-staff, ceremonial and wise",
  "a GUARDIAN — a heavy reinforced war-harness and a boundary-warden's round shield, stalwart",
  "a WARDEN OF THE BOUNDARY — twin territory-stakes and glowing border-runes, holding the tree-line",
];
const LYCAN_MOON_PHASES: readonly string[] = ['new moon', 'crescent moon', 'half moon', 'gibbous moon', 'full moon'];
// index = transformation level 0–4. Raheem 2026-07-24: the werewolf transformation
// TEARS the clothes, so a bare muscular were-torso with TORN CLOTHING remnants is the
// desired look for the shifted forms (2–4) — bare torso is fine there. The HUMAN /
// PARTIAL forms (0–1) stay CLOTHED (not transformed enough to tear). Full form can be
// a bipedal werewolf OR a great four-legged wolf; both read as a Guardian, not a brute.
const LYCAN_FORM_AT_LEVEL: readonly string[] = [
  'a HUMAN pack-guardian in INTACT transformation-ready gear — only subtle wolfish tells (wolf-bright eyes, a fanged canine, a wolfish crest of hair, coarse fur just breaking at the forearms and jaw)',
  'PARTLY shifted — coarse fur spreading over the arms, shoulders and jaw, hands becoming claws, wolfish features rising, clothing STRAINING and beginning to tear but still mostly geared',
  'HALF-SHIFTED — a powerful wolf-headed were-guardian, a muscular fur-and-hide torso, clothing TORN OPEN by the shift (torn shirt and harness remnants hanging off the transformed body), clawed and upright',
  'MOSTLY WOLF — a towering bipedal werewolf guardian, thick fur and muscle, TORN transformation-clothing remnants and the pack-harness still hanging from the transformed body',
  'a FULL LYCAN GUARDIAN — either a mighty bipedal werewolf (muscular, thick fur, TORN clothing remnants and pack role-emblem still worn) OR a great fur-covered four-legged wolf; a noble controlled GUARDIAN of the Moon Goddess, not a rabid brute',
];
function moonPhaseSeed(sheet: CharacterSheet): number {
  // Different salt/field mix than formSeed so pack-role and moon-phase decorrelate.
  const s = `moon:${sheet.hiddenFate.sex ?? ''}|${sheet.hiddenFate.hair ?? ''}|${sheet.hiddenFate.age ?? ''}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function isLycanForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Lycanthrope';
}
function buildLycanScene(sheet: CharacterSheet): string {
  const el = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[el];
  const role = LYCAN_PACK_ROLES[pickFormIndex(sheet, LYCAN_PACK_ROLES.length)];
  const moonStart = moonPhaseSeed(sheet) % LYCAN_MOON_PHASES.length;
  // ALL Lycans END full (level 4) at Ascendant; moon phase sets the Foundation start,
  // rank advances it (+2 at Forged). Foundation full-moon-born already begins full.
  const level = sheet.rank === 'Ascendant' ? 4 : Math.min(4, moonStart + (sheet.rank === 'Forged' ? 2 : 0));
  const form = LYCAN_FORM_AT_LEVEL[level];
  const power =
    sheet.rank === 'Ascendant' ? 'OVERWHELMING POWER' : sheet.rank === 'Forged' ? 'ESCALATING POWER' : 'EARLY RESTRAINED POWER';
  // Pack presence scales with rank = AUTHORITY, not brute size (Bible-safe).
  const pack =
    sheet.rank === 'Ascendant' ? 'LEADING a whole pack of wolf-guardians massed behind'
    : sheet.rank === 'Forged' ? 'a packmate at their side' : 'alone under the night';
  return (
    `SCENE — ${power}: ${role}; ${form}; born under a ${moonPhaseNoun(moonStart)}, ${pack}. ` +
    `STRIKING ${el} manifestation ERUPTING FROM THE BODY — ${el} ${firstClause(v.materials, 30)} wreathing the claws, breath and bared maw, coursing through the fur and gathering as an aura around the guardian, in ${el} colours ${firstClause(v.primaryColors, 24)}; a moon still hangs in the night sky behind but the element strikes on and around the wolf-body itself; ` +
    `the character stays RECOGNIZABLE (their hair-colour in the mane, their eyes and scars kept); painterly hand-painted fantasy card art, NOT photoreal`
  );
}
function moonPhaseNoun(i: number): string {
  return LYCAN_MOON_PHASES[i] ?? 'full moon';
}

// ---- Android form-family (2026-07-24) — identity through PURPOSE + self-authorship
// PAST human form (Bible: "the human form is a chrysalis"; "human-looking end-state
// is a Bible FAILURE for Android"). Rank = INCREASING departure from human: Foundation
// humanoid → Forged silhouette departs (extra limbs / opened panels / fused tools) →
// Ascendant POST-HUMAN radical form driven by the drastic PATH chosen. Two seeds:
// PURPOSE (original function, seed) + PATH (chosen stance, second seed). Element = the
// chassis material/energy. Owns the SCENE. ----
const ANDROID_PURPOSES: readonly string[] = [
  "a GUARDIAN-model (built to protect) — heavy warding shield-plates, a sentinel bearing, a purpose-glyph on the chest",
  "an EXPLORER-model (built to survey) — survey-sensor masts, long-range optics and a cartographer's array",
  "a HEALER-model (built to mend) — precise medical manipulators, remedy-modules and a caduceus purpose-mark",
  "a DIPLOMAT-model (built to speak) — an elegant envoy frame, an expressive face-plate and translator-arrays",
  "an ARTISAN-model (built to make) — fine crafting-manipulators, tool-fingers and a maker's rig of instruments",
  "a LABORER-model (built to haul) — a heavy industrial frame, load-bearing limbs and work-worn plating",
  "a CARETAKER-model (built to tend) — a gentle frame with many soft hands and a tending kit",
  "a WEAPON-model (built to fight) — an armored combat frame, integrated armaments and targeting-optics",
];
const ANDROID_PATHS: readonly string[] = [
  'PROTECT ALL LIFE — a walking FORTRESS-CITADEL machine: a mobile bulwark of layered shield-walls, ramparts and many warding turret-arms; a STRUCTURE, not a figure — no head, no face, no person',
  'DESTROY ALL LIFE — a WAR-ENGINE monstrosity: a bladed, multi-limbed extermination-machine bristling with cannon-spikes and claws; a WAR-MACHINE, not a soldier — no head, no face, no person',
  'BEFRIEND ALL LIFE — a floating SENSOR-SWARM intelligence: a constellation of dozens of drifting sensor-orbs and connective light-filaments with NO central body; a network, not a person — no face',
  'LEAVE ALL LIFE BEHIND — a dispersing CORE-CLOUD: a barely-solid drift of distributed cores, nanite-mist and star-geometry departing into the void; a cloud, not a figure — no body, no face',
];
function pathSeed(sheet: CharacterSheet): number {
  const s = `path:${sheet.hiddenFate.age ?? ''}|${sheet.hiddenFate.skinTone ?? ''}|${sheet.hiddenFate.sex ?? ''}`;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h);
}
function purposeShort(p: string): string {
  const m = p.match(/([A-Z]+)-model/);
  return m ? `a ${m[1].toLowerCase()}-model` : 'its original model';
}
function isAndroidForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Android';
}
function buildAndroidScene(sheet: CharacterSheet): string {
  const el = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[el];
  const purpose = ANDROID_PURPOSES[pickFormIndex(sheet, ANDROID_PURPOSES.length)];
  const chassis = `${firstClause(v.materials, 28)} in ${el} colours ${firstClause(v.primaryColors, 22)}`;
  if (sheet.rank === 'Ascendant') {
    const path = ANDROID_PATHS[pathSeed(sheet) % ANDROID_PATHS.length];
    return (
      `SCENE — OVERWHELMING POWER: a POST-HUMAN android that has SHED all human form — ${path}. ` +
      `Built of ${chassis}. This is a MACHINE STRUCTURE / SWARM, NOT a character — render NO human face, NO head, NO standing humanoid figure, NO woman and NO man; only a faint trace of its origin as ${purposeShort(purpose)}; painterly hand-painted fantasy card art, NOT photoreal`
    );
  }
  if (sheet.rank === 'Forged') {
    return (
      `SCENE — ESCALATING POWER: an android whose silhouette is DEPARTING from human — extra limbs, altered joints, opened chest-panels, sensor-arrays and tools FUSED as body-parts (its maker would no longer recognize it); ${purpose}, of ${chassis}; painterly hand-painted fantasy card art, NOT photoreal`
    );
  }
  return (
    `SCENE — EARLY RESTRAINED POWER: ${purpose}, still largely HUMANOID (the chrysalis shape, reflecting the character's ancestry and features) with only subtle synthetic tells (seams, a panel, luminous eyes, a serial-mark); of ${chassis}; painterly hand-painted fantasy card art, NOT photoreal`
  );
}

// ---- Mech Pilot form-family (2026-07-24) — identity through MACHINE PARTNERSHIP
// (Bible: pilot AND machine are DISTINCT partners; deepen synchronization + machine
// HISTORY across rank — do NOT just enlarge the mech or add weapons; avoid generic
// power armor / cyberpunk neon / Android overlap). DIVISION (seed) picks the machine
// TYPE + pilot gear. Element = the mech's armament. Owns the SCENE. ----
const MECH_DIVISIONS: readonly string[] = [
  "GUARDIANS division — a stalwart bulwark-mech with a great tower-shield and defensive bracing, the pilot in reinforced interface-gear",
  "EXPLORERS division — a long-range survey-walker with sensor-masts, all-terrain legs and expedition stowage, the pilot in a cartographer's rig",
  "RESCUE CORPS — a rescue-mech with grappling arms, floodlights, cutting tools and extraction gear, the pilot in hi-visibility rescue interface-wear",
  "ENGINEERING division — a heavy utility-mech with crane-arms, welding rigs and repair tools, the pilot in a grease-worn technician's harness",
  "RECON UNITS — a light fast scout-mech, streamlined with optics and low-profile lines, the pilot in a lean recon flight-suit",
  "PEACEKEEPING CORPS — a patrol-mech with restraint gear and clear authority-markings (non-lethal), the pilot in a marshal's interface-uniform",
];
function isMechForm(sheet: CharacterSheet): boolean {
  return sheet.archetype === 'Mech Pilot';
}
function buildMechScene(sheet: CharacterSheet): string {
  const el = sheet.resolvedElement;
  const v = ELEMENT_VISUAL_LANGUAGE[el];
  const division = MECH_DIVISIONS[formSeed(sheet) % MECH_DIVISIONS.length];
  const history =
    sheet.rank === 'Ascendant' ? 'a LEGENDARY partnership — the machine a living HISTORY of repairs, mission-tallies and honors, deep synchronization (historically significant, NOT merely bigger or more-armed)'
    : sheet.rank === 'Forged' ? 'a TRUSTED partnership — the machine bears repaired battle-scars, patched wiring and mission-tallies, earned synchronization'
    : 'a NEW pairing — factory-fresh, the pilot still learning the machine, few marks yet';
  const power = sheet.rank === 'Ascendant' ? 'OVERWHELMING POWER' : sheet.rank === 'Forged' ? 'ESCALATING POWER' : 'EARLY RESTRAINED POWER';
  return (
    `SCENE — ${power}: PILOT AND MACHINE together as DISTINCT partners — a ${division}; ${history}. ` +
    `the mech WIELDS ${el} as its armament (${firstClause(v.materials, 24)}) in ${el} colours ${firstClause(v.primaryColors, 20)}; ` +
    `a real BUILT machine of brushed metal, ceramic plating and patched wiring — NOT sleek power-armor, NOT cyberpunk neon, NOT an android; painterly hand-painted fantasy card art, NOT photoreal`
  );
}

function buildElementScenePalette(sheet: CharacterSheet): string {
  if (isNecromancerForm(sheet)) return buildNecromancerFormScene(sheet);
  if (isBeastmasterForm(sheet)) return buildBeastmasterScene(sheet);
  if (isLycanForm(sheet)) return buildLycanScene(sheet);
  if (isAndroidForm(sheet)) return buildAndroidScene(sheet);
  if (isMechForm(sheet)) return buildMechScene(sheet);
  if (isDruidForm(sheet)) return buildDruidFormScene(sheet);
  if (isHumanInfiltrator(sheet)) return buildInfiltratorCamoScene(sheet);
  if (isMonkAllFourAscendant(sheet)) return buildMonkAllFourScene();
  if (isMonkPeaceCosmic(sheet)) return buildMonkPeaceCosmicScene();
  if (isSeraphTwilight(sheet)) return buildSeraphTwilightScene(sheet);
  if (isSeraphFallenAscendant(sheet)) return buildSeraphFallenScene();
  if (isSeraphGoodAscendant(sheet)) return buildSeraphGoodScene();
  if (isVampireRadicalForm(sheet)) return buildVampireRadicalScene(sheet);
  if (isElementless(sheet.archetype)) return buildElementlessScenePalette(sheet);
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
    `SCENE — ${power}; substance of ${firstClause(v.materials, 40)}; rendered in ${el} colours ${v.primaryColors}; ${firstClause(v.atmosphere, 50)}; ` +
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

// Human = the no-element inventor. Its weapon POOL is archetype-level and hands
// out generic melee (a mace + round shield landed on a ninja). So the pooled
// weapon is ignored for Human; instead each Calling gets its OWN defining
// weapon here (or none). A prominent entry matters — the Marksman's rifle is its
// whole silhouette and was vanishing when left to the low-priority wardrobe clause.
// Index order = HUMAN.variants: 0 Artificer, 1 Medic, 2 Scholar, 3 Pacifist,
// 4 Infiltrator, 5 Sky-Corsair, 6 Marksman.
const HUMAN_CALLING_WEAPON: Record<number, string> = {
  5: 'a brass gadget-cutlass at the hip and a brass forearm grapnel-launcher, held ready',
  6: 'a long brass-scoped tech-rifle raised and aimed into the distance — its whole defining silhouette',
};

// 2026-07-23 (Raheem): weapons kept missing the hands or clipping through the
// body. The prompt body is already at the 1450 API cap, so the fix lives in the
// reserved grip cue (below, always survives) + WEAPON_ANATOMY_NEGATIVES, not in
// a longer weapon clause that would evict the BACKGROUND segment.
function buildWeaponClause(sheet: CharacterSheet): string {
  if (isElementless(sheet.archetype)) {
    const idx = sheet.hiddenFate.fashionVariantIndex;
    const w = idx !== undefined ? HUMAN_CALLING_WEAPON[idx] : undefined;
    // Empty for the tool/unarmed callings (Artificer/Medic/Scholar/Pacifist/
    // Infiltrator) — their tools live in the fashion + camo scene.
    return w ? `WEAPON (held and in use, defining silhouette): ${w}, mundane brass-and-steel, no glow, no energy` : '';
  }
  if (!sheet.weapon || !sheet.weapon.trim()) return '';
  // The weapon is a defining silhouette — placed with the pose so the action
  // reads as USING it. §4.4: never "the same sword with a different glow". The
  // weapon is wreathed in the element so it CARRIES the element instead of
  // competing with it for the frame.
  return `WEAPON (held and in use, defining silhouette): ${sheet.weapon}, wreathed in visible ${sheet.resolvedElement} energy`;
}

/** True when this card renders a weapon (so the grip cue + anatomy negatives fire). */
function hasWeapon(sheet: CharacterSheet): boolean {
  return Boolean(buildWeaponClause(sheet).trim());
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
  'underwear as clothing, lingerie, bikini armor, chainmail bikini, sexualized, pin-up, suggestive, ' +
  'extra limbs, extra fingers, fused fingers'; // count-guards reserved so they never truncate

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

// 2026-07-23 (Raheem, EMPHATIC): the whole game is painterly fantasy art —
// actively ban the photoreal drift for EVERY archetype (reverses the old Druid
// photoreal exception). Reserved in the negative lead so it always survives.
const PAINTERLY_NEGATIVES =
  'photorealistic, photograph, hyperrealistic, DSLR photo, 3D render, CGI, octane render';

// 2026-07-23: fix weapons that miss the hand or spear through the body.
const WEAPON_ANATOMY_NEGATIVES =
  'weapon clipping through the body, floating weapon, weapon missing the hand';

/**
 * Elementless (Human) spectacle negatives — same anti-lame targets, but WITHOUT
 * "no visible power / no magic" (that phrasing FORCES magic onto Human, which
 * has none) and WITH hard bans on the sci-fi/arcane/neon look that hijacked the
 * validation (see LEONARDO_PLAYBOOK "element palette SMOTHERS a no-element archetype").
 */
const STEAMPUNK_SPECTACLE_NEGATIVES =
  'static portrait pose, standing still, hands at sides, stiff mannequin, ' +
  'plain background, blank background, studio backdrop, white background, empty backdrop, ' +
  'washed-out, desaturated, muted flat palette, grey daylight scene, ' +
  'glowing energy, arcane aura, magic spell, spell-hands, elemental effect, energy weapon, laser, glowing blade, ' +
  'neon glow, holographic HUD, digital interface, digital matrix rain, teal cyberpunk glow, sci-fi power armor, ' +
  'chrome futurism, clean sterile spacesuit, superhero spandex bodysuit, ' +
  'sailing ship on the ocean, sea galleon on water, ocean waves, naval sea-captain';

/**
 * Leonardo accepts far more than the self-imposed 400 the legacy path uses.
 * The assembler uses a roomier cap so the modesty + spectacle reserves AND a
 * healthy slice of BASE_NEGATIVE all survive.
 */
// Leonardo hard-rejects a negative_prompt over 1000 chars — do not raise this.
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
    : sheet.archetype === 'Monk'
      // Peace must not read as a Seraph; Violence must not read as a hand-glow
      // martial artist; the all-four must not blend to muddy soup.
      ? ', angel wings, feathered wings, feathered halo, angel halo, Christian angel, glowing fists, hand energy blast, ki blast, glowing hands, star wizard casting, Dr Strange spell circles, muddy blended elements, generic martial artist, muscular superhero, superhero bodysuit, spandex bodysuit, cape, chiseled hero physique, comic-book superhero, dynamic power stance'
      : sheet.archetype === 'Seraph'
        // Fallen must not read as a red devil; Good must not read as a paladin;
        // Twilight must stay ONE split figure, not two.
        ? ', red horned devil, cartoon devil horns, demon skull, pentagram, inverted cross, sexy demoness, edgelord goth, fire-orange flame, campfire, generic paladin, knight in plate armor, shiny parade armor, two separate figures, two heads, beautiful young thin angel default'
        : sheet.archetype === 'Druid'
          ? sheet.rank === 'Ascendant'
            // FULL form-break: a non-human plant/animal creature. Branch-antlers
            // are ALLOWED here — only keep modesty (no bare torso/midriff).
            ? ', bare human chest, bare midriff, exposed navel, exposed abs, exposed pecs, leaf bikini, loincloth only, human skin patches'
            // Humanoid tiers: antlers/horns/wings still drift into deer-druid / angel cliché.
            : ', antlers, deer antlers, horns, wings, bare chest, bare midriff, exposed navel, exposed abs, shirtless plant man, leaf bikini, loincloth only'
          : sheet.archetype === 'Lycanthrope'
            // Raheem: bare were-torso is DESIRED (clothes tear on transformation) — do
            // NOT ban it. Only keep it a FURRED werewolf (not a nude human) + drop the
            // rabid-monster read (they are Guardians). Global reserve still bans nipples/genitals.
            ? ', fully nude human, naked human man with no fur, hairless smooth human body, drooling rabid mindless beast'
            : sheet.archetype === 'Android'
              // Bible: human-looking end-state is a FAILURE. Foundation IS humanoid
              // (chrysalis); from Forged on, ban the human silhouette + the chrome-hero cliché.
              ? sheet.rank === 'Foundation'
                ? ', chrome superhero, gundam, sleek sci-fi robot hero'
                : sheet.rank === 'Ascendant'
                  // Ascendant must be POST-HUMAN — hard-ban every humanoid-robot default.
                  ? ', human face, human head, humanoid robot, gynoid, sexy fembot, android woman, handsome android man, two arms two legs robot, chrome superhero, iron man, gundam, power armor man, sleek robot hero, humanoid silhouette'
                  : ', fully human, human silhouette, ordinary human body, chrome superhero, sleek humanoid robot hero, gundam, generic mecha, sexy fembot'
              : sheet.archetype === 'Mech Pilot'
                // Pilot AND machine as distinct partners; a real built machine, not armor.
                ? ', generic power armor, iron man suit, power ranger, cyberpunk neon, glowing android, sleek humanoid robot, the pilot missing, no visible pilot'
                : '';
  const elementless = isElementless(sheet.archetype);
  const spectacleNegatives = elementless ? STEAMPUNK_SPECTACLE_NEGATIVES : SPECTACLE_NEGATIVES;
  const bareChest = allowsBareChest(sheet);
  // Reserved lead (never truncated): anti-shirtless (covered case only) →
  // modesty → anti-lame → element drift bans. Then fill with as much of
  // BASE_NEGATIVE as fits, then the warm-glow tail. In the bare-chest-allowed
  // case the anti-shirtless block is dropped AND the coverage tokens are
  // stripped from the base fill so nothing fights the open-robe cue.
  const chestLead = bareChest ? '' : `${COVERED_CHEST_NEGATIVES}, `;
  // Weapon-anatomy bans only when the card actually renders a weapon.
  const weaponLead = hasWeapon(sheet) ? `, ${WEAPON_ANATOMY_NEGATIVES}` : '';
  const lead = `${chestLead}${CRITICAL_NEGATIVES}, ${PAINTERLY_NEGATIVES}, ${spectacleNegatives}${weaponLead}${elementless ? '' : elementDriftBans}${archetypeBans}`;
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
  // 2026-07-23: bare chest is retired game-wide, and the abstract "fully covered"
  // phrasing kept losing to Phoenix's shirtless prior (validated 3-for-3 failures).
  // Playbook: Phoenix anchors on NOUNS — name the actual closed garment.
  const closedGarment = sheet.hiddenFate.fashion?.primaryGarment || 'a closed high-collared garment';
  const chestCue =
    `torso FULLY CLOTHED in ${firstClause(closedGarment, 42)} closed to the collar, zero exposed chest or midriff`;
  void bareChest;
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
  const reserved = isElementless(sheet.archetype)
    ? `, ${framing}, the character's machines and craft filling the frame`
    : `, ${framing}, ${sheet.resolvedElement} power filling the frame`;
  const body = truncateToLimit(segments.join(', '), PORTRAIT_PROMPT_MAX - reserved.length);

  return {
    portraitPrompt: `${body}${reserved}`,
    negativePrompt: buildNegativePrompt(sheet),
  };
}

// ---------------------------------------------------------------------------
// Workshop snapshot — capture the LIVE Image-Engine surfaces for a proposal
// ---------------------------------------------------------------------------

/**
 * Bump when the assembler's segment PRIORITY ORDER changes, so a proposal's
 * snapshot records which composition rules were in force when it was filed.
 */
const SEGMENT_ORDER_VERSION = '2026-07-21';

const ALL_RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

/** Minimal synthetic sheet used only to sample the archetype hooks for the
 *  snapshot — never rendered. Fresh forge (isEvolution: false), male, default
 *  narrative path so Seraph resolves to its Good/default anchor. */
function probeSheet(archetype: ArchetypeName, rank: Rank): CharacterSheet {
  return {
    hiddenFate: { sex: 'male' } as HiddenFate,
    storyMotifs: [],
    archetype,
    rank,
    resolvedElement: 'Fire',
    pose: '',
    diversityAxis: '',
    isEvolution: false,
    abilityRefs: [],
  };
}

/**
 * Snapshot the Image-Engine surfaces the deterministic assembler actually reads
 * for an archetype, for the Workshop LayerSnapshot. Replaces the retired
 * getVisualMotif/getMetaPromptBlock capture. `element` scopes the element
 * handling to the critiqued card when known; otherwise fire-family is reported
 * for the probe default. Hook outputs are sampled per rank; `sampled` flags a
 * rank whose hook uses Math.random (Vampire feral) so a reviewer treats the
 * captured string as illustrative, not canon.
 */
export function buildImageEngineSnapshot(
  archetype: ArchetypeName,
  opts?: { element?: ElementName },
): ImageEngineSnapshot {
  const element = opts?.element ?? 'Fire';
  const v = ELEMENT_VISUAL_LANGUAGE[element];
  const hookOutputs = ALL_RANKS.map((rank) => {
    const s = probeSheet(archetype, rank);
    return {
      rank,
      posePrefix: hookPosePrefix(s) ?? '',
      mandatorySegment: hookMandatorySegment(s),
      narrativeAnchor: hookNarrativeAnchor(s),
      // Vampire's feral posePrefix is the only randomised hook, at fresh Foundation.
      sampled: archetype === 'Vampire' && rank === 'Foundation',
    };
  });
  return {
    styleLead: styleLeadFor(archetype),
    hookOutputs,
    weaponPoolSample: getWeaponPool(archetype).slice(0, 4).map((w) => w.id),
    environmentPoolSample: getEnvironmentPool(archetype).slice(0, 4).map((e) => e.id),
    posePoolSample: getPosePool(archetype, 'Foundation').slice(0, 4),
    companionPoolSample: getCompanionPool(archetype).slice(0, 4).map((c) => c.id),
    elementHandling: {
      element,
      fireFamily: FIRE_FAMILY_ELEMENTS.includes(element),
      // The element-language fields the assembler actually reads for the render.
      consumedFields: (
        [
          ['motion', v.motion],
          ['lighting', v.lighting],
          ['primaryColors', v.primaryColors],
          ['atmosphere', v.atmosphere],
        ] as const
      )
        .filter(([, val]) => Boolean(val))
        .map(([k]) => k),
    },
    globalRules:
      `segment-order ${SEGMENT_ORDER_VERSION}; negative leads: CRITICAL + ` +
      `${archetype === 'Druid' ? 'Druid growth-suppressors dropped; ' : ''}` +
      `COVERED_CHEST + PAINTERLY (anti-photoreal, all archetypes) + SPECTACLE; ` +
      `bare-chest: retired game-wide (always clothed); ` +
      `style: painterly fantasy (no photoreal, all archetypes)`,
  };
}
