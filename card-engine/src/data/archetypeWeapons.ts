import type { ArchetypeName, Rank } from '../types/card';

/**
 * Curated per-archetype weapon pools with a three-tier visual evolution, from
 * Archetype_Weapon_and_Companion_Reference.md (families) +
 * Archetype_Weapon_and_Companion_Upgrade_Paths.md (per-rank progression).
 *
 * A weapon is rolled from the pool at Foundation and LOCKED across ranks — it
 * stays the SAME weapon family, but its descriptor GROWS per rank (Ritual →
 * Soul-Bound → Death-Sovereign for Necromancer). Descriptors are element-neutral
 * (the element wreath is added by the assembler from the card's element) and
 * avoid the §4.4 "same sword with a different glow" trap.
 */
export interface WeaponEntry {
  /** Stable id used to persist the locked weapon across ranks. */
  id: string;
  name: string;
  /** Full visual descriptor per rank — same family, visibly upgraded. */
  byRank: Record<Rank, string>;
}

const NECROMANCER_WEAPONS: readonly WeaponEntry[] = [
  {
    id: 'grave_scythe',
    name: 'Grave Scythe',
    byRank: {
      Foundation: 'a Grave Scythe — a long curved polearm of blackened funeral steel and bone, faint grave-runes, contained and practical',
      Forged: 'the SAME Grave Scythe, now Soul-Bound — its edge exhaling pale spirit-vapor, grave-runes lit, cutting curses as well as flesh (unmistakably the same scythe, upgraded)',
      Ascendant: 'the SAME Grave Scythe, now Death-Sovereign — a chorus of bound spectral names circling the blade, cold radiance along the edge (the same scythe at mythic power)',
    },
  },
  {
    id: 'reliquary_staff',
    name: 'Reliquary Staff',
    byRank: {
      Foundation: 'a Reliquary Staff — a tall staff with a sealed relic chamber holding one fragment of bone or memory, contained',
      Forged: 'the SAME Reliquary Staff, now Soul-Bound — its reliquary awakened, an advising spirit’s face flickering within the crystal',
      Ascendant: 'the SAME Reliquary Staff, now Death-Sovereign — several luminous ancestor-memories orbiting the staff, each an individual face',
    },
  },
  {
    id: 'soul_lantern',
    name: 'Soul Lantern',
    byRank: {
      Foundation: 'a Soul Lantern — an iron-and-glass lantern on a bone pole that reveals nearby spirit-traces, still and empty',
      Forged: 'the SAME Soul Lantern, now Soul-Bound — one captured soul burning inside as a cold guiding flame',
      Ascendant: 'the SAME Soul Lantern, now Death-Sovereign — a stable constellation of individually visible souls powering it',
    },
  },
  {
    id: 'mourning_bell',
    name: 'Mourning Bell',
    byRank: {
      Foundation: 'a Mourning Bell — a dark tarnished-bronze handbell on a carved bone handle whose tone exposes hidden spirits',
      Forged: 'the SAME Mourning Bell, now Soul-Bound — each ring releasing visible memory-ripples and summoning a chosen dead witness',
      Ascendant: 'the SAME Mourning Bell, now Death-Sovereign — tolling without being struck, the veil itself resonating around it',
    },
  },
  {
    id: 'epitaph_blade',
    name: 'Epitaph Blade',
    byRank: {
      Foundation: 'an Epitaph Blade — a straight double-edged one-handed SWORD (never an axe) of dull funerary steel, the names of the dead scratched down the blade, contained',
      Forged: 'the SAME Epitaph Blade (a straight double-edged SWORD, never an axe), now Soul-Bound — fresh inscriptions glowing along the blade as it records final memories mid-strike',
      Ascendant: 'the SAME Epitaph Blade (a straight double-edged SWORD), now Death-Sovereign — spectral echoes of every recorded bearer manifesting along the long blade',
    },
  },
];

// Druid weapons — "grown, cultivated, reclaimed" (reference doc §Druid). Rank
// path Grown → Awakened → Elder-Grove. Deliberately avoid the bare word "wood"
// (Raheem 2026-07-21) — broad LIVING-PLANT material so Leonardo picks the form
// (living growth, sprouting shoots, fungi, blossom, sap-light). Element-neutral;
// the assembler wreathes it in the card's element.
const DRUID_WEAPONS: readonly WeaponEntry[] = [
  {
    id: 'living_staff',
    name: 'Living Staff',
    byRank: {
      Foundation: 'a Living Staff — a tall gnarled living-plant focus, dormant growth curled along its length, a nature-gem cradled at the crown, grounded and practical',
      Forged: 'the SAME Living Staff, now Awakened — fresh leaves, shoots and sap-light unfurling along its length as it channels, small blossoms opening at the crown (unmistakably the same staff, now alive)',
      Ascendant: 'the SAME Living Staff, now Elder-Grove — a mobile bough of an ancient grove, heavy with leaves, fungi and blossom, visibly reshaping the growth around the wielder (the same staff at mythic power)',
    },
  },
  {
    id: 'thorn_sickle',
    name: 'Thorn Sickle',
    byRank: {
      Foundation: 'a Thorn Sickle — a curved harvesting blade of hardened living-plant matter edged with thorns, grounded and practical',
      Forged: 'the SAME Thorn Sickle, now Awakened — its thorned edge running with sap-light and fresh briar-growth, power gathering along the striking curve (the same sickle, alive)',
      Ascendant: 'the SAME Thorn Sickle, now Elder-Grove — a grove-blessed reaping blade trailing blossom and spores, reshaping the growth it sweeps through (the same sickle at mythic power)',
    },
  },
  {
    id: 'grove_spear',
    name: 'Grove Spear',
    byRank: {
      Foundation: 'a Grove Spear — a tall spear grown from sacred living growth, a leaf-bladed head still budding, grounded and practical',
      Forged: 'the SAME Grove Spear, now Awakened — its living haft putting out shoots and its leaf-blade running with sap-light as it strikes (the same spear, alive)',
      Ascendant: 'the SAME Grove Spear, now Elder-Grove — a bough-spear of an ancient ecosystem, wreathed in flowering vines and drifting spores, reshaping the ground it plants into (the same spear at mythic power)',
    },
  },
  {
    id: 'briar_whip',
    name: 'Briar Whip',
    byRank: {
      Foundation: 'a Briar Whip — a coiled length of living thorned vine held ready, dormant and grounded',
      Forged: 'the SAME Briar Whip, now Awakened — the vine thickening with fresh briar-growth and sap-light, lashing out through the air (the same whip, alive)',
      Ascendant: 'the SAME Briar Whip, now Elder-Grove — a serpent of flowering thorn-vine that seizes and reshapes the growth around it, blossom and spores trailing each arc (the same whip at mythic power)',
    },
  },
  {
    id: 'spore_censer',
    name: 'Spore Censer',
    byRank: {
      Foundation: 'a Spore Censer — a swinging living-plant focus trailing a thin drift of healing pollen, dormant and grounded',
      Forged: 'the SAME Spore Censer, now Awakened — billowing luminous spores and dream-mist that respond to the wielder\'s intention (the same censer, alive)',
      Ascendant: 'the SAME Spore Censer, now Elder-Grove — a grove-heart that fills the air with a stable field of glowing spores, pollen and blossom around the wielder (the same censer at mythic power)',
    },
  },
];

// Barbarian — "inherited, repaired, culturally specific" (ref §Barbarian).
// Rank path Inherited → Proven → Saga-Forged.
const BARBARIAN_WEAPONS: readonly WeaponEntry[] = [
  { id: 'ancestor_blade', name: 'Ancestor Blade', byRank: {
    Foundation: 'an Ancestor Blade — a repaired heirloom greatsword, visible mends and old clan-marks down the fuller, worn grip, grounded and practical',
    Forged: 'the SAME Ancestor Blade, now Proven — legendary repairs layered along the blade, faint ancestral resonance in the steel as it swings (unmistakably the same sword)',
    Ascendant: 'the SAME Ancestor Blade, now Saga-Forged — generations of repairs glowing along a preserved iconic silhouette, power radiating through motion and impact (the same greatsword at mythic power)' } },
  { id: 'oath_axe', name: 'Oath Axe', byRank: {
    Foundation: 'an Oath Axe — a one- or two-handed axe engraved with clan promises, debts and names, grounded and practical',
    Forged: 'the SAME Oath Axe, now Proven — the engraved oaths lit as it bites, ancestral resonance humming through the haft (the same axe, upgraded)',
    Ascendant: 'the SAME Oath Axe, now Saga-Forged — every recorded vow radiant along the head, power through a preserved silhouette (the same axe at mythic power)' } },
  { id: 'guardian_spear', name: 'Guardian Spear', byRank: {
    Foundation: 'a Guardian Spear — a sturdy border-warden spear with a banner-knot below the head, grounded and practical',
    Forged: 'the SAME Guardian Spear, now Proven — reinforced and battle-marked, the banner-knot streaming as it guards (the same spear, upgraded)',
    Ascendant: 'the SAME Guardian Spear, now Saga-Forged — a legendary bulwark-spear radiating protective power through a preserved silhouette (the same spear at mythic power)' } },
  { id: 'hearth_hammer', name: 'Hearth Hammer', byRank: {
    Foundation: 'a Hearth Hammer — a smith\'s or builder\'s warhammer turned guardian\'s weapon, honest wear on the head, grounded and practical',
    Forged: 'the SAME Hearth Hammer, now Proven — the head crackling with the force of every wall it raised, ancestral resonance on impact (the same hammer, upgraded)',
    Ascendant: 'the SAME Hearth Hammer, now Saga-Forged — a mythic guardian-maul, power radiating through motion and a preserved silhouette (the same hammer at mythic power)' } },
  { id: 'legacy_shield', name: 'Legacy Shield', byRank: {
    Foundation: 'a Legacy Shield — layered with family marks, repairs and memorial inscriptions, grounded and practical',
    Forged: 'the SAME Legacy Shield, now Proven — scarred from legendary saves, its marks lit as it covers allies (the same shield, upgraded)',
    Ascendant: 'the SAME Legacy Shield, now Saga-Forged — a bulwark that expands to cover a whole line, generations of marks radiant across a preserved silhouette (the same shield at mythic power)' } },
];

// Monk — "repetition, restraint, precision, earned mastery" (ref §Monk).
// Practice → Mastered → Transcendent.
const MONK_WEAPONS: readonly WeaponEntry[] = [
  { id: 'practice_staff', name: 'Practice Staff', byRank: {
    Foundation: 'a Practice Staff — a quarterstaff worn smooth by years of repeated forms, grounded and unadorned',
    Forged: 'the SAME Practice Staff, now Mastered — moving with flawless economy, faint breath-light tracing each disciplined arc (the same staff, mastered)',
    Ascendant: 'the SAME Practice Staff, now Transcendent — every repetition manifest as a corona of motion around a preserved silhouette (the same staff at transcendent mastery)' } },
  { id: 'temple_spear', name: 'Temple Spear', byRank: {
    Foundation: 'a Temple Spear — a disciplined guardian\'s spear with a plain ribboned head, grounded and practical',
    Forged: 'the SAME Temple Spear, now Mastered — perfect technique in every thrust, breath-light along the shaft (the same spear, mastered)',
    Ascendant: 'the SAME Temple Spear, now Transcendent — guardian discipline at its peak, radiant control along a preserved silhouette (the same spear at transcendent mastery)' } },
  { id: 'iron_fan', name: 'Iron Fan', byRank: {
    Foundation: 'an Iron Fan — a defensive folding fan that redirects force through timing, grounded and understated',
    Forged: 'the SAME Iron Fan, now Mastered — opening to turn aside blows with flawless timing, breath-light along the ribs (the same fan, mastered)',
    Ascendant: 'the SAME Iron Fan, now Transcendent — every redirection perfected, a disc of turned force around a preserved silhouette (the same fan at transcendent mastery)' } },
  { id: 'discipline_rings', name: 'Discipline Rings', byRank: {
    Foundation: 'Discipline Rings — paired ring-blades that demand exact, economical movement, grounded and precise',
    Forged: 'the SAME Discipline Rings, now Mastered — spun with flawless control, breath-light tracing their circles (the same rings, mastered)',
    Ascendant: 'the SAME Discipline Rings, now Transcendent — perfect economy of motion, radiant orbits around a preserved silhouette (the same rings at transcendent mastery)' } },
  { id: 'open_hand_gauntlets', name: 'Open-Hand Gauntlets', byRank: {
    Foundation: 'Open-Hand Gauntlets — simple hand-guards that protect without replacing skill, grounded and plain',
    Forged: 'the SAME Open-Hand Gauntlets, now Mastered — each strike landing with perfected precision, breath-light at the knuckles (the same gauntlets, mastered)',
    Ascendant: 'the SAME Open-Hand Gauntlets, now Transcendent — decades of practice manifest as force around a preserved silhouette (the same gauntlets at transcendent mastery)' } },
];

// Beastmaster — protect/coordinate with a bonded beast (ref §Beastmaster).
// Bonded → Harmonized → Primal Concord.
const BEASTMASTER_WEAPONS: readonly WeaponEntry[] = [
  { id: 'pack_spear', name: 'Pack Spear', byRank: {
    Foundation: 'a Pack Spear — a coordinating spear that holds enemies in place for the bonded beast, grounded and practical',
    Forged: 'the SAME Pack Spear, now Harmonized — moving in perfect concert with the companion, faint bond-light along the shaft (the same spear, upgraded)',
    Ascendant: 'the SAME Pack Spear, now in Primal Concord — hunter and beast as one, power radiating through a preserved silhouette (the same spear at mythic power)' } },
  { id: 'trail_bow', name: 'Trail Bow', byRank: {
    Foundation: 'a Trail Bow — a scouting and covering bow for hunt and signal, grounded and practical',
    Forged: 'the SAME Trail Bow, now Harmonized — each shot timed to the companion\'s movement, bond-light on the string (the same bow, upgraded)',
    Ascendant: 'the SAME Trail Bow, now in Primal Concord — arrows guiding the hunt in perfect partnership, radiant along a preserved silhouette (the same bow at mythic power)' } },
  { id: 'beastguard_shield', name: 'Beastguard Shield', byRank: {
    Foundation: 'a Beastguard Shield — a broad shield that protects both handler and companion, grounded and practical',
    Forged: 'the SAME Beastguard Shield, now Harmonized — covering the beast\'s flank in flawless coordination, bond-light along the rim (the same shield, upgraded)',
    Ascendant: 'the SAME Beastguard Shield, now in Primal Concord — an unbreakable guard over the bonded pair, radiant across a preserved silhouette (the same shield at mythic power)' } },
  { id: 'fang_knives', name: 'Fang Knives', byRank: {
    Foundation: 'Fang Knives — paired knives that mirror quick animal movement up close, grounded and practical',
    Forged: 'the SAME Fang Knives, now Harmonized — striking in rhythm with the companion, bond-light on the edges (the same knives, upgraded)',
    Ascendant: 'the SAME Fang Knives, now in Primal Concord — hunter and beast moving as one predator, radiant along a preserved silhouette (the same knives at mythic power)' } },
  { id: 'totem_staff', name: 'Totem Staff', byRank: {
    Foundation: 'a Totem Staff — a focus channeling animal lineage and instinct, grounded and practical',
    Forged: 'the SAME Totem Staff, now Harmonized — the totem alight as instinct and command merge, bond-light along the haft (the same staff, upgraded)',
    Ascendant: 'the SAME Totem Staff, now in Primal Concord — the full lineage of the wild answering, radiant around a preserved silhouette (the same staff at mythic power)' } },
];

// Vampire — "predation, elegance, bloodline, restraint" (ref §Vampire).
// House → Crimson → Elder-Blood.
const VAMPIRE_WEAPONS: readonly WeaponEntry[] = [
  { id: 'bloodline_rapier', name: 'Bloodline Rapier', byRank: {
    Foundation: 'a Bloodline Rapier — an elegant dueling rapier inherited through a vampire house, restrained and refined',
    Forged: 'the SAME Bloodline Rapier, now Crimson — its fuller running with a thin thread of blood-light as it strikes (the same rapier, upgraded)',
    Ascendant: 'the SAME Bloodline Rapier, now Elder-Blood — centuries of the house\'s power along a preserved silhouette, crimson radiance on the edge (the same rapier at mythic power)' } },
  { id: 'court_cane_blade', name: 'Court Cane-Blade', byRank: {
    Foundation: 'a Court Cane-Blade — lethal steel concealed in a refined gentleman\'s cane, restrained and elegant',
    Forged: 'the SAME Court Cane-Blade, now Crimson — the drawn blade edged in blood-light, social menace made lethal (the same cane-blade, upgraded)',
    Ascendant: 'the SAME Court Cane-Blade, now Elder-Blood — aristocratic power at its peak along a preserved silhouette, crimson radiance on the hidden steel (the same cane-blade at mythic power)' } },
  { id: 'sanguine_chalice', name: 'Sanguine Chalice', byRank: {
    Foundation: 'a Sanguine Chalice — a ritual focus that stores blood and seals pacts, restrained and ornate',
    Forged: 'the SAME Sanguine Chalice, now Crimson — brimming with luminous blood as lineage-magic answers (the same chalice, upgraded)',
    Ascendant: 'the SAME Sanguine Chalice, now Elder-Blood — a font of the whole bloodline\'s power, crimson radiance around a preserved silhouette (the same chalice at mythic power)' } },
  { id: 'thorned_chain', name: 'Thorned Chain', byRank: {
    Foundation: 'a Thorned Chain — a restraining chain-weapon for prey and oath-breakers, restrained and elegant',
    Forged: 'the SAME Thorned Chain, now Crimson — its barbs threaded with blood-light as it seizes (the same chain, upgraded)',
    Ascendant: 'the SAME Thorned Chain, now Elder-Blood — an unbreakable bloodline-bond along a preserved silhouette, crimson radiance on every link (the same chain at mythic power)' } },
  { id: 'blood_seal_signet', name: 'Blood-Seal Signet', byRank: {
    Foundation: 'a Blood-Seal Signet — a commanding ring-focus that validates supernatural contracts, restrained and authoritative',
    Forged: 'the SAME Blood-Seal Signet, now Crimson — its seal glowing as servants and pacts answer (the same signet, upgraded)',
    Ascendant: 'the SAME Blood-Seal Signet, now Elder-Blood — absolute bloodline authority, crimson radiance around a preserved silhouette (the same signet at mythic power)' } },
];

// Lycanthrope — weapons that WORK WITH transformation (ref §Lycanthrope).
// Pack-Marked → Moon-Blessed → Lunar Avatar.
const LYCANTHROPE_WEAPONS: readonly WeaponEntry[] = [
  { id: 'moonfang_glaive', name: 'Moonfang Glaive', byRank: {
    Foundation: 'a Moonfang Glaive — a sweeping lunar-ritual polearm for territory defense, grounded and practical',
    Forged: 'the SAME Moonfang Glaive, now Moon-Blessed — its crescent head running with cold moonlight as it sweeps (the same glaive, upgraded)',
    Ascendant: 'the SAME Moonfang Glaive, now a Lunar Avatar\'s weapon — full moon-radiance along a preserved silhouette, wielded even in beast-form (the same glaive at mythic power)' } },
  { id: 'transforming_bracers', name: 'Transforming Bracers', byRank: {
    Foundation: 'Transforming Bracers — sturdy gauntlets that shift into claw-guards during transformation, grounded and practical',
    Forged: 'the SAME Transforming Bracers, now Moon-Blessed — reshaping to fit the changing hands, moonlight along the guards (the same bracers, upgraded)',
    Ascendant: 'the SAME Transforming Bracers, now a Lunar Avatar\'s claws — moon-radiant guards over a preserved silhouette in beast-form (the same bracers at mythic power)' } },
  { id: 'hunters_spear', name: 'Hunter\'s Spear', byRank: {
    Foundation: 'a Hunter\'s Spear — a tracking spear that pins and controls dangerous prey, grounded and practical',
    Forged: 'the SAME Hunter\'s Spear, now Moon-Blessed — the head lit with moonlight as it pins, useful in shifted form (the same spear, upgraded)',
    Ascendant: 'the SAME Hunter\'s Spear, now a Lunar Avatar\'s weapon — moon-radiant along a preserved silhouette, gripped in a giant clawed hand (the same spear at mythic power)' } },
  { id: 'pack_axe', name: 'Pack Axe', byRank: {
    Foundation: 'a Pack Axe — a rugged communal axe carried by pack guardians, grounded and practical',
    Forged: 'the SAME Pack Axe, now Moon-Blessed — pack-marks lit with moonlight as it bites (the same axe, upgraded)',
    Ascendant: 'the SAME Pack Axe, now a Lunar Avatar\'s weapon — moon-radiant along a preserved silhouette, swung in beast-form (the same axe at mythic power)' } },
  { id: 'packwarden_shield', name: 'Packwarden Shield', byRank: {
    Foundation: 'a Packwarden Shield — a shield that protects allies and holds formation, grounded and practical',
    Forged: 'the SAME Packwarden Shield, now Moon-Blessed — moonlight tracing its pack-sigils as it covers kin (the same shield, upgraded)',
    Ascendant: 'the SAME Packwarden Shield, now a Lunar Avatar\'s guard — moon-radiant across a preserved silhouette (the same shield at mythic power)' } },
];

// Mech Pilot — direct control, modular hardware, pilot-machine bond (ref §Mech
// Pilot). Field → Integrated → Core-Synchronized. Descriptors read as MECH
// hardware (the mech itself is guaranteed by the archetype hook).
const MECHPILOT_WEAPONS: readonly WeaponEntry[] = [
  { id: 'arc_blade', name: 'Arc Blade', byRank: {
    Foundation: 'an Arc Blade — a mech-scale energy sword powered by the machine\'s core, a field-grade close-combat weapon',
    Forged: 'the SAME Arc Blade, now Integrated — its energy edge brighter and cleaner, synced to the pilot\'s inputs (the same blade, upgraded)',
    Ascendant: 'the SAME Arc Blade, now Core-Synchronized — a blade of pure core-energy along a preserved silhouette, moving as an extension of the pilot (the same blade at peak power)' } },
  { id: 'rotary_autocannon', name: 'Rotary Autocannon', byRank: {
    Foundation: 'a Rotary Autocannon — a mech-mounted ballistic weapon managing heat and ammunition, field-grade suppressive fire',
    Forged: 'the SAME Rotary Autocannon, now Integrated — higher rate of fire cleanly heat-managed, feed synced to the pilot (the same autocannon, upgraded)',
    Ascendant: 'the SAME Rotary Autocannon, now Core-Synchronized — a storm of controlled fire along a preserved silhouette (the same autocannon at peak power)' } },
  { id: 'barrier_projector', name: 'Barrier Projector', byRank: {
    Foundation: 'a Barrier Projector — a mech defensive system casting directional shields, field-grade cover',
    Forged: 'the SAME Barrier Projector, now Integrated — brighter, faster-forming shield planes synced to threats (the same projector, upgraded)',
    Ascendant: 'the SAME Barrier Projector, now Core-Synchronized — a mobile fortress of hard-light along a preserved silhouette (the same projector at peak power)' } },
  { id: 'grapple_harpoon', name: 'Grapple Harpoon', byRank: {
    Foundation: 'a Grapple Harpoon — a mech control-weapon that pulls enemies and anchors terrain, field-grade utility',
    Forged: 'the SAME Grapple Harpoon, now Integrated — faster reel and stronger anchor, synced to the pilot\'s commands (the same harpoon, upgraded)',
    Ascendant: 'the SAME Grapple Harpoon, now Core-Synchronized — a battlefield-spanning line along a preserved silhouette (the same harpoon at peak power)' } },
  { id: 'drone_command_rig', name: 'Drone Command Rig', byRank: {
    Foundation: 'a Drone Command Rig — a control interface directing subordinate machines and sensors, field-grade command',
    Forged: 'the SAME Drone Command Rig, now Integrated — more drones under cleaner control, holo-links synced to the pilot (the same rig, upgraded)',
    Ascendant: 'the SAME Drone Command Rig, now Core-Synchronized — a full swarm answering as one along a preserved silhouette (the same rig at peak power)' } },
];

// Android — integrated, adaptive, upgradeable, body-inseparable (ref §Android).
// Standard → Self-Modified → Post-Human.
const ANDROID_WEAPONS: readonly WeaponEntry[] = [
  { id: 'integrated_pulse_blade', name: 'Integrated Pulse Blade', byRank: {
    Foundation: 'an Integrated Pulse Blade — a precise arm-mounted blade that deploys from the body, standard-issue and clean',
    Forged: 'the SAME Integrated Pulse Blade, now Self-Modified — the deploy faster and the edge keener, personalized by the Android (the same blade, upgraded)',
    Ascendant: 'the SAME Integrated Pulse Blade, now Post-Human — an extension of a self-authored form along a preserved silhouette (the same blade at peak power)' } },
  { id: 'adaptive_rifle', name: 'Adaptive Rifle', byRank: {
    Foundation: 'an Adaptive Rifle — a modular firearm that reconfigures its firing mode on analysis, standard-issue and precise',
    Forged: 'the SAME Adaptive Rifle, now Self-Modified — reconfiguring instantly, custom-tuned by the Android (the same rifle, upgraded)',
    Ascendant: 'the SAME Adaptive Rifle, now Post-Human — a weapon that rewrites itself mid-fight along a preserved silhouette (the same rifle at peak power)' } },
  { id: 'hard_light_shield', name: 'Hard-Light Shield', byRank: {
    Foundation: 'a Hard-Light Shield — a projector generating calculated protection exactly where needed, standard-issue',
    Forged: 'the SAME Hard-Light Shield, now Self-Modified — denser, more responsive light-planes tuned by the Android (the same shield, upgraded)',
    Ascendant: 'the SAME Hard-Light Shield, now Post-Human — perfectly predictive geometry along a preserved silhouette (the same shield at peak power)' } },
  { id: 'data_spike', name: 'Data Spike', byRank: {
    Foundation: 'a Data Spike — a dagger-interface that breaches machines and artificial minds, standard-issue and precise',
    Forged: 'the SAME Data Spike, now Self-Modified — faster intrusion routines, personalized by the Android (the same spike, upgraded)',
    Ascendant: 'the SAME Data Spike, now Post-Human — a key to any system along a preserved silhouette (the same spike at peak power)' } },
  { id: 'nanite_forge', name: 'Nanite Forge', byRank: {
    Foundation: 'a Nanite Forge — a tool-focus that builds temporary tools and deconstructs materials, standard-issue',
    Forged: 'the SAME Nanite Forge, now Self-Modified — faster fabrication swarms tuned by the Android (the same forge, upgraded)',
    Ascendant: 'the SAME Nanite Forge, now Post-Human — matter reshaped at will along a preserved silhouette (the same forge at peak power)' } },
];

// Seraph — ceremonial, protective, radiant, duty-burdened (ref §Seraph).
// Consecrated → Radiant → Dawn-Ascendant. Element-neutral (Infernal transmute
// is handled upstream + the Seraph hook).
const SERAPH_WEAPONS: readonly WeaponEntry[] = [
  { id: 'dawn_spear', name: 'Dawn Spear', byRank: {
    Foundation: 'a Dawn Spear — a consecrated spear that pierces darkness and holds a protective line, ceremonial and disciplined',
    Forged: 'the SAME Dawn Spear, now Radiant — its head kindled with dawn-light as it guards (the same spear, upgraded)',
    Ascendant: 'the SAME Dawn Spear, now Dawn-Ascendant — sacred authority blazing along a preserved silhouette (the same spear at mythic power)' } },
  { id: 'halo_blade', name: 'Halo Blade', byRank: {
    Foundation: 'a Halo Blade — a consecrated sword channeling sacred authority through disciplined combat, ceremonial',
    Forged: 'the SAME Halo Blade, now Radiant — a ring of light tracing each disciplined cut (the same sword, upgraded)',
    Ascendant: 'the SAME Halo Blade, now Dawn-Ascendant — divine judgment radiant along a preserved silhouette (the same sword at mythic power)' } },
  { id: 'wingguard_shield', name: 'Wingguard Shield', byRank: {
    Foundation: 'a Wingguard Shield — a consecrated shield that extends protection across nearby allies, ceremonial',
    Forged: 'the SAME Wingguard Shield, now Radiant — its face alight as it shelters a whole line (the same shield, upgraded)',
    Ascendant: 'the SAME Wingguard Shield, now Dawn-Ascendant — a wall of sacred light along a preserved silhouette (the same shield at mythic power)' } },
  { id: 'mercy_mace', name: 'Mercy Mace', byRank: {
    Foundation: 'a Mercy Mace — a consecrated mace that subdues corruption while preserving redemption, ceremonial',
    Forged: 'the SAME Mercy Mace, now Radiant — its head haloed with restrained light on impact (the same mace, upgraded)',
    Ascendant: 'the SAME Mercy Mace, now Dawn-Ascendant — merciful power radiant along a preserved silhouette (the same mace at mythic power)' } },
  { id: 'beacon_standard', name: 'Beacon Standard', byRank: {
    Foundation: 'a Beacon Standard — a consecrated banner-focus that creates a rallying point, ceremonial and steadfast',
    Forged: 'the SAME Beacon Standard, now Radiant — its light strengthening every ally who sees it (the same standard, upgraded)',
    Ascendant: 'the SAME Beacon Standard, now Dawn-Ascendant — a pillar of rallying dawn-light along a preserved silhouette (the same standard at mythic power)' } },
];

// Human — widest practical range; identity from ingenuity, not a gimmick
// (ref §Human). Crafted → Veteran → Legend-Made.
const HUMAN_WEAPONS: readonly WeaponEntry[] = [
  { id: 'versatile_longsword', name: 'Versatile Longsword', byRank: {
    Foundation: 'a Versatile Longsword — a well-crafted balanced blade adaptable to many schools, grounded and practical',
    Forged: 'the SAME Versatile Longsword, now Veteran — nicked and proven, moving with hard-won skill (the same sword, upgraded)',
    Ascendant: 'the SAME Versatile Longsword, now Legend-Made — a blade famous for its bearer\'s choices, power through a preserved silhouette (the same sword at legendary skill)' } },
  { id: 'soldiers_spear', name: 'Soldier\'s Spear', byRank: {
    Foundation: 'a Soldier\'s Spear — a reliable, trainable formation spear, grounded and practical',
    Forged: 'the SAME Soldier\'s Spear, now Veteran — battle-worn and sure in disciplined hands (the same spear, upgraded)',
    Ascendant: 'the SAME Soldier\'s Spear, now Legend-Made — the spear of a storied campaign along a preserved silhouette (the same spear at legendary skill)' } },
  { id: 'recurve_bow', name: 'Recurve Bow', byRank: {
    Foundation: 'a Recurve Bow — a well-made bow that rewards practice and craftsmanship, grounded and practical',
    Forged: 'the SAME Recurve Bow, now Veteran — perfectly tuned by years of use, every shot sure (the same bow, upgraded)',
    Ascendant: 'the SAME Recurve Bow, now Legend-Made — a bow of legendary marksmanship along a preserved silhouette (the same bow at legendary skill)' } },
  { id: 'engineers_crossbow', name: 'Engineer\'s Crossbow', byRank: {
    Foundation: 'an Engineer\'s Crossbow — a mechanical-advantage crossbow with specialized ammunition, grounded and clever',
    Forged: 'the SAME Engineer\'s Crossbow, now Veteran — field-modified with proven upgrades and select payloads (the same crossbow, upgraded)',
    Ascendant: 'the SAME Engineer\'s Crossbow, now Legend-Made — a masterwork of applied ingenuity along a preserved silhouette (the same crossbow at legendary skill)' } },
  { id: 'tower_shield', name: 'Tower Shield', byRank: {
    Foundation: 'a Tower Shield — a broad shield that protects individuals and formations, grounded and practical',
    Forged: 'the SAME Tower Shield, now Veteran — dented from real saves, an anchor for the line (the same shield, upgraded)',
    Ascendant: 'the SAME Tower Shield, now Legend-Made — a bulwark of legendary stands along a preserved silhouette (the same shield at legendary skill)' } },
];

const WEAPON_POOLS: Partial<Record<ArchetypeName, readonly WeaponEntry[]>> = {
  Necromancer: NECROMANCER_WEAPONS,
  Druid: DRUID_WEAPONS,
  Barbarian: BARBARIAN_WEAPONS,
  Monk: MONK_WEAPONS,
  Beastmaster: BEASTMASTER_WEAPONS,
  Vampire: VAMPIRE_WEAPONS,
  Lycanthrope: LYCANTHROPE_WEAPONS,
  'Mech Pilot': MECHPILOT_WEAPONS,
  Android: ANDROID_WEAPONS,
  Seraph: SERAPH_WEAPONS,
  Human: HUMAN_WEAPONS,
};

export function getWeaponPool(archetype: ArchetypeName): readonly WeaponEntry[] {
  return WEAPON_POOLS[archetype] ?? [];
}

export function getWeaponById(archetype: ArchetypeName, id: string): WeaponEntry | undefined {
  return getWeaponPool(archetype).find((w) => w.id === id);
}

/** The rank-appropriate descriptor for a locked weapon, or empty if unknown. */
export function getWeaponDescriptor(archetype: ArchetypeName, id: string, rank: Rank): string {
  return getWeaponById(archetype, id)?.byRank[rank] ?? '';
}
