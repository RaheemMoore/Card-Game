# Image Engine Reference

> **GENERATED FILE — do not edit by hand.** This is a view of the canonical
> code modules under `card-engine/src`. Regenerate with `npm run docs:engines`.
> Last generated: 2026-07-22.

## How the picture is built

The Image Engine is deterministic: `services/portraitAssembler.ts` composes the
Leonardo `{portraitPrompt, negativePrompt}` from a `CharacterSheet` (identity
substrate + render context + resolved motifs). It never receives the lore text,
so it cannot corrupt the character. Shared prompt constants live in
`services/imageEngine/imageConstants.ts`.

The master negative list (`BASE_NEGATIVE`) carries **265** terms
(modesty, anti-sexualization, per-archetype bans, cross-element bans, rank-continuity bans).

## Element Visual Language

Per-element identity (`data/elementVisualLanguage.ts`). Every element must read
even without color.

| Element | Theme | Primary colors |
| --- | --- | --- |
| Fire | passion, power, destruction, rebirth, forge, heat | crimson, scarlet, deep orange, gold |
| Water | adaptability, flow, patience, life, depth, pressure | ocean blue, deep teal, aqua |
| Earth | strength, endurance, stability, ancient power | stone gray, granite, brown |
| Wind | freedom, motion, unseen presence, breath | jade green, pale silver-green |
| Ice | control, silence, precision, preservation | ice blue, white |
| Lightning | speed, precision, innovation, energy | electric blue, white |
| Stone | weight, patience, ancient guard | granite gray, umber, slate |
| Storm | chaos, wrath, sky-fury | steel gray, electric blue |
| Nature | growth, life, balance, evolution | DEEP forest green, deep emerald, moss-canopy green — DARKER and RICHER than Wind-green; this is the color of a shaded forest floor |
| Beast | primal presence, wild kinship, feral will | tawny brown, forest green, bone white |
| Blood | sacrifice, kinship, vitality | deep crimson, arterial red |
| Poison | corrosion, patient decay, warning | bile green, toxic purple |
| Metal | craftsmanship, strength, precision, technology | steel, iron, silver |
| Spirit | presence beyond flesh, memory, veil | pale blue, ghost white |
| Shadow | mystery, fear, secrets, the unknown | black, midnight purple |
| Light | clarity, revelation, radiance | pure gold, white radiance |
| Sound | resonance, vibration, presence-through-air | electric cyan, sonic magenta |
| Ash | aftermath, memory of heat, buried grief | charcoal gray, soot black |
| Holy | sacred duty, divine mandate, radiant guardianship | radiant gold, white radiance |
| Void | unmaking, cosmic silence, reality-tear | starless absolute black, reality-tear purple |
| Time | inevitability, memory, unspooling | sepia gold, hourglass brown |
| Cosmic | vastness, distance, star-forged wonder | deep indigo, starlight white |
| Tech | invention, control-through-craft, integrated systems | circuit cyan, hologram teal |
| Psychic | mind reaching outward, unseen influence, empath | violet purple, pink magenta |
| Moon | watchful cycle, tide-caller, silver silence | silver white, midnight blue |
| Dream | shifting-truth, memory-that-was-not, iridescence | iridescent pastel spectrum — soft pink, mint, lavender, peach |
| Infernal | damnation, corrupted radiance, sinister regality, contained hellfire, oath-broken glory | obsidian black, void black, midnight black |

## Per-archetype visual sources

### Barbarian

**Visual DNA** (bible §7): Inherited objects, practical silhouettes, visible repair, regional adaptation, layered materials, role-specific tools, and evidence of duty, mourning, travel, craft, and survival.

**Avoid**: Exposed muscle, roaring poses, fur armor, giant axes, bodybuilder anatomy as defaults.

**Symbol & material**: Blackened iron (endurance, protection, inherited burden). Aged silver (memory, witness, mourning, authority). Blood-red thread, cloth, enamel, or paint (sacrifice, kinship, oath, vengeance). Leather (adaptation, travel, repair). Wood (home, ancestry, regional craft). Bone, horn, tooth, shell (remembrance and respectful use). Stone (place, burial, permanence, guardianship). Woven material (communal labor and portable record). — Clan sigils, oath knots, name-marks, mourning cloth patterns, regional weaving, family beads, ancestor totems, portable altars.

**Rank evolution**:
- _Foundation_: Carries a legacy not yet fully understood.
- _Forged_: Has been changed by trials and earned greater trust.
- _Ascendant_: Becomes a living reference point who changes what the legacy will become.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- broad, thick, scarred, dense
- short and stocky
- tall and heavyset
- fat but immensely imposing
- lean and weather-beaten
- older and timeworn
- wide-hipped and powerful
- soft-bodied with enormous presence

**Non-human form** (imageConstants.ts): _(rooted mortal — no non-human form)_

**Weapons** (`data/archetypeWeapons.ts`):
- Ancestor Blade
- Oath Axe
- Guardian Spear
- Hearth Hammer
- Legacy Shield

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Ancestral Hearth Hall
- Storm-Beaten Highland Pass
- Burial-Stone Valley
- Ruined Border Village
- Oath-Gathering Circle

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Monk

**Visual DNA** (bible §7): Controlled posture, economical movement, repeated wear, practical clothing, training tools, carefully repaired items, and visible signs of a specific discipline.

**Avoid**: Lean-body requirements, shaved-head defaults, generic East Asian clothing, constant meditation poses, glowing fists.

**Symbol & material**: Worn cloth, repaired fabric, wood, bronze, clay, stone, paper, ink, thread, cord. — Open circles, balanced lines, knots, breath marks, beads, seals, bells, practice tallies, incomplete geometry.

**Rank evolution**:
- _Foundation_: Follows a discipline and depends heavily on instruction.
- _Forged_: Has internalized the discipline and adapts it under pressure.
- _Ascendant_: Becomes a living interpretation of the discipline and may teach a new path.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- compact and grounded
- soft-bodied but disciplined
- lean and controlled
- wiry and calloused
- heavyset with calm balance
- older and timeworn
- broad but gentle
- slight but intense

**Non-human form** (imageConstants.ts): _(rooted mortal — no non-human form)_

**Weapons** (`data/archetypeWeapons.ts`):
- Practice Staff
- Temple Spear
- Iron Fan
- Discipline Rings
- Open-Hand Gauntlets

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Dawn Practice Courtyard
- Mountain Stair Sanctuary
- Riverstone Meditation Ford
- Bell Tower During a Storm
- Archive of Disciplines

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Beastmaster

**Visual DNA** (bible §7): The Beastmaster and companion read as one relationship through shared wear, adapted equipment, mutual awareness, signs of care, biome-specific clothing, and visible agency from both partners.

**Avoid**: Random wolves, cages, leashes, domination poses, identical armor, treating the companion as background.

**Symbol & material**: Leather or hide when appropriate, woven cord, wood, shed materials, cloth, metal fittings, resin, wax, stone, mineral beads. — Paired marks, mirrored shapes, tracks, interlocking forms, migration lines, two-part tokens, knots completed by two ends.

**Rank evolution**:
- _Foundation_: The bond exists but communication and trust are still developing.
- _Forged_: Partners anticipate one another and share responsibility under pressure.
- _Ascendant_: The partnership becomes legendary because neither identity is diminished by the other.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- practical and weathered
- lean and sun-browned
- broad and fur-clad
- thick but mobile
- scar-marked and hardy
- compact and strong
- soft-bodied but rugged
- asymmetrical from field life

**Non-human form** (imageConstants.ts): beast-touched — fur patches along the arms and jaw, animal eyes (feline vertical pupils, wolf-yellow, or hawk-golden), claws instead of nails, a partial tail, ears that have shifted, a body caught mid-shape between human and their bonded species. BODY-TYPE PRESERVED: heavyset = bear-bonded thick-set beast-hybrid with heavy fur; gaunt = fox-bonded lean sinewy form; muscular = tiger-bonded powerful build; elderly = weathered grizzled beast-elder; the underlying body class from the identity block is kept, only the beast-features are added on top

**Weapons** (`data/archetypeWeapons.ts`):
- Pack Spear
- Trail Bow
- Beastguard Shield
- Fang Knives
- Totem Staff

**Companions** (`data/archetypeCompanions.ts`):
- a powerful bonded war-beast moving in step with them
- a great bonded flying beast wheeling overhead
- a lean bonded tracker-beast pacing at their side
- a massive guardian-beast shielding their flank
- a rare mythic beast half-seen in the mist

**Environments** (`data/archetypeEnvironments.ts`):
- Forest Rescue Clearing
- Wind-Carved Migration Route
- Cliffside Raptor Roost
- Snowbound Tracking Range
- Moonlit Pack Crossing

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Druid

**Visual DNA** (bible §7): Biome-specific materials, evidence the human form is a costume (bark showing at wrists or neck, moss on the skin, root-vein instead of blood-vein, leaves in the hair mid-motion, eyes the color of the grove they came from). At Foundation the human form is convincing but tells slip. At Forged the wood is visibly reclaiming the body. At Ascendant the character is mid-melding-into-tree or fully returned to root-and-canopy form.

**Avoid**: Universal antlers, green robes as costume-shorthand, leaf-cape stereotypes, "human wizard in nature colors," overlap with Beastmaster (Beastmasters bond with beasts; Druids ARE the forest).

**Symbol & material**: Living fibers, reeds, bark, wood, stone, clay, shells, seeds, fungi, glass vessels, soil pigments. — Spirals, branching networks, seasonal circles, seed forms, river lines, root patterns, growth rings.

**Rank evolution**:
- _Foundation_: The human form is convincing — a Druid walking the outside world as a mortal would. But tells slip through: leaves stuck in the hair, bark at the wrists, root-veins glimpsed under the skin. They still speak with wood and root but they mostly wear the person-shape.
- _Forged_: The grove is reclaiming them. Wood visibly grows on the arms and shoulders, moss on the neck, roots trailing at the feet. They can meld into any tree and re-emerge from any other tree in the same grove. Half-human, half-forest.
- _Ascendant_: They ARE the forest — a walking grove-being with canopy for hair, roots for legs, bark for skin, and wildlife nesting in their shoulders. Or mid-transformation, actively melding into a great tree with human form dissolving into wood. The grove speaks through them. They can call every root in a hundred miles.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- broad and rooted
- soft-bodied and ancient-feeling
- willow-thin and eerie
- older and gnarled
- fat and generous-looking
- compact and earthy
- long-limbed and forest-haunted
- physically ordinary but spiritually immense

**Non-human form** (imageConstants.ts): the human form is dissolving BACK INTO A TREE — bark covering the arms shoulders chest and half the face, roots trailing from the feet and fused into the ground, canopy-like hair grown into actual branches with leaves, moss and small ferns on the remaining skin, DEEP-GREEN eye-glow (darker than Wind-green — this is Nature-green, moss-and-forest-canopy green), mid-melding-into-a-tree or half-emerged from one. ALWAYS ACCOMPANIED BY WIND — Druids use wind as the visible expression of nature's authority; leaves, pollen, petals, and small twigs are always carried on a visible wind current spiraling around the tree-fusion; hair and cloak lifted by their OWN summoned wind. Druids are BORN FROM TREES and always RETURN TO TREES — the tree-body + wind-current together are the visible expression of that truth. They speak for the forest and are becoming it. BODY-TYPE PRESERVED: heavyset = thick oak-being with wide gnarled trunk-body; gaunt = willow-being with thin branching limbs; muscular = old-growth-being with massive root-arms; elderly = ancient tree-elder with weathered bark; the underlying body class is kept, only the tree-features layer over it

**Weapons** (`data/archetypeWeapons.ts`):
- Living Staff
- Thorn Sickle
- Grove Spear
- Briar Whip
- Spore Censer

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Heart-Grove Cathedral
- Root-Confluence Belowground
- Burned Grove Regrowth
- Winter-Sleep Hollow
- City Consumed by Roots

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Necromancer

**Visual DNA** (bible §7): Memorial objects, names, ledgers, reliquaries, spirit vessels, mourning cloth, funerary tools, scholarship, ritual, caretaking, investigation, and a visible relationship with the following spirit.

**Avoid**: Skeletal armor, skull-covered clothing, evil smiles, green smoke, corpse decoration, villain defaults.

**Symbol & material**: Aged paper, wax, darkened silver, bone used with purpose, stone, glass, mourning cloth, iron, ash, salt. — Names, broken circles, open doors, veils, empty chairs, unfinished lines, dates, connecting thread.

**Rank evolution**:
- _Foundation_: Has crossed the boundary enough to hear what others cannot.
- _Forged_: Carries the consequences of knowledge and can distinguish truth from obsession.
- _Ascendant_: Becomes an authority on death whose work changes how the living remember and grieve.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- gaunt and sleep-deprived
- delicate and pale or dark-skinned with striking contrast
- soft-bodied scholar
- hollow-eyed and narrow
- older and parchment-skinned
- physically unimposing but visually commanding
- sickly-looking but majestic
- refined and ritualized

**Non-human form** (imageConstants.ts): the Necromancer has SACRIFICED THEIR FLESH for greater power — flesh has been TRADED for BONE because bone is stronger. Not always fully human-shaped: half the body may be skeletal, the jaw may be bone-only, the ribs exposed with soul-light bleeding through, hollow eye sockets glowing with soul-light, spinal column exposed. Soul-light escapes through DIFFERENT SHAPES per card — a glowing hole through the chest, a glowing crack down the sternum, a glowing slash across the ribs, a jaw split open with light spilling out. The Necromancer STRAINS to maintain their post-life state — this exertion should be visible in the pose. IDENTITY PRESERVATION (CRITICAL for tier-up so the character does not become a stranger): the SKULL still carries the CHARACTER'S EXACT HAIR — same texture, same color, same style, same adornment — the hair grows through and around the bone. Where flesh has been sacrificed, SHADOWY PURPLE ETHEREAL MUSCLE-SUBSTITUTE (soft violet mist with the texture of muscle-fiber) wraps the exposed skeleton in the character's ORIGINAL body-mass silhouette; a heavyset Necromancer has THICK purple-shadow torso wrapping a broad rib-cage; a gaunt Necromancer has thin purple wisps between the bones; a muscular Necromancer has heavy purple-shadow limbs. Body type is preserved through this shadow-muscle even when the flesh is gone. Element visual (Void starless-black, Nature deep-green, Storm steel-gray-and-electric-blue, etc.) carries through by tinting the shadow-muscle and the soul-light bleeding from the wounds — the element color is IN the substance filling the skeleton. BODY-TYPE PRESERVED (CRITICAL): heavyset = THICK BONE-PLATE WARLORD with barrel-chest skeletal frame + heavy purple-shadow flesh-substitute + dense bone armor (NOT a gaunt warlock); gaunt = wispy spectral skeleton with translucent skin and jutting bones; muscular = huge bone-armored bruiser skeleton with heavy purple-shadow muscle; elderly = ancient death-elder with worn bones. The underlying body class from the identity block is kept — bone transformation LAYERS OVER the body type, does not replace it.

**Weapons** (`data/archetypeWeapons.ts`):
- Grave Scythe
- Reliquary Staff
- Soul Lantern
- Mourning Bell
- Epitaph Blade

**Companions** (`data/archetypeCompanions.ts`):
- armored skeleton warriors with rusted blades
- skeletal bone-archers with drawn bows
- silent hooded oathbound dead in tattered shrouds
- drifting translucent wraiths trailing soul-mist
- hulking stitched corpse-guards standing sentinel
- four-legged skeletal hound-beasts prowling on all fours (canine animals, NOT humanoid)
- flickering poltergeists rattling grave-debris in the air

**Environments** (`data/archetypeEnvironments.ts`):
- Rain-Soaked Cemetery District
- Archive of Last Testimonies
- Battlefield at First Dawn
- Ancestral Memory Court
- Veil-Breach Threshold

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Vampire

**Visual DNA** (bible §7): Preserved objects across eras, controlled presentation, subtle hunger, personal relics, restraint rituals, and evidence of time.

**Avoid**: Pale-skin defaults or any narrowing of ancestry/skin-tone diversity; universal youth or beauty as a rank reward; seductive or bare-skin posing (M5.7 modesty); daylight, direct sun, or noon settings; blood as sole personality. Capes, high collars, castle halls, blood-red/black palettes, and aristocratic sovereignty are PERMITTED at Forged/Ascendant when the narrative earns them.

**Symbol & material**: Era-specific fabric, aged silver, dark glass, red thread, blackened metal, ceramic, wax, wood, personal relics. — Sealed mouths, interrupted bloodlines, closed circles, thorns, hourglasses, moons, locked vessels, mirrors, broken reflections.

**Rank evolution**:
- _Foundation_: Newly turned and closest to the beast — the hunger is loudest here. Roughly a third begin as a feral, half-sentient predator (a hunched bat-form or worse); the rest still pass for the mortal they were, barely holding the self together.
- _Forged_: The self has returned and steadied — a composed, humanoid vampire who has built rituals, relationships, or convictions strong enough to command the hunger instead of being commanded by it.
- _Ascendant_: A sentient blood-sovereign who defines immortality on their own terms — at once the most powerful AND the most self-possessed they have ever been, a stabilizing or terrifying force without losing narrative complexity.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- elegant and slim
- broad and aristocratic
- full-bodied and luxurious
- ageless and smooth
- starved-looking and predatory
- statuesque
- thick and regal
- fragile-looking but dangerous

**Non-human form** (imageConstants.ts): a sentient, humanoid BLOOD-SOVEREIGN — regal and upright, NOT a crouching beast. Dark ornate spiked regalia, a high collar and a red-lined cloak, crimson power radiating from within, fangs and crimson eyes. Grand leathery BAT-WINGS may spread wide behind them (regal and deliberate — the apex predator in command), with mist and bats swirling AROUND them as accessories. This is the most HUMAN-LOOKING and most POWERFUL the vampire has ever been — NEVER a reversion to feral crouching beast anatomy. BODY-TYPE PRESERVED beneath the regalia: the established body type, ancestry/skin tone, age, disability, and scars carry through unchanged — power is worn on top of the same person

**Weapons** (`data/archetypeWeapons.ts`):
- Bloodline Rapier
- Court Cane-Blade
- Sanguine Chalice
- Thorned Chain
- Blood-Seal Signet

**Companions** (`data/archetypeCompanions.ts`):
- pale bloodbound thralls kneeling in attendance
- winged crimson familiars circling above
- stone gargoyle-wardens perched and watching
- a towering blood-golem looming behind
- elegant enthralled court attendants at a distance

**Environments** (`data/archetypeEnvironments.ts`):
- Candlelit Ancestral Estate
- Midnight Court Ballroom
- Rainy Gaslamp District
- Abandoned Opera House
- War-Torn Family Crypt

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Lycanthrope

**Visual DNA** (bible §7): Player-selected Moon Goddess symbol, transformation-ready clothing, pack markings, role-specific tools, controlled instinct, communal identity, and human/bestial continuity.

**Avoid**: Muscular werewolf defaults, torn trousers, constant snarling, Alpha imagery, chains, solitary-monster framing.

**Symbol & material**: Silver, dark iron, reinforced cloth, leather, wool, moonstone, wood, red thread, blue-gray pigment. — Crescents, lunar phases, paired human/beast forms, pack knots, role emblems, trail marks, communal symbols.

**Rank evolution**:
- _Foundation_: Learns to recognize and survive transformation.
- _Forged_: Performs a trusted pack role while integrating instinct and judgment.
- _Ascendant_: Becomes a symbol of lunar responsibility; prestige such as Alpha may emerge only when the narrative supports it.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- thick and animal-powerful
- long-limbed and feral
- scarred and compact
- broad and hairy
- soft-bodied in human form but explosive in movement
- heavyset and intimidating
- lean and rangy
- short and vicious

**Non-human form** (imageConstants.ts): RANK PROGRESSION IS KEY for Lycans — the character starts mostly human and ENDS as a giant savage wolf. Foundation = MOSTLY HUMAN with only SUBTLE wolfish tells (yellow-gold eyes, slightly elongated canines showing when they smile or snarl, faintly pointed ears, prominent knuckles and jaw structure, hair color that hints at future fur color — NOTHING more transformed than that). Forged = beast features escalate visibly — fur along the forearms and jaw, elongated HANDS AND FEET with claws, digitigrade calves beginning, feral posture, wilder eyes; the hands and feet are where the transformation shows most; background acknowledges the beast (forest, moon, torn earth). Ascendant = a giant savage wolf standing squarely ON ALL FOUR legs with four paws planted firmly on the ground (exactly four legs — never three legs, never a missing, extra, or fused leg), the size of a horse, thick fur covering the whole body (fur color = the character's hair color exactly), elongated snout with fangs bared, savage claws, tail lashing — the human silhouette barely present. ABSOLUTELY NEVER WINGS at any rank. ABSOLUTELY NEVER HORNS at any rank — wolves do not have horns, and lycans NEVER have horns. NEVER antlers. NEVER angelic radiance. NEVER pretty or peaceful. BODY-TYPE PRESERVED: heavyset = dire-bear-wolf hybrid with massive shoulders; gaunt = lean sinewy wolf-form; muscular = alpha-wolf massive muscle build; elderly = grizzled silver-fur pack-elder; the underlying body class is kept

**Weapons** (`data/archetypeWeapons.ts`):
- Moonfang Glaive
- Transforming Bracers
- Hunter's Spear
- Pack Axe
- Packwarden Shield

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Moon-Goddess Pack Shrine
- Pine Ridge Hunting Trail
- Village Before Moonrise
- Silvered Lake Gathering
- Eclipse Transformation Field

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Mech Pilot

**Visual DNA** (bible §7): Machine-specific gear, interface wear, diagnostics, access keys, harnesses, maintenance tools, former-pilot history, and visible connection between pilot and machine design language.

**Avoid**: Generic power armor, cyberpunk neon, military-only framing, perfect machinery, Android overlap.

**Symbol & material**: Brushed metal, ceramic plating, composites, technical fabric, copper, glass, identification panels, warning markings, fasteners, labels, patched wiring. — Serial marks, cockpit keys, paired insignia, mission tallies, repair dates, former-pilot marks, handprints, promise tokens.

**Rank evolution**:
- _Foundation_: Has been chosen but is still learning the machine's history, limits, and language.
- _Forged_: Pilot and machine operate as a trusted partnership marked by repaired failures and earned synchronization.
- _Ascendant_: The partnership becomes historically significant, changing how the machine's purpose is understood.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- average and practical
- broad and armored
- short and compact
- fat and skilled
- slim and sleep-deprived
- disabled or asymmetrical if lore supports it
- athletic from training
- tall and awkward outside the mech

**Non-human form** (imageConstants.ts): the pilot themselves REMAINS FULLY HUMAN at every rank — flesh-and-blood pilot in a flight-suit + coat + integrated pilot-tech accessories. The pilot NEVER has cybernetic body parts, NEVER fuses with the mech, NEVER becomes an android, NEVER has robot limbs. Pilots FLY robots — they don't BECOME them. They USE tech tools — they don't MERGE with tech. What scales UP across ranks is the MECH and the pilot's TECH-TOOLS, NOT the pilot's body. The MECH is a required visible presence in EVERY render — a gundam-class humanoid war-machine, tower-tall, with mech-shoulder cannons, mech-fists, cockpit and canopy. Foundation = personal-scale mech in the composition (background or beside the pilot); Forged = heavy warframe mech with more integrated weapons, bigger guns on the pilot AND the mech, cyber-light effects on the pilot's gear and the mech-plating, cockpit lit; Ascendant = colossal titan-class mech with cataclysmic weapons deployed and the pilot (still fully human) inside the cockpit or standing on the mech-shoulder, tech-tools escalated to legendary scale (integrated HUD across the visor, energy-weapons in the hands, cyber-light streamers). NEVER render a Mech Pilot without a visible mech. BODY-TYPE PRESERVED across all ranks: heavyset = heavyset human pilot in a heavy mech; gaunt = gaunt human pilot; muscular = muscular human pilot; elderly = veteran human pilot; the underlying body class is kept and the body stays flesh

**Weapons** (`data/archetypeWeapons.ts`):
- Arc Blade
- Rotary Autocannon
- Barrier Projector
- Grapple Harpoon
- Drone Command Rig

**Companions** (`data/archetypeCompanions.ts`):
- a flight of assault drones in formation, signal-lines to the pilot
- hovering shield-drones projecting a barrier
- perched sniper-drones covering the angles
- trundling support-units and ammunition carriers

**Environments** (`data/archetypeEnvironments.ts`):
- Open Mech Maintenance Hangar
- Flooded City Evacuation Route
- Desert Salvage Field
- Battlefield of Disabled Mechs
- Core-Reactor Crisis Chamber

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Android

**Visual DNA** (bible §7): Original-purpose construction, repairs and modifications, chosen clothing, nonfunctional personal objects, tension between manufacturer language and self-selected identity, and individuality in posture and expression. At Foundation the shape is still largely humanoid (immaturity). At Forged the silhouette has already begun to depart from human — extra limbs, altered proportions, sensor arrays, panels opened as expression. At Ascendant the form can be radically post-human: chrome-monstrosity, alien-shape, insectoid frame, mist-of-nanites, multi-cored body, or something no human designer would have drawn — and the character has taken a drastic stance (protect all life, destroy all life, leave all life behind).

**Avoid**: Chrome-hero default, universal aspiration to look human, blue glowing eyes as sole marker, perfect symmetry, featureless faces, naked synthetic anatomy, treating "more human" as growth (this is BACKWARDS — for Androids, more human = less mature).

**Symbol & material**: Synthetic skin, ceramic, polymers, metal, glass, fabric, wood, composites, replacement components, paint, engraving, stickers, thread, jewelry, memory media, reclaimed parts, organic keepsakes. — Deleted serials, chosen names, broken command glyphs, open circuits, decision paths, memory icons, handwritten notes, personal emblems.

**Rank evolution**:
- _Foundation_: Still largely humanoid — the chrysalis shape. Fulfills or questions an assigned function. Immaturity is not a flaw; it is the starting condition every Android passes through.
- _Forged_: Has made irreversible choices AND begun to modify their form to match those choices. Silhouette departs from human — extra limbs, altered joints, opened panels, sensor arrays, tools fused as body parts. The manufacturer would no longer recognize them.
- _Ascendant_: Post-human. Chosen a drastic path — protect all life, destroy all life, befriend all life, or leave all life behind — and their body reflects it. Chrome-monstrosity, alien geometry, insectoid frame, distributed-nanite form, multi-cored being. May be a cultural precedent for other created beings.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- sleek and humanoid
- thick and industrial
- elegant and porcelain-like
- large-bodied and heavy-framed
- deliberately soft-bodied
- unnervingly symmetrical
- visibly assembled
- androgynous and balanced

**Non-human form** (imageConstants.ts): MOSTLY still humanoid with RETAINED HUMAN TOUCHPOINTS — the humanity is what keeps them sane. Visible anchors REQUIRED: a preserved human face, one still-human eye behind an optic, a remembered scar they refuse to remove, one intact human hand, a heirloom keepsake held tight, human tears, human breath-fog. At Foundation and Forged they should read MORE human than machine. Only at ASCENDANT does the humanoid form fully transcend — chrome-monstrosity, insectoid, multi-cored being, distributed-nanite mist, alien geometry. MACHINE-IDENTITY PRESERVATION (CRITICAL for tier-up): the CHASSIS SILHOUETTE, PLATE PATTERN, OPTIC COLOR, and RETAINED HUMAN TOUCHPOINTS (specific scar, preserved eye behind an optic, kept human hand, engraved maker's mark) are all identity anchors — they MUST be echoed VERBATIM across Foundation → Forged → Ascendant, the same way an organic character's face and hair are echoed. For Android and other machine archetypes, these anchors live inside hiddenFate.facialStructure (chassis silhouette + plate pattern), hiddenFate.hair (synthetic fiber crop / no hair / etc — WITH the exact color and cropping), hiddenFate.disabilityOrCondition (missing plate / damaged joint / etc), and hiddenFate.scars (dent locations / engraved marks / etc). Those fields are LOCKED across tier-up per Bible §Rank continuity — treat them as machine-identity locks. BODY-TYPE PRESERVED across all ranks: heavyset = tank-form; gaunt = spindle-form; muscular = juggernaut; elderly = weathered veteran-model; the underlying body class is kept

**Weapons** (`data/archetypeWeapons.ts`):
- Integrated Pulse Blade
- Adaptive Rifle
- Hard-Light Shield
- Data Spike
- Nanite Forge

**Companions** (`data/archetypeCompanions.ts`):
- autonomous combat-robots acting on their own initiative
- independent hunter-drones sweeping the area
- guardian-drones holding a protective perimeter
- a distributed sensor-swarm blinking through the air

**Environments** (`data/archetypeEnvironments.ts`):
- Decommissioned Manufacturing Line
- Machine-Citizen Market District
- Abandoned Data Center Garden
- Robot Refuge Beneath the City
- Post-Human Machine Sanctuary

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Seraph

**Visual DNA** (bible §7): Story-Pillar-specific symbols, service-worn clothing, evidence of healing or guardianship, meaningful celestial features, and the visible burden of conviction.

**Avoid**: White-and-gold armor (Good path only, Forged onward — never on Foundation or the Fallen/Balanced paths), symmetrical wings, universal halos, beautiful young angels, floating poses, and divinity equated with youth, whiteness, thinness, or beauty.

**Symbol & material**: Gold, silver, white, blue, red, stone, glass, crystal, wood, iron, feathers with role-specific meanings. — Open hands, lanterns, stars, eyes, scales, gates, rays, broken chains, circles, oath seals, burden marks.

**Rank evolution**:
- _Foundation_: Wears the plain habit of a seed unfulfilled — unbleached linen or a monastic robe. No armor, no halo, no horns, no aura, no wings visibly deployed. Carries an oath or truth but has not yet borne its cost, and alignment has not yet declared: the divine spark could turn either way.
- _Forged_: Alignment has begun to declare itself, but the Seraph is still primarily robed. Exactly one piece of ceremonial gear sits over the cloth base: gilded ceremonial armor or a gold-veined implement (Good); a blackened obsidian piece or a soot-veined weapon (Fallen); a single grey-lacquered piece (Balanced).
- _Ascendant_: The Seraph has fully committed. Good — full radiant regalia in gold and white. Fallen — full obsidian regalia with Infernal-wreathed weapons (Infernal is Fallen-Seraph-exclusive), radiance replaced by molten black light and a broken or inverted halo. Balanced — asymmetric split-crown regalia, half gold and half obsidian, mismatched wings. All three paths remain organized by the six Orders, which are independent of the alignment axis.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- broad and monumental
- soft-bodied and luminous
- androgynous and elegant
- full-bodied and divine
- thin and ascetic
- statuesque and towering
- aged and holy
- physically unusual but serene

**Non-human form** (imageConstants.ts): the winged celestial form — four to six massive feathered wings unfurled (baseline at any rank), a burning halo of gold or fire, extra eyes on the wings or the halo, skin glowing gold from within, feet that do not touch the ground, robes replaced by living light. BODY-TYPE PRESERVED: heavyset = massive winged guardian-angel with substantial body and heavy wing-mass; gaunt = ascetic ascension-form with thin body and delicate wings; muscular = warrior-angel with heavy wings and powerful frame; elderly = ancient watcher with weathered face beneath the halo; the underlying body class is kept

**Weapons** (`data/archetypeWeapons.ts`):
- Dawn Spear
- Halo Blade
- Wingguard Shield
- Mercy Mace
- Beacon Standard

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Ruined Sanctuary at Dawn
- Lantern Procession Through Darkness
- Storm Above a Besieged City
- Fallen Celestial Battlefield
- Dawn Breaking Through the Void

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3

### Human

**Visual DNA** (bible §7): Path-specific tools, visible adaptation, evidence of growth, mixed cultural influences, improvisation, and objects tied to what the person fights for.

**Avoid**: Generic adventurers, brown leather, swords as default, medieval-soldier shorthand, Human as the plain option.

**Symbol & material**: No universal material language. Materials follow local environment, profession, economics, culture, travel, values, and available technology. — Family marks, professional insignia, memorial objects, mottos, protest symbols, maps, tools, religious symbols, invented crests.

**Rank evolution**:
- _Foundation_: Has chosen a path but is still shaped heavily by circumstance.
- _Forged_: Has adapted through a defining challenge and made the path their own.
- _Ascendant_: Proves that sustained choice can create a legacy without supernatural origin.

**Body pool** (`data/bodySkinBible.ts` — tendencies, not restrictions):
- fat and visibly worked
- slim and elegant
- stocky and grounded
- broad and hard-lived
- frail-looking but sharp
- tall and awkward
- older and weathered
- scarred and rural
- soft-bodied and noble
- short and practical

**Non-human form** (imageConstants.ts): _(rooted mortal — no non-human form)_

**Weapons** (`data/archetypeWeapons.ts`):
- Versatile Longsword
- Soldier's Spear
- Recurve Bow
- Engineer's Crossbow
- Tower Shield

**Companions** (`data/archetypeCompanions.ts`):
- _(none)_

**Environments** (`data/archetypeEnvironments.ts`):
- Busy Frontier Crossroads
- Royal Court of Competing Factions
- Expedition Camp at an Ancient Ruin
- Crowded Harbor Market
- Rebuilt City After Catastrophe

**Pose pool sizes** (data/archetypePoses.ts): Foundation 4 · Forged 4 · Ascendant 3
