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

const BARBARIAN_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'ancestral_hearth_hall', name: 'Ancestral Hearth Hall', byRank: {
    Foundation: 'a communal hearth hall of carved beams, repaired tools and memorial objects, firelight on generations of shared history',
    Forged: 'the hall roused for war, banners down and warriors gathering, the fire roaring as the clan rallies',
    Ascendant: 'the great hall at the heart of a legend, ancestral spirits all but present in the firelight, the whole clan\'s history bearing down' } },
  { id: 'storm_highland_pass', name: 'Storm-Beaten Highland Pass', byRank: {
    Foundation: 'a harsh highland pass in driving wind, a caravan or sacred burden pressing through the cold',
    Forged: 'the pass in a full mountain storm, the Barbarian holding the line for those behind them',
    Ascendant: 'the highland pass at the edge of catastrophe, the whole mountain roaring as endurance becomes legend' } },
  { id: 'burial_stone_valley', name: 'Burial-Stone Valley', byRank: {
    Foundation: 'a sacred valley of standing stones, cairns and woven offerings, paths linking living and remembered dead',
    Forged: 'the burial valley alive with ancestral presence, the stones seeming to lean in as old oaths stir',
    Ascendant: 'the valley of the ancestors fully awake, every stone blazing with remembered power around the bearer' } },
  { id: 'ruined_border_village', name: 'Ruined Border Village', byRank: {
    Foundation: 'a border village mid-reconstruction after conflict, scaffolds and half-raised walls, the Barbarian as builder and protector',
    Forged: 'the village under fresh threat, the Barbarian defending the rebuilt walls as people shelter behind',
    Ascendant: 'the frontier settlement at its last stand, a whole community\'s survival resting on the guardian' } },
  { id: 'oath_gathering_circle', name: 'Oath-Gathering Circle', byRank: {
    Foundation: 'a ceremonial fire-circle of carved posts and banners where clan representatives witness promises',
    Forged: 'the oath-circle at a decisive gathering, firelight high as binding vows are sworn',
    Ascendant: 'the great oath-gathering of many clans, the circle ablaze as history turns on a single promise' } },
];

const MONK_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'dawn_practice_courtyard', name: 'Dawn Practice Courtyard', byRank: {
    Foundation: 'a monastery courtyard at first light, worn footpaths and training marks, bells and disciplined routine',
    Forged: 'the courtyard mid-form at dawn, the air itself seeming to move with perfected practice',
    Ascendant: 'the practice courtyard transfigured by mastery, dawn-light and motion filling the whole space' } },
  { id: 'mountain_stair_sanctuary', name: 'Mountain Stair Sanctuary', byRank: {
    Foundation: 'a long mountain stair to a high sanctuary, mist and patient ascent, pilgrimage and effort',
    Forged: 'the sanctuary stair swept by wind and cloud, the Monk unmoved amid the elements',
    Ascendant: 'the mountain sanctuary at the roof of the world, clouds parting around a figure of total calm' } },
  { id: 'riverstone_ford', name: 'Riverstone Meditation Ford', byRank: {
    Foundation: 'a river ford of balanced stones and moving water, controlled breath under changing conditions',
    Forged: 'the ford in swelling current, the Monk holding perfect balance where the water rages',
    Ascendant: 'the meditation ford at flood, the river bending around an island of absolute stillness' } },
  { id: 'bell_tower_storm', name: 'Bell Tower During a Storm', byRank: {
    Foundation: 'a bell tower interior as a storm rises, the Monk keeping rhythm while the structure sways',
    Forged: 'the tower pitching in a full gale, the bell steady under disciplined hands',
    Ascendant: 'the storm-torn tower at its limit, the whole structure moving around one unshaken center' } },
  { id: 'archive_of_disciplines', name: 'Archive of Disciplines', byRank: {
    Foundation: 'a quiet library of manuals and annotated forms, teaching records and rival-school disagreements',
    Forged: 'the archive alive with study, the Monk drawing a decisive technique from the records',
    Ascendant: 'the great archive of disciplines fully opened, the accumulated knowledge of an age at the Monk\'s command' } },
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

const HUMAN_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  { id: 'frontier_crossroads', name: 'Busy Frontier Crossroads', byRank: {
    Foundation: 'a bustling frontier crossroads where cultures, professions and travelers meet, conflicting opportunities everywhere',
    Forged: 'the crossroads at a decisive hour, the Human seizing the moment amid the crowd',
    Ascendant: 'the great crossroads at a turning point in history, a whole region\'s fate in the balance' } },
  { id: 'royal_court', name: 'Royal Court of Competing Factions', byRank: {
    Foundation: 'a tense royal court of competing factions, power navigated by judgment and persuasion',
    Forged: 'the court at a decisive intrigue, every faction watching the Human\'s next move',
    Ascendant: 'the throne-room at the pivot of an age, the Human shaping the fate of a kingdom' } },
  { id: 'expedition_camp', name: 'Expedition Camp at an Ancient Ruin', byRank: {
    Foundation: 'an expedition camp at the mouth of an ancient ruin, curiosity and careful preparation',
    Forged: 'the expedition breaking into the ruin, the Human adapting to forgotten dangers',
    Ascendant: 'the great ruin fully opened, a lost history unleashed around the Human who dared it' } },
  { id: 'harbor_market', name: 'Crowded Harbor Market', byRank: {
    Foundation: 'a crowded coastal harbor market of trade, migration and cultural exchange, sails and stalls',
    Forged: 'the harbor at a decisive moment, the Human at the center of converging fortunes',
    Ascendant: 'the great port at a world-turning event, trade and destiny colliding around the Human' } },
  { id: 'rebuilt_city', name: 'Rebuilt City After Catastrophe', byRank: {
    Foundation: 'a city under reconstruction after catastrophe, human collaboration and disagreement shaping what comes next',
    Forged: 'the rebuilding city at a crossroads, the Human rallying its people to a choice',
    Ascendant: 'the reborn metropolis at the moment its future is set, a whole people moving with the Human' } },
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

export function getEnvironmentById(archetype: ArchetypeName, id: string): EnvironmentFamily | undefined {
  return getEnvironmentPool(archetype).find((e) => e.id === id);
}

/** The rank-appropriate setting for a locked environment family, or empty. */
export function getEnvironmentDescriptor(archetype: ArchetypeName, id: string, rank: Rank): string {
  return getEnvironmentById(archetype, id)?.byRank[rank] ?? '';
}
