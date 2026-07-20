import type { ElementName } from '../types/bible';

/**
 * Element Visual Language Bible — canonical source of visual identity for
 * every element in the game. Encodes the schema from
 * /Element-Reference-Guide.rtf (2026-07-19) verbatim for the 8 elements the
 * Bible defines directly, and extrapolates the same schema to the remaining
 * 18 elements using prior Raheem direction as the ground truth.
 *
 * Bible principle: "Every element should be recognizable even without color.
 * A player should identify an element by silhouette, materials, lighting,
 * motion, textures, atmosphere. Color should reinforce an element, not
 * define it."
 *
 * This module replaces the thin `ELEMENT_EFFECT_LIBRARY` in claudeApi.ts.
 * Consumers should assemble prompts from these fields rather than baking
 * global "warm ember lighting" or "glowing energy" defaults that end up
 * poisoning every non-fire element toward orange-red aesthetics.
 */
export interface ElementVisual {
  /** Emotional identity — one or two words per line joined. */
  theme: string;
  /** Dominant colors — reads as a comma list. */
  primaryColors: string;
  /** Supporting colors. */
  secondaryColors: string;
  /** Small highlight colors. */
  accentColors: string;
  /** Physical materials associated with the element. */
  materials: string;
  /** Surface texture keywords. */
  textures: string;
  /** How light behaves. CRITICAL for element identity — the pipeline used
   *  to inject "warm ember lighting" globally which contaminated every
   *  element toward fire aesthetics. Lighting MUST be element-driven. */
  lighting: string;
  /** How energy moves. */
  motion: string;
  /** Common forms — silhouette-level shape language. */
  shapes: string;
  /** Environmental effects around the element. */
  atmosphere: string;
  /** Concepts the element represents. Optional for Claude to weave. */
  symbolism: string;
  /** Things Leonardo commonly overuses that must be avoided for this element. */
  avoid: string;
}

const V = (v: ElementVisual): ElementVisual => v;

/**
 * ---------- Elements from the Bible (verbatim) ----------
 */

const FIRE = V({
  theme: 'passion, power, destruction, rebirth, forge, heat',
  primaryColors: 'crimson, scarlet, deep orange, gold',
  secondaryColors: 'amber, burnt copper, white-hot yellow',
  accentColors: 'charcoal, black, dark gray',
  materials: 'lava, magma, molten iron, burning wood, charred stone, obsidian, ash',
  textures: 'cracked rock, cooling lava, burning coal, embers, burn marks, melted metal',
  lighting: 'internal glow, flickering highlights, heat distortion, bright core with dark outer edges',
  motion: 'sparks, smoke, rising embers, flowing magma, flame tongues',
  shapes: 'jagged, explosive, upward, sharp',
  atmosphere: 'heat haze, smoke, floating ash',
  symbolism: 'renewal, anger, courage, determination, creation through destruction',
  avoid: 'generic glowing red blobs, flat orange backgrounds, cartoon fire, subject completely engulfed in flames',
});

const WATER = V({
  theme: 'adaptability, flow, patience, life, depth, pressure',
  primaryColors: 'ocean blue, deep teal, aqua',
  secondaryColors: 'turquoise, navy, seafoam',
  accentColors: 'white, silver',
  materials: 'ocean water, rain, ice, mist, glass, coral, pearls',
  textures: 'ripples, foam, waves, condensation, smooth reflections',
  lighting: 'refraction, caustics, soft reflections, transparent glow — NO warm ember light',
  motion: 'flowing currents, waterfalls, splashing droplets, swirling tides',
  shapes: 'curved, flowing, spiral, circular',
  atmosphere: 'fog, rain, humidity',
  symbolism: 'healing, adaptability, wisdom, persistence',
  avoid: 'flat blue energy, generic magic swirl, plain blue glow, blue fire',
});

const EARTH = V({
  theme: 'strength, endurance, stability, ancient power',
  primaryColors: 'stone gray, granite, brown',
  secondaryColors: 'moss green, sandstone, clay',
  accentColors: 'gold, emerald, quartz',
  materials: 'granite, marble, stone, crystal, clay, fossils, gemstones',
  textures: 'rough rock, cracks, moss, weathering, chiseled stone',
  lighting: 'soft ambient light, crystal reflections — NO warm ember light',
  motion: 'tremors, dust, rising pillars',
  shapes: 'blocky, angular, heavy',
  atmosphere: 'dust, falling debris',
  symbolism: 'protection, permanence, patience',
  avoid: 'plain brown rocks, smooth featureless boulders, glowing volcanic Earth (that is Fire)',
});

const NATURE = V({
  theme: 'growth, life, balance, evolution',
  primaryColors: 'DEEP forest green, deep emerald, moss-canopy green — DARKER and RICHER than Wind-green; this is the color of a shaded forest floor',
  secondaryColors: 'brown, amber, moss',
  accentColors: 'bright flowers, bright leaves, gold pollen',
  materials: 'bark, roots, vines, mushrooms, flowers, sap, amber',
  textures: 'moss, leaves, wood grain, bark, petals',
  lighting: 'sunbeams, dappled light, soft glow through canopy — NO warm ember light. Eye-glow when present is DEEP GREEN (moss-and-forest-canopy green), never pale wind-green, never warm',
  motion: 'growing vines, falling leaves, floating pollen',
  shapes: 'organic, twisting, branching',
  atmosphere: 'forest mist, seeds, butterflies',
  symbolism: 'renewal, harmony, growth',
  avoid: 'only leaves, generic vines everywhere, green fire, pale-mint-green (that is Wind), yellow-green (that is Poison), no wings on Druid-users',
});

const LIGHTNING = V({
  theme: 'speed, precision, innovation, energy',
  primaryColors: 'electric blue, white',
  secondaryColors: 'cyan, indigo',
  accentColors: 'violet, silver',
  materials: 'plasma, crystal, charged metal',
  textures: 'electric fractures, energy veins, arc patterns',
  lighting: 'extremely bright flashes, pulses — NO warm ember light',
  motion: 'branching arcs, sparks, magnetic distortion',
  shapes: 'sharp, angular, branching',
  atmosphere: 'ozone, static particles',
  symbolism: 'intelligence, speed, discovery',
  avoid: 'single yellow lightning bolt, flat neon blue glow, yellow fire',
});

const ICE = V({
  theme: 'control, silence, precision, preservation',
  primaryColors: 'ice blue, white',
  secondaryColors: 'pale cyan, frost gray',
  accentColors: 'crystal blue',
  materials: 'ice, snow, crystal, frost',
  textures: 'frost patterns, cracks, snow',
  lighting: 'cold reflections, crystal sparkle — NO warm ember light',
  motion: 'blizzards, snowflakes, freezing mist',
  shapes: 'sharp, geometric',
  atmosphere: 'blizzard, frozen fog',
  symbolism: 'discipline, preservation',
  avoid: 'plain blue ice cubes, cartoon snow, blue fire',
});

const SHADOW = V({
  theme: 'mystery, fear, secrets, the unknown',
  primaryColors: 'black, midnight purple',
  secondaryColors: 'dark gray, indigo',
  accentColors: 'violet, crimson',
  materials: 'obsidian, smoke, void',
  textures: 'ink, smoke, velvet darkness',
  lighting: 'rim lighting only, low-key contrast — NO warm ember light',
  motion: 'drifting smoke, shadow tendrils',
  shapes: 'flowing, abstract',
  atmosphere: 'eclipse, fog, silence',
  symbolism: 'secrets, fear, death',
  avoid: 'pure black silhouettes, purple fire everywhere',
});

const METAL = V({
  theme: 'craftsmanship, strength, precision, technology',
  primaryColors: 'steel, iron, silver',
  secondaryColors: 'bronze, brass',
  accentColors: 'gold, copper',
  materials: 'forged steel, damascus steel, bronze, chains, gears',
  textures: 'brushed metal, hammer marks, engraving',
  lighting: 'sharp reflections, cool metallic shine — NO warm ember light, NO fire glow, cool metallic reflectivity only',
  motion: 'rotating gears, sparks',
  shapes: 'mechanical, geometric',
  atmosphere: 'forge sparks, steam',
  symbolism: 'discipline, progress, craft',
  avoid: 'flat gray armor, chrome everything, molten-metal-only compositions (that reads as Fire)',
});

/**
 * ---------- Extrapolated elements (schema-matched to the Bible) ----------
 *
 * These 18 elements are not defined in the Bible directly. Content is
 * derived from prior Raheem direction (Wind = green + wispy + floating,
 * Void = starless black warping reality, Sound = shock waves + fantasy
 * speakers, etc.) rewritten to fit the Bible's schema. When Raheem drops
 * additional canonical Bible entries for these, replace verbatim above and
 * remove the corresponding entry below.
 */

const WIND = V({
  theme: 'freedom, motion, unseen presence, breath',
  primaryColors: 'jade green, pale silver-green',
  secondaryColors: 'white, pale cyan',
  accentColors: 'silver, translucent green',
  materials: 'moving air, wisps, translucent silk, spirit-current',
  textures: 'wispy, translucent, flowing ribbons, ghost-of-a-current',
  lighting: 'diffuse ambient light, backlit rim from behind the wisps, no direct sun',
  motion: 'curling and unfurling gusts, spiraling leaves and debris, lifted cloth and hair, feet just barely off the ground',
  shapes: 'ribbon-like, unfurling, spiraling, half-translucent',
  atmosphere: 'green translucent wind currents through the frame, dust kicked up beneath hovering feet, partial translucent wings from the shoulder blades',
  symbolism: 'freedom, unseen force, transition',
  avoid: 'solid opaque wind, white-only wind, warm colors, blue-magic default',
});

const STONE = V({
  theme: 'weight, patience, ancient guard',
  primaryColors: 'granite gray, umber, slate',
  secondaryColors: 'moss green, lichen olive',
  accentColors: 'quartz white, iron-vein rust',
  materials: 'granite plates, boulder chunks, buried fossils',
  textures: 'chunky rocky-plate, mineral-vein, weathered pit',
  lighting: 'soft ambient, muted highlights on plate faces, dust-diffused',
  motion: 'heaving plates, rising pillars, rock-fists forming',
  shapes: 'blocky-heavy, columnar, angular',
  atmosphere: 'dust cloud rising, cracked ground fanning outward',
  symbolism: 'permanence, unmoved witness',
  avoid: 'glowing volcanic stone (that is Fire), smooth featureless boulders',
});

const STORM = V({
  theme: 'chaos, wrath, sky-fury',
  primaryColors: 'steel gray, electric blue',
  secondaryColors: 'rain silver, thunderhead purple',
  accentColors: 'lightning white, hail-pale',
  materials: 'rain, wind, cloud, lightning, hail',
  textures: 'swirling-cloud, lightning-arc, rain-streak',
  lighting: 'dim ambient with intense lightning-flash punctuation, sky-flash rim light',
  motion: 'swirling storm cloud above the head, lightning to the ground, rain lashing sideways, cloak whipped',
  shapes: 'spiraling, chaotic-billowing, forked',
  atmosphere: 'storm cloud swirling above, rain streaking the frame, thunder in the air',
  symbolism: 'unrest, cleansing violence',
  avoid: 'red/orange, clear-sky, static',
});

const BEAST = V({
  theme: 'primal presence, wild kinship, feral will',
  primaryColors: 'tawny brown, forest green, bone white',
  secondaryColors: 'dust ochre, blood crimson (as accent only)',
  accentColors: 'eye-glow yellow-gold or feral red',
  materials: 'fur, sinew, tooth, claw, hide, bone, feather',
  textures: 'thick fur, wet muscle-tension, tooth-and-hide, scratched dirt',
  lighting: 'moonlit shadow, low predatory light, natural sun/moon — NO magical glow',
  motion: 'crouched-and-springing, claws swiping, tail lashing, misty spirit-animals prowling on the ground',
  shapes: 'crouched-tension, low-shouldered, poised-to-strike',
  atmosphere: 'scratched dirt, torn-up ground, spirit-animal silhouettes at ground level',
  symbolism: 'wild kinship, instinct, blood loyalty',
  avoid: 'ABSOLUTELY NEVER fire or flame or ember or heat-shimmer, NEVER lightning arcs, NEVER magical rune circles, NEVER any glow-based magic',
});

const BLOOD = V({
  theme: 'sacrifice, kinship, vitality',
  primaryColors: 'deep crimson, arterial red',
  secondaryColors: 'rust brown, clot-black',
  accentColors: 'pale skin-tone, blood-drop silver-highlight',
  materials: 'blood, wet crimson mist, red iron',
  textures: 'misting-flowing liquid, veined-glow-under-skin, droplet-suspended',
  lighting: 'cool ambient contrasted by warm crimson under-glow from within the character, not from outside',
  motion: 'red mist rising, blood-droplets suspended, crimson pooling from the feet',
  shapes: 'ribbon-and-droplet, veined-branching, pooling',
  atmosphere: 'red mist, crimson particles suspended',
  symbolism: 'sacrifice, kin-bond, life-cost',
  avoid: 'orange fire flame (that is Fire), purple, dry-crackling',
});

const POISON = V({
  theme: 'corrosion, patient decay, warning',
  primaryColors: 'bile green, toxic purple',
  secondaryColors: 'sickly yellow, oil-slick shimmer',
  accentColors: 'venom-drip highlight',
  materials: 'venom, oil, corroded metal, sickly plant',
  textures: 'dripping miasma, corroding vapor, oil-slick swirl',
  lighting: 'sickly ambient, greenish underlight, no clean daylight',
  motion: 'rising miasma, venom drip, spreading vapor across the ground',
  shapes: 'creeping, seeping, curling downward',
  atmosphere: 'wilting plants, cracked earth, sickly-yellow sky',
  symbolism: 'slow ruin, patient revenge',
  avoid: 'clean bright colors, holy light, cheerful pastels',
});

const SPIRIT = V({
  theme: 'presence beyond flesh, memory, veil',
  primaryColors: 'pale blue, ghost white',
  secondaryColors: 'soul-glow silver, aqua-hint',
  accentColors: 'faint indigo',
  materials: 'ectoplasm, spirit-mist, veil-cloth',
  textures: 'translucent-wispy, ghost-transparent, mist-drift',
  lighting: 'pale cool ambient, glow from within thinning skin, no warm light',
  motion: 'wisps rising from the shoulders, spectral silhouettes drifting behind',
  shapes: 'ribbon-and-wisp, half-there silhouettes, drifting-tendril',
  atmosphere: 'mist rolling across the ground, spectral echoes',
  symbolism: 'memory, veil, presence-past-death',
  avoid: 'solid opaque, warm colors, fire',
});

const LIGHT = V({
  theme: 'clarity, revelation, radiance',
  primaryColors: 'pure gold, white radiance',
  secondaryColors: 'soft yellow, prism-rainbow spectrum',
  accentColors: 'beam-sparkle',
  materials: 'refracted light, prism-crystal, sunbeam',
  textures: 'beam-and-ray, refracted prism, radiant halo, sparkle',
  lighting: 'brilliant direct radiance, prism refraction, gold-from-within — daylight max',
  motion: 'beams from the eyes/chest/skin, refracted rainbow around body, sunburst behind the head',
  shapes: 'radial-beam, sunburst, prismatic',
  atmosphere: 'light spilling from the ground beneath the feet, sky bright',
  symbolism: 'truth revealed, clarity of purpose',
  avoid: 'dark, moody, shadow, purple/black',
});

const SOUND = V({
  theme: 'resonance, vibration, presence-through-air',
  primaryColors: 'electric cyan, sonic magenta',
  secondaryColors: 'waveform white, neon purple',
  accentColors: 'concentric-ripple gold',
  materials: 'resonance rings, waveform lines, drum-skin, string, brass horn',
  textures: 'concentric ripple, waveform line, vibration blur, resonance echo',
  lighting: 'cyan-magenta underglow, no warm ember, edge-lit by the pulse of the wave',
  motion: 'concentric shock waves emanating outward, resonance rings around head and chest, vibration blur at the hands',
  shapes: 'concentric-ring, waveform, radial-pulse',
  atmosphere: 'sound waves rippling across the ground, waveform cutting through the frame; occasional fantasy-styled speaker-tower, stone amps, drum-kit, or lute in the background as playful world-building',
  symbolism: 'unheard truth, resonance, memory-through-song',
  avoid: 'ABSOLUTELY NEVER fire or flame or any warm-red glow, NEVER red aura',
});

const ASH = V({
  theme: 'aftermath, memory of heat, buried grief',
  primaryColors: 'charcoal gray, soot black',
  secondaryColors: 'ember orange (only in cracks), bone white',
  accentColors: 'burnt-paper edges',
  materials: 'ash, charred bone, spent coal, burnt scroll',
  textures: 'dust-and-cinder, charred cracking, falling flake, soot-smear',
  lighting: 'muted ambient with only tiny ember-red seeping through cracks, not open flame',
  motion: 'gray dust rising, ash flaking off, embers drifting slowly through the air',
  shapes: 'crumbling, drifting-flake, cracked-open',
  atmosphere: 'scorch marks and gray ash spreading, ash-fall through the sky',
  symbolism: 'what remains after fire, memory of loss',
  avoid: 'pure open flame (that is Fire), wet colors, clean colors',
});

const HOLY = V({
  theme: 'sacred duty, divine mandate, radiant guardianship',
  primaryColors: 'radiant gold, white radiance',
  secondaryColors: 'flame-halo yellow, sacred rose',
  accentColors: 'stained-glass jewel-tone',
  materials: 'living light, gold-leaf halo, feather, sacred flame, prayer-cloth',
  textures: 'sacred-fire, feathery-light, radiant-beam, gold-glow',
  lighting: 'golden radiant beam from above, gold-from-within the skin, cathedral shafts of light',
  motion: 'halo burning around the head, gold light through the skin, feathery light drifting',
  shapes: 'symmetrical, radiant, halo-crowned',
  atmosphere: 'sacred fire rising from the ground at the feet, pillars of light behind them',
  symbolism: 'divine mandate, sacred watch',
  avoid: 'dark, moody, unholy purple',
});

const VOID = V({
  theme: 'unmaking, cosmic silence, reality-tear',
  primaryColors: 'starless absolute black, reality-tear purple',
  secondaryColors: 'antimatter violet, anti-white where reality breaks',
  accentColors: 'edge-glitch iridescent',
  materials: 'anti-matter shear, ripped reality, non-euclidean geometry',
  textures: 'warping-reality, shadow-tear, non-euclidean fracture, antimatter shimmer',
  lighting: 'ambient light BEING EATEN by the character, negative-light where the void tears open, no source',
  motion: 'darkness eating the light around the body, shadow tendrils rising from the ground, gravity distorted',
  shapes: 'fractured, non-euclidean, torn-and-warping',
  atmosphere: 'reality warping and cracking at the edges of the frame, void tearing open behind them showing more black',
  symbolism: 'unmaking, the end of things',
  avoid: 'ABSOLUTELY NEVER any warm color, NEVER fire, NEVER gold, NEVER organic natural light',
});

const TIME = V({
  theme: 'inevitability, memory, unspooling',
  primaryColors: 'sepia gold, hourglass brown',
  secondaryColors: 'chrono-blue accent, faded-vintage',
  accentColors: 'sand-grain highlight',
  materials: 'sand, hourglass glass, weathered brass, chronographs',
  textures: 'sand-suspended, clock-glyph, fading-motion-blur, film-grain',
  lighting: 'golden-sepia diffuse light, time-distortion blur, no harsh direct source',
  motion: 'sand or petals suspended mid-fall around the whole character, temporal distortion blur',
  shapes: 'hourglass-curve, spiral, suspended-fall',
  atmosphere: 'clock and hourglass symbols glowing in the air, ground cracked with time-runes',
  symbolism: 'inevitability, layered memory',
  avoid: 'modern digital clocks, neon, fresh vibrant colors',
});

const COSMIC = V({
  theme: 'vastness, distance, star-forged wonder',
  primaryColors: 'deep indigo, starlight white',
  secondaryColors: 'nebula purple, galactic pink',
  accentColors: 'starlight cyan, gold-star sparkle',
  materials: 'stardust, nebula gas, gravitational lens, meteorite',
  textures: 'constellation-and-nebula, gravity-warp, stardust-shimmer, galaxy-swirl',
  lighting: 'starlight from all directions, gravitational lensing distortion, no daylight',
  motion: 'constellation patterns lit under the skin, gravity-warped debris and stars orbiting the character',
  shapes: 'orbiting-swirl, spiraling-galaxy, starburst',
  atmosphere: 'stars and cosmic dust sparkling around the frame, night sky visible through the ground beneath their feet, nebula behind them',
  symbolism: 'awe, distance from mortal concern',
  avoid: 'earth-bound bright colors, fire, organic natural',
});

const TECH = V({
  theme: 'invention, control-through-craft, integrated systems',
  primaryColors: 'circuit cyan, hologram teal',
  secondaryColors: 'neon white, matrix green accent',
  accentColors: 'HUD-amber warning',
  materials: 'brushed alloy panels, hologram-plate, fiber optic, embedded circuitry',
  textures: 'circuit-line, hologram-projection, pixel-grid, neon-glow hard-edge',
  lighting: 'clean cobalt luminance, embedded-circuit underglow, HUD glow across the face',
  motion: 'glowing circuit lines under the skin, holographic projections floating around the hands, energy weapons materializing',
  shapes: 'geometric-hardline, circuit-branching, hex-grid',
  atmosphere: 'holographic projections and tech-grid overlay, digital rain-drift',
  symbolism: 'craft, mastery through system',
  avoid: 'organic natural, fire, wet-water, steampunk gears, medieval leather',
});

const PSYCHIC = V({
  theme: 'mind reaching outward, unseen influence, empath',
  primaryColors: 'violet purple, pink magenta',
  secondaryColors: 'telepathic lavender, iridescent shimmer',
  accentColors: 'eye-glow amethyst',
  materials: 'thought-lattice, telepathic-aura, floating-object array',
  textures: 'aura-halo, orbiting-debris, telekinetic ripple, prismatic shift',
  lighting: 'purple-pink aura around the head, subtle interior lavender glow, no warm ember',
  motion: 'floating debris and objects orbiting the character at multiple heights, telekinetic ripples in the air',
  shapes: 'concentric-halo, orbiting-lattice',
  atmosphere: 'telekinetic ripples cutting through the air, distant objects hovering',
  symbolism: 'unseen touch, mental precision',
  avoid: 'red/warm colors, gold radiance, fire',
});

const MOON = V({
  theme: 'watchful cycle, tide-caller, silver silence',
  primaryColors: 'silver white, midnight blue',
  secondaryColors: 'moonstone pale, pearl luminescence',
  accentColors: 'silver-star pinpoint',
  materials: 'moonstone, silver, still water, moon-glass',
  textures: 'silvery-glow, crescent-halo, moonstone-pearl, soft-luminous',
  lighting: 'moonlight-silver top light, cool ambient, no warm sun',
  motion: 'moonlight-silver light through the skin and hair, crescent halo behind the head, tide-motion in the air',
  shapes: 'crescent, orbital, calm-still',
  atmosphere: 'silver aura wrapping the character, the moon itself huge behind them, night sky, silvery ground beneath',
  symbolism: 'cycles, watchful presence, tide',
  avoid: 'warm colors, gold, daylight, fire',
});

const DREAM = V({
  theme: 'shifting-truth, memory-that-was-not, iridescence',
  primaryColors: 'iridescent pastel spectrum — soft pink, mint, lavender, peach',
  secondaryColors: 'prism-shift accent',
  accentColors: 'butterfly-wing highlight',
  materials: 'dream-fog, memory-ribbon, butterfly, symbol-motif',
  textures: 'hazy-iridescent, soft-focus, butterfly-and-symbol, dream-fog',
  lighting: 'soft diffuse pastel-shift, no strong direction, glow-from-nowhere',
  motion: 'iridescent haze wrapping the whole character, dream-symbols and butterflies floating throughout, pastel prismatic color shift across the body',
  shapes: 'unreal soft edges, dissolving silhouette, drifting-symbol',
  atmosphere: 'dream-fog rising from the ground, butterflies and symbols drifting throughout the frame, background dissolving into color',
  symbolism: 'unreliable memory, wish-lit truth',
  avoid: 'dark/harsh, solid opaque, fire, moody-realistic',
});

/**
 * INFERNAL — Fallen-Seraph-exclusive element (P4 Seraph corruption arc,
 * art-director draft approved verbatim by Raheem 2026-07-20). Assigned
 * only by alignment transmutation — never appears in the forge picker.
 */
const INFERNAL = V({
  theme: 'damnation, corrupted radiance, sinister regality, contained hellfire, oath-broken glory',
  primaryColors: 'obsidian black, void black, midnight black',
  secondaryColors: 'blood orange, dried-blood crimson, ember red',
  accentColors: 'sulfur yellow, molten gold-in-cracks, brimstone bronze',
  materials: 'sculpted obsidian plate, black basalt, brimstone, fissured armor with molten veins beneath, spined black iron, sacrilegious relic-metal, cracked onyx',
  textures: 'lava-fissured armor plates, hairline molten cracks glowing through black metal, matte-black lacquer, veined obsidian, soot-etched engravings, cooled-glass sheen',
  lighting: 'weapon-bound firelight, glow that BLEEDS UP through cracks in black armor and stone (never bathes the whole subject), sharp rim-light on obsidian edges, dark negative space dominates, cold ambient with hot linework — NOT warm ember floodlight',
  motion: 'slow curling ember-smoke rising from blade edge, controlled fire wreathing a single weapon or hand, drifting cinders, contained not billowing',
  shapes: 'architectural spikes, sculpted crown-like silhouettes, bladed armor plates, thorn-shaped pauldrons, cathedral-gothic angularity, containment vessels for the flame',
  atmosphere: 'lava-cracked ground beneath the subject, thin sulfur haze, still and heavy air, ash falling like snow, cathedral-of-the-fallen stillness',
  symbolism: 'oaths broken, fallen grace, regal wrath, judgment inverted, purification turned to punishment, priesthood in ruin',
  avoid: 'generic orange fire, campfire, torch, phoenix wings, wildfire, forge sparks, berserker rage flames, whole-body engulfment, warm ember lighting, dancing naturalistic flame tongues, magma landscapes as backdrop, lava rivers, volcanic eruption, pure white halo, angelic golden radiance, dove wings, holy light rays, cartoon devil horns, generic demon skulls, red-and-black checkerboard',
});

/**
 * ---------- Canonical map ----------
 */
export const ELEMENT_VISUAL_LANGUAGE: Record<ElementName, ElementVisual> = {
  Fire: FIRE,
  Water: WATER,
  Earth: EARTH,
  Wind: WIND,
  Ice: ICE,
  Lightning: LIGHTNING,
  Stone: STONE,
  Storm: STORM,
  Nature: NATURE,
  Beast: BEAST,
  Blood: BLOOD,
  Poison: POISON,
  Metal: METAL,
  Spirit: SPIRIT,
  Shadow: SHADOW,
  Light: LIGHT,
  Sound: SOUND,
  Ash: ASH,
  Holy: HOLY,
  Void: VOID,
  Time: TIME,
  Cosmic: COSMIC,
  Tech: TECH,
  Psychic: PSYCHIC,
  Moon: MOON,
  Dream: DREAM,
  Infernal: INFERNAL,
};

/**
 * Assemble a compact ELEMENT VISUAL LOCKDOWN block for a Leonardo prompt.
 * Emphasises lighting + materials + textures + motion (Bible principle:
 * "recognizable even without color") while still calling out the color
 * palette. Kept dense — the caller may truncate.
 */
export function assembleElementLockdown(name: ElementName): string {
  const v = ELEMENT_VISUAL_LANGUAGE[name];
  return [
    `LIGHTING: ${v.lighting}`,
    `MATERIALS: ${v.materials}`,
    `TEXTURES: ${v.textures}`,
    `MOTION: ${v.motion}`,
    `SHAPES: ${v.shapes}`,
    `ATMOSPHERE: ${v.atmosphere}`,
    `COLORS: ${v.primaryColors} (primary), ${v.secondaryColors} (secondary), ${v.accentColors} (accent)`,
    `AVOID: ${v.avoid}`,
  ].join('. ');
}
