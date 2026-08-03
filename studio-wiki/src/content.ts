export type TruthStatus = 'SHIPPED' | 'IN FLIGHT' | 'PLANNED' | 'PARKED' | 'APPROVED' | 'MISSING ASSET';

export const archetypes = [
  ['Barbarian', 'barbarian.jpg', 'Blood-Iron clan crest', 'ATK-led warrior tradition'],
  ['Monk', 'monk.jpg', 'Circular monastery seal', 'Discipline made visible'],
  ['Beastmaster', 'beastmaster.jpg', 'Ceremonial beast totem', 'Bond before command'],
  ['Druid', 'druid.jpg', 'Rootweaver open hand', 'Nature as relationship'],
  ['Necromancer', 'necromancer.jpg', 'Skull and black crescent', 'Memory, cost, and the dead'],
  ['Vampire', 'vampire.jpg', 'Blood-moon relic', 'Hunger under control'],
  ['Lycanthrope', 'lycanthrope.jpg', 'Wolf over the silver moon', 'Pack trust and lunar duty'],
  ['Mech Pilot', 'mech-pilot.jpg', 'Techno-arcane pilot helm', 'Human judgment inside machinery'],
  ['Android', 'android.png', 'Synthetic mechanical eye', 'Personhood beyond origin'],
  ['Seraph', 'seraph.jpg', 'Six-winged celestial mask', 'A contested divine spark'],
  ['Human', 'human.jpg', 'Fingerprint-ridge knight', 'Adaptability without destiny'],
] as const;

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

const performance = (
  slug: string,
  charge: ElementPerformance['charge'],
  delivery: ElementPerformance['delivery'],
  impact: string,
  palette: ElementPerformance['palette'],
  options: Partial<Pick<ElementPerformance, 'streamAnimated' | 'impactAnimated' | 'crystal' | 'artStatus'>> = {},
): ElementPerformance => ({
  slug,
  name: slug[0].toUpperCase() + slug.slice(1),
  charge,
  delivery,
  impact,
  palette,
  streamAnimated: options.streamAnimated ?? true,
  impactAnimated: options.impactAnimated ?? true,
  crystal: options.crystal === undefined ? `/assets/elements/${slug}.jpg` : options.crystal,
  artStatus: options.artStatus ?? 'candidate',
});

/**
 * Wiki-facing projection of the committed Ability Performance material table
 * (`ability-performance-system` @ c39304f). The combat branch remains the
 * canonical runtime source; this compact record gives the independent Wiki a
 * stable, reviewable index without importing game logic or uncommitted battle
 * integration.
 */
export const elements = [
  performance('fire', 'flame', 'wisp', 'spreading sheet', ['#ffd88a', '#e8541c', '#3a1408']),
  performance('water', 'pool', 'jet', 'foam crown', ['#0e5a72', '#2aa6c4', '#eaf7fb']),
  performance('earth', 'ground', 'jet', 'splintering stone', ['#6b6459', '#3f382e', '#c9a227'], { impactAnimated: false }),
  performance('wind', 'motes', 'wisp', 'gust scatter', ['#8fbf9e', '#c9e8d6', '#eaf9f2']),
  performance('ice', 'motes', 'jet', 'shard burst', ['#a8d8e8', '#4a9bc4', '#eaf9ff']),
  performance('storm', 'motes', 'wisp', 'radial stormbreak', ['#4a5568', '#7a8fa8', '#eaf2ff']),
  performance('nature', 'bloom', 'growth', 'root bloom', ['#1e3d1a', '#4a7c2f', '#c9a227']),
  performance('beast', 'ground', 'lunge', 'four-claw break', ['#8a6b47', '#4a3826', '#e8b923']),
  performance('blood', 'pool', 'jet', 'wet splatter', ['#7d1220', '#c8203a', '#f2b8bd'], { impactAnimated: false }),
  performance('poison', 'pool', 'creep', 'toxic fan', ['#5a7a1a', '#4a2a5a', '#c4d43a']),
  performance('metal', 'motes', 'jet', 'metallic burst', ['#8a8f96', '#c4a668', '#e8c468'], { impactAnimated: false }),
  performance('spirit', 'halo', 'wisp', 'engulfing spirit', ['#a8c4d8', '#e8f4f8', '#f8fbff']),
  performance('shadow', 'motes', 'wisp', 'ink bloom', ['#1a1424', '#4a3a63', '#9d8fb5'], { impactAnimated: false }),
  performance('light', 'halo', 'jet', 'sunburst', ['#fff4d4', '#e8d488', '#ffffff']),
  performance('holy', 'halo', 'barrier', 'refracting ward', ['#f7e7a8', '#d9a625', '#fffdf2'], { streamAnimated: false, impactAnimated: false, artStatus: 'procedural' }),
  performance('void', 'motes', 'wisp', 'unmaking bloom', ['#0a0612', '#3a1a52', '#8a4ac9']),
  performance('time', 'motes', 'unmapped', 'not authored', ['#3b1152', '#c026d3', '#fce7ff'], { streamAnimated: false, impactAnimated: false, crystal: '', artStatus: 'missing' }),
  performance('cosmic', 'halo', 'wisp', 'nebula bloom', ['#1a1a3a', '#4a3a6a', '#f0c848']),
  performance('psychic', 'motes', 'jet', 'psychic pulse', ['#7a3a9a', '#c44ab8', '#c896e8']),
  performance('moon', 'motes', 'jet', 'silver crown', ['#c8d4e8', '#2a3a5a', '#f0f4ff']),
  performance('dream', 'motes', 'wisp', 'nightmare bloom', ['#0d0512', '#3a1550', '#a855e8']),
  performance('bone', 'motes', 'volley', 'bone splinter', ['#e8e0d0', '#8a8478', '#6ac4a8'], { streamAnimated: false, impactAnimated: false }),
  performance('nocturne', 'halo', 'wisp', 'blood-moon veil', ['#4a0f18', '#8a1428', '#c4a8a8']),
  performance('sanguine', 'crystallize', 'volley', 'garnet shatter', ['#8c0f2a', '#d4224a', '#ffd9e2'], { streamAnimated: false, impactAnimated: false }),
  performance('lunar', 'halo', 'wisp', 'silver flare', ['#f0f4ff', '#a8c4e8', '#ffffff']),
  performance('plasma', 'contained', 'jet', 'contained flare', ['#e8f8ff', '#4a1a8a', '#8affff']),
  performance('nanite', 'motes', 'volley', 'swarm burst', ['#c4c8cc', '#6a6e74', '#4ae8e8'], { streamAnimated: false, impactAnimated: false }),
  performance('prism', 'motes', 'wisp', 'prismatic flare', ['#f8f4ff', '#4ae8c8', '#e84ac8']),
  performance('infernal', 'pool', 'jet', 'molten starburst', ['#ffb347', '#7a2408', '#1a0f0a']),
] as const;

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
  { group: 'Explore', items: [['/', 'Studio Home'], ['/characters', 'Characters & Archetypes'], ['/bosses', 'Bosses & Arenas'], ['/abilities', 'Abilities & Elements'], ['/world', 'Game World'], ['/minigames', 'Battle Tower']] },
  { group: 'Production', items: [['/production', 'Current Build'], ['/assets', 'Art & Assets'], ['/workshops', 'Workshops'], ['/decisions', 'Decisions'], ['/technical', 'Technical Systems'], ['/archive', 'Archive']] },
] as const;

export const searchEntries = [
  { path: '/characters', title: 'Characters & Archetypes', text: 'eleven emblems cards heroes ranks foundation forged ascendant' },
  { path: '/bosses', title: 'Bosses & Arenas', text: 'Battle Tower floors Debt-Bearer Still Season PixelLab idle windup attack ultimate rage hit defeat' },
  { path: '/abilities', title: 'Abilities & Elements', text: '29 element crystals PixelLab charge delivery stream volley growth impact blast ability performance Ember Cleave Aegis Ward artwork' },
  { path: '/world', title: 'Game World', text: 'castle courtyard tower arenas colliders occluders Phaser Leonardo PixelLab' },
  { path: '/minigames', title: 'Battle Tower', text: 'primary game mode floors party cards boss intent attack mana tech elements guard strike abilities' },
  { path: '/production', title: 'Current Build', text: 'production status open threads priorities shipped in flight' },
  { path: '/assets', title: 'Art & Assets', text: 'asset catalog OpenNest web previews provenance approved candidate missing' },
  { path: '/workshops', title: 'Workshops', text: 'harnesses sprite lab background arena prompt lab visual playtest' },
  { path: '/decisions', title: 'Decisions', text: 'decision log governance canonical source truth' },
  { path: '/technical', title: 'Technical Systems', text: 'React Vite Supabase Phaser Leonardo PixelLab architecture' },
];
