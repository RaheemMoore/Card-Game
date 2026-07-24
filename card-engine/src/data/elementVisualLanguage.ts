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
  materials: 'ocean water, clear glass, living coral, pearl',
  textures: 'rippled surface, foam-crest, cool condensation sheen',
  lighting: 'caustic refraction, soft blue reflection, transparent glow — NO warm light',
  motion: 'flowing lateral currents, cresting waves, splashing droplet-spray',
  shapes: 'curved, flowing, spiral, cresting',
  atmosphere: 'fog, rain, humidity',
  symbolism: 'healing, adaptability, wisdom, persistence',
  avoid: 'flat blue energy, generic magic swirl, plain blue glow, blue fire',
});

const EARTH = V({
  theme: 'strength, endurance, stability, ancient power',
  primaryColors: 'stone gray, granite, brown',
  secondaryColors: 'moss green, sandstone, clay',
  accentColors: 'gold, emerald, quartz',
  materials: 'granite plates, boulder chunks, raw gemstone, buried fossils, slate',
  textures: 'chunky rocky-plate, mineral-vein pits, weathered and cracked',
  lighting: 'soft ambient, muted highlights on plate faces, dust-diffused — NO warm ember light',
  motion: 'heaving stone plates, rising rock pillars, rock-fists forming, ground tremor',
  shapes: 'blocky-heavy, columnar, angular',
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

// LIGHTNING merged into STORM (2026-07-23 element-restructure batch).
const ICE = V({
  theme: 'control, silence, precision, preservation',
  primaryColors: 'ice blue, white',
  secondaryColors: 'pale cyan, frost gray',
  accentColors: 'crystal blue',
  materials: 'glacial ice, hard frost, snow-pack, faceted crystal',
  textures: 'faceted frost-fracture, cracked glass-ice, rimed surface',
  lighting: 'cold refracted sparkle, blue subsurface, sharp specular on facets — NO warm ember light',
  motion: 'ice crystallizing OUTWARD in sharp spikes, drifting snow, freezing mist creeping',
  shapes: 'angular, faceted, spike-and-shard',
  atmosphere: 'blizzard, frozen fog',
  symbolism: 'discipline, preservation',
  avoid: 'plain blue ice cubes, cartoon snow, blue fire',
});

const SHADOW = V({
  theme: 'mystery, fear, secrets, the unknown',
  primaryColors: 'black, midnight purple',
  secondaryColors: 'dark gray, indigo',
  accentColors: 'violet, crimson',
  materials: 'living ink, velvet smoke, polished obsidian',
  textures: 'velvet ink-smoke, matte light-drinking black, tar-slick sheen',
  lighting: 'rim-light only, deep low-key, light swallowed at the edges — NO warm ember light',
  motion: 'low-drifting smoke, crawling shadow-tendrils reaching outward, darkness pooling',
  shapes: 'flowing, tendril, formless-crawling',
  atmosphere: 'eclipse, fog, silence',
  symbolism: 'secrets, fear, death',
  avoid: 'pure black silhouettes, purple fire everywhere',
});

const METAL = V({
  theme: 'craftsmanship, strength, precision, technology',
  primaryColors: 'steel, iron, silver',
  secondaryColors: 'bronze, brass',
  accentColors: 'gold, copper',
  materials: 'forged steel, damascus steel, iron chains, interlocking gears, bladed alloy',
  textures: 'brushed hammer-marks, engraved etching, riveted plate',
  lighting: 'hard cool specular reflections, metallic sheen — NO warm ember light, NO fire glow, cool metallic reflectivity only',
  motion: 'rotating gears, whirling blades, chains lashing, sparks flying off grinding metal',
  shapes: 'mechanical, rigid, geometric-bladed',
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

// STONE merged into EARTH (2026-07-23 element-restructure batch).
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
  materials: 'arterial blood, clotting pools, glistening red iron',
  textures: 'glossy wet sheen, syrup-thick viscous drips, beading droplets',
  lighting: 'dark translucent red, subsurface under-skin glow, wet specular highlights',
  motion: 'coiling ribbons, spraying arcs, hovering droplets, slow DOWNWARD drip',
  shapes: 'tendrils, ribbons, spheres, coiling curves',
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

// ASH removed (2026-07-23 — Raheem: a byproduct of Fire, not its own element).
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

// 2026-07-23 rework (Raheem + art-prompt-director): COSMIC is now MONK-EXCLUSIVE
// — the Peace-path culmination, the fantasy-Buddha transcended into a serene
// celestial COSMIC BEING. Distinct from Void (starless black reality-tear),
// Moon (silver cycle), Light/Holy (gold beams + halo). Cosmic is FULL of stars
// and color, a calm vast starfield — NOT a caster blasting from the hands.
const COSMIC = V({
  theme: 'transcendence, star-forged serenity, the enlightened mind gone vast',
  primaryColors: 'deep-space indigo, void-blue black, starlight white',
  secondaryColors: 'nebula violet, galactic rose-pink, deep teal cloud',
  accentColors: 'gold-star sparkle, cyan pinpoint-stars, constellation-line silver',
  materials: 'deep-space starfield, spiral galaxies, glowing nebula-gas clouds, orbiting stars and cosmic dust, a galaxy-disc halo, constellation-lines under the skin',
  textures: 'grainy stardust shimmer, soft cloudy nebula-gas, pin-sharp starfield speckle, faint constellation-lines glowing beneath translucent skin, gravity-lens ripple',
  lighting: 'soft cosmic self-illumination from within, starlight glinting from all directions, a serene celestial nimbus glow behind the head — NO daylight, NO warm sun, NOT a harsh beam',
  motion: 'stars and cosmic dust slowly ORBITING the figure, a great galaxy-disc turning behind the head as a cosmic halo, constellation-lines drifting lit beneath the skin, nebula clouds curling gently — calm and vast, NOT a violent burst',
  shapes: 'a serene ringed cosmic nimbus / galaxy-disc halo, orbiting-star rings, spiraling-galaxy swirls, a soft lotus-and-orbit symmetry',
  atmosphere: 'a deep-space starfield and glowing nebulae filling the whole background, galaxies wheeling slowly, the ground beneath the feet opening onto the night sky, cosmic dust sparkling through the frame',
  symbolism: 'enlightenment become vast, serenity beyond mortal concern, the self dissolved into the cosmos',
  avoid: 'earth-bound bright daylight, fire, warm orange, organic nature; the starless ABSOLUTE-black reality-tear of Void (Cosmic is FULL of stars and color, not empty); silver moon-only palette (that is Moon); gold radiant beams and feathered halo (that is Light/Holy); angel wings; a menacing star-wizard or sorcerer casting from the hands (Cosmic is a SERENE seated/standing enlightened being, never a caster)',
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
// Bone — Necromancer-exclusive (2026-07-22). The physical architecture of the
// dead: bone/skull/marrow constructs. Distinct from Ash (soot/grief), Spirit
// (ectoplasm/souls), Shadow (ink/dark). Manifests as assembling skeletal
// structures, NOT wet gore.
const BONE = V({
  theme: 'permanence of death, the frame beneath the flesh, memento mori',
  primaryColors: 'bone white, aged ivory, grave-gray',
  secondaryColors: 'marrow cream, tooth-yellow, ash-white',
  accentColors: 'soul-light blue-green socket glow',
  materials: 'bone, skull, rib, vertebrae, marrow, calcified relic, tooth',
  textures: 'porous bone, hairline bone-cracks, polished ivory, calcified crust',
  lighting: 'cold pale under-glow from within the bone, soul-light from the eye-sockets — NO warm light',
  motion: 'bones assembling and rattling, skeletal constructs forming, marrow-dust drifting, bone-shards orbiting',
  shapes: 'skeletal, ribbed, vertebral, interlocking-bone',
  atmosphere: 'drifting bone-dust, floating skulls, ossuary architecture, rattling bones',
  symbolism: 'permanence of death, the frame beneath the flesh, memento mori',
  avoid: 'fleshy gore, wet blood (that is Blood), warm colors, fire, cartoon googly-eyed skulls',
});

// Nocturne — Vampire-exclusive (2026-07-22). Dominion of eternal night: a
// personal blood-moon midnight. NOT Shadow (fear-dark) and NOT Moon (silver
// cycle) — this is crimson-into-black, the devoured sun, wheeling bats.
const NOCTURNE = V({
  theme: 'dominion of eternal night, the devoured sun, blood-moon sovereignty',
  primaryColors: 'blood-moon crimson, deep crimson-black, midnight void-black',
  secondaryColors: 'dried-blood maroon, bruise-purple, star-choked black',
  accentColors: 'blood-moon red-glow, pale bat-silhouette gray',
  materials: 'blood-moon light, night-mist, wheeling bats, red-black sky, leather bat-wing membrane',
  textures: 'velvet red-black gloom, drifting mist, moon-glow bleed, membranous wing-veining',
  lighting: 'deep red blood-moon backlight, crimson rim on a field of black — NO warm daylight, the sun is devoured',
  motion: 'bats wheeling and swirling, crimson mist coiling upward, the blood-moon rising, night bleeding across the sky',
  shapes: 'crescent blood-moon, wheeling-bat swarm, billowing-mist, wing-silhouette',
  atmosphere: 'a huge blood-moon dominating the sky, gothic spires in silhouette, a swirl of bats, perpetual crimson midnight',
  symbolism: 'the eternal night, sovereignty over the dark, the sun devoured',
  avoid: 'warm daylight, blue night sky, silver moon (that is Moon), cheerful stars, orange fire, campfire glow',
});

// Sanguine — Vampire-exclusive (2026-07-24, Raheem). CRYSTALLIZED blood: the
// vampire's vitality hardened into faceted ruby/garnet crystal. Where Blood is
// WET and flowing, Sanguine is HARD, sharp, refractive gem — a jewel, not a pool.
const SANGUINE = V({
  theme: 'crystallized blood, vitality hardened to jewel, gemstone sovereignty',
  primaryColors: 'deep garnet crimson, ruby red, dark blood-crystal',
  secondaryColors: 'wine-dark facet-shadow, dried-blood maroon, black-red crystal core',
  accentColors: 'ruby glint, crimson refraction-spark, rose-gold crystal edge',
  materials: 'faceted blood-crystal, hardened crimson glass, garnet and ruby gemstone, crystallized arterial shards, blood turned to jewel and spur',
  textures: 'sharp crystalline facets, glassy blood-gem sheen, refractive ruby depth, fractured crystal edges, polished garnet',
  lighting: 'deep translucent red refracting THROUGH crystal facets, internal ruby glow, sharp specular glints on faceted edges — NOT a wet liquid sheen (that is Blood)',
  motion: 'faceted ruby crystal fragments hovering and slowly rotating, crimson light refracting through floating shards, sharp blood-crystal spurs growing hard and angular from the body, brittle facets catching the light — crystallizing and setting SOLID, never flowing or dripping',
  shapes: 'faceted crystal shards, angular ruby spurs, geometric gem-clusters, crystalline spikes and lattices',
  atmosphere: 'floating blood-crystal shards suspended in the air, refracted crimson light scattering, a cathedral of dark-red crystal behind',
  symbolism: 'vitality made permanent, blood hardened into power, the crystallized jewel of the bloodline',
  avoid: 'wet flowing or dripping liquid blood and glossy blood pools (that is Blood — Sanguine is HARD faceted crystal, dry and solid), molten glow, lava, obsidian or volcanic glass (that is Infernal), blood-moon or night sky (that is Nocturne), red devil skin, horns, orange fire, purple, soft organic curves',
});

// Lunar — Lycanthrope-exclusive RARE (2026-07-22). The SUPERIOR version of Moon:
// where Moon is calm silver GLOW, Lunar is BLAZING divine silver-FIRE — the Moon
// Goddess's blessing, a full-moon corona and lunar runes. Must read as more
// powerful/radiant than Moon at a glance.
const LUNAR = V({
  theme: "divine lunar sovereignty, the Moon Goddess's blessing, silver ascendance",
  primaryColors: 'blazing silver-white, radiant moon-pearl, luminous platinum',
  secondaryColors: 'deep midnight-blue field, prismatic halo-shimmer',
  accentColors: 'silver-fire spark, lunar-rune glow',
  materials: 'silver moonfire, radiant lunar corona, blessed silver, moon-glass, glowing lunar runes',
  textures: 'blazing silver-flame, radiant corona-glow, engraved lunar-rune, liquid-silver sheen',
  lighting: "BLAZING silver-white radiance from within — far brighter than Moon's soft glow — a full-moon corona haloing the whole figure, divine backlight",
  motion: 'silver moonfire wreathing the body, a great full moon flaring behind, lunar runes orbiting, silver flame licking upward',
  shapes: 'radiant full-disc, corona-burst, rune-ring, blazing crescent',
  atmosphere: 'an enormous blazing full moon filling the sky, silver-fire raining, lunar runes in the air, divine silver light flooding the scene',
  symbolism: "the Goddess's chosen, divine lunar authority, ascension",
  avoid: 'soft dim moonlight (that is Moon), warm colors, sun-gold, plain calm silver glow — Lunar BLAZES, divine and radiant, never calm',
});

// Tech-archetype rare family (2026-07-22) — engineered/machine power. Shared by
// Mech Pilot + Android. Each must read as CONTAINED, precise, machine-made —
// never organic, never open flame.
const PLASMA = V({
  theme: 'engineered energy sovereignty, the caged star, raw power mastered',
  primaryColors: 'blazing white-blue, electric violet, plasma-cyan',
  secondaryColors: 'containment-ring gold, deep reactor-blue',
  accentColors: 'white-hot core, arc-violet spark',
  materials: 'a caged plasma-sphere held in glowing magnetic RINGS, plasma-blades, a plasma-cannon, molten ionized energy',
  textures: 'roiling contained plasma inside metal containment rings, energy-field shimmer, white-hot core',
  lighting: 'a blazing white-blue plasma core held INSIDE visible magnetic rings — CONTAINED not loose, hard energy-rim — NOT free lightning bolts, NOT open orange flame',
  motion: 'plasma roiling WITHIN caged magnetic rings, plasma-blades ignited, a plasma-cannon discharging a bolt, contained not sprayed',
  shapes: 'glowing containment-rings around a caged plasma-sphere, plasma-blade, cannon-muzzle',
  atmosphere: 'orbiting magnetic containment rings holding caged plasma, a reactor-sun core',
  symbolism: 'mastered power, the star in a cage',
  avoid: 'open orange campfire flame (that is Fire), single yellow lightning bolt (that is Storm), wet colors, organic',
});

const NANITE = V({
  theme: 'a living swarm of tiny machines, endless self-remaking',
  primaryColors: 'liquid silver, chrome-gray, tech-cyan glint',
  secondaryColors: 'matte gunmetal, hologram-teal',
  accentColors: 'circuit-cyan glint, red sensor-pinpoints',
  materials: 'a huge SWARM of MANY small and medium chrome robots (NO single big robot or mech), liquid-metal nanite dust',
  textures: 'a dense crawling swarm of many distinct small and medium robots, granular chrome, individual machines visible',
  lighting: 'cool metallic sheen with many tiny red/cyan sensor-glints across the swarm — no warm light',
  motion: 'a huge swarm of many small and medium robots crawling, flying and assembling in mid-air, dissolving and reforming — the SWARM is the whole presence, not one big machine',
  shapes: 'a dense cloud of many small and medium robots coalescing and scattering, no single large silhouette',
  atmosphere: 'the air FILLED with a huge swarm of many small and medium robots swirling around the character',
  symbolism: 'the machine that never dies, endless remaking',
  avoid: 'a single large robot or mech, one solid body, a smooth glow, warm colors, organic — Nanite is a SWARM of MANY small and medium robots, NEVER one big machine',
});

// Prism — Android-exclusive (2026-07-22). The synthetic soul as refracted light
// + volumetric HOLOGRAMS. Must read STRIKING and CLEARLY MANUFACTURED — iridescent
// spectrum + projected holo-constructs, NOT gold holy light (Light/Holy) and NOT
// flat circuit-cyan panels (Tech).
const PRISM = V({
  theme: 'the synthetic soul made of refracted light, holographic radiance',
  primaryColors: 'iridescent rainbow-white, prismatic full-spectrum, holographic cyan-magenta',
  secondaryColors: 'refracted spectrum bands, pearl-white',
  accentColors: 'sharp spectral glint, holo-glyph glow',
  materials: 'refracted spectrum light, prismatic crystal facets, VOLUMETRIC HOLOGRAMS, projected light-constructs, floating holo-glyphs',
  textures: 'iridescent refraction, crisp holographic scanlines, faceted prism-crystal, spectral shimmer',
  lighting: 'brilliant white light SPLITTING into rainbow spectra, holographic glow from within, sharp prismatic beams — NOT warm, NOT gold holy light',
  motion: 'beams of white light splitting into rainbow spectra, volumetric holograms and data-mandalas assembling in the air, projected wings of light unfurling, spectral glyphs orbiting the figure',
  shapes: 'prismatic facets, geometric holo-constructs, refracted spectrum-fans, sacred-geometry data-mandalas, projected light-wings',
  atmosphere: 'the air alive with floating holographic constructs and refracted rainbow light, spectral geometry projected all around them',
  symbolism: 'the manufactured soul, light given structure, the ghost in beautiful machine-light',
  avoid: 'gold holy radiance (that is Light/Holy), flat circuit-cyan tech panels (that is Tech), warm colors, fire — Prism is IRIDESCENT SPECTRUM + volumetric HOLOGRAMS, striking and clean',
});

export const ELEMENT_VISUAL_LANGUAGE: Record<ElementName, ElementVisual> = {
  Fire: FIRE,
  Water: WATER,
  Earth: EARTH,
  Wind: WIND,
  Ice: ICE,
  Storm: STORM,
  Nature: NATURE,
  Beast: BEAST,
  Blood: BLOOD,
  Poison: POISON,
  Metal: METAL,
  Spirit: SPIRIT,
  Shadow: SHADOW,
  Light: LIGHT,
  Holy: HOLY,
  Void: VOID,
  Time: TIME,
  Cosmic: COSMIC,
  Tech: TECH,
  Psychic: PSYCHIC,
  Moon: MOON,
  Dream: DREAM,
  Infernal: INFERNAL,
  Bone: BONE,
  Nocturne: NOCTURNE,
  Sanguine: SANGUINE,
  Lunar: LUNAR,
  Plasma: PLASMA,
  Nanite: NANITE,
  Prism: PRISM,
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
