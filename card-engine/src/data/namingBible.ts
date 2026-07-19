import type { ArchetypeName } from '../types/card';

/**
 * Fantasy Character Naming Bible (Raheem, v1.0, 2026-07-19) — canonical
 * naming reference for generated character cards. Source of truth:
 * /Fantasy_Character_Naming_Bible.md.
 *
 * This module condenses the Bible's per-archetype chapters into structured
 * data that the character-generation prompt can compact per forge. The full
 * Bible is NOT copied into every API request; the pipeline picks the
 * relevant archetype chapter + a rotating slice of example names + a
 * repetition-prevention list per call.
 *
 * Bible principle (§17): "A good fantasy name is not a decorated random
 * word. It is a compressed piece of worldbuilding. The name should make
 * the character feel as though they existed before the generation prompt."
 */

/**
 * Name structures the Bible defines (§5). Multiple structures are valid
 * per archetype — the pipeline selects one based on character context.
 */
export type NameStructure =
  | 'personal_only' // Structure A — Personal Name
  | 'personal_family' // Structure B — Personal + Family
  | 'personal_clan' // Structure C — Personal + Clan/Pack
  | 'personal_order_place' // Structure D — Personal + Order/Place
  | 'personal_earned_byname' // Structure E — Personal + Earned Byname
  | 'personal_house' // Structure F — Personal + House/Bloodline
  | 'manufactured_designation' // Structure G — Manufactured Designation
  | 'celestial_liturgical'; // Structure H — Celestial/Liturgical

export interface ArchetypeNamingGuide {
  /** One-sentence identity — the CORE of what a name for this archetype
   *  should evoke. Bible §7 per-archetype "Naming Identity". */
  identity: string;
  /** Which name structures are suitable for this archetype. Bible §7. */
  structures: readonly NameStructure[];
  /** Rotating sample personal names — variety, not a fixed pool. */
  sampleNames: readonly string[];
  /** Rotating sample full names / bynames — shows structure + tone. */
  sampleFullNames: readonly string[];
  /** Culture/aesthetic notes — used to give Claude coherent sound
   *  direction without stereotype. Multiple cultures per archetype. */
  culturalRegisters: readonly string[];
  /** Bible §7 "Avoid" per archetype — the specific stereotypes to skip. */
  avoid: readonly string[];
}

/**
 * ---------- Bible §7 archetype chapters ----------
 */

const BARBARIAN: ArchetypeNamingGuide = {
  identity:
    'kinship, survival, migration, inherited duty, physical environment, or deeds remembered by a clan',
  structures: [
    'personal_only',
    'personal_clan',
    'personal_earned_byname',
    'personal_order_place',
  ],
  sampleNames: [
    'Adisa', 'Brenna', 'Dren', 'Eira', 'Faraji', 'Goran', 'Hessa', 'Imani',
    'Jarek', 'Kesi', 'Laleh', 'Makoa', 'Nkiru', 'Orsa', 'Radan', 'Samira',
    'Tarek', 'Veska', 'Yara', 'Zoren',
  ],
  sampleFullNames: [
    'Adisa Reed-Breaker', 'Brenna Ash-Tusk', 'Dren Stonehide',
    'Eira of the White Pass', 'Faraji Thunder-Step', 'Hessa Iron-Mother',
    'Imani Red-Cliff', 'Jarek Bear-Sworn', 'Kesi of the Long Grass',
    'Makoa Wave-Shoulder', 'Nkiru Keeps-the-Flame', 'Radan Three-Scars',
    'Samira Dust-Born', 'Veska Bone-Mender', 'Yara Storm-Bitten',
  ],
  culturalRegisters: [
    'Central Asian steppe (Mongol-inspired)',
    'West African savanna and river-delta',
    'North European mountain hold (Norse-inspired)',
    'Balkan / Carpathian highland',
    'Andean cordillera',
    'Pacific-islander outrigger cultures',
    'Sahelian caravan cultures',
  ],
  avoid: [
    'making every Barbarian sound Norse',
    'automatic "blood," "axe," "skull," or "rage" names',
    'names that imply stupidity or savagery',
    'legendary conquest names unsupported by the lore',
  ],
};

const MONK: ArchetypeNamingGuide = {
  identity:
    'discipline, community, philosophical lineage, vows, pilgrimage, teachers, monasteries, or a life left behind',
  structures: [
    'personal_only',
    'personal_order_place',
    'personal_earned_byname',
  ],
  sampleNames: [
    'Amadi', 'Ansel', 'Bao', 'Devika', 'Esen', 'Hanae', 'Idris', 'Jalen',
    'Kavya', 'Liora', 'Minh', 'Nima', 'Oren', 'Priya', 'Ren', 'Sajan',
    'Tenzin', 'Uma', 'Varo', 'Yuna',
  ],
  sampleFullNames: [
    'Amadi of the Open Hand', 'Ansel Bell-Keeper', 'Bao Quiet-River',
    'Devika of the Ember Vow', 'Esen Seven-Breaths', 'Hanae Stone-Garden',
    'Idris of the Unbroken Step', 'Kavya Dawn-Listener',
    'Liora of the Hollow Bell', 'Minh Ashen-Palm',
    'Nima of the Long Silence', 'Priya River-Mind',
    'Ren of the Copper Gate', 'Sajan of the Quiet Step', 'Yuna Cloud-Walker',
  ],
  culturalRegisters: [
    'East Asian Buddhist / Chan / Zen',
    'South Asian ascetic (Sanskrit/Tamil/Bengali roots)',
    'Ethiopian Orthodox monasticism',
    'Byzantine hesychast tradition',
    'North African Sufi',
    'Andean high-mountain hermetic',
    'Tibetan / Himalayan monastic',
  ],
  avoid: [
    'treating all Monks as one East Asian culture',
    'random spiritual words without an order or philosophy',
    'names that sound like ability titles instead of people',
    'automatically making every Monk serene or elderly',
  ],
};

const BEASTMASTER: ArchetypeNamingGuide = {
  identity:
    'kinship with animals, stewardship, hunting traditions, migration routes, wilderness survival, or a bond with a specific creature',
  structures: [
    'personal_only',
    'personal_clan',
    'personal_earned_byname',
    'personal_order_place',
  ],
  sampleNames: [
    'Abeni', 'Brannoc', 'Cerys', 'Dagan', 'Enzi', 'Fara', 'Hakan', 'Ilyan',
    'Jora', 'Kato', 'Luma', 'Miri', 'Nuru', 'Orin', 'Pema', 'Rafi', 'Sela',
    'Toren', 'Vasha', 'Zuri',
  ],
  sampleFullNames: [
    'Abeni Lion-Whisper', 'Brannoc of the Black Antler', 'Cerys Fox-Sister',
    'Dagan Hawk-Bound', 'Enzi of the Tall Reeds', 'Fara Bear-Mother',
    'Hakan Elk-Runner', 'Jora of the Rain Herd', 'Kato Reed-Fang',
    'Luma Owl-Eyed', 'Nuru Horn-Caller', 'Rafi Wolf-Friend',
    'Sela of the White Mane', 'Toren Stag-Watcher', 'Zuri Many-Tracks',
  ],
  culturalRegisters: [
    'East African pastoralist',
    'North American plains',
    'Sami / circumpolar reindeer-herding',
    'Central Asian falconer',
    'Amazon rainforest hunter-gatherer',
    'Australian outback ranger',
    'Welsh / Cornish upland shepherd',
  ],
  avoid: [
    'naming every Beastmaster after wolves',
    'childish pet-style names',
    'making the animal bond sound like ownership',
    'using the same animal in the name, portrait, trait, and epithet',
  ],
};

const DRUID: ArchetypeNamingGuide = {
  identity:
    'groves, seasons, rivers, roots, old places, celestial cycles, oral traditions, and the responsibility of maintaining balance',
  structures: [
    'personal_only',
    'personal_order_place',
    'personal_earned_byname',
  ],
  sampleNames: [
    'Aderyn', 'Amara', 'Briallen', 'Caelan', 'Dara', 'Elowen', 'Fintan',
    'Ivara', 'Junia', 'Kellan', 'Maelis', 'Nessa', 'Olan', 'Rhoswen',
    'Siofra', 'Talia', 'Ulan', 'Wren', 'Ysolde',
  ],
  sampleFullNames: [
    'Aderyn of Mosswater', 'Amara Root-Keeper', 'Briallen of Briarwake',
    'Caelan Autumn-Bound', 'Dara Willow-Hand', 'Elowen of the Elder Grove',
    'Fintan Rain-Reader', 'Ivara Seed-Mother', 'Junia of the Red Orchard',
    'Kellan Stone-Root', 'Nessa Reed-Singer', 'Olan of the Hollow Oak',
    'Rhoswen Thorn-Mender', 'Talia Spring-Warden', 'Wren of the Last Green',
  ],
  culturalRegisters: [
    'Welsh / Cornish / Brythonic Celtic',
    'Slavic river-cult and rusalki traditions',
    'Ainu forest cosmology',
    'Yoruba orisha stewardship',
    'Māori Papatūānuku traditions',
    'Baltic pagan grove-keeping',
    'Basque Pyrenees mountain-cult',
  ],
  avoid: [
    'making every Druid name pseudo-Celtic',
    'stuffing names with "leaf," "thorn," and "moon"',
    'names that imply nature is always gentle',
    'using a plant name without connecting it to character history',
  ],
};

const NECROMANCER: ArchetypeNamingGuide = {
  identity:
    'scholarship, funerary traditions, inherited taboos, grave stewardship, forbidden institutions, spirit contracts, or cultures that treat death with seriousness rather than cartoon villainy',
  structures: [
    'personal_family',
    'personal_order_place',
    'personal_earned_byname',
    'personal_house',
  ],
  sampleNames: [
    'Amina', 'Corvin', 'Damaris', 'Edras', 'Farah', 'Gideon', 'Ilyas',
    'Jessara', 'Kasimir', 'Leora', 'Merek', 'Nadja', 'Othmar', 'Parisa',
    'Qadir', 'Sable', 'Toma', 'Vespera', 'Ysra', 'Zahir',
  ],
  sampleFullNames: [
    'Amina of the Quiet Sepulcher', 'Corvin Vale', 'Damaris Bone-Scribe',
    'Edras of the Ninth Crypt', 'Farah Ash-Archivist', 'Gideon Mourning-Warden',
    'Ilyas of the Last Bell', 'Jessara Veil-Keeper', 'Kasimir Morcant',
    'Leora Grave-Lantern', 'Merek of the Pale Academy', 'Nadja Veyr',
    'Othmar Soul-Binder', 'Parisa Tomb-Reader', 'Zahir of the Closed Gate',
  ],
  culturalRegisters: [
    'Egyptian funerary priesthood',
    'Persian Zoroastrian dakhma-keeping',
    'Mesoamerican death-day tradition',
    'Byzantine Orthodox ossuary-keeping',
    'West African ancestor-priest lineage',
    'Tibetan sky-burial tradition',
    'Bengali sadhu graveyard-ascetic',
  ],
  avoid: [
    '"Malakar," "Draven," and similar generic villain defaults',
    'automatically using Latin-like names',
    'excessive skull, death, doom, grave, or blood words',
    'naming every Necromancer as evil',
  ],
};

const VAMPIRE: ArchetypeNamingGuide = {
  identity:
    'age, house, region, lost nationality, courtly identity, chosen reinvention, predatory reputation, or the era in which the character was turned',
  structures: [
    'personal_family',
    'personal_house',
    'personal_order_place',
  ],
  sampleNames: [
    'Alina', 'Cassian', 'Daciana', 'Emil', 'Fiora', 'Idris', 'Isolde',
    'Leander', 'Lucienne', 'Mirela', 'Nadim', 'Octavia', 'Rafael', 'Sabine',
    'Sorin', 'Taisia', 'Valen', 'Zahra', 'Zora', 'Zuriel',
  ],
  sampleFullNames: [
    'Alina Morcant', 'Cassian Veyr', 'Daciana Vale', 'Emil Noctevane',
    'Fiora of the Ash Court', 'Idris Sablemont', 'Isolde Marrowe',
    'Leander Voss', 'Lucienne Blackmere', 'Mirela Duskryn',
    'Nadim of the Red Archive', 'Octavia Velcor', 'Sabine Nightglass',
    'Sorin Hollowmere', 'Zahra of House Ebonveil',
  ],
  culturalRegisters: [
    'Romanian / Wallachian aristocracy',
    'Ottoman Constantinople court',
    'French Second Empire salon',
    'Ptolemaic Alexandrian dynastic',
    'Mughal courtly Persian',
    'Edo Japan retired noble',
    'Silla-era Korean royal',
  ],
  avoid: [
    'naming everyone Dracula-adjacent',
    'using "blood," "night," or "shadow" in every surname',
    'making all Vampires Eastern European',
    'giving ancient names to newly turned modern characters without explanation',
  ],
};

const LYCANTHROPE: ArchetypeNamingGuide = {
  identity:
    'the relationship between person, beast, pack, curse, lineage, territory, and self-control; some may retain ordinary cultural names, others may earn pack names or abandon their birth names',
  structures: [
    'personal_only',
    'personal_clan',
    'personal_earned_byname',
    'personal_order_place',
  ],
  sampleNames: [
    'Amara', 'Bako', 'Cian', 'Daria', 'Eamon', 'Freya', 'Hadi', 'Imani',
    'Joren', 'Kiva', 'Leif', 'Mara', 'Niko', 'Osei', 'Runa', 'Soren',
    'Tamsin', 'Udo', 'Vela', 'Wren',
  ],
  sampleFullNames: [
    'Amara Moontrail', 'Bako Red-Fang', 'Cian of the Broken Howl',
    'Daria Silver-Pelt', 'Eamon Pine-Runner', 'Freya of the Winter Pack',
    'Hadi Night-Scent', 'Imani Wolf-Heart', 'Joren Scar-Muzzle',
    'Kiva of the Hollow Moon', 'Mara Chain-Breaker', 'Osei Long-Hunt',
    'Runa Ash-Paw', 'Tamsin Two-Forms', 'Vela of the Gray Territory',
  ],
  culturalRegisters: [
    'Baltic / Slavic werewolf tradition',
    'Anatolian mountain shepherd',
    'French Beauceron / Loup-Garou legend',
    'Balkan volkodlak folklore',
    'Nordic ulfhednar warrior tradition',
    'West African leopard-society',
    'Turkic steppe kurt-oglan',
  ],
  avoid: [
    'Wolfgar, Fenrir, Luna, and other immediate clichés',
    'making every name about the moon',
    'treating the person as only an animal',
    'using pack names for characters whose lore says they are solitary',
  ],
};

const MECH_PILOT: ArchetypeNamingGuide = {
  identity:
    'living people inside technological cultures; names may come from nations, colonies, military programs, corporate city-states, nomadic fleets, or inherited call-sign traditions',
  structures: [
    'personal_family',
    'personal_earned_byname',
    'personal_order_place',
  ],
  sampleNames: [
    'Ari Calder', 'Dalia Venn', 'Elias Rook', 'Hana Serrin', 'Idris Vale',
    'Juno Marr', 'Kade Orlov', 'Lena Sato', 'Malik Dray', 'Nia Corven',
    'Omar Reyes', 'Petra Voss', 'Rhea Tal', 'Soren Kest', 'Talia Noor',
    'Tomas Vey', 'Yara Kade', 'Zane Mercer',
  ],
  sampleFullNames: [
    'Captain Nia Corven, "Rook"', 'Elias Rook of the Ninth Lance',
    'Juno Marr, Callsign Halberd', 'Malik Dray of Cobalt Squadron',
    'Petra Voss, "Crosswind"', 'Talia Noor of the Emberline Fleet',
  ],
  culturalRegisters: [
    'multiethnic colonial fleet — surnames from multiple diaspora',
    'militarized nomadic clan',
    'corporate city-state salaryman line',
    'orbital habitat generational',
    'lunar-farmstead frontier',
  ],
  avoid: [
    'treating the call sign as the legal name by default',
    'making every pilot sound American military',
    'random strings of numbers unless justified',
    'using famous sci-fi pilot names',
  ],
};

const ANDROID: ArchetypeNamingGuide = {
  identity:
    'who named this being — a manufacturer, owner, laboratory, military program, community, or the android themselves; naming is part of identity development, not a fixed label',
  structures: [
    'manufactured_designation',
    'personal_only',
    'personal_family', // when they take a chosen human name
  ],
  sampleNames: [
    'Ari', 'Echo', 'Iona', 'Kestrel', 'Lumen', 'Mira', 'Nera', 'Oriel',
    'Praxis', 'Sable', 'Solace', 'Vesper',
  ],
  sampleFullNames: [
    'IONA-7, now called Iona', 'Axiom R4', 'Kestrel-12 of the Free Circuit',
    'Mira, formerly MR-A9', 'NERA // 03', 'Oriel Unit Nine',
    'Praxis-8 "Pilgrim"', 'Solace V2', 'Vesper-14, self-designated Vesper',
  ],
  culturalRegisters: [
    'utilitarian series-designation (e.g. IONA-7, AXIOM-R4)',
    'manufacturer-branded series (Kestrel, Lumen, Praxis)',
    'chosen personal name reclaimed from designation',
    'community-given name after emancipation',
  ],
  avoid: [
    'giving every Android a human first name',
    'giving every Android only a serial number',
    'random leetspeak',
    'names that copy famous robots, androids, or AI characters',
    'changing designation style without changing manufacturer or culture',
  ],
};

const SERAPH: ArchetypeNamingGuide = {
  identity:
    'celestial office, oath, choir, judgment, protection, sacrifice, sacred duty, or conflict between divine command and personal conscience',
  structures: [
    'celestial_liturgical',
    'personal_order_place',
    'personal_earned_byname',
  ],
  sampleNames: [
    'Aurel', 'Caelis', 'Elaris', 'Ilyra', 'Khariel', 'Lumira', 'Naeva',
    'Orien', 'Samara', 'Selaph', 'Serin', 'Solenne', 'Tavia', 'Vaela',
    'Ysmara', 'Zophiel',
  ],
  sampleFullNames: [
    'Aurel of the Sixth Radiance', 'Caelis Mercy-Bound',
    'Elaris of the Brazen Choir', 'Ilyra Dawn-Vigil',
    'Khariel Gate-Judge', 'Lumira of the Shielded Flame',
    'Naeva Oath-Keeper', 'Orien of the Hollow Crown',
    'Samara Sun-Witness', 'Serin of the Last Trumpet',
    'Solenne Ash-Wing', 'Tavia of the Golden Threshold',
    'Vaela Balance-Bearer', 'Ysmara of the Weeping Choir',
    'Zophiel Crown-Sundered',
  ],
  culturalRegisters: [
    'Hebrew angelic tradition — but original, not the named archangels',
    'Ethiopian Orthodox celestial hierarchy',
    'Zoroastrian yazata',
    'Sanskrit deva/ganin',
    'Byzantine iconographic seraphic',
    'Coptic monastic angelic',
  ],
  avoid: [
    'directly copying famous angel names without approval',
    'making every name end in "-iel"',
    'random biblical-sounding syllables',
    'assuming every Seraph is gentle or morally perfect',
  ],
};

const HUMAN: ArchetypeNamingGuide = {
  identity:
    'a believable culture, family, city, profession, social class, migration history, or personal aspiration; Human does NOT mean culturally neutral or ordinary — it means human',
  structures: [
    'personal_family',
    'personal_order_place',
    'personal_earned_byname',
    'personal_only',
  ],
  sampleNames: [
    'Amina Dastan', 'Andre Vale', 'Ayla Mercer', 'Cassia Rook',
    'Darius Venn', 'Elena Marr', 'Farah Noor', 'Gideon Reed', 'Hana Calder',
    'Idris Kade', 'Jamal Corven', 'Lena Voss', 'Mara Saye', 'Nia Tal',
    'Omar Serrin', 'Priya Vey', 'Rafael Dray', 'Sabine Orlov',
    'Tomas Reyes', 'Yara Bell',
  ],
  sampleFullNames: [
    'Amina Dastan', 'Andre of Southgate', 'Ayla Mercer', 'Cassia Rook',
    'Darius Venn', 'Elena Marr', 'Farah Noor', 'Gideon Reed', 'Hana Calder',
    'Idris Kade', 'Jamal Corven', 'Lena Voss', 'Mara Saye', 'Nia Tal',
    'Omar Serrin', 'Priya Vey', 'Rafael Dray', 'Sabine Orlov',
    'Tomas Reyes', 'Yara Bell',
  ],
  culturalRegisters: [
    'multi-ethnic port-city cosmopolitan',
    'agricultural-village generational',
    'nomadic trader lineage',
    'guild-crafts family',
    'university-town scholarly',
    'coastal fishing culture',
    'frontier-town migrant',
  ],
  avoid: [
    'using Human as the default "plain" archetype',
    'assigning only modern Western names',
    'making every Human name ordinary while other archetypes receive richer identities',
    'using culture as decoration without connection to setting or lineage',
  ],
};

/**
 * ---------- Canonical map + accessors ----------
 */

export const NAMING_BIBLE: Record<ArchetypeName, ArchetypeNamingGuide> = {
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
 * Bible §6 "Common Overused Fantasy Patterns" + §9 "Weak Epithets" — the
 * project-wide banned list. Enforced across every archetype.
 */
export const NAMING_BANNED_TROPES: readonly string[] = [
  // §6 overused first-name fragments
  'Kael', 'Kaelen', 'Kaelor', 'Draven', 'Raven', 'Shadow', 'Night', 'Blood',
  'Grim', 'Thorne', 'Ash', 'Vex', 'Nyx', 'Xander',
  // §6 overused prefixes / suffixes
  'Ael-', 'Val-', 'Aer-', 'Thal-', 'Xy-', '-ion', '-ius', '-ara',
  // §9 weak epithets
  'the Powerful', 'the Destroyer', 'the Dark One', 'the Strong',
  'the Mysterious', 'the Legendary', 'the Fire Warrior', 'the Wolf Man',
  // Project-specific: "Keeper of X" / "Y's Vigil" defaults produced by
  // the pre-M4.5 prompt example "Kaelen, Keeper of Names".
  'Keeper of', 'Keeper\'s', 'Vigil', 'Warden of',
];

/**
 * Bible §5 name-structure display strings — used to tell Claude the
 * available structures for the current archetype.
 */
export const NAME_STRUCTURE_LABELS: Record<NameStructure, string> = {
  personal_only: 'A: Personal Name only (e.g. "Veyra") — for solitary figures or those who discarded an earlier identity',
  personal_family: 'B: Personal + Family Name (e.g. "Idris Marr") — for established nations, cities, or houses',
  personal_clan: 'C: Personal + Clan/Pack Name (e.g. "Brenna Ash-Tusk") — for kinship-based societies',
  personal_order_place: 'D: Personal + of/from Order or Place (e.g. "Sajan of the Quiet Step") — for institutional cultures',
  personal_earned_byname: 'E: Personal + Earned Byname (e.g. "Yara Storm-Bitten") — for deeds replacing surnames',
  personal_house: 'F: Personal + House/Bloodline (e.g. "Lucienne Morcant") — for aristocratic or magical dynasties',
  manufactured_designation: 'G: Manufactured Designation (e.g. "IONA-7", "Axiom R4") — for Androids and created beings',
  celestial_liturgical: 'H: Personal + Choir/Office/Vow (e.g. "Aurel of the Sixth Radiance") — for Seraphs and divine orders',
};

/**
 * Bible §9 rank-based epithet guidance.
 */
export const EPITHET_BY_RANK: Record<'Foundation' | 'Forged' | 'Ascendant', string> = {
  Foundation:
    'Names should feel personal, local, or incomplete. Foundation characters are usually NOT dramatically titled. Examples: "Nessa Reed", "Joren", "Mira, Unit MR-A9". An epithet may exist only if a specific Story Pillar answer directly earned it.',
  Forged:
    'The character MAY gain a recognized byname, office, call sign, pack name, or clan standing — but ONLY if the story pillar answers support one. Examples: "Nessa Reed-Singer", "Joren Scar-Muzzle", "Mira of the Free Circuit". Do not invent a title uninvited.',
  Ascendant:
    'The title MAY become legendary — but it must emerge from established history in the Story Pillar answers, NOT from generic tropes. Examples: "Nessa, Keeper of the Last Green" (only if lore established her as such), "Joren, the Howl That Broke Winter" (only if the howl is in the story). NO generic "the Powerful / the Destroyer / the Dark One".',
};

/**
 * ---------- Rotation helpers ----------
 *
 * The Bible warns explicitly (§ intro) that example names must NOT become a
 * "small random-name pool" that gets repeatedly sampled. Rotation here
 * exists only to VARY which samples Claude sees per forge — Claude should
 * still generate ORIGINAL names, not echo the samples verbatim.
 */

/** Deterministic slice — start at offset, take `count` items with wrap-around. */
export function rotateSlice<T>(items: readonly T[], offset: number, count: number): readonly T[] {
  const n = items.length;
  if (n === 0) return [];
  const out: T[] = [];
  const take = Math.min(count, n);
  for (let i = 0; i < take; i++) out.push(items[(offset + i) % n]);
  return out;
}

/** Bible §6 quality reminders — compact, prompt-safe. */
export const NAMING_QUALITY_REMINDERS: readonly string[] = [
  'be pronounceable after one or two readings',
  'one to four spoken beats',
  'distinct from nearby generated cards (recent names are listed below)',
  'fit the character\'s lore and visual design',
  'avoid unearned grandeur at Foundation rank',
  'remain usable when the character reaches Ascendant',
  'avoid repeated beginnings (Kael-, Val-, Aer-, Nyx-, Thal-, Xy-)',
  'avoid excessive X, Z, apostrophes, doubled vowels',
  'not simply describe the archetype (no "Wolfgar" for every Lycanthrope)',
  'not copy famous fictional character names',
];
