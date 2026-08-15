import { ARCHETYPE_NAMES, type ArchetypeName } from '../../card-engine/src/types/card';
import { ELEMENT_NAMES, type ElementName } from '../../card-engine/src/types/bible';

export type TruthStatus = 'SHIPPED' | 'IN FLIGHT' | 'PLANNED' | 'PARKED' | 'APPROVED' | 'MISSING ASSET';

/**
 * How the Wiki presents each archetype. The *set* of archetypes is not decided
 * here — it comes from the game's `ARCHETYPE_NAMES`. Because this is a
 * `Record<ArchetypeName, …>`, adding a twelfth archetype to the game fails the
 * Wiki's typecheck until someone writes its emblem and identity line.
 *
 * That is deliberate. The Wiki used to keep its own hand-copied list, which
 * happened to be correct but had nothing keeping it correct.
 */
const ARCHETYPE_PRESENTATION: Record<ArchetypeName, { emblem: string; symbol: string; identity: string }> = {
  Barbarian: { emblem: 'barbarian.jpg', symbol: 'Blood-Iron clan crest', identity: 'ATK-led warrior tradition' },
  Monk: { emblem: 'monk.jpg', symbol: 'Circular monastery seal', identity: 'Discipline made visible' },
  Beastmaster: { emblem: 'beastmaster.jpg', symbol: 'Ceremonial beast totem', identity: 'Bond before command' },
  Druid: { emblem: 'druid.jpg', symbol: 'Rootweaver open hand', identity: 'Nature as relationship' },
  Necromancer: { emblem: 'necromancer.jpg', symbol: 'Skull and black crescent', identity: 'Memory, cost, and the dead' },
  Vampire: { emblem: 'vampire.jpg', symbol: 'Blood-moon relic', identity: 'Hunger under control' },
  Lycanthrope: { emblem: 'lycanthrope.jpg', symbol: 'Wolf over the silver moon', identity: 'Pack trust and lunar duty' },
  'Mech Pilot': { emblem: 'mech-pilot.jpg', symbol: 'Techno-arcane pilot helm', identity: 'Human judgment inside machinery' },
  Android: { emblem: 'android.png', symbol: 'Synthetic mechanical eye', identity: 'Personhood beyond origin' },
  Seraph: { emblem: 'seraph.jpg', symbol: 'Six-winged celestial mask', identity: 'A contested divine spark' },
  Human: { emblem: 'human.jpg', symbol: 'Fingerprint-ridge knight', identity: 'Adaptability without destiny' },
};

/** `[name, emblemFile, symbol, identity]`, in the game's own canonical order. */
export const archetypes = ARCHETYPE_NAMES.map(
  (name) => [name, ARCHETYPE_PRESENTATION[name].emblem, ARCHETYPE_PRESENTATION[name].symbol, ARCHETYPE_PRESENTATION[name].identity] as const,
);

export type CardEvidenceState = 'present' | 'review' | 'missing';
export type CardRecordKind = 'candidate' | 'study';

export type DevelopmentCardRecord = {
  id: string;
  name: string;
  title: string;
  archetype: (typeof archetypes)[number][0];
  kind: CardRecordKind;
  fixture: string;
  heroImage: string;
  heroKind: 'complete-card' | 'portrait';
  summary: string;
  lore?: string;
  stats?: { Atk: number; Def: number; Mana?: number; Tech?: number; resourceBias?: string };
  abilitySlots?: readonly { abilityId: string; fixtureSlot: 'core' | 'signature' | 'ultimate' }[];
  tiers: readonly { rank: 'Foundation' | 'Forged' | 'Ascendant'; image?: string; note: string }[];
  readiness: readonly { label: string; state: CardEvidenceState; note: string }[];
  notes: readonly string[];
  sources: readonly string[];
};

const missingTier = (rank: 'Foundation' | 'Forged' | 'Ascendant') => ({
  rank,
  note: 'No rank-specific card or portrait is attached to this repository record.',
});

export const developmentCards: readonly DevelopmentCardRecord[] = [
  {
    id: 'gryndak',
    name: 'Gryndak',
    title: 'Gryndak, the Half-Claimed',
    archetype: 'Barbarian',
    kind: 'candidate',
    fixture: 'Battle Tower seed party',
    heroImage: '/assets/dev-portraits/Ashvara.jpg',
    heroKind: 'complete-card',
    summary: 'A low-Mana, attack-led battle fixture with a complete three-slot loadout.',
    lore: 'Half his blood answered a whisper before the pact was sealed. He does not name what watches him.',
    stats: { Atk: 62, Def: 55, Mana: 30, resourceBias: 'Very Low' },
    abilitySlots: [
      { abilityId: 'ability_thornmantle', fixtureSlot: 'core' },
      { abilityId: 'ability_oathbreakers_answer', fixtureSlot: 'signature' },
      { abilityId: 'ability_the_name_they_left_me', fixtureSlot: 'ultimate' },
    ],
    tiers: [missingTier('Foundation'), missingTier('Forged'), missingTier('Ascendant')],
    readiness: [
      { label: 'Identity continuity', state: 'missing', note: 'Only one rendered artifact exists; no locked three-rank identity record is attached.' },
      { label: 'Complete card metadata', state: 'review', note: 'Battle stats, lore, and loadout exist; Story Pillars, element bond, Hidden Fate, and evolution history do not.' },
      { label: 'Tier coverage', state: 'missing', note: 'Foundation, Forged, and Ascendant evidence is not mapped.' },
      { label: 'Art quality review', state: 'review', note: 'The complete card is useful development evidence but has not passed the current visual standard.' },
      { label: 'Reproducible provenance', state: 'present', note: 'The fixture and committed card image have repository source paths.' },
      { label: 'Gameplay evidence', state: 'present', note: 'Used by the deterministic Battle Tower development seed party.' },
      { label: 'Human acceptance', state: 'missing', note: 'No permanent-card acceptance has been recorded.' },
    ],
    notes: [
      'Reconcile the fixture stats with the different values printed on the rendered card before evaluation.',
      'Thornmantle is assigned as a core slot here, while the canonical ability record defines it as a Druid signature; decide whether this is intentional test coverage or a loadout error.',
      'Create a Bible-era identity record and a true Foundation-to-Ascendant continuity set before permanent review.',
    ],
    sources: ['card-engine/src/pages/DevSeedBattle.tsx', 'card-engine/public/assets/dev-portraits/Ashvara.jpg'],
  },
  {
    id: 'seojin',
    name: 'Seojin',
    title: 'Seojin, Lycanthrope of the Infinite',
    archetype: 'Lycanthrope',
    kind: 'candidate',
    fixture: 'Battle Tower seed party',
    heroImage: '/assets/dev-portraits/Seojin.jpg',
    heroKind: 'complete-card',
    summary: 'A defense-led Lycanthrope fixture built to exercise a moderate resource profile.',
    lore: 'Once, she ran only under one moon. The pack sings her name in three tongues now.',
    stats: { Atk: 45, Def: 68, Mana: 58, resourceBias: 'Mid' },
    abilitySlots: [
      { abilityId: 'ability_inherited_guard', fixtureSlot: 'core' },
      { abilityId: 'ability_bearing_witness', fixtureSlot: 'signature' },
      { abilityId: 'ability_the_name_they_left_me', fixtureSlot: 'ultimate' },
    ],
    tiers: [missingTier('Foundation'), missingTier('Forged'), missingTier('Ascendant')],
    readiness: [
      { label: 'Identity continuity', state: 'missing', note: 'No three-rank identity sequence is attached to the fixture.' },
      { label: 'Complete card metadata', state: 'review', note: 'Battle stats, lore, and loadout exist; Bible-era generation facts are absent.' },
      { label: 'Tier coverage', state: 'missing', note: 'Foundation, Forged, and Ascendant evidence is not mapped.' },
      { label: 'Art quality review', state: 'review', note: 'The rendered artifact needs human review against current Lycanthrope identity and card standards.' },
      { label: 'Reproducible provenance', state: 'present', note: 'The fixture and committed card image have repository source paths.' },
      { label: 'Gameplay evidence', state: 'present', note: 'Used by the deterministic Battle Tower development seed party.' },
      { label: 'Human acceptance', state: 'missing', note: 'No permanent-card acceptance has been recorded.' },
    ],
    notes: [
      'Reconcile the fixture stats with the different ATK and DEF values printed on the rendered card.',
      'The current loadout pulls from Barbarian and Seraph ability families rather than the Lycanthrope family; evaluate it as test coverage, not a canonical kit.',
      'Verify that future rank art preserves the same person and expresses pack trust and lunar duty rather than automatic bestial escalation.',
    ],
    sources: ['card-engine/src/pages/DevSeedBattle.tsx', 'card-engine/public/assets/dev-portraits/Seojin.jpg'],
  },
  {
    id: 'ashvara',
    name: 'Ashvara',
    title: 'Ashvara, the Void-Synchronized',
    archetype: 'Necromancer',
    kind: 'candidate',
    fixture: 'Battle Tower seed party',
    heroImage: '/assets/dev-portraits/Gryndak.jpg',
    heroKind: 'complete-card',
    summary: 'A resource-rich Necromancer fixture with a complete three-slot battle loadout.',
    lore: 'She keeps her prayers unfinished so the dead have somewhere to arrive.',
    stats: { Atk: 55, Def: 45, Mana: 82, resourceBias: 'Very High' },
    abilitySlots: [
      { abilityId: 'ability_inherited_guard', fixtureSlot: 'core' },
      { abilityId: 'ability_bearing_witness', fixtureSlot: 'signature' },
      { abilityId: 'ability_the_name_they_left_me', fixtureSlot: 'ultimate' },
    ],
    tiers: [missingTier('Foundation'), missingTier('Forged'), missingTier('Ascendant')],
    readiness: [
      { label: 'Identity continuity', state: 'missing', note: 'No three-rank identity sequence is attached to the fixture.' },
      { label: 'Complete card metadata', state: 'review', note: 'Battle stats, lore, and loadout exist; Bible-era generation facts are absent.' },
      { label: 'Tier coverage', state: 'missing', note: 'Foundation, Forged, and Ascendant evidence is not mapped.' },
      { label: 'Art quality review', state: 'missing', note: 'The current portrait conflicts with the project-wide modesty standard and cannot be promoted as-is.' },
      { label: 'Reproducible provenance', state: 'present', note: 'The fixture and committed card image have repository source paths.' },
      { label: 'Gameplay evidence', state: 'present', note: 'Used by the deterministic Battle Tower development seed party.' },
      { label: 'Human acceptance', state: 'missing', note: 'No permanent-card acceptance has been recorded.' },
    ],
    notes: [
      'Replace or revise the portrait so the character is covered from neck to feet under the current M5.7 rule.',
      'Reconcile the fixture stats with the different values printed on the rendered card.',
      'The current loadout uses Barbarian and Seraph-family abilities; author and test a Necromancer-coherent kit before permanent review.',
    ],
    sources: ['card-engine/src/pages/DevSeedBattle.tsx', 'card-engine/public/assets/dev-portraits/Gryndak.jpg'],
  },
  {
    id: 'kael',
    name: 'Kael',
    title: 'Kael, the Unbroken',
    archetype: 'Barbarian',
    kind: 'candidate',
    fixture: 'Homepage demo fixture',
    heroImage: '/portraits/sample/raheem_ascendant.jpg',
    heroKind: 'portrait',
    summary: 'The original homepage demo character and the repository’s only named three-rank portrait sequence.',
    lore: 'Born in the volcanic trenches of the Ashlands, Kael earned every scar before his fifteenth winter.',
    stats: { Atk: 88, Def: 52, Mana: 22 },
    tiers: [
      { rank: 'Foundation', image: '/portraits/sample/raheem_foundation.jpg', note: 'Legacy sample portrait; duplicated under assets/portraits/barbarian_foundation_1.jpg.' },
      { rank: 'Forged', image: '/portraits/sample/raheem_forged.jpg', note: 'Legacy sample portrait; duplicated under assets/portraits/barbarian_forged_1.jpg.' },
      { rank: 'Ascendant', image: '/portraits/sample/raheem_ascendant.jpg', note: 'Homepage portrait; duplicated under assets/portraits/barbarian_ascendant_1.jpg.' },
    ],
    readiness: [
      { label: 'Identity continuity', state: 'review', note: 'Three visually related portraits exist, but locked identity fields and a continuity review are not recorded.' },
      { label: 'Complete card metadata', state: 'review', note: 'Name, archetype, stats, and legacy lore exist; Story Pillars, element bond, Hidden Fate, abilities, and provenance are incomplete.' },
      { label: 'Tier coverage', state: 'present', note: 'Foundation, Forged, and Ascendant portrait evidence exists.' },
      { label: 'Art quality review', state: 'missing', note: 'Foundation and Forged portraits expose the torso and fail the current M5.7 modesty rule.' },
      { label: 'Reproducible provenance', state: 'review', note: 'Committed assets exist, but modern generation inputs and approval records are absent.' },
      { label: 'Gameplay evidence', state: 'missing', note: 'This card demonstrates rendering on the homepage; it is not part of the Battle Tower seed party.' },
      { label: 'Human acceptance', state: 'missing', note: 'Homepage visibility is not permanent-card acceptance.' },
    ],
    notes: [
      'Treat this as a legacy homepage fixture, not as a nearly approved card.',
      'Regenerate the rank sequence under current identity-continuity and modesty rules before visual evaluation.',
      'Add Story Pillars, element bond, Hidden Fate, abilities, evolution history, and generation provenance before permanent review.',
    ],
    sources: ['card-engine/src/pages/Home.tsx', 'card-engine/public/portraits/sample/'],
  },
  {
    id: 'druid-tier-study',
    name: 'Unnamed Druid',
    title: 'Druid three-rank art study',
    archetype: 'Druid',
    kind: 'study',
    fixture: 'Portrait generator fallback study',
    heroImage: '/assets/portraits/druid_ascendant_1.jpg',
    heroKind: 'portrait',
    summary: 'A complete visual progression study with no named card record attached.',
    tiers: [
      { rank: 'Foundation', image: '/assets/portraits/druid_foundation_1.jpg', note: 'Also committed as portraits/sample/tori_sample.jpg.' },
      { rank: 'Forged', image: '/assets/portraits/druid_forged_1.jpg', note: 'Visual study only; no rank-specific card metadata is attached.' },
      { rank: 'Ascendant', image: '/assets/portraits/druid_ascendant_1.jpg', note: 'Visual study only; no rank-specific card metadata is attached.' },
    ],
    readiness: [
      { label: 'Identity continuity', state: 'review', note: 'The same visual identity appears across three ranks, but no locked identity record or human continuity verdict is attached.' },
      { label: 'Complete card metadata', state: 'missing', note: 'No name, lore, Story Pillars, stats, element bond, abilities, or card ID is attached.' },
      { label: 'Tier coverage', state: 'present', note: 'Foundation, Forged, and Ascendant portrait evidence exists.' },
      { label: 'Art quality review', state: 'review', note: 'The study is available for human visual review; no acceptance verdict is recorded.' },
      { label: 'Reproducible provenance', state: 'review', note: 'Fallback paths are committed, but modern generation inputs are not recorded here.' },
      { label: 'Gameplay evidence', state: 'missing', note: 'No playable card or battle fixture is attached.' },
      { label: 'Human acceptance', state: 'missing', note: 'This is not yet a card and cannot enter the permanent roster.' },
    ],
    notes: [
      'Decide whether this visual identity should become a named character before doing card-level work.',
      'If retained, create the immutable character facts first, then evaluate whether the three portraits preserve them.',
      'Do not infer lore, stats, elements, or abilities from the art alone.',
    ],
    sources: ['card-engine/src/services/portraitGenerator.ts', 'card-engine/public/assets/portraits/druid_*_1.jpg'],
  },
] as const;

export type PermanentCard = {
  name: string;
  title: string;
  archetype: (typeof archetypes)[number][0];
  image: string;
  acceptedAt: string;
};

// This list is intentionally human-governed. File, asset, or database presence
// never promotes a card into the permanent game roster.
export const permanentCards: readonly PermanentCard[] = [];

export type ElementPerformance = {
  slug: string;
  name: string;
  charge: 'pool' | 'flame' | 'bloom' | 'halo' | 'ground' | 'motes' | 'crystallize' | 'contained';
  delivery: 'jet' | 'wisp' | 'creep' | 'volley' | 'growth' | 'lunge' | 'barrier' | 'unmapped';
  impact: string;
  palette: readonly [string, string, string];
  streamAnimated?: boolean;
  impactAnimated?: boolean;
  crystal?: string;
  artStatus: 'candidate' | 'procedural' | 'missing';
};

type PerformanceSpec = [
  charge: ElementPerformance['charge'],
  delivery: ElementPerformance['delivery'],
  impact: string,
  palette: ElementPerformance['palette'],
  options?: Partial<Pick<ElementPerformance, 'streamAnimated' | 'impactAnimated' | 'crystal' | 'artStatus'>>,
];

const performance = (name: ElementName, spec: PerformanceSpec | undefined): ElementPerformance => {
  if (!spec) {
    // Reachable when the game adds an element and the Wiki has not been taught how
    // to show it. TypeScript catches this first; this covers the untyped paths and,
    // more importantly, says what to do instead of failing on a destructure.
    throw new Error(
      `The game defines the element "${name}" but the Studio Wiki has no performance for it. ` +
        'Add an entry to ELEMENT_PERFORMANCE in studio-wiki/src/content.ts (charge, delivery, impact, palette).',
    );
  }
  const [charge, delivery, impact, palette, options = {}] = spec;
  const slug = name.toLowerCase();
  return {
    slug,
    name,
    charge,
    delivery,
    impact,
    palette,
    streamAnimated: options.streamAnimated ?? true,
    impactAnimated: options.impactAnimated ?? true,
    crystal: options.crystal === undefined ? `/assets/elements/${slug}.jpg` : options.crystal,
    artStatus: options.artStatus ?? 'candidate',
  };
};

/**
 * Wiki-facing projection of the committed Ability Performance material table
 * (`ability-performance-system` @ c39304f). The combat branch remains the
 * canonical runtime source; this compact record gives the independent Wiki a
 * stable, reviewable index without importing game logic or uncommitted battle
 * integration.
 */
/**
 * As with archetypes: the *set* of elements comes from the game's `ELEMENT_NAMES`,
 * and this record only says how each one is presented. Add a thirtieth element to
 * the game and the Wiki stops typechecking until its charge, delivery, impact, and
 * palette are authored — which is the point. A Wiki that quietly omits an element
 * is worse than one that refuses to build.
 */
const ELEMENT_PERFORMANCE: Record<ElementName, PerformanceSpec> = {
  Fire: ['flame', 'wisp', 'spreading sheet', ['#ffd88a', '#e8541c', '#3a1408']],
  Water: ['pool', 'jet', 'foam crown', ['#0e5a72', '#2aa6c4', '#eaf7fb']],
  Earth: ['ground', 'jet', 'splintering stone', ['#6b6459', '#3f382e', '#c9a227'], { impactAnimated: false }],
  Wind: ['motes', 'wisp', 'gust scatter', ['#8fbf9e', '#c9e8d6', '#eaf9f2']],
  Ice: ['motes', 'jet', 'shard burst', ['#a8d8e8', '#4a9bc4', '#eaf9ff']],
  Storm: ['motes', 'wisp', 'radial stormbreak', ['#4a5568', '#7a8fa8', '#eaf2ff']],
  Nature: ['bloom', 'growth', 'root bloom', ['#1e3d1a', '#4a7c2f', '#c9a227']],
  Beast: ['ground', 'lunge', 'four-claw break', ['#8a6b47', '#4a3826', '#e8b923']],
  Blood: ['pool', 'jet', 'wet splatter', ['#7d1220', '#c8203a', '#f2b8bd'], { impactAnimated: false }],
  Poison: ['pool', 'creep', 'toxic fan', ['#5a7a1a', '#4a2a5a', '#c4d43a']],
  Metal: ['motes', 'jet', 'metallic burst', ['#8a8f96', '#c4a668', '#e8c468'], { impactAnimated: false }],
  Spirit: ['halo', 'wisp', 'engulfing spirit', ['#a8c4d8', '#e8f4f8', '#f8fbff']],
  Shadow: ['motes', 'wisp', 'ink bloom', ['#1a1424', '#4a3a63', '#9d8fb5'], { impactAnimated: false }],
  Light: ['halo', 'jet', 'sunburst', ['#fff4d4', '#e8d488', '#ffffff']],
  Holy: ['halo', 'barrier', 'refracting ward', ['#f7e7a8', '#d9a625', '#fffdf2'], { streamAnimated: false, impactAnimated: false, artStatus: 'procedural' }],
  Void: ['motes', 'wisp', 'unmaking bloom', ['#0a0612', '#3a1a52', '#8a4ac9']],
  Time: ['motes', 'unmapped', 'not authored', ['#3b1152', '#c026d3', '#fce7ff'], { streamAnimated: false, impactAnimated: false, crystal: '', artStatus: 'missing' }],
  Cosmic: ['halo', 'wisp', 'nebula bloom', ['#1a1a3a', '#4a3a6a', '#f0c848']],
  Psychic: ['motes', 'jet', 'psychic pulse', ['#7a3a9a', '#c44ab8', '#c896e8']],
  Moon: ['motes', 'jet', 'silver crown', ['#c8d4e8', '#2a3a5a', '#f0f4ff']],
  Dream: ['motes', 'wisp', 'nightmare bloom', ['#0d0512', '#3a1550', '#a855e8']],
  Bone: ['motes', 'volley', 'bone splinter', ['#e8e0d0', '#8a8478', '#6ac4a8'], { streamAnimated: false, impactAnimated: false }],
  Nocturne: ['halo', 'wisp', 'blood-moon veil', ['#4a0f18', '#8a1428', '#c4a8a8']],
  Sanguine: ['crystallize', 'volley', 'garnet shatter', ['#8c0f2a', '#d4224a', '#ffd9e2'], { streamAnimated: false, impactAnimated: false }],
  Lunar: ['halo', 'wisp', 'silver flare', ['#f0f4ff', '#a8c4e8', '#ffffff']],
  Plasma: ['contained', 'jet', 'contained flare', ['#e8f8ff', '#4a1a8a', '#8affff']],
  Nanite: ['motes', 'volley', 'swarm burst', ['#c4c8cc', '#6a6e74', '#4ae8e8'], { streamAnimated: false, impactAnimated: false }],
  Prism: ['motes', 'wisp', 'prismatic flare', ['#f8f4ff', '#4ae8c8', '#e84ac8']],
  Infernal: ['pool', 'jet', 'molten starburst', ['#ffb347', '#7a2408', '#1a0f0a']],
};

export const elements = ELEMENT_NAMES.map((name) => performance(name, ELEMENT_PERFORMANCE[name]));

export const bossStates = [
  { id: 'idle', file: 'idle', frames: 5, fps: 3, loop: true, label: 'Idle' },
  { id: 'windup', file: 'windup', frames: 7, fps: 8, loop: true, label: 'Windup' },
  { id: 'attack', file: 'smash', frames: 7, fps: 11, loop: false, label: 'Attack' },
  { id: 'ultimate', file: 'ultimate', frames: 7, fps: 7, loop: true, label: 'Ultimate' },
  { id: 'rage', file: 'ablaze', frames: 7, fps: 6, loop: true, label: 'Rage' },
  { id: 'hit', file: 'hit', frames: 5, fps: 13, loop: false, label: 'Hit' },
  { id: 'defeat', file: 'defeat', frames: 7, fps: 8, loop: false, label: 'Defeat' },
] as const;

export const navigation = [
  { group: 'Explore', items: [['/', 'Studio Home'], ['/characters', 'Characters & Archetypes'], ['/bosses', 'Bosses & Arenas'], ['/characters/cards', 'Cards'], ['/elements', 'Elements'], ['/abilities', 'Abilities'], ['/world', 'Game World'], ['/interface', 'Interface & Menus'], ['/minigames', 'Battle Tower']] },
  { group: 'Production', items: [['/production', 'Current Build'], ['/code-atlas', 'Code Atlas'], ['/studio', 'AI Studio Handbook'], ['/assets', 'Art & Assets'], ['/workshops', 'Workshops'], ['/decisions', 'Decision Log'], ['/technical', 'Technical Systems'], ['/archive', 'Archive']] },
  { group: 'Work Board', items: [['/work/advice', 'AI Advice'], ['/work/active', 'Active Work'], ['/work/required', 'Required & Deferred'], ['/work/tori', "Tori's Desk"], ['/work/raheem', "Raheem's Desk"]] },
] as const;

export const searchEntries = [
  { path: '/characters', title: 'Characters & Archetypes', text: 'eleven emblems cards heroes ranks foundation forged ascendant' },
  { path: '/characters/cards', title: 'Cards', text: 'tested development artifacts permanent archetype cards accepted into game roster examples learning' },
  { path: '/bosses', title: 'Bosses & Arenas', text: 'Battle Tower floors Debt-Bearer Still Season PixelLab idle windup attack ultimate rage hit defeat' },
  { path: '/elements', title: 'Elements', text: '29 element crystals PixelLab charge delivery stream volley growth impact blast combat performance material language' },
  { path: '/abilities', title: 'Abilities', text: 'ability codex canonical roster core signature ultimate role family resource effects version artwork' },
  { path: '/world', title: 'Game World', text: 'castle courtyard v2 pending forge quadrant chibi footsteps dust colliders occluders Phaser Leonardo PixelLab Figma' },
  { path: '/interface', title: 'Interface & Menus', text: 'pixel UI kit stall menus collection forge codex panel button bar slot scrim scroll doorway pause menu card detail retiring web pages PixelLab chrome' },
  { path: '/minigames', title: 'Battle Tower', text: 'primary game mode floors party cards boss intent attack mana tech elements guard strike abilities' },
  { path: '/production', title: 'Current Build', text: 'production status open threads priorities shipped in flight' },
  { path: '/code-atlas', title: 'Code Atlas', text: 'where do I go code map folders files pages components services data assets castle battle combat collection forge codex minigames admin dev beginner' },
  { path: '/studio', title: 'AI Studio Handbook', text: 'coworker onboarding workflow accounts Figma Leonardo idea plan create build connect prove release agents skills evidence human approval' },
  { path: '/assets', title: 'Art & Assets', text: 'asset catalog OpenNest web previews provenance approved candidate missing' },
  { path: '/workshops', title: 'Workshops', text: 'harnesses sprite lab background arena prompt lab visual playtest' },
  { path: '/decisions', title: 'Decision Log', text: 'append-only historical rationale why decisions governance canonical source truth' },
  { path: '/technical', title: 'Technical Systems', text: 'React Vite Supabase Phaser Leonardo PixelLab architecture' },
  { path: '/work/advice', title: 'AI Advice', text: 'recommendations priorities goals questions improve game Codex Claude advice next' },
  { path: '/work/active', title: 'Active Work', text: 'ongoing tasks in progress live branches current work status owners blockers checkpoints' },
  { path: '/work/required', title: 'Required & Deferred', text: 'open threads required blocked deferred sidestepped later functional gaps unfinished work' },
  { path: '/work/tori', title: "Tori's Desk", text: 'lore assignments bosses telegraphs move names archetype voice canon review Tori lore desk moved admin writing' },
  { path: '/work/raheem', title: "Raheem's Desk", text: 'private ideas notebook capture remember focus notes not tasks' },
];
