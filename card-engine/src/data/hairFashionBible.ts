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

/** Bible §13 — armor library, condensed. */
export const ARMOR_LIBRARY: readonly string[] = [
  // padded
  'quilted gambeson', 'layered felt armor', 'stitched shoulder guards',
  // leather
  'molded leather cuirass', 'lacquered leather scales', 'boiled-leather shoulder caps',
  // chain
  'fine ring mail', 'riveted mail', 'blackened chain shirt', 'silvered mail',
  // scale/lamellar
  'overlapping bronze scales', 'lacquered lamellar', 'bone lamellar', 'moon-silver lamellae',
  // plate
  'partial plate', 'articulated plate', 'fluted plate', 'engraved plate',
  'blackened plate', 'asymmetrical salvaged plate',
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

export const FASHION_ROLE_GUIDANCE: Record<FashionRole, string> = {
  heroic:       'clarity, purpose, readiness, recognizable silhouette, one meaningful personal emblem — Bible §16.Heroic',
  villainous:   'severe silhouette, muted colors, concealed hands, ritual regalia — NOT just black. Bible §16.Villainous',
  aristocratic: 'controlled silhouette, luxurious textiles, subtle rank markers — NOT drowning in gold. Bible §16.Aristocratic',
  scholarly:    'academic robes, ink-stained cuffs, scroll harness, manuscript pouches, reading spectacles or eyeglass',
  practical:    'reinforced worker garments, local materials, one signature repair, weatherproof mantle',
  battlefield:  'armored layers with visible wear, hasty repairs, blood-stained accents, blade-notched plates',
  ceremonial:   'ritual regalia, embroidered rank panels, formal over-vest, sacred beads or chains — Bible §16.Ceremonial',
  industrial:   'reinforced work-suit, tool harness, pressure gaskets, wear-plates, embedded circuitry',
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
  hair: string;
  clothing: string; // one-line comma-separated layered description
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

const BARBARIAN: ArchetypeFashionGuide = {
  culture: 'clan history, survival knowledge, regional climate, inherited craft, trophies with meaning — NOT fur underwear and bare abs',
  hairDirections: [
    'dense coils tied with leather cord', 'freeform locs wrapped in clan-colored cloth',
    'short practical crop', 'thick wind-tangled waves',
    'shaved temples with a braided central strip', 'long iron-gray hair in a low knot',
    'multiple narrow braids with bronze weights', 'clean-shaven head marked with ritual paint',
  ],
  variants: [
    V('heroic',       'multiple narrow braids with bronze clan weights',                 'layered indigo wool tunic over a quilted vest, patterned clan-woven sash, reinforced leather bracers, weather-cracked boots, repaired fur-lined traveling mantle, one carved ancestral clasp'),
    V('villainous',   'clean-shaven head marked with dark ritual paint',                  'blackened scale armor over dark woven cloth, trophy chains, severe fur collar, ritual face veil, polished execution weapon harness, clan symbols intentionally defaced'),
    V('aristocratic', 'long iron-gray hair in a controlled low knot with silver comb',    'richly-dyed wool overcoat with woven geometric patterns, bronze torc, embroidered hide mantle, heirloom bronze lamellar, carved belt fittings, ceremonial boots'),
    V('battlefield',  'shaved temples with a scorch-marked central strip',                'dark hide undercoat, blackened chainmail with hooked links, weather-cut wool mantle, hooked iron clasps, heavy shoulder-plate scored with clan-marks'),
    V('practical',    'thick wind-tangled waves tied back with cloth wrap',               'sleeveless leather tunic over a linen shift, patched wool trousers, a broad belt with weathered pouches, wrapped forearms, salt-stained travel boots'),
    V('ceremonial',   'freeform locs wrapped in clan-colored cloth with bone pins',       'embroidered ancestor mantle, ceremonial bronze lamellar with clan sigil embossed, waist-sash bearing ancestral tokens, ceremonial parade boots, torc-and-chain'),
  ],
  avoid: ['identical shirtless bodybuilders', 'one fur shoulder on every card', 'horned helmet as default', 'random "tribal" decoration without a culture', 'Viking-only styling'],
};

const MONK: ArchetypeFashionGuide = {
  culture: 'discipline, order, climate, labor, training, philosophy, ritual hierarchy, personal vows — Monks come from desert, mountain, forest, urban, maritime, OR synthetic orders',
  hairDirections: [
    'shaved head', 'close-cropped coils', 'long hair tied in a practical knot',
    'crown braid', 'wrapped locs', 'silver hair gathered with a vow cord',
    'temple shave with remaining hair braided', 'hair fully covered by a training scarf',
    'uncut hair as a sacred vow',
  ],
  variants: [
    V('heroic',       'close-cropped coils under a wrapped training scarf',           'layered linen robe with split-skirt panels, wrapped forearms, quilted vest underneath, practical sash, soft training shoes, weatherproof travel mantle, prayer beads at the wrist'),
    V('villainous',   'severe blunt bob, immaculately groomed',                       'immaculate dark robes with restrictive high collar, weighted sleeves, chain prayer beads, severe embroidered rank panels, polished mask hanging at the waist, hidden hands'),
    V('aristocratic', 'long silver hair in a crown braid with jade comb',             'fine silk-brocade robe, structured shoulder panels with gold-thread order insignia, formal over-vest, carved bead necklace, layered cuffs, ceremonial headpiece'),
    V('battlefield',  'temple shave with remaining hair in a warrior topknot',        'quilted robe armor, lacquered forearm guards, lamellar shoulder pieces, wrapped torso, split coat tails for movement, reinforced boots, compact traveling pack'),
    V('scholarly',    'shaved head with ash-marked scalp',                            'ink-stained linen under-robe, scroll harness across the chest, manuscript pouches at the waist, ceremonial sash, sandaled feet with a walking staff'),
    V('ceremonial',   'wrapped locs beneath a folded prayer veil',                    'multi-layered brocade robe with jade closures, embroidered order insignia, ritual sash bearing philosophical script, ceremonial slipper-shoes, incense censer'),
  ],
  avoid: ['every Monk being bald', 'one generic orange robe', 'using sacred real-world symbols casually', 'all Monks being thin and barefoot'],
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
    V('aristocratic', 'immaculate long hair with silver comb',                          'silk-brocade coat with mother-of-pearl closures, velvet inner vest, tailored trousers, house-sigil ring, polished boots, cravat of dark red silk, ancestral signet'),
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
    V('battlefield',  'shaved head with pilot-clan tattoo, oil-smeared',                'battle-scarred pressure suit with visible dents, blood-stained gauntlets, reinforced chest plate over the suit, hastily-patched thigh armor, mag-boots, callsign patch scorched'),
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
    V('ceremonial',   'silver hair braided into a crown',                                'multi-layered brocade ceremonial robe, ornate rank panels of the choir, sacred sash of unbroken vow, gold-thread stole, ceremonial gauntlets, censer-of-mercy'),
    V('villainous',   'shorn head with vow-marks tattooed',                              'severe blackened plate with scorched halo, torn under-robe, tarnished gorget with defaced sigil, mourning chain-belt, ceremonial dagger of judgment, funeral wraps at the wrists'),
    V('battlefield',  'twin braids of gold-thread hair, blood-stained',                  'war-scarred plate with blade-notches, torn ivory under-robe, blood-stained gauntlets, hastily-repaired feather articulation, battle-worn boots, judgment sword'),
    V('aristocratic', 'shaved head with a formal circlet',                               'tailored formal robe of ivory silk, ceremonial gold plate over the shoulders, house-of-heaven crest, polished ceremonial boots, ritual scepter'),
  ],
  avoid: ['every Seraph gentle and morally perfect', 'copying famous angel names', 'making every name end in "-iel"'],
};

const HUMAN: ArchetypeFashionGuide = {
  culture: 'a believable culture, family, city, profession, social class, migration history — Human is NOT the default fit body OR default modern Western',
  hairDirections: [
    'coarse straight hair in a merchant\'s bun', 'wind-whipped waves',
    'weathered iron-gray coils', 'braided hair with clan-thread',
    'sandy blonde crop', 'wrapped locs tucked under a work-cap',
    'silver-streaked long hair in a low tail',
  ],
  variants: [
    V('practical',    'coarse straight hair in a merchant\'s bun',                        'wool traveler\'s coat over a linen shift, patched trousers, wide belt with tool pouches, worn boots, weatherproof mantle, one heirloom charm'),
    V('aristocratic', 'silver-streaked long hair in a low tail with pearl comb',          'silk-brocade formal coat with mother-of-pearl closures, tailored inner vest, high polished boots, house sigil ring, ceremonial cape, gold cuff-links'),
    V('scholarly',    'wrapped locs tucked under a scholar\'s cap',                       'scholar\'s over-robe with book harness, ink-stained cuffs, reading spectacles on a cord, quilted inner vest, walking staff, satchel of parchment'),
    V('battlefield',  'shaved sides with a warrior top-knot',                             'reinforced gambeson under partial plate, tabard with sworn liege\'s crest, riveted vambraces, blood-stained gauntlets, battle-scarred boots, war-hammer at the hip'),
    V('ceremonial',   'crown braid of chestnut hair with silver threads',                 'multi-layered ceremonial robe, embroidered ancestral tabard, ceremonial sash of order, polished ceremonial boots, ancestral medallion'),
    V('villainous',   'severe close-cropped black hair with widow\'s peak',              'severe black riding coat with high collar, blackened plate half-armor, hooked leather gauntlets, dark trousers, polished boots with metal caps, cursed signet ring'),
  ],
  avoid: ['using Human as the "plain" archetype', 'assigning only modern Western names', 'making every Human name ordinary while others get richness'],
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
  Foundation: {
    layerCount: 4,
    focus: 'practical construction, limited armor, one signature accessory',
    description: 'primary garment + waist + footwear + one signature accessory. Repairs and patched work visible. Modest ornament. NOT full regalia.',
  },
  Forged: {
    layerCount: 8,
    focus: 'reinforced layers, better tailoring, earned insignia, stronger cultural identity',
    description: 'base layer + primary garment + structural layer + armor + waist + outer layer + footwear + rank insignia. Partial ceremonial elements. Lore-specific repairs or trophies.',
  },
  Ascendant: {
    layerCount: 12,
    focus: 'complete regalia, elite craftsmanship, integrated magic/tech, unique silhouette',
    description: 'base + primary + structural + armor + waist + outer + footwear + arm treatment + accessories + rank ornament + magical/technological integration + meaningful damage/repair/inheritance. Do NOT express Ascendant only by more gold.',
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
   Reference hair: ${variant.hair}
   Reference clothing: ${variant.clothing}
   (This is the target vibe. Adapt to the character's ancestry, story, body, and element — do NOT copy verbatim. Other variants exist for this archetype [${otherVariants}] but are not this forge's target.)

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
