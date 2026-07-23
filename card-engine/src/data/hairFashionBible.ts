import type { ArchetypeName, Rank } from '../types/card';
import type { ElementName } from '../types/bible';

/**
 * Fantasy Hair, Fashion, and Clothing Bible (Raheem, v1.0, 2026-07-19) —
 * canonical reference for hair and costume construction in character
 * generation. Source: /Fantasy_Hair_Fashion_and_Clothing_Bible.md.
 *
 * Bible §27 Final Principle: "A character's appearance is worldbuilding on
 * a body. Hair carries lineage, discipline, and history. Clothing carries
 * culture, rank, environment, and personal choice."
 *
 * Same pattern as elementVisualLanguage / namingBible / bodySkinBible:
 * this module condenses the Bible into structured data. The runtime
 * pipeline picks a compact per-forge subset (~700 chars) via
 * assembleHairFashionBlock() — NEVER copies the full Bible.
 */

/**
 * ---------- Hair vocabulary (Bible §3–§9) ----------
 */

export interface HairVocabularyBucket {
  label: string;
  samples: readonly string[];
}

/** Bible §4 — hair texture, condensed to 5-6 samples per bucket. */
export const HAIR_TEXTURES: readonly HairVocabularyBucket[] = [
  { label: 'straight',    samples: ['pin-straight', 'thick straight', 'coarse straight', 'silky straight', 'wind-whipped straight', 'blunt straight'] },
  { label: 'wavy',        samples: ['loose waves', 'broad waves', 'deep waves', 'beach-worn waves', 'thick undulating hair', 'wet waves'] },
  { label: 'curly',       samples: ['loose curls', 'springy curls', 'dense curls', 'ringlets', 'broad curls', 'cloud-like curls', 'frizzed curls'] },
  { label: 'coily',       samples: ['tight coils', 'dense coils', 'compact coils', 'soft coils', 'cloud-shaped coils', 'twist-defined coils'] },
  { label: 'locs',        samples: ['short locs', 'long locs', 'freeform locs', 'thick locs', 'micro-locs', 'silver-threaded locs'] },
  { label: 'braided',     samples: ['single heavy braid', 'twin braids', 'crown braid', 'rope braid', 'multiple narrow warrior braids', 'braided topknot', 'asymmetrical braiding'] },
  { label: 'shaved/cropped', samples: ['clean-shaven scalp', 'close crop', 'textured crop', 'temple shave', 'undercut', 'shaved ceremonial pattern', 'uneven field-cut hair'] },
];

/** Bible §5 — color buckets. */
export const HAIR_COLORS: readonly HairVocabularyBucket[] = [
  { label: 'natural dark',   samples: ['blue-black', 'soft black', 'espresso', 'dark chocolate', 'deep chestnut', 'mahogany', 'dark auburn'] },
  { label: 'medium warm',    samples: ['chestnut', 'walnut brown', 'copper brown', 'auburn', 'burnt sienna', 'honey brown', 'warm umber'] },
  { label: 'light',          samples: ['ash brown', 'sandy brown', 'wheat blonde', 'honey blonde', 'pale gold', 'flaxen', 'silver-blonde'] },
  { label: 'gray / age',     samples: ['iron gray', 'salt-and-pepper', 'silver', 'white at the temples', 'smoke gray', 'streaked gray', 'snow white'] },
  // M5.2 — removed 'ember-copper tips' which leaked warm-orange language
  // onto non-fire characters. Fantasy colors here are element-agnostic.
  { label: 'fantasy (rare — only through streaks/tips/light response)', samples: ['moon-silver', 'blood-red streaks', 'star-white tips', 'spectral violet sheen', 'frost-blue undertone', 'moss-green through the ends'] },
];

/** Bible §6 — condition + surface. */
export const HAIR_CONDITIONS: readonly string[] = [
  'polished', 'oiled', 'carefully groomed', 'wind-tangled', 'rain-darkened',
  'sweat-damp', 'ash-dusted', 'salt-stiffened', 'sun-bleached', 'frayed',
  'matted', 'battlefield-cut', 'ceremonially perfumed', 'frost-crusted',
  'singed at the ends', 'dust-coated', 'unevenly self-cut', 'wet with mist',
];

/** Bible §7 — facial hair. Include intentionally-absent options. */
export const FACIAL_HAIR: readonly string[] = [
  'clean-shaven', 'faint stubble', 'heavy stubble', 'close-trimmed beard',
  'full beard', 'forked beard', 'braided beard', 'mustache', 'curled mustache',
  'chin beard', 'ritual beard rings', 'patchy beard', 'silver beard',
  'wolfish facial fur', 'ceremonial false beard',
];

/** Bible §8 — accessories by mood. */
export interface HairAccessoryBucket {
  label: string;
  samples: readonly string[];
}
export const HAIR_ACCESSORIES: readonly HairAccessoryBucket[] = [
  { label: 'practical',     samples: ['leather ties', 'cloth wraps', 'waxed cord', 'bone pins', 'wooden combs', 'metal clasps', 'protective scarves'] },
  { label: 'aristocratic',  samples: ['jeweled pins', 'gold combs', 'pearl chains', 'silver filigree', 'velvet ribbons', 'enamel clasps', 'ornamental veils'] },
  { label: 'sacred',        samples: ['prayer cords', 'vow ribbons', 'holy beads', 'halo pins', 'moon crescents', 'funeral veils', 'shrine bells'] },
];

/**
 * ---------- Clothing library (Bible §10–§15) ----------
 */

/** Bible §12 — textiles, condensed. */
export const TEXTILES: readonly string[] = [
  'matte linen', 'felted wool', 'quilted cotton', 'silk brocade', 'velvet',
  'brocade with metallic thread', 'boiled leather', 'lacquered leather',
  'cracked leather', 'suede', 'embossed leather', 'shaggy fur',
  'shearling lining', 'weathered pelt', 'bark-fiber weave', 'mushroom leather',
  'living vine lattice', 'silver-thread mesh', 'chainmail', 'lacquered lamellar',
  'brushed alloy', 'synthetic silk', 'ballistic fabric',
];

/**
 * Bible §13 — armor library. STRIKING FANTASY armor: every entry carries a
 * dramatic silhouette AND ornate detail, never a flat historical term. (Raheem
 * 2026-07-23: the old "articulated plate / ring mail" library rendered boring,
 * disappointing armor — armor should be a WOW element, not a footnote.)
 */
export const ARMOR_LIBRARY: readonly string[] = [
  // cloth / light — still characterful
  'a quilted gambeson panelled with embroidered sigils and rivet-studs',
  'studded brigandine of overlapping leather-and-steel plates',
  // sculpted leather
  'a sculpted molded-leather cuirass with raised relief-work and layered tassets',
  'lacquered beetle-shell leather scales cascading down the torso',
  // chain
  'blackened chainmail worn beneath an ornate engraved breastplate',
  // scale / lamellar
  'overlapping bronze lamellar bound with tasseled silk cords',
  'moon-silver lamellae that catch and throw the light',
  'bone-and-obsidian lamellar plates lashed with sinew',
  // plate — dramatic silhouettes
  'ornate filigreed full plate chased with fine scrollwork',
  'fluted gothic plate with dramatic sweeping pauldrons and a high fanged gorget',
  'sculpted heroic plate, crested and ridged, shaped to the body',
  'brutal blackened spiked plate with layered faulds and a spined gorget',
  'gilded ceremonial plate with a relief-carved breastplate and grand winged pauldrons',
  'asymmetrical salvaged plate cobbled from mismatched masterwork pieces',
  // fantasy / elemental
  "living armor grown to the body that channels the wielder's element along every edge",
  'a grand commanding silhouette of layered plate, chain and flowing cloth built as one',
];

/** Bible §14 — construction verbs. Optional flavor. */
export const CONSTRUCTION_VERBS: readonly string[] = [
  'wrapped', 'pleated', 'layered', 'belted', 'draped', 'tailored', 'quilted',
  'stitched', 'riveted', 'laced', 'buckled', 'knotted', 'embroidered',
  'appliquéd', 'patched', 'mended', 'high-collared', 'open-fronted',
  'cross-wrapped', 'side-fastened', 'asymmetrical',
];

/** Bible §15 — wear state per condition class. */
export const WEAR_STATES: readonly HairVocabularyBucket[] = [
  { label: 'new or elite',  samples: ['polished', 'immaculate', 'sharply tailored', 'heirloom quality', 'ceremonial', 'freshly dyed'] },
  { label: 'used',          samples: ['softened by wear', 'faded', 'creased', 'repaired', 'patched', 'oil-darkened', 'travel-stained'] },
  { label: 'battlefield',   samples: ['cut', 'scorched', 'dented', 'blood-stained', 'mud-caked', 'hastily stitched', 'smoke-blackened'] },
  { label: 'ancient',       samples: ['tarnished', 'oxidized', 'moth-eaten', 'brittle', 'threadbare', 'funerary-preserved', 'time-darkened'] },
];

/**
 * ---------- Fashion role library (Bible §16) ----------
 *
 * A role is the character's costume identity — what the outfit is
 * arguing for. Every archetype supports multiple roles.
 */
export type FashionRole =
  | 'heroic'
  | 'villainous'
  | 'aristocratic'
  | 'scholarly'
  | 'practical'
  | 'battlefield'
  | 'ceremonial'
  | 'industrial';

// 2026-07-23 overhaul: every role LEADS with a silhouette SHAPE adjective so the
// role reads as FORM in Leonardo, not vibe.
export const FASHION_ROLE_GUIDANCE: Record<FashionRole, string> = {
  heroic:       'SCULPTED, UPRIGHT silhouette — clarity, purpose, readiness, one meaningful personal emblem — Bible §16.Heroic',
  villainous:   'SEVERE, SWEEPING-VERTICAL silhouette — muted colors, concealed hands, ritual regalia — NOT just black. Bible §16.Villainous',
  aristocratic: 'CONTROLLED, HIGH-COLLARED silhouette — luxurious textiles, subtle rank markers — NOT drowning in gold. Bible §16.Aristocratic',
  scholarly:    'DRAPED, LAYERED silhouette — academic robes, ink-stained cuffs, scroll harness, manuscript pouches',
  practical:    'TRIM, REINFORCED silhouette — worker garments, local materials, one signature repair, weatherproof mantle',
  battlefield:  'MASSIVE, ASYMMETRIC silhouette — armored layers with visible wear, one colossal statement piece, battle-scarred plates',
  ceremonial:   'LAYERED, CASCADING silhouette — ritual regalia, embroidered rank panels, sacred beads or chains — Bible §16.Ceremonial',
  industrial:   'HARD-SHELLED, CABLED silhouette — reinforced work-suit, tool harness, pressure gaskets, wear-plates',
};

/**
 * ---------- Per-archetype hair + fashion variants (Bible §18) ----------
 *
 * Each archetype gets 4-6 fashion role variants (rotated per forge via a
 * cursor) and a hair-direction pool. The variant contains a compact
 * clothing description ready to drop into a prompt.
 */

export interface ArchetypeFashionVariant {
  role: FashionRole;
  hair: string; // male-presenting reference cue
  /**
   * 2026-07-23 gender fix (art-prompt-director): female/matriarch-presenting
   * hair cue. Every current hair cue was male-coded, so female rolls rendered
   * masculine. The block presents BOTH and Claude picks by the character's sex.
   */
  hairFeminine?: string;
  clothing: string; // MAX 4 items: silhouette anchor + flow element + statement piece + grounded detail
  /**
   * 2026-07-23 fashion overhaul (art-prompt-director): the ONE-sentence "wow
   * shot" — dominant material + construction + form + flow. Placed FIRST in
   * the fashion block; becomes the armor/primaryGarment content. Without it,
   * Phoenix list-averages the clothing into a generic outfit.
   */
  silhouette?: string;
  /**
   * Rank escalation as deltas on the SAME outfit (never a swap): how the
   * locked silhouette ceremonializes/deepens at Forged and Ascendant.
   * Foundation is the stripped field-worn version of the silhouette.
   */
  escalation?: { Forged: string; Ascendant: string };
  /**
   * M5.2 — element-eligibility hook, retained for future element-scoped
   * variants. M5.4 removed the last uses (infernal/celestial/corrupted
   * roles were deleted entirely) so every current variant is element-agnostic.
   */
  requiredElements?: readonly ElementName[];
}

export interface ArchetypeFashionGuide {
  /** Costume culture summary — 1 sentence. */
  culture: string;
  /** Hair-direction pool (rotated separately from fashion variant). */
  hairDirections: readonly string[];
  /** Fashion variants Claude picks ONE from per forge. */
  variants: readonly ArchetypeFashionVariant[];
  /** Bible §18 avoid list per archetype. */
  avoid: readonly string[];
}

const V = (role: FashionRole, hair: string, clothing: string, requiredElements?: readonly ElementName[]): ArchetypeFashionVariant =>
  requiredElements ? { role, hair, clothing, requiredElements } : { role, hair, clothing };

// 2026-07-23 BARBARIAN TRADITIONS (Raheem + art-prompt-director). The archetype
// used to collapse to one tribal-shirtless-man monoculture. The six variants are
// now six distinct PEOPLES (a "which people forged you?" culture-blocker, like
// Mech Divisions). Each leads with a dominant MATERIAL noun + an anti-drift
// clause in the silhouette (the load-bearing divergence lever on Phoenix), and
// each ships paired male + matriarch hair so female rolls stop rendering male.
// Tradition → matched elements (for the element-restructure batch):
//   Stonehold=Earth/Metal · Horse-Lord=Wind/Storm · Glacier=Ice/Earth ·
//   Ash-Waste=Fire/Earth · Canopy=Earth/Beast · Sand-City=Metal/Fire.
const BARBARIAN: ArchetypeFashionGuide = {
  culture: 'ONE of six distinct warrior peoples (Stonehold crag-guardian / Horse-Lord steppe-nomad / Glacier-Warden polar-hunter / Ash-Waste warlord / Canopy head-hunter / Sand-City champion) — regional adaptation made visible, NOT a generic tribe, NOT fur underwear and bare abs, NOT default Viking',
  hairDirections: [
    // male + matriarch cues, spanning the six traditions, so the rotating hair
    // slice is no longer male-only.
    'iron-grey hair in a low weighted knot with slate rings', 'a matriarch\'s silver hair coiled tight and pinned with carved slate combs',
    'long black hair shaved at the temples with one weighted back-braid', 'many tight braids gathered under a peaked felt riding-cap with forehead-chains',
    'pale frost-stung locks bound under a shearling hood', 'white hair in a tight coiled bun sealed under a shearling hood',
    'a scorched scalp-crest with ash-grey stubble', 'a tight scorched topknot bound with blackened iron',
    'black hair pulled into a tall feather-threaded crest', 'black hair coiled high and pinned with carved jade and scarlet plumes',
    'close-cropped dark curls with a bronze champion\'s fillet', 'a braided crown pinned with bronze and a laurel fillet',
  ],
  variants: [
    // 1. Stoneholds of the High Crags — Earth/Metal
    {
      role: 'battlefield',
      hair: 'iron-grey hair in a low weighted knot, granite-dust in a short beard, bound with dark slate rings',
      hairFeminine: 'a matriarch\'s long silver hair coiled tight to the scalp and pinned with carved slate combs, weather-cut at the brow, no beard (female-presenting)',
      silhouette: 'a heavy closed charcoal wool tunic covering the whole chest and stomach to the collarbone, slabs of grey stone-plate armor lashed OVER it (a human warrior fully clothed beneath, NOT a stone golem or dwarf, NEVER a bare chest), one shoulder carved as a standing ancestor-totem, a slate-weighted mantle draping in deep vertical folds',
      clothing: 'a closed charcoal wool tunic under a grey stone-plate cuirass, deep-folded slate-grey mantle, carved ancestor-totem shoulder, blackened iron banding',
      escalation: {
        Forged: 'a second totem-plate earned on the off-shoulder, the stone-plate deep-cut with clan glyphs, the mantle lengthened and iron-riveted',
        Ascendant: 'the full guardian regalia — a crown of carved standing-stones across both shoulders, the cuirass a relief-carved rockface of ancestor faces, the mantle floor-length and slab-heavy',
      },
    },
    // 2. Horse-Lords of the Grass Sea — Wind/Storm
    {
      role: 'heroic',
      hair: 'long black hair shaved at the temples with one thick weighted braid down the back, lacquered beads, a thin trailing mustache',
      hairFeminine: 'a horse-lord matron\'s many tight braids gathered under a peaked felt riding-cap, silver forehead-chains, wind-burned face, no beard (female-presenting)',
      silhouette: 'a long closed quilted felt riding-coat buttoned to the throat over a fully covered chest, rows of lacquered leather lamellar laced OVER it (STEPPE nomad, NOT samurai — felt coat not kimono, no face-mask, NEVER a bare chest), a horsetail standard streaming from the shoulder, split coat-skirts flaring back as if mid-gallop',
      clothing: 'a closed felt riding-coat under lacquered lamellar, wind-streaming horsetail shoulder-standard, split flaring coat-skirts, a broad wrapped riding-sash',
      escalation: {
        Forged: 'a clan-lord\'s lamellar collar earned across the chest, the felt coat deep-dyed and quilted in wind-patterns, the horsetail standard doubled and longer',
        Ascendant: 'the full khan\'s regalia — lamellar chased with storm-scroll lacquer, a mantle of layered felt streaming to the stirrups, a crest of many horsetails riding the wind',
      },
    },
    // 3. Glacier-Wardens of the White Waste — Ice/Earth
    {
      role: 'practical',
      hair: 'pale hair frozen into stiff frost-stung locks, a short ice-crusted beard, bound under a shearling-lined hood',
      hairFeminine: 'an ice-warden elder\'s white hair in a tight coiled bun sealed under a shearling hood, frost on the lashes, wind-scoured cheeks, no beard (female-presenting)',
      silhouette: 'a heavy closed seal-hide and wool tunic covering the whole chest and stomach up to the throat, curved whalebone plates and frost-iron scale buckled OVER it (NOT Viking — no horned helm, NO round shield, NEVER a bare chest; a polar sea-hunter, shearling is lining not fur armor), a heavy ice-glazed storm-cloak hanging stiff with frost',
      clothing: 'a closed seal-hide tunic under frost-iron scale, ice-glazed storm-cloak, whalebone shoulder-arcs, a broad frost-crusted throat-wrap',
      escalation: {
        Forged: 'a warden\'s whalebone breast-yoke earned and carved with tide-marks, the seal-hide double-layered, the storm-cloak lengthened and rimed with hard frost',
        Ascendant: 'the full glacier regalia — interlocked frost-iron and whalebone forming a carved shell of the deep ice, tide-carved plates across the whole torso, the storm-cloak floor-length and sheeted in glacial rime',
      },
    },
    // 4. Ash-Waste Warlords — Fire/Earth
    {
      role: 'villainous',
      hair: 'hair burned back to a scorched scalp-crest, ash-grey stubble, a molten-scarred brow',
      hairFeminine: 'an ash-mother warlord\'s hair in a tight scorched topknot bound with blackened iron, soot-streaked face, ember-lit eyes, no beard (female-presenting)',
      silhouette: 'a closed scorched black lacquered-leather cuirass covering the entire chest and stomach to the collar, overlapping obsidian scale-plates riveted OVER it (molten iron is BRAND-MARKS and cooling seams ON the armor, never free flame, NEVER a bare chest — a human warlord, not a fire spirit), a heat-scorched tattered war-mantle rising on the thermals',
      clothing: 'a closed lacquered-leather cuirass under obsidian scale, ash-tattered rising war-mantle, a molten-branded gorget, cracked cinder-grey banding',
      escalation: {
        Forged: 'a warlord\'s branded breastplate earned, the obsidian scale doubled and edged in cooling molten seams, the war-mantle lengthened and burned to ragged streamers',
        Ascendant: 'the full ash-warlord regalia — a carapace of black obsidian scale veined with live molten iron, brand-glyphs of conquered clans seared across the whole cuirass, the war-mantle floor-length and smouldering',
      },
    },
    // 5. Canopy Head-Hunters of the Deep Green — Earth/Beast
    {
      role: 'ceremonial',
      hair: 'black hair pulled up into a tall bound crest threaded with green feathers, shaved war-painted temples, no beard',
      hairFeminine: 'a jungle war-matron\'s black hair coiled high and pinned with carved jade, scarlet feather-plumes at the crown, bold face-paint, no beard (female-presenting)',
      silhouette: 'a closed quilted cotton war-tunic covering the whole chest and stomach to the collarbone, a broad jade-scale collar and cascading long green-and-scarlet feather regalia layered OVER it (Mesoamerican-flavored jungle culture, NOT a Plains war-bonnet, NOT Norse, NEVER a bare chest; warrior foreground, headdress framing not dominating), an obsidian-edged banner sweeping down the back, bold glyph-pattern face war-paint',
      clothing: 'a closed quilted cotton war-tunic under a jade-scale collar, cascading long-feather headdress, an obsidian-edged ceremonial back-banner, bold ochre-and-scarlet war-paint',
      escalation: {
        Forged: 'a trophy-collar of carved jade earned across the chest, the feather headdress taller and doubled in scarlet, the quilted tunic deep-dyed with clan glyph-work',
        Ascendant: 'the full head-hunter regalia — a towering plumed crest of quetzal-green and scarlet, a jade breastplate carved with sun-glyphs, a cascading feather mantle sweeping the jungle floor',
      },
    },
    // 6. Sand-City Champions — Metal/Fire
    {
      role: 'battlefield',
      hair: 'close-cropped dark curls, a trimmed oiled beard, a bronze champion\'s fillet across the brow',
      hairFeminine: 'a champion-woman\'s black hair in a tight braided crown pinned with bronze, a laurel fillet, an arena-scarred cheek, no beard (female-presenting)',
      silhouette: 'a closed sand-linen tunic covering the whole chest and stomach, articulated bronze segmented plate buckled OVER it (a cosmopolitan desert sand-city, NOT Rome — sandstone and bronze, no lorica-segmentata legionary, no toga, NEVER a bare chest, mixed peoples of many ancestries), a single ornate shoulder-guard bearing arena victory-brands, a dyed champion\'s half-cape sweeping from one shoulder',
      clothing: 'a closed sand-linen tunic under bronze segmented plate, a sweeping dyed half-cape, a victory-branded shoulder-guard, a broad chain-and-leather belt-guard',
      escalation: {
        Forged: 'a champion\'s laurel-chased bronze cuirass earned, victory-brands multiplied across the pauldron, the half-cape deepened in imperial dye and lengthened',
        Ascendant: 'the full arena-champion regalia — mirror-polished bronze segmented plate relief-worked with past triumphs, a crown-guard of laurel bronze, a floor-length champion\'s cape',
      },
    },
  ],
  avoid: ['identical shirtless bodybuilders', 'one fur shoulder on every card', 'horned helmet as default', 'random "tribal" decoration without a culture', 'Viking-only styling', 'collapsing the six traditions back into one generic tribe', 'muscular/ripped/chiseled anatomy (renders as a shirtless bodybuilder even when clothed) — describe frame + weight + age instead'],
};

// 2026-07-23 MONK MORAL-FORK REDESIGN (Raheem, LOCKED). A moral blocker at
// creation locks PEACE (Holy/Light → cosmic culmination) or VIOLENCE (one of
// Fire/Water/Wind/Earth → all-four culmination). Aesthetic anchor: FANTASY
// BUDDHA × cosmic-space fantasy hero. Element GATES the variant via
// requiredElements. The element shows through a TRAINED BODY, posture and garb
// — NEVER hand-glow / glowing fists / martial-artist cliche (Bible §Monk avoid).
// Body variety is mandatory: stout / broad / heavy "laughing-Buddha" / aged are
// all in-bounds — describe frame + weight + age, NOT ripped abs. Order:
// 0 Peace · 1 Fire · 2 Water · 3 Wind · 4 Earth (index-parallel to
// MONK_ENVIRONMENTS for tradition-coupling; Monk is in TRADITION_COUPLED).
const MONK: ArchetypeFashionGuide = {
  culture: 'the moral-fork ascetic — a FANTASY-BUDDHA who transformed the self through lifelong discipline and stands at a locked moral path: a serene enlightened PEACE monk (Holy/Light, arcing toward a cosmic celestial being) OR an elemental warrior-MONK of the VIOLENCE path (one of fire/water/wind/earth mastered through the body); orders come from desert, mountain, forest, maritime, urban or star-gazing traditions — NOT a generic martial artist, NOT East-Asian costume pastiche, NOT one orange robe, body types ALL welcome (lean, stout, broad, heavy laughing-Buddha, aged)',
  hairDirections: [
    'a serenely shaved crown marked with a painted third-eye and ash-dot enlightenment tilaka',
    'long silver ascetic hair in a high meditation topknot bound with a vow-cord',
    'close-cropped grey coils under a folded meditation shawl',
    'a shaved head crossed by a single braided vow-lock behind the ear',
    'thick uncut hair worn loose as a lifelong sacred vow, streaked with age',
    'wrapped locs gathered into a high knot pinned with a bronze prayer-bead',
    'a broad bald head with painted discipline-tallies across the scalp (a chosen mark, not a default)',
    'a warrior-monk topknot shaved at the temples, a cord of practice-beads at the crown',
    'silver-threaded braid coiled into a low bun with a carved bone breath-mark pin',
  ],
  variants: [
    // 0. PEACE — serene enlightened fantasy-Buddha, Holy/Light, arcs to COSMIC
    {
      role: 'ceremonial',
      hair: 'a serenely shaved crown marked with a painted third-eye tilaka and an ash enlightenment-dot, calm unlined brow, a soft close-trimmed grey beard',
      hairFeminine: 'silver ascetic hair in a smooth high meditation-knot bound with a vow-cord, a painted third-eye tilaka on a serene brow, no beard (female-presenting)',
      silhouette: 'a flowing closed layered saffron-and-ivory MEDITATION ROBE of soft homespun cloth wrapped fully over the whole chest, stomach and one shoulder to the collar, a long wooden mala prayer-bead strand and a plain rope waist-sash the only adornments (a serene enlightened FANTASY-BUDDHA monk in calm meditative poise, ANY body welcome INCLUDING a broad stout heavy laughing-Buddha frame — NOT a lean fighter, NOT angel-winged, NO feathered halo, NO Christian-angel iconography, NEVER a bare chest, NO glowing fists), enlightenment shown through STILLNESS and posture, a serene lotus-seat calm, a soft celestial nimbus reading as a faint ring of light behind the head, not wings',
      clothing: 'a closed layered saffron-and-ivory meditation robe over one shoulder, a long wooden mala bead-strand, a rope waist-sash, a lotus-seat meditative pose',
      escalation: {
        Forged: 'the robe deepened with a second embroidered enlightenment-vestment layer bearing lotus and open-circle sigils, the mala lengthened to floor-drape, the faint nimbus behind the head resolving into a thin ring of orbiting light-motes — serenity deepened, still fully covered, still no wings',
        Ascendant: 'PEACE CULMINATION — the fantasy-Buddha transcends into a CELESTIAL COSMIC BEING: the robe now a floor-length starfield-brocade of deep space, constellation-lines lit softly UNDER the skin, a COSMIC NIMBUS of orbiting stars and a galaxy-disc haloing the head (never feathered wings, never angel-halo), seated in serene lotus-poise amid deep-space nebulae — enlightenment become vast and star-forged',
      },
      requiredElements: ['Holy', 'Light', 'Cosmic'],
    },
    // 1. VIOLENCE — FIRE warrior-monk
    {
      role: 'battlefield',
      hair: 'a warrior-monk topknot shaved at the temples, ember-singed at the tips, a short scorched beard, ash-dotted brow',
      hairFeminine: 'dark hair in a tight high warrior-knot shaved at the temples, singed ends, a soot-smudged serene brow, no beard (female-presenting)',
      silhouette: 'a closed rust-and-charcoal quilted training-robe covering the whole chest and stomach to the collar, cinder-scorched lacquered forearm-wraps and a heat-tempered leather training-cuirass buckled OVER it (a FIRE warrior-MONK — the fire shows as heat-shimmer off a disciplined trained body, brand-marks and cooling-ember seams ON the garb and a coal-forge stance, NOT free flame, NOT glowing fists, NOT a fire spirit, NEVER a bare chest), a scorched half-mantle rising on the thermals, a grounded low fighting stance',
      clothing: 'a closed quilted training-robe under a heat-tempered leather cuirass, cinder-scorched forearm-wraps, a rising scorched half-mantle, a low coal-forge fighting stance',
      escalation: {
        Forged: 'a mastered-fire discipline earned — a branded ember-seam breastplate over the robe, forearm-wraps re-lacquered black with glowing crack-lines, the half-mantle lengthened to smoulder',
        Ascendant: 'VIOLENCE CULMINATION — grandmaster fire regalia, the trained body wreathed in controlled heat, one element mastered as the all-four convergence gathers around the master',
      },
      requiredElements: ['Fire'],
    },
    // 2. VIOLENCE — WATER warrior-monk
    {
      role: 'battlefield',
      hair: 'long wet-slicked dark hair in a low seafarer\'s knot, salt-damp, a trimmed dripping beard',
      hairFeminine: 'long dark hair in a wet-slicked low braid beaded with pearl, salt-damp brow, serene, no beard (female-presenting)',
      silhouette: 'a closed deep-teal wrapped training-robe of rippling silk covering the whole chest and stomach to the collar, blue lacquered scale forearm-guards and a pearl-buttoned water-cuirass buckled OVER it (a WATER warrior-MONK — the water shows as a flowing-cloth silhouette, condensation sheen on the garb and a fluid redirecting stance, NOT a splash aura, NOT glowing fists, NEVER a bare chest), a long streaming sash that moves like a current, a low fluid stance mid-redirect',
      clothing: 'a closed rippling-silk training-robe under a pearl-buttoned water-cuirass, blue lacquered scale forearm-guards, a current-streaming sash, a fluid redirecting stance',
      escalation: {
        Forged: 'a mastered-water discipline earned — a mother-of-pearl tide-plate over the robe, the sash doubled and floor-flowing like a wave-crest, the scale-guards deep-lacquered ocean-blue',
        Ascendant: 'VIOLENCE CULMINATION — grandmaster water regalia, the trained body moving with total fluid control, one element mastered as the all-four convergence gathers around the master',
      },
      requiredElements: ['Water'],
    },
    // 3. VIOLENCE — WIND warrior-monk
    {
      role: 'heroic',
      hair: 'wind-tossed loose dark hair swept back from a shaved undercut, a thin trailing mustache',
      hairFeminine: 'wind-lifted long hair streaming from a high loose knot, serene wind-burned brow, no beard (female-presenting)',
      silhouette: 'a closed pale jade-green wrapped training-robe of light layered gauze covering the whole chest and stomach to the collar, streaming banded silk arm-ribbons and a light reinforced flight-vest buckled OVER it (a WIND warrior-MONK — the wind shows as lifted cloth, half-translucent trailing ribbons and a poised barely-grounded stance, NOT a glowing aura, NOT glowing fists, NEVER a bare chest), long unfurling shoulder-streamers caught mid-gust, feet light and barely-planted',
      clothing: 'a closed light-gauze training-robe under a reinforced flight-vest, streaming banded arm-ribbons, long unfurling shoulder-streamers, a poised barely-grounded stance',
      escalation: {
        Forged: 'a mastered-wind discipline earned — a light banded aeromancer\'s yoke over the robe, the streamers multiplied and lengthened to ride the wind, the gauze layered and rippling',
        Ascendant: 'VIOLENCE CULMINATION — grandmaster wind regalia, the trained body poised as if weightless, one element mastered as the all-four convergence gathers around the master',
      },
      requiredElements: ['Wind'],
    },
    // 4. VIOLENCE — EARTH warrior-monk
    {
      role: 'battlefield',
      hair: 'a broad shaved head with painted stone-grey discipline-tallies, a heavy full grey-streaked beard',
      hairFeminine: 'iron-grey hair coiled into a heavy low bun pinned with carved stone, a broad calm weathered face, no beard (female-presenting)',
      silhouette: 'a closed slate-grey heavy quilted training-robe covering the whole broad chest and stomach to the collar, carved stone-plate forearm-braces and a granite-slab training-cuirass lashed OVER it (an EARTH warrior-MONK — the earth shows as a rooted immovable stance, stone-dust on the garb and mineral-vein carving in the plate, ANY frame INCLUDING a heavy stout mountain-broad build, NOT a stone golem, NOT glowing fists, NEVER a bare chest), a heavy grounded low horse-stance, a slate-weighted mantle hanging in deep folds',
      clothing: 'a closed heavy quilted training-robe under a granite-slab cuirass, carved stone-plate forearm-braces, a deep-folded slate mantle, a rooted immovable low stance',
      escalation: {
        Forged: 'a mastered-earth discipline earned — a mineral-vein relief breastplate over the robe, the braces carved with mountain-glyphs, the mantle lengthened and slab-heavy',
        Ascendant: 'VIOLENCE CULMINATION — grandmaster earth regalia, the trained body utterly rooted and immovable, one element mastered as the all-four convergence gathers around the master',
      },
      requiredElements: ['Earth'],
    },
  ],
  avoid: ['every Monk being bald', 'one generic orange robe', 'glowing fists / glow-as-mastery / hand-VFX auras', 'generic martial-artist cliche', 'generic East-Asian costume pastiche', 'using sacred real-world symbols casually', 'all Monks being thin and barefoot (stout / broad / heavy / aged are in-bounds)', 'the Peace path reading as a Seraph (NO angel wings, NO feathered halo, NO Christian-angel iconography — use a cosmic/celestial nimbus, lotus, third-eye instead)', 'the Peace cosmic culmination reading as a generic star-wizard or Dr. Strange', 'the all-four culmination reading as muddy elemental chaos'],
};

const BEASTMASTER: ArchetypeFashionGuide = {
  culture: 'the animals they live beside, the climate they travel through, practical movement, stewardship, hunting or tracking, mutual bonds',
  hairDirections: [
    'thick unbound waves', 'shoulder-length locs decorated with feathers',
    'shaved sides with a long back plait', 'close crop with weather-worn ends',
    'silver-streaked hair tied at the nape', 'long braid with animal-bone charms',
    'coils tucked under a wrapped hunting scarf',
  ],
  variants: [
    V('practical',    'thick unbound waves, dust-coated',                              'layered wool tunic, boiled-leather cuirass over a linen shift, patterned tracking-sash, wrapped forearms, weathered boots with fur cuffs, hunter\'s belt of pouches, one animal-bond charm'),
    V('battlefield',  'shoulder-length locs with animal-bone charms',                  'reinforced boiled-leather harness over a padded gambeson, spotted-hide shoulder cape, scale-cut leather faulds, blood-stained boots, gauntlet of the bonded beast, hunting horn on a strap'),
    V('aristocratic', 'silver-streaked hair braided with silver falcon pins',          'embroidered wool riding-coat with fur-trimmed collar, silk-lined inner vest, silver clasp with beast-house sigil, high polished boots, gauntlet-glove marked with clan tattoo'),
    V('ceremonial',   'shaved sides with a ritual central plait tied with sinew',     'painted animal-hide mantle, ritual bone lamellar, waist-cord bearing pack tokens, embroidered ancestor pouches, feather-adorned headpiece, ceremonial staff'),
    V('heroic',       'coils tucked under a wrapped hunting scarf',                    'field-worn hide vest over linen tunic, practical wool trousers, mud-caked leather boots, bond-companion charm on a leather thong, one signature scar on the visible forearm'),
    V('scholarly',    'close crop with ink-marked ears',                                'ranger\'s naturalist coat with many pockets, quilted vest, ink-stained cuffs, sketch-tablet slung at the hip, deep boots, spectacles on a cord'),
  ],
  avoid: ['every Beastmaster looking like a fantasy ranger clone', 'animal-print as costume shortcut', 'making the animal bond look like ownership'],
};

const DRUID: ArchetypeFashionGuide = {
  culture: 'the forest, river, tundra, or biome they steward; the human form is a costume worn to walk among mortals — actual body may be melded with tree, root, moss',
  hairDirections: [
    'long hair with leaves and small branches woven in', 'gray hair like Spanish moss',
    'shaved scalp with painted growth-runes', 'thick coils wrapped in living vine',
    'silver locks that trail like willow branches', 'braided crown of dried flowers',
    'hair fused with bark at the roots',
  ],
  variants: [
    V('ceremonial',   'long hair with leaves and small branches woven in',              'living-vine mantle over a bark-fiber robe, moss-lined inner tunic, sash of woven river-reed, root-cord waistband, bare feet or plant-fiber sandals, staff of fossilized oak'),
    V('practical',    'silver locks that trail like willow branches, wind-tossed',      'weathered wool cloak with pockets of seed-pouches, sturdy bark-cloth tunic, patched leather trousers, muddy boots, gnarled walking staff, one wren feather clasp'),
    V('villainous',   'shaved scalp with painted growth-runes in green',                'blight-marked mantle of dead vines, blackened bark-cloth robe, ritual chain of thorn-and-bone, blighted-antler shoulder pieces, root-tangle boots with mushroom sprouts'),
    V('aristocratic', 'braided crown of dried flowers, silver-threaded',                'silk-lined moss coat, embroidered biome tapestry over the shoulder, carved amber closures, tailored bark-fiber under-robe, ceremonial staff of polished ash'),
    V('heroic',       'thick coils wrapped in living vine',                             'green wool tunic layered over linen, oak-plate shoulder armor grown into place, patterned sash showing grove sigils, sturdy boots, seed pouch at the belt, one ancient acorn charm'),
  ],
  avoid: ['making every Druid pseudo-Celtic', 'antlers as default headwear', 'leaf-cape stereotype', 'human wizard in nature colors'],
};

const NECROMANCER: ArchetypeFashionGuide = {
  culture: 'scholarship, funerary traditions, inherited taboos, grave stewardship — NOT cartoon villainy',
  hairDirections: [
    'long dark hair tied back with a black cord', 'shaved sides with a central braided plait',
    'wispy silver hair like smoke', 'close crop with ash-marked scalp',
    'hair partially melting into shadow', 'gray hair in a scholar\'s bun',
    'coils gathered under a mourning veil',
  ],
  variants: [
    V('scholarly',    'gray hair in a scholar\'s bun with bone pins',                   'academic robe with book harness across the chest, ink-stained cuffs, quilted vest, scroll pouches at the waist, patched leather boots, ceremonial dagger for parchment cutting'),
    V('ceremonial',   'coils gathered under a mourning veil, silver-threaded',          'multi-layered funerary robe with embroidered mourning motifs, blackened chainmail underlayer, waist-sash of prayer cords, censer chain, ritual gloves ink-stained at the fingertips'),
    V('battlefield',  'shaved sides with a central braided plait, ash-dusted',          'blackened chainmail over a padded gambeson, bone-scale shoulder plates, funeral-veil half-cloak, blood-stained gauntlets, mud-caked boots, war-censer swinging'),
    V('aristocratic', 'long dark hair with silver comb, immaculately dressed',           'silk-brocade coat with high mourning collar, velvet inner vest, gold-and-jet clasp, tailored trousers, polished boots, house sigil ring — funerary house of noble lineage'),
    V('villainous',   'wispy silver hair like smoke, wind-tangled',                     'severe black robe with restrictive collar, chain prayer beads inverted, weighted sleeves, polished mask of blank bone, hidden hands, defiled family crest'),
  ],
  avoid: ['"Malakar" / "Draven" villain default', 'automatically Latin-style names + robes', 'excessive skull / doom / blood', 'every Necromancer being evil'],
};

const VAMPIRE: ArchetypeFashionGuide = {
  culture: 'age, house, region, lost nationality, courtly identity, chosen reinvention, predatory reputation, era in which turned',
  hairDirections: [
    'immaculate long hair with silver pins', 'short slicked-back hair with widow\'s peak',
    'silver-streaked waves', 'shaved head with pale scalp',
    'high formal knot with jeweled comb', 'long braid down the back',
    'wild wind-tangled dark hair',
  ],
  variants: [
    {
      role: 'aristocratic',
      hair: 'immaculate long hair with silver comb',
      silhouette: 'a floor-length silk-brocade court coat with a dramatic high standing collar framing the face, mother-of-pearl closures down a sculpted closed torso, dark red silk cravat',
      clothing: 'floor-length silk-brocade court coat with high standing collar, mother-of-pearl closures, dark red silk cravat, ancestral signet',
      escalation: {
        Forged: 'the coat full-length, collar raised, closures mother-of-pearl, house embroidery ghosted into the brocade',
        Ascendant: 'the coat as house regalia — collar flaring into a sculpted frame, brocade dense with the ancestral pattern, a short ceremonial half-cape off one shoulder',
      },
    },
    V('villainous',   'severe short slicked hair with pronounced widow\'s peak',        'severe black riding coat with high collar, blood-red silk cravat, blackened chain-jewelry, tailored trousers, polished dueling boots, walking cane with concealed blade'),
    V('ceremonial',   'high formal knot with jeweled crescent comb',                    'multi-layered court robe with silver embroidery, brocade sash, ancestral house cape, ceremonial gorget, polished ceremonial boots, ritual chalice on a chain'),
    V('battlefield',  'long braid down the back, blood-flecked',                        'blackened chainmail under a torn velvet coat, riveted vambraces, blood-stained gauntlets, scarred plate half-mask, war-boots with heel-spurs'),
    V('practical',    'silver-streaked waves, unadorned',                                'plain traveling coat over a shirt with cravat, dark trousers, worn boots, oiled cloak, satchel of medical tools, unassuming ring — hiding among mortals'),
  ],
  avoid: ['naming everyone Dracula-adjacent', 'blood/night/shadow in every surname', 'making all Vampires Eastern European', 'gothic cape as default'],
};

const LYCANTHROPE: ArchetypeFashionGuide = {
  culture: 'the relationship between person, beast, pack, curse, lineage, territory, and self-control',
  hairDirections: [
    'thick wild mane with silver streaks', 'shaved sides with a long back braid',
    'coarse fur breaking through the scalp', 'unkempt shoulder-length waves',
    'shaved head with claw-mark scars', 'wolfish crest of raised hair',
    'braided hair with animal-bone weights',
  ],
  variants: [
    V('practical',    'thick wild mane with silver streaks',                             'reinforced leather harness over a linen shift, patched wool trousers, wide belt with pack-tokens, wrapped forearms, mud-caked boots, one pack-token amulet'),
    V('battlefield',  'shaved sides with a long back braid, blood-tipped',              'reinforced boiled-leather harness with claw-mark scarring, torn wool undercoat, spiked shoulder-guards, blood-stained wraps, battle-scarred boots, war-horn'),
    V('villainous',   'wolfish crest of raised hair, mud-matted',                       'blackened studded harness over torn dark cloth, trophy chain of enemy claws, ritual bone gorget, hooked leather bracers, dark boots with iron plating'),
    V('heroic',       'braided hair with animal-bone weights',                          'clan-woven tunic layered over linen, patterned pack-sash, reinforced leather shoulder guards, wide belt with hunting tools, sturdy boots, ancestral pack-medallion'),
    V('ceremonial',   'unkempt shoulder-length waves crowned with pack-token feathers', 'ritual pack-cloak of woven wolf-fur, embroidered under-tunic, sinew waist-cord bearing pack tokens, moon-silver charm at the throat, ceremonial boots'),
  ],
  avoid: ['Wolfgar / Fenrir / Luna clichés', 'moon in every name and outfit', 'treating them as only an animal'],
};

const MECH_PILOT: ArchetypeFashionGuide = {
  culture: 'living people inside technological cultures — nations, colonies, military programs, corporate city-states, nomadic fleets',
  hairDirections: [
    'close pilot-crop', 'shaved sides with a signature quiff',
    'braided hair pinned close for the helmet', 'silver-streaked short hair',
    'shaved head with pilot-clan tattoo', 'wrapped locs close to the scalp',
    'severe blunt bob',
  ],
  variants: [
    V('industrial',   'close pilot-crop, sweat-damp',                                    'gray-and-blue pilot pressure suit with reinforced seams, tool harness across the chest, quilted vest for warmth, patched knee-pads, magnetic boots, one clan patch on the shoulder'),
    V('aristocratic', 'braided hair pinned close for the helmet',                        'silk-lined command coat with house crest, engraved interface collar, tailored trousers, polished boots, ceremonial shoulder plate, house signet ring'),
    {
      role: 'battlefield',
      hair: 'shaved head with pilot-clan tattoo, oil-smeared',
      silhouette: "a hard-shelled scarred pressure suit with sculpted overlapping chest plating shaped like the mech's own hull, one oversized reinforced pauldron bearing the scorched callsign, cabling routed like veins down the arms",
      clothing: 'hard-shelled scarred pressure suit with hull-matched chest plating, oversized callsign pauldron, vein-routed arm cabling, torn squadron half-cape',
      escalation: {
        Forged: "chest plating upgraded to match the mech's hull-lines; the pauldron earned; the squadron cape issued",
        Ascendant: 'pilot and mech share one visual language — full hull-matched plating, the pauldron crested, the cape battle-shredded and long',
      },
    },
    V('practical',    'shaved sides with a signature quiff',                             'utility jumpsuit rolled at the sleeves, tool belt, quilted inner vest, reinforced knee-pads, worn boots, faded squadron patch'),
    V('ceremonial',   'severe blunt bob, immaculate',                                    'formal squadron dress-uniform with embroidered rank panels, ceremonial gauntlets, mirror-polished boots, chest of medals, ceremonial sword'),
    V('villainous',   'silver-streaked short hair, immaculate',                          'severe black pressure suit with restrictive collar, blackened plate accents, defaced squadron patch, hooked gauntlets, polished boots with metal caps'),
  ],
  avoid: ['treating call sign as legal name by default', 'every pilot sounding American military', 'random numbers unless justified'],
};

const ANDROID: ArchetypeFashionGuide = {
  culture: 'who named/made them; whether they still wear maker\'s livery or have chosen their own aesthetic — clothing is CHOSEN by androids beyond Foundation',
  hairDirections: [
    'no hair — polished chassis crown', 'synthetic fiber crop in an unnatural color',
    'braided synthetic fibers with fiber-optic light', 'cropped hair grown from bio-panel',
    'shaved head with visible seams and ports', 'long hair-substitute of woven wire',
    'no hair, ceramic-plate scalp',
  ],
  variants: [
    V('industrial',   'no hair — polished chassis crown with maker\'s stamp',            'utility maintenance suit with tool harness, exposed joint-armor, quilted synthetic vest, work-boots with mag-pads, maker\'s patch on the shoulder'),
    V('aristocratic', 'braided synthetic fibers with fiber-optic light',                 'silk-brocade formal coat over a fitted chassis-suit, polished ceremonial gauntlets, house crest on the collar, tailored trousers, polished formal boots, ceremonial sash'),
    V('ceremonial',   'cropped hair grown from bio-panel',                               'formal ceremonial robe with rank panels, ceremonial gauntlets, prayer-cord belt, ceremonial slipper-boots, ceremonial focus-crystal on a chain'),
    V('scholarly',    'shaved head with visible seams and ports',                        'scholarly under-coat with data-slate harness, reading spectacles on a cord, ink-stained cuffs (chosen accessory), tool-pouch of interface tools, walking staff'),
    V('battlefield',  'no hair, ceramic-plate scalp',                                    'reinforced combat chassis with visible armor plating, tool-belt of interface weapons, mag-boots with impact plates, battle-scarred shoulder cores, weapon-arm mount'),
  ],
  avoid: ['every Android chrome mannequin', 'human-face-plus-antennae default', 'making all androids ashamed of their form'],
};

const SERAPH: ArchetypeFashionGuide = {
  culture: 'celestial office, oath, choir, judgment, protection, sacrifice, sacred duty',
  hairDirections: [
    'long flowing hair like sunbeams', 'shaved head with a burning halo',
    'silver hair braided into a crown', 'coiled hair with light-woven threads',
    'ivory hair falling to the shoulders', 'shorn head with vow-marks tattooed',
    'twin braids of gold-thread hair',
  ],
  variants: [
    {
      role: 'ceremonial',
      hair: 'silver hair braided into a crown',
      hairFeminine: 'silver hair braided into a high coiled crown threaded with gold light-wire, a serene brow, no beard (female-presenting)',
      silhouette: 'cascading layered ivory brocade that falls like folded wings, a sculpted gold breast-icon of the choir at the sternum, a gold-thread stole streaming past the knees',
      clothing: 'cascading layered ivory brocade robe, sculpted gold choir breast-icon, streaming gold-thread stole, censer-chain wound at the wrist',
      escalation: {
        Forged: 'a second brocade layer with choir rank panels; the breast-icon polished and radiant; the stole embroidered with the vow',
        Ascendant: 'the full choir vestment — robe layers cascading in sculpted tiers, the breast-icon grown into a relief-carved gorget, the stole doubled and floor-sweeping',
      },
    },
    // 2026-07-23 upgraded from plain V() to the full silhouette contract
    // (closed-undergarment coverage + escalation + feminine hair). The
    // villainous variant bakes the Fallen corrupted-angel read; the aristocratic
    // one is silver/pearl so it never collides with Good-path white-and-gold.
    {
      role: 'villainous',
      hair: 'a shorn head with defaced vow-marks tattooed across the scalp, soot-darkened',
      hairFeminine: 'black hair scorched at the ends and bound in a severe low knot with blackened iron pins, defaced vow-marks tattooed at the temple, ash-streaked brow, no beard (female-presenting)',
      silhouette: 'a closed charred black under-robe covering the whole chest and stomach to the collar, blackened tarnished-gold obsidian breastplate and thorn-shaped pauldrons buckled OVER it (a MAJESTIC ruined angel — molten-obsidian BLACK light bleeds up through hairline cracks in the plate, never free flame, NEVER a bare chest, NEVER a red horned devil), a shattered halo-ring canted behind the head and a torn stole hanging like a burnt wing',
      clothing: 'closed charred black under-robe, blackened tarnished-gold obsidian breastplate with molten cracks, thorn-shaped pauldrons, a shattered inverted halo-ring and burnt trailing stole',
      escalation: {
        Forged: 'one obsidian statement piece over the charred robe — the breastplate scorched and hairline-cracked, the halo already canting and dimming',
        Ascendant: 'full obsidian regalia — the plate fully lava-fissured with black light, the halo shattered/inverted, a single great charred black feathered wing dissolving into ash',
      },
    },
    {
      role: 'battlefield',
      hair: 'twin braids of gold-thread hair, blood-stained and singed',
      hairFeminine: 'twin gold-thread braids gathered under a dented war-fillet, a battle-grimed serene brow, a blade-scar across one cheek, no beard (female-presenting)',
      silhouette: 'a closed war-torn ivory under-robe covering the whole chest and stomach to the collar, blade-notched dented ceremonial plate and one battle-scarred wing-articulated pauldron lashed OVER it (a guardian who has PAID the cost — visible wear, field-repairs and dried blood on the plate, NEVER a bare chest, NOT a shiny parade paladin), a torn banner-stole snapping in the wind',
      clothing: 'closed war-torn ivory under-robe, blade-notched dented ceremonial plate, one wing-articulated battle-scarred pauldron, a torn snapping banner-stole',
      escalation: {
        Forged: 'the plate more battered with a field-repaired seam and one earned rank-brand, the stole ragged',
        Ascendant: 'the full war-vestment worn and legendary — cascading dented tiers, a relief-carved gorget notched by combat, the wing-articulation grown to full span',
      },
    },
    {
      role: 'aristocratic',
      hair: 'a shaved head under a formal silver circlet',
      hairFeminine: 'a smooth high chignon under a formal silver circlet, pearl drops at the temple, a composed serene brow, no beard (female-presenting)',
      silhouette: 'a closed high-collared ivory silk court-robe covering the whole chest and stomach to the throat, a silver-and-pearl ceremonial mantle and house-of-heaven gorget set OVER it (a high-court Seraph of an Order, refined and restrained, silver rather than heavy gold, NEVER a bare chest, NOT drowning in gold, NOT a paladin), a long court-train falling in controlled vertical folds',
      clothing: 'closed high-collared ivory silk court-robe, silver-and-pearl ceremonial mantle, house-of-heaven gorget, a long controlled court-train',
      escalation: {
        Forged: 'a second silk layer with an Order rank-panel, the gorget polished, the circlet set with a single pale stone',
        Ascendant: 'the full court regalia — sculpted cascading silk tiers, the mantle grown to a formal shoulder-cascade, the train floor-sweeping',
      },
    },
  ],
  avoid: ['every Seraph gentle and morally perfect', 'copying famous angel names', 'making every name end in "-iel"'],
};

// 2026-07-23 HUMAN REFRAME (Raheem + art-prompt-director): Human is no longer the
// generic everyman. Human = the no-element TECH "Inventor" class — power is what
// they BUILD/ADAPT/ASSIST with, never elemental magic. A CALLING BLOCKER (sibling
// to Barbarian Traditions) gates one of seven vocations. Steampunk/dieselpunk:
// brass, gears, rivets, canvas, oiled leather. Every silhouette leads with a
// CLOSED full-torso garment (the validated coverage rule) + a NEVER-a-bare-chest
// guard, dominant material noun first, ≤4 clothing items, deepen-never-swap
// escalation, paired male/matriarch hair. Variant ORDER is load-bearing — it is
// index-parallel to HUMAN_ENVIRONMENTS (archetypeEnvironments.ts) for coupling.
const HUMAN: ArchetypeFashionGuide = {
  culture: 'the no-element TECH INVENTOR — power is what they BUILD, ADAPT, and ASSIST with (turrets, constructs, gadgets, prosthetics, cures), NOT any elemental magic; ONE of seven Callings (Artificer / Field-Medic / Scholar / Pacifist / Infiltrator / Sky-Corsair / Marksman) — a "who did you become?" vocation-blocker in a steampunk/dieselpunk fantasy world of brass, gears, rivets, pressure-gauges, wiring, canvas and oiled leather; NOT a generic everyman, NOT modern-Western, NOT real-world military, NOT sci-fi chrome',
  hairDirections: [
    'short oil-smudged dark hair with brass goggles shoved up on the brow', 'dark hair in a tight bun skewered with a brass caliper-pin, soot-smudged',
    'short clean hair under a strapped brass head-lamp with a flip-up loupe', 'smooth low chignon pinned with a slide-rule pin, ink-stained fingertips',
    'neat side-parted hair behind folding analytical lenses', 'softly-shaved crown with a single prayer-cord at the temple',
    'hair veiled flat beneath a wrapped low-profile ghillie-hood', 'wind-tossed hair under pushed-up aviator goggles with a brass ear-cuff',
    'close field-cut hair under a range-finder monocle bracket', 'a tight field-braid under a brow-bracket optic',
  ],
  variants: [
    // 1. THE ARTIFICER — flagship steampunk inventor/engineer
    {
      role: 'industrial',
      hair: 'short practical dark hair pushed back and oil-smudged, brass goggles shoved up onto the forehead, a close-trimmed working beard',
      hairFeminine: 'dark hair scraped into a tight practical bun skewered with a brass caliper-pin, soldering-goggles pushed up on the brow, a soot-smudged cheek, no beard (female-presenting)',
      silhouette: 'a closed oil-stained canvas-and-leather work-tunic buttoned to the collar covering the whole chest and stomach, a riveted brass tool-harness and a segmented brass-and-gear back-rig strapped OVER it (a human INVENTOR-ENGINEER — brass, gears, rivets and pressure-gauges, NOT a plate knight, NOT a mage or any magic, NEVER a bare chest), a half-built clockwork mechanism cradled at the hip, goggles up on the brow',
      clothing: 'a closed canvas-and-leather work-tunic under a riveted brass tool-harness, a gear-and-piston back-rig, a half-built clockwork mechanism at the hip, brass goggles',
      escalation: {
        Forged: 'the back-rig grown into a working powered exo-frame of brass pistons and copper piping, one earned pressure-gauge chestplate bolted over the tunic, a small deployed turret-construct at the shoulder',
        Ascendant: 'the full artificer regalia — a brass-and-copper engineer\'s exo-rig venting live steam, the chest a paneled instrument-array of gauges and valves, a constructed automaton standing at heel — everything the Human BUILT, never conjured (keep the rig hand/body scale, NOT a piloted giant mech)',
      },
    },
    // 2. THE FIELD-MEDIC — TECH healer, NOT magic
    {
      role: 'practical',
      hair: 'short clean practical hair under a strapped brass head-lamp, a magnifying loupe flipped up at the temple, tired eyes, faint stubble',
      hairFeminine: 'hair pulled back tight and pinned under a strapped brass head-lamp, a jeweler\'s loupe on a temple-bracket, weary eyes, no beard (female-presenting)',
      silhouette: 'a blood-flecked high-collared oilcloth SURGEON\'S APRON strap-buckled over a rolled-sleeve buttoned linen shirt covering the whole chest and stomach, the character mid-operation LEANING OVER A PATIENT ON A SURGERY-TABLE with a gleaming bone-saw and forceps IN HAND, a leather chest-bandolier crowded with brass syringes, scalpels, clamps and glass apothecary vials worn OVER the apron (an OLD-SCHOOL GASLAMP-FANTASY FIELD-SURGEON of REAL period medicine — bone-saws, tourniquets, sutures, leech-jars, ether-bottles, brass syringes, a hanging skeleton/anatomy chart behind — NOT an inventor at a workbench, NOT a modern nurse, NOT a magic priest, NO glowing spell-hands, NEVER a bare chest), a clockwork prosthetic hand, an operating-lamp overhead',
      clothing: 'a blood-flecked oilcloth surgeon\'s apron over a linen shirt, a bandolier of scalpels, brass syringes and glass vials, a bone-saw and forceps in hand, a patient on the surgery-table',
      escalation: {
        Forged: 'the apron layered under a brass-buttoned surgeon\'s coat, a chest-rack of graduated vials and gleaming steel instruments, a wheeled surgical-cabinet and operating-table beside the working surgeon',
        Ascendant: 'the full field-surgeon regalia — a walking surgical-theatre of brass instrument-drawers, glass reservoirs, coiled tubing and hanging tools, a masterwork clockwork prosthetic limb presented, the surgeon commanding the operating floor — old-world medicine as engineering, never magic',
      },
    },
    // 3. THE SCHOLAR — scientist/researcher
    {
      role: 'scholarly',
      hair: 'neat side-parted hair, analytical brass-rimmed lenses on a folding armature, ink-stained fingers, clean-shaven',
      hairFeminine: 'hair in a smooth low chignon pinned with a slide-rule pin, a bank of flip-down analytical lenses on a brow-armature, ink-stained fingertips, no beard (female-presenting)',
      silhouette: 'a closed reinforced field-coat buttoned to the collar covering the whole chest and stomach, a survey-instrument harness and a blueprint-scroll bandolier worn OVER it (a fantasy-TECH RESEARCHER of brass instruments and data-slates — NOT a wizard in robes, NOT a sterile modern lab-coat, NO spellbooks, NEVER a bare chest), a glowing blueprint data-slate held ready, a small survey-drone at the shoulder, a multi-lens analytical monocle',
      clothing: 'a closed reinforced field-coat under a survey-instrument harness, a blueprint-scroll bandolier, a data-slate in hand, a shoulder survey-drone',
      escalation: {
        Forged: 'the field-coat plated with a brass instrument-breastplate of dials, an earned senior-surveyor mantle of rolled charts, the survey-drone upgraded and paired, a mapping-orrery bracer on the forearm',
        Ascendant: 'the full researcher regalia — a wearable analytical engine, the coat threaded with a working brass computation-array, a constellation of survey-drones mapping the air, master blueprints unfurling — the Human who UNDERSTANDS rather than casts',
      },
    },
    // 4. THE PACIFIST — faith peacemaker, the ONE non-tech exception
    {
      role: 'ceremonial',
      hair: 'a softly-shaved crown, serene unlined brow, clean-shaven, a single prayer-cord at the temple',
      hairFeminine: 'hair fully veiled beneath a plain layered head-wrap, a serene face, a single prayer-bead strand at the brow, no beard (female-presenting)',
      silhouette: 'a plain flowing undyed MONASTIC ROBE of soft homespun cloth, hooded, falling loose to the ankles and closed to the collar over the whole chest, stomach and arms, a long wooden prayer-bead strand and a simple rope-cord waist-sash the ONLY adornments (the ONE faith Calling — a serene robed monk/priest, UNARMED, fully covered, NO leather harness, NO buckles, NO armor, NO weapon, NOT a rugged adventurer, NEVER a bare chest), both hands open and empty raised in a gesture of peace, a plain wooden walking-staff (NOT a weapon), standing calm in a quiet lantern-lit sanctuary',
      clothing: 'a plain hooded undyed monastic robe to the ankles, a long wooden prayer-bead strand, a rope-cord waist-sash, a plain wooden walking-staff',
      escalation: {
        Forged: 'a second embroidered vestment-layer earned bearing the order\'s peace-sigil, the prayer-beads lengthened, the staff crowned with a simple carved token — still unarmed, still fully covered',
        Ascendant: 'the full peacemaker regalia — cascading layered ceremonial vestments falling floor-length, an embroidered stole of the reconciled, followers bearing hand-lanterns around the figure, hands still open and empty — authority through peace, never force',
      },
    },
    // 5. THE INFILTRATOR — ninja/spec-ops, camo BLENDS INTO the background (special)
    {
      role: 'practical',
      hair: 'flat matte-dark hair under a wrapped low-profile hood, face masked below the eyes, one visible watchful eye, no shine',
      hairFeminine: 'hair bound flat and hidden under a wrapped ghillie-hood, a cloth mask below the eyes, one lit watchful eye, no beard (female-presenting)',
      silhouette: 'a FULL GHILLIE CAMO SUIT — a shaggy hooded camouflage cloak of frayed grey-green-brown foliage-strips, mottled netting and leafy rags COVERING the whole body head to knee over a closed matte undersuit, patterned and textured to MATCH the surrounding camo background so the figure is DISAPPEARING into it and doing it well (a real ghillie-suited spec-ops sniper/scout, camo NOT chrome, NOT a spandex superhero-ninja, NEVER a bare chest), low and crouched among the foliage, a broken-up silhouette — ONLY the eyes and a sliver of the shadowed face barely readable, everything else camouflaged',
      clothing: 'a full shaggy ghillie camo suit of foliage-strips and netting over a closed undersuit, a mottled camo hood shadowing the face, foliage-wrapped gear, a suppressed scoped tech-rifle low in the leaves',
      escalation: {
        Forged: 'the ghillie suit thicker and more matched to the foliage, more of the figure dissolved into the camo, only the eyes catching light',
        Ascendant: 'a masterwork ghillie shroud near-perfectly matching the wildwood — the Human all but VANISHED, a barely-there ripple in the camo field, only two watchful eyes proving anyone is there at all',
      },
    },
    // 6. THE SKY-CORSAIR — TECH pirate of the airship-lanes
    {
      role: 'heroic',
      hair: 'wind-tossed hair under aviator goggles pushed up, a rakish trimmed beard, a brass ear-cuff, a weather-burned grin',
      hairFeminine: 'wind-whipped hair in a long storm-tossed braid under pushed-up aviator goggles, a brass ear-cuff, a weather-burned cheek, no beard (female-presenting)',
      silhouette: 'a closed weathered canvas-and-leather flight-tunic buttoned to the collar covering the whole chest and stomach, a long brass-buttoned airship long-coat and a bandolier of gadgets worn OVER it, aviator goggles up on the brow, aboard a FLYING AIRSHIP high in the clouds — the ship\'s great gasbag/balloon envelope and propellers overhead, open sky and cloud all around (a TECH SKY-PIRATE of the air-lanes; absolutely NOT a sailing sea-ship on water, NOT an ocean galleon, NOT a naval sea-captain, NOT a Caribbean/tricorn pirate, NO ocean, NEVER a bare chest)',
      clothing: 'a closed flight-tunic under a brass-buttoned airship long-coat, aviator goggles, aboard a flying airship among the clouds, gasbag envelope overhead',
      escalation: {
        Forged: 'the long-coat lengthened into a captain\'s storm-coat with brass epaulettes, a mechanical glider-harness folded at the back, still high in the clouds aboard the flying airship (never at sea)',
        Ascendant: 'the full sky-corsair regalia — a captain\'s brass-and-leather flight-coat streaming in the wind, a deployed mechanical glider-rig spread behind, commanding the deck of a great FLYING AIRSHIP amid a cloud-harbor of skyships (high in the sky, gasbag envelopes above, NEVER an ocean or sailing sea-ship)',
      },
    },
    // 7. THE MARKSMAN — precision shooter, fantasy-tech NOT modern military
    {
      role: 'practical',
      hair: 'close field-cut hair under a range-finder monocle bracket, a spotter\'s squint, light stubble, a cheek-smudge',
      hairFeminine: 'hair in a tight field-braid under a range-finder monocle on a brow-bracket, a steady spotter\'s squint, a cheek-smudge, no beard (female-presenting)',
      silhouette: 'a lone sharpshooter kneeling on a high wind-swept OVERWATCH RIDGE under open outdoor sky, RAISING AND AIMING a long brass-scoped tech-rifle into the distance — the rifle its defining silhouette — a range-finder monocle over one eye and a spotter-drone at the shoulder; a closed reinforced canvas field-tunic buttoned to the collar covers the whole chest and stomach under a segmented leather-and-brass shooting-harness (a fantasy-TECH precision MARKSMAN of brass optics, oiled walnut and blued steel, OUTDOORS on the ridge NOT indoors, NOT a modern soldier, NO plastic rifle, NO nylon webbing, NEVER a bare chest)',
      clothing: 'a long brass-scoped tech-rifle aimed into the distance, a closed canvas field-tunic under a leather-and-brass shooting-harness, a range-finder monocle, kneeling on an open windswept ridge',
      escalation: {
        Forged: 'a brass instrument-bracer of range-dials on the harness, an upgraded spotter-drone circling, a heavier bipod rifle steadied on the ridge, the valley falling away below',
        Ascendant: 'the full marksman regalia — a masterwork brass-and-walnut long-rifle with a multi-lens optic array, a paired spotter-drone flight, high on a legendary overwatch ridge commanding the whole valley — precision made an art',
      },
    },
  ],
  avoid: [
    'using Human as the "plain" everyman archetype', 'any elemental magic, spell-hands, glowing runes or arcane VFX (Human has NO element — power is BUILT, not channeled)', 'modern-Western or real-world-military styling', 'sci-fi chrome / clean-sterile futurism (keep it brass-and-canvas dieselpunk)', 'the Field-Medic as a red-cross nurse or a robed magic priest', 'the Sky-Corsair as a tricorn Caribbean sea-pirate', 'the Marksman as a modern soldier with nylon webbing', 'the Infiltrator as spandex superhero-ninja', 'arming the Pacifist or covering them in armor', 'collapsing the seven Callings back into one generic tinkerer', 'the Artificer\'s exo-rig reading as a piloted giant mech (keep it body-scale)',
  ],
};

export const ARCHETYPE_FASHION_GUIDES: Record<ArchetypeName, ArchetypeFashionGuide> = {
  Barbarian: BARBARIAN,
  Monk: MONK,
  Beastmaster: BEASTMASTER,
  Druid: DRUID,
  Necromancer: NECROMANCER,
  Vampire: VAMPIRE,
  Lycanthrope: LYCANTHROPE,
  'Mech Pilot': MECH_PILOT,
  Android: ANDROID,
  Seraph: SERAPH,
  Human: HUMAN,
};

/**
 * ---------- Rank-scaled depth (Bible §17) ----------
 *
 * Foundation cards get 3-4 clothing layers; Forged gets 6-8 + rank
 * signal; Ascendant gets full 12 + integrated magic/tech. This matches
 * Bible §17 rank progression and prevents over-scoping every forge.
 */
export const RANK_LAYER_DEPTH: Record<Rank, {
  layerCount: number;
  focus: string;
  description: string;
}> = {
  // 2026-07-23 overhaul: escalation is SILHOUETTE-DEEPENING on the same outfit,
  // NOT layer-count inflation ("more items" renders WORSE, not grander).
  Foundation: {
    layerCount: 4,
    focus: 'the stripped, field-worn version of the variant silhouette',
    description: 'The variant silhouette at its working core — plain materials, field repairs, the statement piece absent or unearned, the flow element short and practical. Same construction it will always have, humblest expression.',
  },
  Forged: {
    layerCount: 8,
    focus: 'the SAME silhouette + ONE earned statement piece',
    description: 'The same outfit, proven: add exactly ONE earned statement piece at scale (a grand pauldron, an embroidered mantle, a crest), deepen the craftsmanship, lengthen the flow element. Do NOT add clutter — deepen, never swap.',
  },
  Ascendant: {
    layerCount: 12,
    focus: 'the silhouette at full ceremonial scale — same construction, deeper',
    description: 'The same outfit as living regalia — the silhouette at its grandest: sweeping, layered, integrated, the statement piece crowned, the flow element floor-length and dramatic, meaningful damage/inheritance visible. Do NOT express Ascendant only by more gold, and do NOT swap the outfit.',
  },
};

/**
 * ---------- Negatives (Bible §22) ----------
 */
export const HAIR_FASHION_NEGATIVES: readonly string[] = [
  'generic fantasy clothing', 'generic leather armor', 'random fur shoulder',
  'identical black robes', 'identical capes', 'every woman in a corset',
  'every man in bare-chested armor', 'hypersexualized armor', 'cleavage armor',
  // M5.7 — modesty mandate mirrored from BASE_NEGATIVE so both stacks catch it.
  'exposed nipples', 'bare breasts', 'bra as outerwear', 'sports bra as outerwear',
  'bikini top as armor', 'panties', 'thong', 'lingerie armor', 'leotard armor',
  'chainmail bikini', 'hip-cutout costume', 'crop top on the battlefield',
  'bare midriff on the battlefield', 'sexualized costume', 'pin-up styling',
  'high heels in battlefield gear without reason', 'excessive exposed skin',
  'modern clothing leaking into fantasy settings', 'random cultural symbol mixing',
  'random sacred symbols', 'hair passing through helmets',
  'capes attached without clasps', 'armor with no underlayer',
  'belts and straps leading nowhere', 'chainmail painted like cloth',
  'every villain in black',
  'every aristocrat overloaded with jewels',
  'every Barbarian looking Norse', 'every Monk looking East Asian',
  'every Druid looking Celtic', 'every Vampire looking Victorian',
  'every Human looking modern Western',
  'repeated hairstyle across recent cards',
];

/**
 * ---------- Rotation helpers ----------
 */
export function rotateSliceHF<T>(items: readonly T[], offset: number, count: number): readonly T[] {
  const n = items.length;
  if (n === 0) return [];
  const out: T[] = [];
  const take = Math.min(count, n);
  for (let i = 0; i < take; i++) out.push(items[(offset + i) % n]);
  return out;
}

/**
 * Pick the fashion variant for this forge per archetype cursor. The
 * cursor is stored in localStorage per archetype so Barbarian #1 lands
 * on one variant, Barbarian #2 on the next, etc.
 *
 * M5.2 — walks the variants from `cursor` position with wrap-around and
 * returns the first variant whose `requiredElements` includes the
 * character's element (or has no requiredElements = valid for any).
 * M5.4 — retained for future element-scoped variants; every current
 * variant is element-agnostic (infernal/celestial/corrupted roles were
 * deleted entirely and their element flavor moved to the ELEMENT VISUAL
 * LANGUAGE block).
 */
export function pickFashionVariant(
  archetype: ArchetypeName,
  element: ElementName,
  cursor: number,
): ArchetypeFashionVariant {
  const guide = ARCHETYPE_FASHION_GUIDES[archetype];
  const n = guide.variants.length;
  for (let i = 0; i < n; i++) {
    const candidate = guide.variants[(cursor + i) % n];
    if (!candidate.requiredElements || candidate.requiredElements.includes(element)) {
      return candidate;
    }
  }
  // Impossible in practice (every archetype has multiple always-valid
  // variants) but return the first one as a safety net.
  return guide.variants[0];
}

/**
 * Assemble a compact HAIR & FASHION block for a Leonardo prompt. The block
 * grows with rank per Bible §17 — Foundation gets essentials, Forged adds
 * structural layers + insignia, Ascendant gets full regalia guidance.
 */
export function assembleHairFashionBlock(
  archetype: ArchetypeName,
  element: ElementName,
  rank: Rank,
  fashionCursor: number,
  hairCursor: number,
): { block: string; variant: ArchetypeFashionVariant } {
  const guide = ARCHETYPE_FASHION_GUIDES[archetype];
  const variant = pickFashionVariant(archetype, element, fashionCursor);
  const rankDepth = RANK_LAYER_DEPTH[rank];
  const hairSamples = rotateSliceHF(guide.hairDirections, hairCursor, 3);
  const otherVariants = guide.variants
    .filter((v) => v.role !== variant.role)
    .slice(0, 3)
    .map((v) => v.role)
    .join(' / ');

  const block = `
=== HAIR & FASHION BIBLE (Raheem v1.0 — enforce for hair + fashion structured fields) ===
CORE PRINCIPLE: A character's appearance is worldbuilding on a body. Hair carries lineage, discipline, and history. Clothing carries culture, rank, environment, and personal choice. Build outfits in LAYERS — Bible §10. Do NOT reduce this archetype to one costume shortcut.

ARCHETYPE COSTUME CULTURE (${archetype}): ${guide.culture}.

REQUIRED FASHION VARIANT (for this specific forge — do NOT drift to another): ${variant.role.toUpperCase()} — ${FASHION_ROLE_GUIDANCE[variant.role]}
${variant.silhouette ? `   SILHOUETTE (the WOW shot — this ONE dominant form is what must render; put it into primaryGarment/armor nearly verbatim): ${variant.silhouette}\n` : ''}${variant.escalation && rank !== 'Foundation' ? `   RANK DELTA (${rank} — deepen the SAME outfit, never swap): ${variant.escalation[rank]}\n` : ''}   Reference hair — PICK BY THE CHARACTER'S SEX (this archetype is 50/50 male/female; do NOT default to the male cue):
      male-presenting: ${variant.hair}${variant.hairFeminine ? `\n      female-presenting: ${variant.hairFeminine}` : ''}
   Reference clothing (MAX 4 items — one dominant form, one thing that flows, one statement piece, one grounded detail): ${variant.clothing}
   (This is the target vibe. Adapt to the character's ancestry, story, body, and element — do NOT copy verbatim. Other variants exist for this archetype [${otherVariants}] but are not this forge's target. The torso is ALWAYS fully clothed — no bare chest/midriff at any rank.)

HAIR DIRECTION POOL for ${archetype} (rotating slice — the character's hair should feel drawn from THIS pool, not from a generic fantasy default):
${hairSamples.map((h) => `  - ${h}`).join('\n')}

HAIR FIELDS (Bible §3 — REQUIRED nested object):
  texture: pick from Bible §4 buckets — straight / wavy / curly / coily / locs / braided / shaved-cropped (with a specific descriptor, not just "curly")
  length: short / shoulder-length / long / very long / clipped
  style: the specific arrangement (e.g. "high half-knot with two bronze clan rings", "wrapped locs tucked under a training scarf")
  color: from Bible §5 buckets — dark / medium-warm / light / gray-age / fantasy (fantasy only through streaks/tips/light response, not full-head neon)
  condition: from Bible §6 — polished / oiled / wind-tangled / battlefield-cut / etc. Reflects the setting.
  adornment: optional — one or two intentional pieces, NOT loaded with accessories
  facialHair: from Bible §7 — clean-shaven / stubble / full beard / braided beard / etc. or "none — female-presenting" / "wolfish facial fur" / etc.
  headwearInteraction: how the hair sits under any hood/helmet/veil/halo — Bible §9. If none, "none".

FASHION FIELDS (Bible §10 — layered construction, RANK-SCALED depth):
  Rank: ${rank} — ${rankDepth.focus}
  Layer count target: ${rankDepth.layerCount} of the 12 possible layers.
  ${rankDepth.description}
  role: MUST equal "${variant.role}"
  primaryGarment: the main outfit piece (e.g. "layered indigo wool tunic", "silk-brocade court coat", "utility jumpsuit")
  ${rank !== 'Foundation' ? 'baseLayer: the underlayer (linen shift / quilted gambeson / synthetic pressure suit / etc.)' : '(Foundation: no baseLayer required unless it shows)'}
  ${rank !== 'Foundation' ? 'structuralLayer: the reinforcement between garment and armor (padded vest / quilted arming coat / cotton wrap)' : ''}
  armor: pick from Bible §13 vocabulary — quilted gambeson / molded leather cuirass / blackened chain shirt / articulated plate / studded brigandine / lamellar scales. Foundation = optional/limited. Forged = partial. Ascendant = complete regalia. Element-specific coloring (ember/halo/blood/etc.) is applied by the ELEMENT VISUAL LANGUAGE block, NOT by the armor description here.
  waist: sash / belt / cord / harness — how the waist system works
  outerLayer: cloak / mantle / cape / travel coat — with construction detail. Foundation = repaired travel mantle. Ascendant = ceremonial regalia mantle.
  footwear: specific — weather-cracked boots / soft training shoes / mag-boots / etc.
  ${rank === 'Ascendant' ? 'armAndHandTreatment: gauntlets / wrapped forearms / ceremonial gloves / etc.' : ''}
  materials: array of 2-4 specific textiles from Bible §12 (matte linen / felted wool / silk brocade / velvet / boiled leather / lacquered lamellar / etc.)
  wear: Bible §15 — new / used / battlefield / ancient with SPECIFIC descriptor ("softened by wear", "blood-stained", "moth-eaten")
  signatureAccessory: ONE meaningful piece tied to the character's story (an ancestral clasp, a house sigil ring, a pack-medallion, a callsign patch)
  ${rank !== 'Foundation' ? 'rankSignal: how the character shows their standing — earned insignia, clan colors, house crest — NOT gold-by-default' : '(Foundation: rankSignal optional — Bible §17 says Foundation is "incomplete identity")'}
  ${rank === 'Ascendant' ? 'magicalOrTechnologicalIntegration: the last field — how magic or tech is woven INTO the outfit (not glued on). Ascendant only.' : ''}

BIBLE §22 EXCLUSIONS: NO generic fantasy clothing, NO random fur shoulder, NO identical black robes, NO cleavage armor, NO high heels on the battlefield, NO modern clothing in fantasy settings, NO hair passing through helmets, NO belts leading nowhere, NO chainmail painted like cloth, NO every villain in black. Element-specific palette (ember, halo, blood-mist, void-tear) comes from the ELEMENT VISUAL LANGUAGE block ONLY — DO NOT bake element color into the fashion description.

MODESTY IS MANDATORY (Bible §22.M5.7): NO bras, NO panties, NO underwear-as-costume, NO lingerie, NO chainmail bikinis, NO leotard armor, NO cleavage cutouts, NO hip cutouts, NO bare-midriff battlefield gear, NO exposed nipples, NO bare breasts, NO pin-up styling, NO sexualized costume. The strong wear REAL armor, robes, coats, capes, and regalia. Every archetype's Foundation outfit at minimum covers the torso and hips. Powerful and modest — that is the tone.

ARCHETYPE-SPECIFIC AVOID for ${archetype}:
${guide.avoid.map((a) => `  - ${a}`).join('\n')}

BIBLE §14 VALIDATION: Would this outfit look coherent WITHOUT armor? Is the wear state SPECIFIC (not just "battle-worn")? Does the hair texture MATCH the character's ancestry (Bible §2.5: skin tone does NOT determine hair culture)? Is the layered construction physically compatible (no cape attached without clasp, no armor without underlayer)?
`;

  return { block, variant };
}
