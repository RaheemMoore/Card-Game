import type { ArchetypeName, Rank } from '../types/card';

/**
 * Curated per-archetype environment families, from
 * Archetype_Environment_and_Background_Reference.md.
 *
 * A family is rolled at Foundation and LOCKED across ranks; its descriptor
 * ESCALATES in scale/consequence per rank (env doc §2.3: local → wider stakes →
 * mythic) while staying the same place. Necromancer settings stay dark/nocturnal
 * and varied — NOT "an evil graveyard" every time (env doc §Necromancer avoid).
 * Element colour comes from the assembler's scene-palette lead; these supply the
 * SPECIFIC setting + a piece of environmental storytelling (§5.3).
 */
export interface EnvironmentFamily {
  id: string;
  name: string;
  /** Full setting descriptor per rank — same place, escalating consequence. */
  byRank: Record<Rank, string>;
}

const NECROMANCER_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  {
    id: 'cemetery_district',
    name: 'Rain-Soaked Cemetery District',
    byRank: {
      Foundation: 'a rain-soaked working cemetery district at night, headstones and iron railings, the lamplit windows of an ordinary city beyond',
      Forged: 'the same cemetery district at night, now thick with unquiet spirits and fog rolling between the crypts, a gathering haunting',
      Ascendant: 'the whole necropolis-city risen at midnight, avenues of tombs stretching out and a sky adrift with souls',
    },
  },
  {
    id: 'archive_testimonies',
    name: 'Archive of Last Testimonies',
    byRank: {
      Foundation: 'a candlelit crypt-archive of death-masks and sealed testimonies, tall shelves of funerary records in deep shadow',
      Forged: 'the archive stirring awake, pages turning themselves as spectral witnesses gather between the shelves',
      Ascendant: 'a vast floating archive of spectral pages, countless dead witnesses testifying at once in the dark',
    },
  },
  {
    id: 'battlefield_first_dawn',
    name: 'Battlefield at First Dawn',
    byRank: {
      Foundation: 'a quiet war-torn field before dawn, scattered arms and hasty cairns, lingering battlefield mist',
      Forged: 'the battlefield thick with rising war-ghosts, fragmented memories replaying across the churned ground',
      Ascendant: 'an endless spectral army rising from the war-field beneath a torn, sunless pre-dawn sky',
    },
  },
  {
    id: 'ancestral_memory_court',
    name: 'Ancestral Memory Court',
    byRank: {
      Foundation: 'a shadowed spirit-court where a few ancestral dead gather as quiet witnesses around a low dais',
      Forged: 'the memory-court in full session, ranks of luminous ancestors advising, accusing, and remembering',
      Ascendant: 'a boundless court of the dead, a sea of ancestral spirits stretching past the horizon',
    },
  },
  {
    id: 'veil_breach_threshold',
    name: 'Veil-Breach Threshold',
    byRank: {
      Foundation: 'a narrow tear in reality where the living world overlaps the realm of the dead, cold light bleeding through',
      Forged: 'the veil-breach widening, spirits pouring through a growing rift between the two worlds',
      Ascendant: 'a colossal veil-breach, the boundary between life and death torn wide open across the sky',
    },
  },
];

// Druid environments — "living systems, seasonal cycles, forest guardianship"
// (reference doc §Druid). Forest identity is central but must VARY; never open
// grassland, never decorative. Rank escalates functional → proven → mythic.
const DRUID_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  {
    id: 'heart_grove_cathedral',
    name: 'Heart-Grove Cathedral',
    byRank: {
      Foundation: 'an ancient forest where colossal trunks and an interwoven canopy form a living sacred chamber, shafts of green light between the boles',
      Forged: 'the heart-grove stirring awake, boughs shifting and roots lifting as the living cathedral responds to the Druid, canopy-light brightening',
      Ascendant: 'the whole heart-grove risen as a titanic living cathedral, trunks like towers and a canopy of bloom arching overhead, the forest itself in motion',
    },
  },
  {
    id: 'root_confluence',
    name: 'Root-Confluence Belowground',
    byRank: {
      Foundation: 'a subterranean forest hollow where luminous roots thread the dark, carrying faint memory and warning through the soil',
      Forged: 'the root-confluence blazing brighter, a web of glowing roots pulsing with communication as the Druid draws on the network below',
      Ascendant: 'a cathedral-vast underworld of colossal luminous roots, the whole belowground grove lit and alive with surging memory-light',
    },
  },
  {
    id: 'burned_grove_regrowth',
    name: 'Burned Grove Regrowth',
    byRank: {
      Foundation: 'a fire-scarred grove where fresh green shoots push up through grey ash, fragile new life the Druid shelters',
      Forged: 'the burned grove surging back, saplings and flowering growth overtaking the ash in a widening tide of renewal',
      Ascendant: 'the scorched land wholly reclaimed at mythic speed, a young forest exploding into being over the last of the ash',
    },
  },
  {
    id: 'winter_sleep_hollow',
    name: 'Winter-Sleep Hollow',
    byRank: {
      Foundation: 'a snow-quiet forest hollow of dormant trees, a hidden place where a Druid can meld into the sleeping grove',
      Forged: 'the winter hollow waking around the Druid, snow shaking loose as dormant boughs stir and green pushes through the frost',
      Ascendant: 'the whole winter-sleep hollow roused at once, an entire forest breaking dormancy in a burst of green through snow and mist',
    },
  },
  {
    id: 'city_consumed_by_roots',
    name: 'City Consumed by Roots',
    byRank: {
      Foundation: 'an abandoned quarter where forest and architecture negotiate — roots cracking flagstones, vines climbing quiet walls',
      Forged: 'the reclamation accelerating, roots buckling streets and canopy swallowing rooftops as the forest reclaims the city',
      Ascendant: 'an entire city consumed and remade by the grove, towers wrapped in colossal roots and blossoming canopy, nature sovereign over stone',
    },
  },
];

// 2026-07-23 Barbarian Traditions: six environments in the SAME ORDER as the six
// BARBARIAN fashion variants (hairFashionBible.ts). The forge locks
// fashionVariantIndex and the environment picker (resolveLockedSelections) reads
// it via isTraditionCoupled, so each Tradition gets its matching world and a
// Glacier-Warden never spawns in a jungle. ORDER IS LOAD-BEARING — do not reorder
// without reordering the fashion variants too.
const BARBARIAN_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  // 0 — Stoneholds of the High Crags
  { id: 'crag_stonehold', name: 'Cliff-Fortress of the High Crags', byRank: {
    Foundation: 'a cliff-fortress of dry-stacked granite built into a sheer crag face, standing ancestor-stones lining the approach, cold pale mountain light',
    Forged: 'the crag-hold roused, ancestor-stones seeming to lean in, storm-cloud breaking over the granite ramparts',
    Ascendant: 'the mountain stronghold at the edge of legend, every standing-stone blazing with ancestral presence, the whole crag face bearing down' } },
  // 1 — Horse-Lords of the Grass Sea
  { id: 'steppe_grass_sea', name: 'The Endless Grass Sea', byRank: {
    Foundation: 'an endless wind-combed grass sea under a vast racing sky, felt tents and horse-herds small on the horizon, standards snapping in the gale',
    Forged: 'the steppe under a full racing storm-sky, the horde\'s standards streaming as the grass flattens in the wind',
    Ascendant: 'the grass sea at the turning of an age, a horizon-wide storm centered on the rider, banners of many clans riding the gale' } },
  // 2 — Glacier-Wardens of the White Waste
  { id: 'glacier_white_waste', name: 'The White Waste Glacier Coast', byRank: {
    Foundation: 'a blue-shadowed glacier coast of cracked sea-ice and towering frost cliffs, a bone-framed longhouse half-buried in snow, low arctic sun',
    Forged: 'the ice coast in a rising polar gale, cracks splitting the sea-ice, the frost cliffs groaning',
    Ascendant: 'the deep-ice at world\'s edge, the glacier calving in mythic scale, a frozen sea shattering around the warden' } },
  // 3 — Ash-Waste Warlords
  { id: 'ashwaste_volcanic', name: 'The Cracked Volcanic Waste', byRank: {
    Foundation: 'a cracked volcanic wasteland of black ash-dunes and glowing lava-seams, a fortress of fused obsidian on a smoking ridge, red-lit smoke sky',
    Forged: 'the ash-waste erupting, lava-seams splitting wide, the obsidian fortress lit hell-red behind the warlord',
    Ascendant: 'the volcano at full cataclysm, the earth tearing open in molten rivers, the sky choked black and ember-red around the conqueror' } },
  // 4 — Canopy Head-Hunters of the Deep Green
  { id: 'canopy_jungle_temple', name: 'The Deep-Green Temple Canopy', byRank: {
    Foundation: 'a dense emerald rainforest canopy strung with vines, a stepped stone temple-pyramid rising through green mist, shafts of jungle light',
    Forged: 'the jungle temple alive with ritual, torch-smoke curling up the pyramid steps, the canopy thick with watching green',
    Ascendant: 'the great temple-city at the heart of the deep green fully awake, the pyramid blazing, the whole jungle bending toward the hunter' } },
  // 5 — Sand-City Champions
  { id: 'sandcity_arena', name: 'The Sand-City Arena', byRank: {
    Foundation: 'a sun-baked sandstone arena-city of tiered colonnades and hanging banners, the great fighting-pit below, hot desert light and dust-haze',
    Forged: 'the arena roaring at full crowd, banners streaming from the tiers, dust and sun over the champion in the pit',
    Ascendant: 'the grand colosseum of the sand-city at its legendary hour, the whole city thundering, the pit an altar of triumph' } },
];

// 2026-07-23 Monk moral-fork redesign: five environments index-parallel to the
// five MONK fashion variants (0 Peace, 1 Fire, 2 Water, 3 Wind, 4 Earth). Monk
// is tradition-coupled (the element-gated variant index locks the setting), so a
// Peace monk ascends into the cosmic void and a Fire monk trains at the forge.
// ORDER IS LOAD-BEARING — do not reorder without reordering the variants.
const MONK_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  // 0 — PEACE: mountain shrine → celestial cosmic void
  { id: 'peace_summit_shrine', name: 'Summit Meditation Shrine', byRank: {
    Foundation: 'a quiet high mountain meditation shrine at first light, worn prayer-stones and a single lotus-carved altar, mist and stillness',
    Forged: 'the summit shrine wreathed in cloud, lotus-lanterns lit, the air itself gone serene and luminous around the seated monk',
    Ascendant: 'the shrine dissolved into a serene deep-space void — the monk seated among wheeling galaxies and glowing nebulae, a cosmic starfield opening beneath the meditation-seat, a galaxy-disc halo turning behind the head' } },
  // 1 — FIRE dojo → forge arena
  { id: 'fire_forge_dojo', name: 'Ember-Forge Training Hall', byRank: {
    Foundation: 'a stone training hall built around a great forge-hearth, scorched practice-posts and cooling-ember floor, heat-haze in the air',
    Forged: 'the forge-hall roaring at full heat, the monk holding perfect form amid rising sparks and cinder',
    Ascendant: 'a volcanic training-arena at the edge of legend, lava-seams glowing in the floor, the whole hall a crucible around one disciplined figure' } },
  // 2 — WATER ford dojo → tidal arena
  { id: 'water_tide_dojo', name: 'Tidal Stone Training Ford', byRank: {
    Foundation: 'a training ford of balanced stones in moving water, spray and controlled breath, a maritime shrine on the bank',
    Forged: 'the ford in swelling current, the monk redirecting the rushing water with fluid perfect form',
    Ascendant: 'a great tidal arena at flood, waves curling around an island of absolute disciplined stillness' } },
  // 3 — WIND terrace dojo → sky arena
  { id: 'wind_terrace_dojo', name: 'High Wind Terrace', byRank: {
    Foundation: 'a cliff-edge training terrace swept by mountain wind, prayer-flags snapping, thin high air',
    Forged: 'the terrace in a rising gale, the monk poised weightless amid streaming banners and lifted debris',
    Ascendant: 'a sky-high wind arena at the roof of the world, cloud and gale wheeling around one unshaken poised figure' } },
  // 4 — EARTH courtyard dojo → mountain arena
  { id: 'earth_stone_dojo', name: 'Stone-Circle Training Ground', byRank: {
    Foundation: 'a training ground of standing stones and packed earth, carved discipline-markers, dust in the low light',
    Forged: 'the stone circle trembling with rooted power, the monk immovable as the ground shifts',
    Ascendant: 'a mountain-heart arena of colossal standing stones and heaving granite, the earth itself rooted around one unmovable master' } },
];

const BEASTMASTER_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'forest_rescue_clearing', name: 'Forest Rescue Clearing', byRank: {
    Foundation: 'a protected woodland clearing where wounded wildlife and travelers recover, quiet and careful',
    Forged: 'the rescue clearing under threat, handler and beast standing guard over the sheltered',
    Ascendant: 'the sanctuary clearing at the center of a great convergence of wildlife rallying to its protector' } },
  { id: 'migration_route', name: 'Wind-Carved Migration Route', byRank: {
    Foundation: 'a vast wind-carved landscape where the pair travels alongside a seasonal animal migration',
    Forged: 'the migration route swelling with moving herds, handler and beast guiding the great passage',
    Ascendant: 'the migration at mythic scale, a continent of moving life flowing behind the bonded pair' } },
  { id: 'raptor_roost', name: 'Cliffside Raptor Roost', byRank: {
    Foundation: 'a vertical mountain-coast roost built around flying companions and aerial observation',
    Forged: 'the roost in high wind, the flying companion wheeling as the handler signals from the cliffs',
    Ascendant: 'the great roost at the peak, a sky full of wheeling companions answering their bonded master' } },
  { id: 'snowbound_tracking_range', name: 'Snowbound Tracking Range', byRank: {
    Foundation: 'a low-visibility tundra of prints and scent-trails, shelter-craft and coordinated survival',
    Forged: 'the tracking range in a rising whiteout, handler and beast moving as one through the snow',
    Ascendant: 'the frozen range at its harshest, the bonded pair unstoppable across the mythic winter waste' } },
  { id: 'moonlit_pack_crossing', name: 'Moonlit Pack Crossing', byRank: {
    Foundation: 'a tense moonlit crossing where trust and body language matter more than domination',
    Forged: 'the crossing at a decisive moment, the wild pack testing and then yielding to the bond',
    Ascendant: 'the moonlit crossing become a mythic communion, whole wild packs moving with the Beastmaster' } },
];

const VAMPIRE_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'ancestral_estate', name: 'Candlelit Ancestral Estate', byRank: {
    Foundation: 'a candlelit manor of portraits, sealed rooms and preserved objects, centuries of accumulated identity',
    Forged: 'the estate stirring with old power, shadows deepening as the bloodline\'s influence gathers',
    Ascendant: 'the ancestral estate at the height of its dark grandeur, the whole house answering its master' } },
  { id: 'midnight_court_ballroom', name: 'Midnight Court Ballroom', byRank: {
    Foundation: 'an elegant midnight ballroom of tightly controlled etiquette, alliances and restrained hunger',
    Forged: 'the court ballroom charged with predatory tension, every eye turning as the Vampire ascends',
    Ascendant: 'the midnight court at the summit of intrigue, the whole assembly bending to a sovereign presence' } },
  { id: 'gaslamp_district', name: 'Rainy Gaslamp District', byRank: {
    Foundation: 'a rain-slick gaslamp district at night, reflections and night-crowds, hidden feeding routes',
    Forged: 'the district\'s shadows lengthening, the Vampire moving unseen through the wet lamplight',
    Ascendant: 'the whole night city bending to the predator, gaslight and rain swirling around them' } },
  { id: 'abandoned_opera_house', name: 'Abandoned Opera House', byRank: {
    Foundation: 'a decaying opera house preserving music, grief and the memory of a lost era, dust in the box-light',
    Forged: 'the opera house half-woken, phantom music rising as the Vampire takes the stage of memory',
    Ascendant: 'the ruined opera at mythic grandeur, a spectral performance blazing around its sovereign' } },
  { id: 'war_torn_crypt', name: 'War-Torn Family Crypt', byRank: {
    Foundation: 'an underground family crypt attacked and exposed, the bloodline\'s history desecrated',
    Forged: 'the crypt roused in fury, the Vampire\'s power rising to answer the violation',
    Ascendant: 'the ancestral crypt become a throne of vengeance, the whole bloodline\'s wrath manifest' } },
];

const LYCANTHROPE_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'pack_shrine', name: 'Moon-Goddess Pack Shrine', byRank: {
    Foundation: 'a sacred forest shrine of transformation rites, pack-markings, offerings and lunar symbols',
    Forged: 'the shrine under a bright moon, the rite deepening as the pack gathers close',
    Ascendant: 'the great shrine of the Moon Goddess ablaze with lunar power, the full pack in communion' } },
  { id: 'pine_ridge_trail', name: 'Pine Ridge Hunting Trail', byRank: {
    Foundation: 'a familiar pine-ridge trail navigated by scent and sound, communal hunting knowledge',
    Forged: 'the ridge trail at the height of the hunt, the pack moving as one through the pines',
    Ascendant: 'the mountain forest under a full moon, a legendary hunt sweeping across the ridge' } },
  { id: 'village_before_moonrise', name: 'Village Before Moonrise', byRank: {
    Foundation: 'an ordinary pack village preparing carefully for an approaching transformation, dusk gathering',
    Forged: 'the village at moonrise, the change beginning as kin brace and support one another',
    Ascendant: 'the whole settlement under the risen full moon, transformation and pack-faith at their peak' } },
  { id: 'silvered_lake', name: 'Silvered Lake Gathering', byRank: {
    Foundation: 'a lakeshore of pack decisions and rites beneath a visible moon reflected on still water',
    Forged: 'the silvered lake bright with moonlight, the pack\'s rite reaching its decisive turn',
    Ascendant: 'the lake ablaze with reflected full-moon light, a mythic gathering of the whole pack' } },
  { id: 'eclipse_field', name: 'Eclipse Transformation Field', byRank: {
    Foundation: 'an open field under a gathering eclipse, a rare celestial event unsettling forms and instincts',
    Forged: 'the eclipse deepening, forms destabilizing as the pack fights to hold its roles',
    Ascendant: 'the total eclipse at its peak, a mythic celestial event remaking beast and pack alike' } },
];

const MECHPILOT_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'maintenance_hangar', name: 'Open Mech Maintenance Hangar', byRank: {
    Foundation: 'an industrial hangar of scaffolds, crew tools and exposed machinery, the mech\'s scale plain beside the pilot',
    Forged: 'the hangar in scramble-launch, klaxons and crews as the upgraded mech powers up',
    Ascendant: 'the vast hangar dwarfed by a titan-class machine, the whole facility mobilized around it' } },
  { id: 'flooded_evacuation', name: 'Flooded City Evacuation Route', byRank: {
    Foundation: 'a flooded urban evacuation route, the mech clearing debris and shielding civilians rather than fighting',
    Forged: 'the flooded city under worsening disaster, the mech holding a lifeline open for the fleeing',
    Ascendant: 'the drowning metropolis at catastrophe scale, the machine a colossus between the water and thousands' } },
  { id: 'desert_salvage', name: 'Desert Salvage Field', byRank: {
    Foundation: 'an arid salvage field of broken machines, resources and difficult choices under a hard sun',
    Forged: 'the salvage field contested, the pilot fighting for the wrecks that mean survival',
    Ascendant: 'the endless machine-graveyard desert, the pilot\'s titan rising above a sea of ruin' } },
  { id: 'disabled_mech_battlefield', name: 'Battlefield of Disabled Mechs', byRank: {
    Foundation: 'a ruined battlefield of dead machines, a mechanical graveyard of salvage and memory',
    Forged: 'the mech-graveyard reawakened by battle, the pilot fighting among the fallen giants',
    Ascendant: 'the vast graveyard of war-machines at mythic scale, one titan standing over an army of the dead' } },
  { id: 'core_reactor_crisis', name: 'Core-Reactor Crisis Chamber', byRank: {
    Foundation: 'a high-risk reactor chamber, the pilot working beside the mech during a systems emergency',
    Forged: 'the reactor chamber in cascading failure, the pilot and machine racing catastrophe',
    Ascendant: 'the core-chamber at meltdown, the pilot and overclocked titan blazing at the edge of disaster' } },
];

const ANDROID_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'decommissioned_line', name: 'Decommissioned Manufacturing Line', byRank: {
    Foundation: 'a silent manufacturing line where the Android returns to its place of origin to confront its purpose',
    Forged: 'the dormant factory stirring back to life around the Android as it reclaims the line',
    Ascendant: 'the vast production complex fully reawakened, the Android sovereign over the place that made it' } },
  { id: 'machine_citizen_market', name: 'Machine-Citizen Market District', byRank: {
    Foundation: 'an urban market where humans, Androids and robots coexist with visible social friction',
    Forged: 'the market district charged with tension, the Android a focal point of the changing order',
    Ascendant: 'the whole machine-citizen city turning on a moment, the Android at the center of history' } },
  { id: 'data_center_garden', name: 'Abandoned Data Center Garden', byRank: {
    Foundation: 'a technological ruin where vines and cooling towers mix, servers holding preserved digital memories',
    Forged: 'the data-garden humming awake, light running through the reclaimed servers around the Android',
    Ascendant: 'the vast server-garden fully lit, an ecosystem of machine-memory blooming around its keeper' } },
  { id: 'robot_refuge', name: 'Robot Refuge Beneath the City', byRank: {
    Foundation: 'a hidden underground settlement where discarded machines repair one another and build new culture',
    Forged: 'the refuge rallying, obsolete machines organizing around the Android as leader',
    Ascendant: 'the great machine-refuge risen into a civilization, the Android at the heart of its founding' } },
  { id: 'post_human_sanctuary', name: 'Post-Human Machine Sanctuary', byRank: {
    Foundation: 'a strange technological sanctuary of ascended forms, geometry no human architect would design',
    Forged: 'the sanctuary reshaping itself around the Android as its post-human logic unfolds',
    Ascendant: 'the mythic machine-sanctuary at full impossibility, a world remade by ascended minds' } },
];

const SERAPH_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'ruined_sanctuary_dawn', name: 'Ruined Sanctuary at Dawn', byRank: {
    Foundation: 'a broken holy place at dawn where the Seraph protects survivors, first light through shattered arches',
    Forged: 'the ruined sanctuary filling with dawn-light as the Seraph rallies the sheltered',
    Ascendant: 'the fallen sanctuary blazing with restored radiance, a beacon reborn over the saved' } },
  { id: 'lantern_procession', name: 'Lantern Procession Through Darkness', byRank: {
    Foundation: 'ordinary people carrying small lights along a dark road, the Seraph guarding their passage',
    Forged: 'the procession pressing through deepening darkness, the Seraph\'s light strengthening every lantern',
    Ascendant: 'the whole procession blazing as one river of light, the Seraph a sun leading them through the dark' } },
  { id: 'storm_above_city', name: 'Storm Above a Besieged City', byRank: {
    Foundation: 'a storm-wracked sky above a besieged city, the Seraph on the wing over thousands',
    Forged: 'the aerial storm at its height, wings spread as the Seraph shields the city below',
    Ascendant: 'the tempest split by radiance, the Seraph a blazing guardian over a whole saved city' } },
  { id: 'fallen_celestial_battlefield', name: 'Fallen Celestial Battlefield', byRank: {
    Foundation: 'a mythic ruin of broken halos and abandoned standards, proof that divine power can fail',
    Forged: 'the fallen battlefield stirring, the Seraph standing where others fell',
    Ascendant: 'the celestial battlefield at cosmic scale, the Seraph\'s conviction blazing against ruin' } },
  { id: 'dawn_through_void', name: 'Dawn Breaking Through the Void', byRank: {
    Foundation: 'an ascended cosmic threshold where conviction begins to break like dawn against the void',
    Forged: 'the void receding before a growing dawn, the Seraph\'s light carving into the dark',
    Ascendant: 'a world-changing dawn tearing across the void, radiance without erasing the surrounding dark' } },
];

// 2026-07-23 HUMAN reframe = no-element TECH INVENTOR. Seven Callings, seven
// environments in the SAME ORDER as the seven HUMAN fashion variants
// (hairFashionBible.ts). Human is tradition-coupled: the forge locks
// fashionVariantIndex and the picker reads it via isTraditionCoupled, so an
// Artificer always spawns in a foundry and a Marksman on an overwatch ridge.
// ORDER IS LOAD-BEARING — do not reorder without reordering the variants too.
const HUMAN_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  // 0 — Artificer → workshop-foundry
  { id: 'artificer_foundry', name: 'Steamworks Foundry-Workshop', byRank: {
    Foundation: 'a cluttered brass-and-iron workshop-foundry, half-built machines on the benches, boiler-pipes and hanging tools, warm forge-light and drifting steam',
    Forged: 'the foundry at full working roar, turret-frames and constructs powering up on the assembly floor, steam venting and gear-trains turning',
    Ascendant: 'a vast manufactory-foundry at legendary output, whole ranks of the Human\'s constructs assembling themselves, the great engines of the workshop thundering' } },
  // 1 — Field-Medic → field-hospital
  { id: 'medic_field_hospital', name: 'Frontline Field-Hospital', byRank: {
    Foundation: 'a canvas-and-brass field-hospital tent behind the lines, cots and injector-racks, med-drones charging, lamplit and orderly',
    Forged: 'the field-hospital overwhelmed and holding, the Human\'s med-drones and prosthetic-rigs working every cot at once',
    Ascendant: 'a vast frontier trauma-hall at mythic scale, swarms of med-drones and finished prosthetics saving a whole army, the Human at its beating center' } },
  // 2 — Scholar → archive/lab
  { id: 'scholar_survey_hall', name: 'Instrument-Hall Research Archive', byRank: {
    Foundation: 'a brass-instrument research hall, blueprint-tables and specimen cases, orreries and data-slates glowing in the lamplight',
    Forged: 'the research hall alive with discovery, survey-drones mapping the air, charts and analytical engines whirring around the Human',
    Ascendant: 'the grand analytical archive fully unlocked, a cathedral of computation-engines and star-charts, a lost knowledge unfurling at the Human\'s command' } },
  // 3 — Pacifist → temple/sanctuary
  { id: 'pacifist_sanctuary', name: 'Open Peace-Sanctuary', byRank: {
    Foundation: 'a plain open sanctuary of quiet stone and hanging lanterns, prayer-cords and an unbarred door, calm and undefended',
    Forged: 'the sanctuary filled with those who came for shelter, the Human keeping peace among them with open hands',
    Ascendant: 'the great sanctuary become a beacon of reconciliation, a vast gathering laying down arms around the unarmed Human' } },
  // 4 — Infiltrator → a dense CAMO field they dissolve into (couples with the
  // ghillie-suit camo-blend scene in portraitAssembler.buildInfiltratorCamoScene)
  { id: 'infiltrator_camo_thicket', name: 'Mottled Camouflage Thicket', byRank: {
    Foundation: 'a dense thicket of mottled woodland foliage, ferns, moss and broken branches in muted grey-green-brown, dappled shadow everywhere — perfect concealment',
    Forged: 'the overgrown thicket at a tense hour, the foliage a shifting camo field the Human melts through unseen',
    Ascendant: 'a vast tangled wildwood at a knife-edge moment, a limitless camouflage field bending around a ghost no eye can find' } },
  // 5 — Sky-Corsair → airship-dock
  { id: 'corsair_airship_dock', name: 'Brass Airship Sky-Dock', byRank: {
    Foundation: 'a brass-and-timber sky-dock high on a mooring-mast, airship envelopes and rigging, cloud and open sky below the gangplank',
    Forged: 'the sky-dock in a running raid, the corsair\'s airship casting off amid grappling-lines and racing cloud',
    Ascendant: 'a vast cloud-harbor of airships at the corsair\'s command, a sky-armada wheeling above the mooring-towers' } },
  // 6 — Marksman → overwatch-ridge
  { id: 'marksman_overwatch_ridge', name: 'Wind-Swept Overwatch Ridge', byRank: {
    Foundation: 'a high wind-swept ridge overlooking a distant valley, scrub and grey rock, a long clear sightline and a spotter\'s vantage',
    Forged: 'the overwatch ridge in a rising wind, the Human holding a decisive sightline over the contested ground far below',
    Ascendant: 'the great ridge at the roof of the battle, a legendary vantage where a single shot decides the fate of the valley below' } },
];

const ENVIRONMENT_POOLS: Partial<Record<ArchetypeName, readonly EnvironmentFamily[]>> = {
  Necromancer: NECROMANCER_ENVIRONMENTS,
  Druid: DRUID_ENVIRONMENTS,
  Barbarian: BARBARIAN_ENVIRONMENTS,
  Monk: MONK_ENVIRONMENTS,
  Beastmaster: BEASTMASTER_ENVIRONMENTS,
  Vampire: VAMPIRE_ENVIRONMENTS,
  Lycanthrope: LYCANTHROPE_ENVIRONMENTS,
  'Mech Pilot': MECHPILOT_ENVIRONMENTS,
  Android: ANDROID_ENVIRONMENTS,
  Seraph: SERAPH_ENVIRONMENTS,
  Human: HUMAN_ENVIRONMENTS,
};

export function getEnvironmentPool(archetype: ArchetypeName): readonly EnvironmentFamily[] {
  return ENVIRONMENT_POOLS[archetype] ?? [];
}

/**
 * Archetypes whose environment families are authored 1:1 parallel to their
 * fashion variants, so the background is picked by the locked
 * hiddenFate.fashionVariantIndex instead of at random. Keep the two arrays the
 * same length and order (Barbarian: six Traditions ↔ six environments).
 */
// Monk couples via its ELEMENT-gated variant index (pickFashionVariant matches
// requiredElements → that index is locked onto fashionVariantIndex), so a Fire
// monk trains at the forge and a Peace monk ascends into the cosmic void.
const TRADITION_COUPLED: ReadonlySet<ArchetypeName> = new Set<ArchetypeName>(['Barbarian', 'Human', 'Monk']);

export function isTraditionCoupled(archetype: ArchetypeName): boolean {
  return TRADITION_COUPLED.has(archetype);
}

export function getEnvironmentById(archetype: ArchetypeName, id: string): EnvironmentFamily | undefined {
  return getEnvironmentPool(archetype).find((e) => e.id === id);
}

/** The rank-appropriate setting for a locked environment family, or empty. */
export function getEnvironmentDescriptor(archetype: ArchetypeName, id: string, rank: Rank): string {
  return getEnvironmentById(archetype, id)?.byRank[rank] ?? '';
}
