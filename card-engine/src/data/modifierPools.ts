import type { ModifierStack } from '../types/card';

export interface ModifierEntry {
  text: string;
}

export const SETTING_POOL: ModifierEntry[] = [
  { text: 'Ashen wasteland under a bruised sky' },
  { text: 'Moonlit cliffs above a black sea' },
  { text: 'Obsidian cathedral with shattered windows' },
  { text: 'Torchlit crypt lined with old bones' },
  { text: 'Storm-swept mountain peak' },
  { text: 'Sunken temple half-claimed by roots' },
  { text: 'Frozen battlefield still smoking' },
  { text: 'Neon-drenched rain-slick alley' },
  { text: 'Forge-heart chamber glowing orange' },
  { text: 'Ancient library choked with vines' },
  { text: 'Salt-flats under a double moon' },
  { text: 'Ruined coliseum with broken statues' },
  { text: 'Bioluminescent forest at deep night' },
  { text: 'Volcanic shore with black glass sand' },
  { text: 'Frost-shattered pine wood at dawn' },
  { text: 'Bone garden beneath a red sky' },
  { text: 'Derelict starship corridor lit by emergency red' },
  { text: 'Windless desert of mirrored dunes' },
  { text: 'Cathedral of ice, sunlight refracting' },
  { text: 'Hanging gardens over a caldera' },
  { text: 'Rooftop above a sleeping city' },
  { text: 'Rusted scrapyard cathedral' },
  { text: 'Meadow of pale grass under an eclipse' },
  { text: 'Sunken city, kelp swaying through arches' },
  { text: 'Ceremonial stone circle at blue hour' },
];

export const DEMEANOR_POOL: ModifierEntry[] = [
  { text: 'Weary but unbroken' },
  { text: 'Coldly defiant' },
  { text: 'Serene and unshakeable' },
  { text: 'Hungry, predator-focused' },
  { text: 'Triumphant, mid-roar' },
  { text: 'Haunted, thousand-yard stare' },
  { text: 'Quietly amused' },
  { text: 'Reverent, head slightly bowed' },
  { text: 'Coiled, about to strike' },
  { text: 'Grieving but standing' },
  { text: 'Regal and dismissive' },
  { text: 'Feral and grinning' },
  { text: 'Meditative, eyes closed' },
  { text: 'Wrathful, teeth bared' },
  { text: 'Curious, head tilted' },
  { text: 'Resigned to what\'s coming' },
  { text: 'Watchful, scanning the horizon' },
  { text: 'Devout, mid-prayer' },
  { text: 'Contemptuous of the viewer' },
  { text: 'Bloodied but laughing' },
  { text: 'Focused, mid-technique' },
  { text: 'Guarding someone unseen' },
  { text: 'Mourning, holding a token' },
  { text: 'Awakening for the first time' },
  { text: 'Fully at peace' },
];

export const SIGNATURE_DETAIL_POOL: ModifierEntry[] = [
  { text: 'Shattered blade held in reverse grip' },
  { text: 'Chained tome floating at the hip' },
  { text: 'Raven perched on the shoulder' },
  { text: 'Prosthetic arm, exposed mechanism' },
  { text: 'Cracked porcelain mask, half-worn' },
  { text: 'Trailing red banner torn at the edge' },
  { text: 'Braided cord of trophies at the belt' },
  { text: 'Single glowing eye, the other scarred shut' },
  { text: 'Wolf skull as a shoulder pauldron' },
  { text: 'Coiled chain wrapped around the forearm' },
  { text: 'Faintly glowing tattoo across the collarbone' },
  { text: 'Broken crown carried in one hand' },
  { text: 'Lantern burning with cold blue flame' },
  { text: 'Threadbare cloak pinned with an old medal' },
  { text: 'Serpent tattoo winding down one arm' },
  { text: 'Feathered fan held closed like a weapon' },
  { text: 'Twin daggers crossed at the small of the back' },
  { text: 'Rosary of black beads at the wrist' },
  { text: 'Shackle still locked around one ankle' },
  { text: 'Painted handprint across the chest' },
  { text: 'Book bound in dark leather, chained shut' },
  { text: 'Antlered helm carried under the arm' },
  { text: 'Silver bell hanging from the belt' },
  { text: 'Living vine growing from a scar' },
  { text: 'Small child\'s toy tied to the pack' },
];

export const LIGHTING_POOL: ModifierEntry[] = [
  { text: 'Dawn gold, low and warm' },
  { text: 'Eclipse red, everything blood-tinted' },
  { text: 'Blue hour, cool and quiet' },
  { text: 'Forge glow, orange from below' },
  { text: 'Moonlight silver, high contrast' },
  { text: 'Storm-lit, brief lightning flashes' },
  { text: 'Underlit by pale magical fire' },
  { text: 'Overcast noon, flat and gray' },
  { text: 'Candlelit, warm and close' },
  { text: 'Backlit by a shattered sun' },
  { text: 'Aurora green from above' },
  { text: 'Twin-moon light, doubled shadows' },
  { text: 'Torchlight flickering, deep shadow' },
  { text: 'Bioluminescent blue-green ambient' },
  { text: 'Dust-hazed golden hour' },
  { text: 'Snow-reflected daylight, cold white' },
  { text: 'Fire-shadow, dancing on one side' },
  { text: 'Starlight only, near-monochrome' },
  { text: 'Green witchlight from the ground' },
  { text: 'Sunset copper, long shadows' },
  { text: 'Deep cave dark, single point source' },
  { text: 'Sunrise through mist, diffuse' },
  { text: 'Corona of holy light from behind' },
  { text: 'Neon underlight, magenta and cyan' },
  { text: 'Total silhouette, edge-lit only' },
];

export interface ModifierCategory {
  key: keyof ModifierStack;
  label: string;
  description: string;
  pool: ModifierEntry[];
}

export const MODIFIER_CATEGORIES: ModifierCategory[] = [
  { key: 'setting', label: 'Setting', description: 'Where your champion stands', pool: SETTING_POOL },
  { key: 'demeanor', label: 'Demeanor', description: 'Their expression and posture', pool: DEMEANOR_POOL },
  { key: 'signatureDetail', label: 'Signature Detail', description: 'One striking feature', pool: SIGNATURE_DETAIL_POOL },
  { key: 'lighting', label: 'Lighting', description: 'Atmosphere and color', pool: LIGHTING_POOL },
];

export function rollOptions(pool: ModifierEntry[], count: number): ModifierEntry[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0 && copy.length - i <= count; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(copy.length - count);
}

export function rollSurprise(pool: ModifierEntry[], excluding: ModifierEntry[]): ModifierEntry {
  const excludedTexts = new Set(excluding.map((e) => e.text));
  const available = pool.filter((e) => !excludedTexts.has(e.text));
  return available[Math.floor(Math.random() * available.length)];
}
