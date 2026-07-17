import type { ModifierStack, ArchetypeName } from '../types/card';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';

export interface ModifierEntry {
  text: string;
  rarity?: Rarity;
}

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  mythic: 3,
};

export const RARITY_STYLE: Record<Rarity, { label: string; ring: string; text: string; glow: string }> = {
  common: { label: '', ring: 'border-slate-dark', text: 'text-bone/90', glow: '' },
  uncommon: { label: 'Uncommon', ring: 'border-emerald-500/50', text: 'text-emerald-300', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.35)]' },
  rare: { label: 'Rare', ring: 'border-sky-400/60', text: 'text-sky-300', glow: 'shadow-[0_0_14px_rgba(56,189,248,0.5)]' },
  mythic: { label: 'Mythic', ring: 'border-fuchsia-400/70', text: 'text-fuchsia-300', glow: 'shadow-[0_0_18px_rgba(232,121,249,0.6)]' },
};

// ELEMENT — was 6, now 22
export const ELEMENT_POOL: ModifierEntry[] = [
  { text: 'Fire' },
  { text: 'Ice' },
  { text: 'Lightning' },
  { text: 'Shadow' },
  { text: 'Earth' },
  { text: 'Wind' },
  { text: 'Water' },
  { text: 'Storm', rarity: 'uncommon' },
  { text: 'Poison', rarity: 'uncommon' },
  { text: 'Radiance', rarity: 'uncommon' },
  { text: 'Verdant', rarity: 'uncommon' },
  { text: 'Sand', rarity: 'uncommon' },
  { text: 'Iron' },
  { text: 'Blood', rarity: 'rare' },
  { text: 'Crystal', rarity: 'rare' },
  { text: 'Void', rarity: 'rare' },
  { text: 'Chaos', rarity: 'rare' },
  { text: 'Mist', rarity: 'uncommon' },
  { text: 'Plague', rarity: 'rare' },
  { text: 'Moon', rarity: 'uncommon' },
  { text: 'Sun', rarity: 'uncommon' },
  { text: 'Dream', rarity: 'mythic' },
  { text: 'Echo', rarity: 'mythic' },
  { text: 'Silence', rarity: 'mythic' },
];

// PHYSIQUE — was 6, now 22
export const PHYSIQUE_POOL: ModifierEntry[] = [
  { text: 'Towering, massive frame' },
  { text: 'Lean and wiry' },
  { text: 'Scarred survivor' },
  { text: 'Ethereal, otherworldly presence', rarity: 'uncommon' },
  { text: 'Clad in heavy plate' },
  { text: 'Weathered by centuries', rarity: 'uncommon' },
  { text: 'Corded muscle, athlete build' },
  { text: 'Gaunt, hollow-cheeked' },
  { text: 'Broad-shouldered brawler' },
  { text: 'Small but coiled' },
  { text: 'Half-metal, half-flesh', rarity: 'rare' },
  { text: 'Skeletally thin' },
  { text: 'Feral, hunched posture' },
  { text: 'Regally poised' },
  { text: 'Scar-lattice across every visible skin', rarity: 'uncommon' },
  { text: 'Tattoo-covered from head to hand' },
  { text: 'Missing a limb, replaced by prosthetic', rarity: 'uncommon' },
  { text: 'One eye milky, the other burning', rarity: 'rare' },
  { text: 'Twin-hearted, faint chest glow', rarity: 'rare' },
  { text: 'Grafted with living wood', rarity: 'rare' },
  { text: 'Frost-veined, breath visible', rarity: 'uncommon' },
  { text: 'Body of shifting shadow', rarity: 'mythic' },
];

// LINEAGE — was 6, now 22
export const LINEAGE_POOL: ModifierEntry[] = [
  { text: 'Exiled from homeland' },
  { text: 'Royal blood' },
  { text: 'Cursed, bearing a dark burden' },
  { text: 'Orphaned, forged by loss' },
  { text: 'Blessed, touched by divinity', rarity: 'uncommon' },
  { text: 'Reborn, returned from death', rarity: 'uncommon' },
  { text: 'Bastard heir of a hidden dynasty' },
  { text: 'Last of a slaughtered order' },
  { text: 'Sold into service as a child' },
  { text: 'Raised by monsters' },
  { text: 'Deserter from an elite army' },
  { text: 'Prisoner turned executioner' },
  { text: 'Chosen by a dying god', rarity: 'rare' },
  { text: 'Vow-broken, cast out by peers' },
  { text: 'Sibling to a great villain', rarity: 'uncommon' },
  { text: 'Woken from centuries of sleep', rarity: 'uncommon' },
  { text: 'Adopted heir of a demon' },
  { text: 'Sole survivor of a prophecy' },
  { text: 'Made, not born', rarity: 'rare' },
  { text: 'Descended from a fallen star', rarity: 'rare' },
  { text: 'Split from their twin at birth' },
  { text: 'Never had a childhood, memory begins in blood', rarity: 'mythic' },
];

// SETTING — was 25, now 60
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
  { text: 'Salt-flats under a double moon', rarity: 'uncommon' },
  { text: 'Ruined coliseum with broken statues' },
  { text: 'Bioluminescent forest at deep night', rarity: 'uncommon' },
  { text: 'Volcanic shore with black glass sand' },
  { text: 'Frost-shattered pine wood at dawn' },
  { text: 'Bone garden beneath a red sky', rarity: 'uncommon' },
  { text: 'Derelict starship corridor lit by emergency red' },
  { text: 'Windless desert of mirrored dunes', rarity: 'rare' },
  { text: 'Cathedral of ice, sunlight refracting' },
  { text: 'Hanging gardens over a caldera' },
  { text: 'Rooftop above a sleeping city' },
  { text: 'Rusted scrapyard cathedral' },
  { text: 'Meadow of pale grass under an eclipse', rarity: 'uncommon' },
  { text: 'Sunken city, kelp swaying through arches' },
  { text: 'Ceremonial stone circle at blue hour' },
  { text: 'Battlefield the morning after' },
  { text: 'Throne room stripped of its throne' },
  { text: 'Waterfall pouring into an abyss' },
  { text: 'Crumbling lighthouse on a black shore' },
  { text: 'Ancestral tomb, dust hanging in shafts of light' },
  { text: 'Trench cut into red clay, walls scarred' },
  { text: 'Grand ballroom, chandelier fallen' },
  { text: 'Ice-shelf under aurora light' },
  { text: 'Field of standing spears in the mist' },
  { text: 'Forgotten shrine deep in a jungle' },
  { text: 'Skyless underground cavern lit by fungi' },
  { text: 'Candlelit altar in an empty temple' },
  { text: 'Airship deck mid-storm' },
  { text: 'Wheat field with a burning barn behind' },
  { text: 'Dojo garden, cherry petals falling' },
  { text: 'Marble courtyard split by a lightning scar' },
  { text: 'Iron bridge over a river of fog' },
  { text: 'Prison yard at execution hour' },
  { text: 'Silk-draped harem gone to ruin' },
  { text: 'Barren tundra, one dead tree' },
  { text: 'Alchemist\'s tower, glass shattered' },
  { text: 'Battlefield of frozen soldiers standing upright', rarity: 'rare' },
  { text: 'Endless staircase carved into a mountain' },
  { text: 'Ossuary chapel with candlelit skulls' },
  { text: 'Reactor core chamber, warning lights strobing' },
  { text: 'Cliffside hermitage in the clouds' },
  { text: 'Cursed grove where nothing grows straight', rarity: 'rare' },
  { text: 'Coastal ruin swallowed by rising tide' },
  { text: 'Marketplace burned to the pillars' },
  { text: 'Palace of glass at dusk' },
  { text: 'A single tree older than the world', rarity: 'rare' },
  { text: 'The moment between heartbeats', rarity: 'mythic' },
  { text: 'The inside of a dying star', rarity: 'mythic' },
  { text: 'A dream someone else is having', rarity: 'mythic' },
  { text: 'The last page of a burning book', rarity: 'mythic' },
];

// DEMEANOR — 46 entries (removed 4 NSFW-trigger entries)
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
  { text: 'Focused, mid-technique' },
  { text: 'Guarding someone unseen' },
  { text: 'Mourning, holding a token' },
  { text: 'Awakening for the first time', rarity: 'uncommon' },
  { text: 'Fully at peace' },
  { text: 'Grinning through gritted teeth' },
  { text: 'Silent judgment' },
  { text: 'Barely restraining rage' },
  { text: 'Amused by their own doom', rarity: 'uncommon' },
  { text: 'Weeping without noticing' },
  { text: 'Nostalgic and distant' },
  { text: 'Sharpening a blade absentmindedly' },
  { text: 'Beckoning the viewer forward' },
  { text: 'Whispering to someone unseen' },
  { text: 'Refusing to look away' },
  { text: 'Praying to a god they hate' },
  { text: 'Reading a letter from a friend' },
  { text: 'Half-turning toward a sound' },
  { text: 'Exhaling smoke slowly' },
  { text: 'Standing tall and still advancing' },
  { text: 'Lifting a fallen banner' },
  { text: 'Pointing at the horizon' },
  { text: 'Ready to face what\'s coming' },
  { text: 'Cackling at nothing' },
  { text: 'Awaiting judgment' },
  { text: 'Perfectly still, eyes glowing', rarity: 'rare' },
  { text: 'Speaking a truth no one wants to hear', rarity: 'rare' },
  { text: 'Beyond emotion, past all fear', rarity: 'mythic' },
];

// SIGNATURE DETAIL — 54 entries (removed 6 NSFW-trigger entries)
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
  { text: 'Living vine growing from a scar', rarity: 'uncommon' },
  { text: 'Small child\'s toy tied to the pack' },
  { text: 'Coin held between the teeth' },
  { text: 'Hourglass hanging at the belt, sand frozen', rarity: 'rare' },
  { text: 'Locket cracked open, no picture inside' },
  { text: 'Faded scar across the jaw' },
  { text: 'Cloak lined with the pelt of a mythic beast', rarity: 'uncommon' },
  { text: 'Wedding ring worn on a chain, not a finger' },
  { text: 'Missing tooth replaced with gold' },
  { text: 'Bandage over one hand that never comes off' },
  { text: 'Feather in the hair, painted red at the tip' },
  { text: 'Compass pointing at the viewer' },
  { text: 'Scroll clenched in a white-knuckled fist' },
  { text: 'Tattoo of a name across the knuckles' },
  { text: 'Blindfold with something written on it' },
  { text: 'Iron collar sawed halfway through' },
  { text: 'Sash tied by someone else, still knotted' },
  { text: 'Signet ring worn on the wrong hand' },
  { text: 'Weapon with a name carved into the hilt' },
  { text: 'Fresh flower tucked behind the ear' },
  { text: 'Chain-belt of prison shackles, unlocked' },
  { text: 'Bandoleer of vials, each glowing different colors' },
  { text: 'A single black feather stuck to the shoulder', rarity: 'uncommon' },
  { text: 'Shield split down the middle but still carried' },
  { text: 'Broken sword reforged with silver seams', rarity: 'rare' },
  { text: 'Cloak sewn from enemy banners' },
  { text: 'Mask that whispers when no one speaks', rarity: 'rare' },
  { text: 'Crown of iron thorns, cold and dark', rarity: 'rare' },
  { text: 'A candle that never gutters, held aloft', rarity: 'rare' },
  { text: 'Their own portrait rolled up under one arm', rarity: 'rare' },
  { text: 'The last star, held in a glass jar', rarity: 'mythic' },
  { text: 'A blade forged from starlight itself', rarity: 'mythic' },
];

// LIGHTING — was 25, now 50
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
  { text: 'Aurora green from above', rarity: 'uncommon' },
  { text: 'Twin-moon light, doubled shadows', rarity: 'uncommon' },
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
  { text: 'Corona of holy light from behind', rarity: 'uncommon' },
  { text: 'Neon underlight, magenta and cyan' },
  { text: 'Total silhouette, edge-lit only' },
  { text: 'Cold blue rim, warm orange fill' },
  { text: 'Rainbow light through stained glass' },
  { text: 'Dying fire, last embers below' },
  { text: 'Moonlight filtered through leaves' },
  { text: 'Overhead spotlight in the dark' },
  { text: 'Purple twilight, saturated' },
  { text: 'Fireflies drifting around them' },
  { text: 'Emergency red strobe' },
  { text: 'Pale winter noon, no warmth' },
  { text: 'Gaslight yellow, hazy' },
  { text: 'Volcanic under-lighting, orange from below' },
  { text: 'Solar flare bloom, blinding at edges' },
  { text: 'Ice-cave blue, refracted light' },
  { text: 'A single held candle, everything else black' },
  { text: 'Prismatic light through a broken crystal', rarity: 'rare' },
  { text: 'Light bending strangely, unnatural angle', rarity: 'rare' },
  { text: 'Their own body faintly luminous', rarity: 'rare' },
  { text: 'Twin suns setting, doubled warm light', rarity: 'rare' },
  { text: 'Aurora in the shape of a face', rarity: 'rare' },
  { text: 'Light coming from a wound', rarity: 'mythic' },
  { text: 'Absolute darkness with them visible anyway', rarity: 'mythic' },
  { text: 'Light of a memory, not a source', rarity: 'mythic' },
  { text: 'Colors that do not exist elsewhere', rarity: 'mythic' },
  { text: 'The gaze of something watching from above', rarity: 'mythic' },
  { text: 'Godlight, painful even to imagine', rarity: 'mythic' },
];

// CLASS SIGNATURE — locked at Foundation, unlocked at Forged+
export const CLASS_SIGNATURE_POOLS: Record<ArchetypeName, ModifierEntry[]> = {
  Necromancer: [
    { text: 'Skeletal honor guard flanking behind' },
    { text: 'Wraith bound to their shadow' },
    { text: 'Robed acolyte kneeling with a scroll' },
    { text: 'Bone dragon coiled in the darkness behind them', rarity: 'rare' },
    { text: 'Ghostly choir hovering in the mist' },
    { text: 'Skeleton warriors silhouetted in the fog below' },
    { text: 'Spectral crow swarm circling above' },
    { text: 'A floating grimoire orbiting slowly', rarity: 'rare' },
    { text: 'Robed servant kneeling and holding a chalice' },
    { text: 'Spectral revenant knight standing sentinel' },
    { text: 'A spirit-bound familiar taking the shape of a shadow-hound', rarity: 'mythic' },
    { text: 'An army of the dead marching from the horizon', rarity: 'mythic' },
  ],
  Vampire: [
    { text: 'Kneeling servant in silk at their feet' },
    { text: 'Bat familiar perched on the shoulder' },
    { text: 'Coven of pale attendants in a semicircle behind' },
    { text: 'Gilded coffin floating just behind them', rarity: 'rare' },
    { text: 'Their sired kin in silhouette in the background' },
    { text: 'Wolf pack bound in service behind them' },
    { text: 'Servant holding an ornate goblet' },
    { text: 'Mist of spectral moths swirling around them' },
    { text: 'A pale-cloaked attendant at their side' },
    { text: 'Portrait of an ancient sire watching from behind' },
    { text: 'Their maker\'s ghost, reproachful and silent', rarity: 'rare' },
    { text: 'A cathedral of thralls, all facing them, all bowing', rarity: 'mythic' },
  ],
  Lycanthrope: [
    { text: 'Wolf pack flanking in loose formation, all eyes forward' },
    { text: 'Silver moon-sigil branded into shoulder or chestplate' },
    { text: 'A single dire-wolf sworn companion at their heel' },
    { text: 'Twin curved silvered blades held low, ready' },
    { text: 'Moonlight bending around them as they walk' },
    { text: 'Torn shirt half-fallen, revealing mid-shift transformation' },
    { text: 'Ritual pendant of the Moon Goddess at the throat' },
    { text: 'Pawprints of light following behind them across the ground', rarity: 'rare' },
    { text: 'A halo of moonlight forming the shape of an open wolf jaw', rarity: 'rare' },
    { text: 'Pack of spectral white wolves emerging from the mist behind', rarity: 'rare' },
    { text: 'The Moon Goddess herself watching from the sky, face barely visible', rarity: 'mythic' },
    { text: 'Every wolf on the continent howling in unison, their voice at the center', rarity: 'mythic' },
  ],
  Druid: [
    { text: 'Spirit wolf companion at their side' },
    { text: 'Great owl perched atop their staff' },
    { text: 'Bloom of impossible flowers at their feet' },
    { text: 'Treant sapling growing where they stand' },
    { text: 'Bear-form guardian rearing behind them' },
    { text: 'Doe and fawn watching from the treeline' },
    { text: 'Serpent coiled peacefully around their arm' },
    { text: 'Swarm of butterflies forming a living crown', rarity: 'rare' },
    { text: 'Ancient stag with antlers of gold behind them', rarity: 'rare' },
    { text: 'Great turtle carrying them on its back' },
    { text: 'Forest itself leaning inward toward them', rarity: 'rare' },
    { text: 'A grove of trees whose roots trace their bloodline', rarity: 'mythic' },
  ],
  Beastmaster: [
    { text: 'War-beast at heel, ready to spring' },
    { text: 'Wolf pack flanking in tight formation' },
    { text: 'Mounted on a massive dire boar' },
    { text: 'Falcon in flight overhead' },
    { text: 'Great cat prowling behind them' },
    { text: 'Pack of spectral hounds', rarity: 'rare' },
    { text: 'Bonded stag beside them, watching' },
    { text: 'Armored war-elk with tusk-mounted spears' },
    { text: 'Riding a saddled hydra hatchling', rarity: 'rare' },
    { text: 'A one-eyed war-wolf sworn to them' },
    { text: 'A dragon that answers only to them', rarity: 'mythic' },
    { text: 'Every beast within a hundred leagues, all watching', rarity: 'mythic' },
  ],
  Barbarian: [
    { text: 'Massive two-handed greataxe held ready' },
    { text: 'Twin war hammers hefted at the shoulders' },
    { text: 'Chained flail wreathed in fire' },
    { text: 'Trophy-hung spear taller than themselves' },
    { text: 'Warpaint blazing across the face and chest' },
    { text: 'Dragonbone club with iron studs', rarity: 'rare' },
    { text: 'Cleaver made from a giant\'s sword' },
    { text: 'Belt of iron trophies won in battle' },
    { text: 'Beast-skull worn as a helm' },
    { text: 'Massive stone maul dragging on the ground' },
    { text: 'A whip of woven storm-cloud', rarity: 'mythic' },
    { text: 'A weapon forged from the first sword ever broken', rarity: 'mythic' },
  ],
  'Mech Pilot': [
    { text: 'Shoulder-mounted cannon array' },
    { text: 'Deployable combat drone hovering nearby' },
    { text: 'Energy blade gauntlet crackling with power' },
    { text: 'Missile-pod backpack, tips glowing' },
    { text: 'Coolant vapor venting from shoulder ports' },
    { text: 'Overclocked reactor glowing through chest plating' },
    { text: 'Rail gun mounted along the forearm' },
    { text: 'Kinetic shield generator on the wrist' },
    { text: 'Full mech suit towering behind, opened up', rarity: 'rare' },
    { text: 'HUD projection floating in the air before them' },
    { text: 'An AI companion hovering beside as a hologram', rarity: 'rare' },
    { text: 'Prototype orbital strike targeting reticle overlaid', rarity: 'mythic' },
  ],
  Android: [
    { text: 'Detached hovering limbs floating around them' },
    { text: 'Nanite swarm forming abstract shapes at their side' },
    { text: 'Holographic tactical display floating before their eyes' },
    { text: 'Modular weapon-arm mid-transformation' },
    { text: 'Kinetic shielding shimmering around them' },
    { text: 'Datacore visible through chest paneling' },
    { text: 'Circuit-line traceries glowing under synthetic skin' },
    { text: 'A second self standing behind them, mirrored', rarity: 'rare' },
    { text: 'Companion drone perched on their shoulder' },
    { text: 'Holographic ancestors of the same model behind them', rarity: 'rare' },
    { text: 'Access ports open, revealing an inner light' },
    { text: 'The first true soul in a machine, plainly visible', rarity: 'mythic' },
  ],
  Monk: [
    { text: 'Spectral fists mirroring their stance' },
    { text: 'Chi-form tiger prowling behind them', rarity: 'uncommon' },
    { text: 'Third eye opened on the forehead, glowing' },
    { text: 'Prayer beads levitating in a slow orbit' },
    { text: 'Shadow with six arms, though they have two', rarity: 'rare' },
    { text: 'Ascended aura in the shape of a lotus' },
    { text: 'Chi-form dragon coiling around them', rarity: 'rare' },
    { text: 'Ghostly student-selves training in the background' },
    { text: 'Ancestor spirits watching approvingly' },
    { text: 'A staff that moves on its own, floating' },
    { text: 'Enlightenment itself as a visible corona', rarity: 'mythic' },
    { text: 'Every version of themselves that could have been, arrayed behind', rarity: 'mythic' },
  ],
  Seraph: [
    { text: 'Chorus of lesser angels arrayed behind them' },
    { text: 'Ring of orbiting holy weapons' },
    { text: 'Six burning wings unfurled', rarity: 'rare' },
    { text: 'Halo-crown of woven light' },
    { text: 'Judgment scales floating at their side' },
    { text: 'A trumpet held loosely, waiting to sound' },
    { text: 'Sword of light drawn from empty air' },
    { text: 'Book of names hovering open before them' },
    { text: 'Cherubim flanking, faces averted' },
    { text: 'Sunburst mandala manifesting behind their head' },
    { text: 'God\'s own gaze upon them, visible as a beam', rarity: 'mythic' },
    { text: 'The scales of every soul they have ever weighed', rarity: 'mythic' },
  ],
  Human: [
    { text: 'Championship belt slung over the shoulder' },
    { text: 'Custom tactical loadout, holstered' },
    { text: 'Signature jacket, worn and personalized' },
    { text: 'Sponsor patches covering the sleeves' },
    { text: 'Championship trophy held aloft' },
    { text: 'Signature weapon of their sport at the ready' },
    { text: 'Battered helmet under one arm' },
    { text: 'Rival\'s broken weapon carried as a trophy' },
    { text: 'Their coach\'s coat draped over their shoulders' },
    { text: 'Cameras and floodlights aimed at them from the dark' },
    { text: 'A crowd of thousands in silhouette behind them', rarity: 'rare' },
    { text: 'The undefeated record itself, made physical', rarity: 'mythic' },
  ],
};

export interface ModifierCategory {
  key: keyof ModifierStack;
  label: string;
  description: string;
  pool: ModifierEntry[];
  /**
   * 'editable' — user can cycle/browse this ring freely, plus it's affected by spin.
   * 'fate' — only spin can change it; no manual cycle/browse.
   */
  editable: 'editable' | 'fate';
}

// Portrait-only pool getters
export function getClassSignaturePool(archetype: ArchetypeName): ModifierEntry[] {
  return CLASS_SIGNATURE_POOLS[archetype] ?? [];
}

/**
 * Foundation-safe subset of the class trait pool — only commons + uncommons.
 * Higher rarities represent Forged/Ascendant escalation (six wings, dragon
 * companion, orbital reticle) so we hold them back at Foundation.
 */
export function getClassTraitPoolForRank(archetype: ArchetypeName, rank: string): ModifierEntry[] {
  const pool = getClassSignaturePool(archetype);
  if (rank === 'Foundation') {
    return pool.filter((e) => !e.rarity || e.rarity === 'common' || e.rarity === 'uncommon');
  }
  return pool;
}

/**
 * Base category set. 3 editable rings (Element, Signature Detail, Class Trait)
 * and 4 fate rings (Physique, Lineage, Setting, Demeanor, Lighting). Kept in
 * this order because the wheel renders top-down.
 */
export const BASE_CATEGORIES: ModifierCategory[] = [
  { key: 'element', label: 'Element', description: 'Elemental affinity — you choose', pool: ELEMENT_POOL, editable: 'editable' },
  { key: 'signatureDetail', label: 'Signature Detail', description: 'One striking feature — you choose', pool: SIGNATURE_DETAIL_POOL, editable: 'editable' },
  { key: 'physique', label: 'Physique', description: 'Body and bearing — fate decides', pool: PHYSIQUE_POOL, editable: 'fate' },
  { key: 'lineage', label: 'Lineage', description: 'Where they came from — fate decides', pool: LINEAGE_POOL, editable: 'fate' },
  { key: 'setting', label: 'Setting', description: 'Where your champion stands — fate decides', pool: SETTING_POOL, editable: 'fate' },
  { key: 'demeanor', label: 'Demeanor', description: 'Expression and posture — fate decides', pool: DEMEANOR_POOL, editable: 'fate' },
  { key: 'lighting', label: 'Lighting', description: 'Atmosphere and color — fate decides', pool: LIGHTING_POOL, editable: 'fate' },
];

/** Legacy — original 4 portrait-only categories, kept for tierUp fallback. */
export const MODIFIER_CATEGORIES: ModifierCategory[] = [
  { key: 'setting', label: 'Setting', description: 'Where your champion stands', pool: SETTING_POOL, editable: 'fate' },
  { key: 'demeanor', label: 'Demeanor', description: 'Their expression and posture', pool: DEMEANOR_POOL, editable: 'fate' },
  { key: 'signatureDetail', label: 'Signature Detail', description: 'One striking feature', pool: SIGNATURE_DETAIL_POOL, editable: 'fate' },
  { key: 'lighting', label: 'Lighting', description: 'Atmosphere and color', pool: LIGHTING_POOL, editable: 'fate' },
];

/**
 * Build the wheel's category list for a given archetype. The Class Trait ring
 * is class-specific and always included (unlocked at Foundation with a milder
 * pool). It's the user's "unique thing" — wings for Seraph, dragons for
 * Beastmaster, portals for Necromancer, chi manifestations for Monk, etc.
 */
export function buildCategoriesForArchetype(
  archetype: ArchetypeName | null,
  rank: string,
): ModifierCategory[] {
  const cats = [...BASE_CATEGORIES];
  if (archetype) {
    cats.push({
      key: 'classSignature',
      label: 'Class Trait',
      description: 'Your class\'s unique visual signature — you choose',
      pool: getClassTraitPoolForRank(archetype, rank),
      editable: 'editable',
    });
  }
  return cats;
}

/** Weighted pick from a pool, respecting rarity weights. */
export function rollWeighted(pool: ModifierEntry[]): ModifierEntry {
  const totalWeight = pool.reduce((sum, e) => sum + RARITY_WEIGHTS[e.rarity ?? 'common'], 0);
  let target = Math.random() * totalWeight;
  for (const entry of pool) {
    target -= RARITY_WEIGHTS[entry.rarity ?? 'common'];
    if (target <= 0) return entry;
  }
  return pool[pool.length - 1];
}

/**
 * Roll `count` distinct entries from `pool` using rarity-weighted sampling.
 * Guarantees no repeats.
 */
export function rollOptions(pool: ModifierEntry[], count: number): ModifierEntry[] {
  const chosen: ModifierEntry[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * 20;
  let attempts = 0;
  while (chosen.length < count && chosen.length < pool.length && attempts < maxAttempts) {
    const pick = rollWeighted(pool);
    if (!seen.has(pick.text)) {
      seen.add(pick.text);
      chosen.push(pick);
    }
    attempts++;
  }
  return chosen;
}

/** Pick a single entry different from any in `excluding`. */
export function rollSurprise(pool: ModifierEntry[], excluding: ModifierEntry[]): ModifierEntry {
  const excludedTexts = new Set(excluding.map((e) => e.text));
  const available = pool.filter((e) => !excludedTexts.has(e.text));
  if (available.length === 0) return rollWeighted(pool);
  return rollWeighted(available);
}

/** Look up an entry's rarity by its text (for styling selected values). */
export function findRarity(pool: ModifierEntry[], text: string): Rarity {
  return pool.find((e) => e.text === text)?.rarity ?? 'common';
}
