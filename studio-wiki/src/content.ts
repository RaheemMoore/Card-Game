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

export const elements = ['fire', 'water', 'wind', 'earth', 'light', 'shadow', 'lunar', 'nature', 'metal', 'psychic', 'void', 'cosmic'] as const;

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
  { group: 'Explore', items: [['/', 'Studio Home'], ['/characters', 'Characters & Archetypes'], ['/bosses', 'Bosses & Arenas'], ['/abilities', 'Abilities & Elements'], ['/world', 'Game World'], ['/minigames', 'Minigames']] },
  { group: 'Production', items: [['/production', 'Current Build'], ['/assets', 'Art & Assets'], ['/workshops', 'Workshops'], ['/decisions', 'Decisions'], ['/technical', 'Technical Systems'], ['/archive', 'Archive']] },
] as const;

export const searchEntries = [
  { path: '/characters', title: 'Characters & Archetypes', text: 'eleven emblems cards heroes ranks foundation forged ascendant' },
  { path: '/bosses', title: 'Bosses & Arenas', text: 'Debt-Bearer Still Season PixelLab idle windup attack ultimate rage hit defeat' },
  { path: '/abilities', title: 'Abilities & Elements', text: 'element crystals ability families Ember Cleave Aegis Ward artwork' },
  { path: '/world', title: 'Game World', text: 'castle courtyard tower arenas colliders occluders Phaser Leonardo PixelLab' },
  { path: '/production', title: 'Current Build', text: 'production status open threads priorities shipped in flight' },
  { path: '/assets', title: 'Art & Assets', text: 'asset catalog OpenNest web previews provenance approved candidate missing' },
  { path: '/workshops', title: 'Workshops', text: 'harnesses sprite lab background arena prompt lab visual playtest' },
  { path: '/decisions', title: 'Decisions', text: 'decision log governance canonical source truth' },
  { path: '/technical', title: 'Technical Systems', text: 'React Vite Supabase Phaser Leonardo PixelLab architecture' },
];
