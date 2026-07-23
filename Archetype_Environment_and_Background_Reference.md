> **STATUS — DESIGN SOURCE (not canonical implementation).** The canonical, current-state reference is generated from code: see [`IMAGE_ENGINE_REFERENCE.md`](IMAGE_ENGINE_REFERENCE.md) at the repo root, regenerated via `npm run docs:engines`. This document is the original design rationale the code was built from — consult it for intent, not current values.

# Archetype Environment and Background Reference

**Status:** Draft reference for approval  
**Project:** Card Game  
**Scope:** Canonical environment families and background-generation guidance for all 11 archetypes  
**Source priority:** Latest project snapshot, Archetype Bibles, and current approved design direction

---

## 1. Purpose

This document defines the locations, environments, and narrative situations in which characters from each archetype may appear.

The goal is not to give each archetype one permanent biome. That would become repetitive almost immediately. Instead, every archetype receives a broad library of settings that:

- Reinforce its core fantasy and identity
- Create meaningful visual and narrative variety
- Support Foundation, Forged, and Ascended character progression
- Remain readable behind a full-body card character
- Avoid generic fantasy-background repetition
- Provide reusable input for the character-art prompt pipeline

These are environment concepts, not finalized game locations, map regions, factions, encounter mechanics, or lore canon. A setting becomes a named canonical place only after separate approval.

---

## 2. Shared Environment Rules

### 2.1 The character remains primary

Backgrounds must support the character rather than compete with them.

Use:

- One clear focal area behind the character
- Strong foreground, midground, and background separation
- Atmospheric depth
- Controlled detail near the silhouette
- Environmental lighting that reinforces the archetype
- Enough open visual space around the head, weapons, wings, beasts, or machinery

Avoid:

- Crowded figures directly behind the character
- Heavy architecture intersecting the silhouette
- Bright objects competing with the face
- Background text, signage, symbols, or banners unless explicitly approved
- Excessive particle effects hiding equipment
- A flat studio backdrop when a narrative environment is requested

### 2.2 Environment is not archetype imprisonment

An archetype may travel outside its expected home environment.

A Druid can enter a city.  
A Mech Pilot can cross a swamp.  
A Vampire can appear in daylight under protection.  
A Human may appear anywhere.

The setting should answer one of these questions:

- Where did this character come from?
- What are they protecting?
- What are they investigating?
- What obstacle are they crossing?
- What responsibility brought them here?
- What part of their identity does this place test?
- What changed in this location because of them?

### 2.3 Rank progression

The existing progression is:

1. **Foundation**
2. **Forged**
3. **Ascended**

Environment progression should increase narrative and visual consequence without simply adding more glow.

- **Foundation:** Local, practical, intimate, believable.
- **Forged:** Wider stakes, stronger environmental storytelling, visible consequences.
- **Ascended:** Mythic scale, altered natural laws, legendary or world-defining situations.

A character may also remain in the same location across ranks while the environment evolves around them.

### 2.4 Environment prompt fields

Future structured environment records should support:

- Archetype
- Environment family
- Environment name
- Biome
- Civilization level
- Interior or exterior
- Time of day
- Weather
- Season
- Mood
- Environmental story
- Foreground elements
- Midground elements
- Background landmark
- Lighting source
- Atmospheric effect
- Rank compatibility
- Character-placement notes
- Companion-placement notes
- Negative prompt additions
- Reusability tags

These are recommended schema fields, not yet approved implementation requirements.

---

# 3. Archetype Environment Libraries

## Barbarian

**Core fantasy:** Carry a living legacy through hardship.

Barbarian environments should communicate ancestry, survival, migration, community, responsibility, and the physical evidence of generations. Avoid trapping the archetype inside generic frozen Viking scenery.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Ancestral Hearth Hall | Interior settlement | A communal hall filled with repaired tools, carved beams, memorial objects, and evidence of shared history |
| Storm-Beaten Highland Pass | Mountain exterior | Harsh travel route where endurance protects a caravan, clan, or sacred burden |
| Red-Grass Steppe Camp | Open plains | Portable homes, livestock, watchfires, and a culture built around movement rather than permanent stone cities |
| Black-Iron Mountain Forge | Industrial interior | A generational workshop where weapons, tools, vows, and repairs share equal importance |
| Burial-Stone Valley | Sacred landscape | Standing stones, cairns, woven offerings, and paths connecting the living to remembered ancestors |
| Ruined Border Village | Damaged settlement | A place under reconstruction after conflict, showing the Barbarian as builder and protector |
| Coastal Cliff Stronghold | Fortified coast | Wind, salt, rope bridges, watchtowers, and a community defending dangerous waters |
| Deep Woodland Hunting Ground | Forest | Tracked paths, respectful harvesting, survival craft, and regional animal symbolism |
| Volcanic Ash Settlement | Extreme biome | Homes built from dark stone and timber beneath ashfall, emphasizing adaptation rather than spectacle |
| Oath-Gathering Circle | Ceremonial exterior | Clan representatives meet around fire, carved posts, banners, and witnessed promises |

### Strong visual motifs

- Repaired structures
- Woven records and oath cords
- Cairns and memorial stones
- Shared fires
- Regional craft
- Evidence of rebuilding
- Weathered materials with specific cultural meaning

### Avoid

- Generic Viking longhouse repetition
- Random skull piles
- Empty snowy mountains as the default
- A society defined only by raiding
- Environments that imply Barbarians cannot build or organize

**Recommended foundation set:** Ancestral Hearth Hall, Storm-Beaten Highland Pass, Black-Iron Mountain Forge, Burial-Stone Valley, Ruined Border Village.

---

## Monk

**Core fantasy:** Transform oneself through lifelong practice.

Monk settings should show routine, discipline, mentorship, service, craft, repetition, and the relationship between practice and everyday life. Avoid making every Monk live in the same isolated mountaintop temple.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Dawn Practice Courtyard | Monastery exterior | Repeated footpaths, training marks, bells, and early light establish disciplined routine |
| Mountain Stair Sanctuary | Mountain architecture | A long ascent representing patience, pilgrimage, and sustained effort |
| Rain-Washed Street Dojo | Urban interior/exterior | A modest practice space embedded within an ordinary neighborhood |
| Artisan Monastery Workshop | Craft interior | Pottery, calligraphy, metalwork, weaving, or carpentry treated as spiritual practice |
| Riverstone Meditation Ford | Natural exterior | Moving water, balanced stones, and controlled breath under changing conditions |
| Traveling Teacher’s Camp | Wilderness camp | Minimal equipment, students’ bedrolls, and temporary practice spaces show discipline without permanence |
| Archive of Disciplines | Library | Manuals, annotated forms, teaching records, and disagreements between schools |
| Bell Tower During a Storm | Vertical interior | The Monk maintains rhythm and concentration while the entire structure moves around them |
| Community Healing House | Civic interior | Practice expressed through care, recovery, and service rather than combat |
| Abandoned Rival School | Ruined interior | A place of failed teaching, broken tradition, or a discipline that lost its purpose |

### Strong visual motifs

- Repetition marks
- Maintained tools
- Training wear
- Calm geometry
- Measured spacing
- Functional simplicity
- Evidence of students and mentors

### Avoid

- Generic floating meditation poses everywhere
- Constant golden energy
- One cultural tradition used as the entire archetype
- Empty temples with no daily life
- Martial arts spectacle without evidence of practice

**Recommended foundation set:** Dawn Practice Courtyard, Artisan Monastery Workshop, Riverstone Meditation Ford, Traveling Teacher’s Camp, Community Healing House.

---

## Beastmaster

**Core fantasy:** Earn a companion’s trust and act as partners.

Beastmaster environments should show where human and animal paths cross naturally. The environment must provide credible space, behavior, shelter, and movement for the bonded beast.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Forest Rescue Clearing | Woodland | A protected recovery site where wounded wildlife and travelers receive care |
| Wind-Carved Migration Route | Open wilderness | The pair travels alongside seasonal animal movement across a vast landscape |
| Cliffside Raptor Roost | Mountain coast | Vertical terrain designed around flying companions and aerial observation |
| Flooded Mangrove Channels | Wetland | Tight waterways, roots, hidden routes, and amphibious or aquatic bonds |
| Desert Watering Sanctuary | Arid oasis | A guarded neutral ground where predators and prey temporarily share water |
| Snowbound Tracking Range | Tundra | Prints, scent trails, shelter craft, and coordinated survival in low visibility |
| Beastkeeper’s Village Edge | Rural settlement | Human homes transition carefully into protected animal territory |
| Ancient Megafauna Graveyard | Mythic wilderness | Massive remains, ecological history, and dangerous creatures drawn to the site |
| Overgrown Imperial Menagerie | Ruined complex | Former captivity reclaimed as a sanctuary or liberation site |
| Moonlit Pack Crossing | Forest or plains | A tense encounter where trust and body language matter more than domination |

### Companion composition rules

- Give the bonded beast a clear path and physical space.
- Avoid placing the companion as a tiny decorative object.
- Show shared attention, coordinated posture, or mutual protection.
- Environmental scale must fit the creature.
- Do not use cages, chains, saddles, or control devices without story justification.

### Strong visual motifs

- Tracks and trails
- Shared shelter
- Feeding or watering areas
- Rescue equipment
- Natural observation points
- Ecological transitions
- Evidence of trust

### Avoid

- Zoo-like staging
- Trophy rooms
- Random exotic animals added for spectacle
- Beast ownership fantasy
- Environments where the human is clearly dominating the animal

**Recommended foundation set:** Forest Rescue Clearing, Wind-Carved Migration Route, Desert Watering Sanctuary, Beastkeeper’s Village Edge, Overgrown Imperial Menagerie.

---

## Druid

**Core fantasy:** Become one with the living forest and return when it calls.

Druid environments should express living systems, root communication, seasonal cycles, forest guardianship, and the tension between mortal settlements and ancient ecosystems. Forest identity is central, but forest environments must still vary dramatically.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Heart-Grove Cathedral | Ancient forest | Colossal trunks and interwoven canopy form a living sacred chamber |
| Root-Confluence Belowground | Subterranean forest | Luminous roots carry memory, warnings, and communication beneath the soil |
| Autumn Seedfall Village | Forest settlement edge | Mortals and Druids negotiate harvest, boundaries, and seasonal responsibility |
| Burned Grove Regrowth | Recovering landscape | New shoots emerge through ash while the Druid protects fragile renewal |
| Rainforest Canopy Walk | Tropical forest | Layered vertical life, hanging bridges, rain, and dense biodiversity |
| Winter-Sleep Hollow | Snow forest | Dormant trees and a hidden place where Druids meld into the grove for years |
| Fungal Lantern Marsh | Wet forest | Bioluminescent fungi, drowned roots, spores, and slow ecological decay |
| Orchard of Dangerous Fruit | Cultivated woodland | A beautiful managed ecosystem containing medicinal, magical, and lethal growth |
| City Consumed by Roots | Urban reclamation | Forest and architecture negotiate, collide, or merge after abandonment |
| Walking Forest Boundary | Mythic landscape | Entire trees migrate as the grove relocates away from danger |

### Strong visual motifs

- Root networks
- Canopy light
- Seedfall
- Bark integration
- Seasonal transformation
- Forest communication
- Living architecture
- Regrowth after damage

### Avoid

- Treating Druids as generic nature wizards
- Open grassland as their default home
- Random animal companions replacing Beastmaster identity
- Neon-green magic on every plant
- A forest that appears decorative rather than alive

**Recommended foundation set:** Heart-Grove Cathedral, Root-Confluence Belowground, Burned Grove Regrowth, Winter-Sleep Hollow, City Consumed by Roots.

---

## Necromancer

**Core fantasy:** Seek truth and memory beyond mortality.

Necromancer environments should support investigation, funerary practice, memory, forbidden knowledge, death, grief, spirits, corpsecraft, and the consequences of interfering with mortality. Not every scene needs to be an evil graveyard.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Archive of Last Testimonies | Library or crypt | Final words, spirit records, death masks, and sealed witness accounts |
| Rain-Soaked Cemetery District | Urban exterior | Working burial grounds surrounded by ordinary city life and unresolved hauntings |
| Ossuary Research Chamber | Subterranean interior | Carefully catalogued remains used for historical, magical, or medical study |
| Battlefield at First Dawn | War-torn exterior | Lingering spirits and fragmented memories remain after the living have departed |
| Plague-Era Hospital Ruin | Abandoned interior | Medical tools, quarantine marks, memorials, and dangerous residual magic |
| Sunken Funeral City | Underwater or flooded ruin | Tomb avenues, drowned monuments, and spirits trapped beneath dark water |
| Ancestral Memory Court | Spiritual realm | The dead gather as witnesses, advisers, accusers, or fragments of history |
| Desert Necropolis Observatory | Arid ruin | Tombs aligned with stars to study death, cycles, and the movement of souls |
| Village of Empty Houses | Haunted settlement | Every resident vanished or died, leaving domestic memories rather than battlefield spectacle |
| Veil-Breach Threshold | Mythic boundary | Reality tears open where the living world overlaps with the realm of the dead |

### Servant composition rules

- Undead servants should have defined labor, defensive, ritual, or investigative purpose.
- Use empty space so spectral servants remain legible.
- Show whether the environment fears, accepts, employs, or depends on necromancy.
- Corporeal undead should not become an undifferentiated crowd behind the character.
- A recurring servant may occupy the midground as a secondary focal point.

### Strong visual motifs

- Memorial records
- Funeral architecture
- Catalogued remains
- Echoes of ordinary life
- Spirit residue
- Sealed thresholds
- Evidence and testimony
- Decay with narrative meaning

### Avoid

- Skull wallpaper
- Green fog in every scene
- Graveyards as the only setting
- Mindless undead crowds by default
- Assuming every Necromancer is evil or careless with remains

**Recommended foundation set:** Archive of Last Testimonies, Rain-Soaked Cemetery District, Battlefield at First Dawn, Ancestral Memory Court, Veil-Breach Threshold.

---

## Vampire

**Core fantasy:** Preserve identity through restraint.

Vampire environments should express hunger, restraint, longevity, secrecy, court politics, preserved memory, changing eras, temptation, isolation, and fragile connections to mortal identity.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Candlelit Ancestral Estate | Manor interior | Portraits, sealed rooms, preserved objects, and centuries of accumulated identity |
| Midnight Court Ballroom | Political interior | Elegant social danger where etiquette, alliances, and hunger are tightly controlled |
| Rainy Gaslamp District | Urban exterior | Night crowds, reflections, hidden feeding routes, and changing mortal culture |
| Abandoned Opera House | Cultural ruin | A place preserving music, grief, performance, and memories of a lost era |
| Protected Daylight Conservatory | Glass interior | Filtered sun, heavy curtains, rare plants, and deliberate confrontation with vulnerability |
| Blood-Oath Council Chamber | Formal interior | Rival houses negotiate contracts, territory, punishment, and restraint |
| War-Torn Family Crypt | Underground interior | A bloodline’s history has been attacked, exposed, or desecrated |
| Frozen Castle at Polar Night | Extreme exterior | Months without sunrise create freedom, isolation, and dangerous excess |
| Modern Penthouse Above an Old City | Contemporary interior | Ancient identity survives inside a rapidly changing world |
| Crimson Dream Banquet | Psychic or mythic realm | Temptation becomes architecture, forcing the Vampire to confront desire and memory |

### Servant composition rules

- Blood Servants must have a visible role: guard, steward, agent, physician, emissary, transformed protector, or supernatural construct.
- Avoid filling every court scene with kneeling thralls.
- Show differences between willing service, political loyalty, supernatural compulsion, and transformation.
- Servants may reinforce status, but the Vampire’s core tension must remain visible.

### Strong visual motifs

- Preserved art
- Layered eras
- Mirrors and reflections
- Controlled candlelight
- Curtains and filtered daylight
- Social distance
- Family records
- Spaces maintained long after their original purpose

### Avoid

- Gothic castle as the only location
- Constant red lighting
- Every servant portrayed as mindless
- Sexualized feeding scenes by default
- Treating all Vampires as wealthy aristocrats

**Recommended foundation set:** Candlelit Ancestral Estate, Midnight Court Ballroom, Rainy Gaslamp District, Protected Daylight Conservatory, Modern Penthouse Above an Old City.

---

## Lycanthrope

**Core fantasy:** Join instinct, pack duty, and lunar faith.

Lycanthrope settings should express duality, communal responsibility, transformation, lunar ritual, territorial knowledge, instinct, and the continuity between human and bestial identity.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Moon-Goddess Pack Shrine | Sacred forest or cave | Transformation rites, pack markings, offerings, and lunar symbols |
| Pine Ridge Hunting Trail | Mountain forest | Familiar territory navigated through scent, sound, and communal knowledge |
| Village Before Moonrise | Rural settlement | Ordinary pack life prepares carefully for an approaching transformation |
| Silvered Lake Gathering | Lakeshore | Pack decisions, rites, and reflections beneath a visible moon |
| Ruined Hunter Fortress | Defensive ruin | Former enemies’ stronghold reclaimed, investigated, or watched by the pack |
| Dense City Rooftops | Urban exterior | A Lycanthrope navigates modern territory through height, scent, and hidden routes |
| Winter Den Sanctuary | Cave or lodge | Warm communal shelter emphasizing family and recovery rather than animal savagery |
| Blood-Scented Borderland | Contested wilderness | Territorial tension threatens restraint and pack diplomacy |
| Eclipse Transformation Field | Mythic exterior | A rare celestial event destabilizes forms, instincts, and pack roles |
| Ancestor-Wolf Dreamscape | Spiritual realm | Lunar faith and inherited instinct take symbolic landscape form |

### Pack composition rules

- Pack members are peers, relatives, elders, rivals, or allies.
- Do not stage them as obedient servants.
- Show shared formation, ritual, protection, or disagreement.
- Human and transformed forms may coexist to show continuity.
- Environment should provide room for transformation silhouettes.

### Strong visual motifs

- Moon phases
- Pack markings
- Shared dens and fires
- Scent trails
- Territory boundaries
- Transformation-safe clothing and structures
- Lunar reflections
- Communal ritual

### Avoid

- Random wolf packs behind every character
- Constant full-moon clichés
- Chains as the only symbol of restraint
- Environments that equate instinct with stupidity
- Treating pack life as hierarchy without relationships

**Recommended foundation set:** Moon-Goddess Pack Shrine, Village Before Moonrise, Silvered Lake Gathering, Winter Den Sanctuary, Dense City Rooftops.

---

## Mech Pilot

**Core fantasy:** Carry responsibility through a chosen machine.

Mech Pilot environments should show direct machine partnership, maintenance, deployment, scale, logistics, civilian responsibility, tactical control, and the consequences of using powerful hardware.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Open Mech Maintenance Hangar | Industrial interior | Exposed machinery, scaffolds, crew tools, repairs, and visible pilot-machine scale |
| Flooded City Evacuation Route | Urban disaster | The mech protects civilians and moves debris rather than merely fighting |
| Desert Salvage Field | Arid industrial exterior | Broken machines become resources, history, and difficult choices |
| Orbital Drop Bay | Spacecraft interior | Pre-deployment tension, restraint systems, command interfaces, and extreme scale |
| Mountain Mining Colony | Industrial settlement | Civilian machinery and defense systems share parts, labor, and responsibility |
| Storm-Battered Coastal Defense Wall | Fortified coast | A pilot protects infrastructure during both natural and military threats |
| Overgrown Battlefield of Disabled Mechs | Ruined exterior | Old machines form a mechanical graveyard filled with salvage and memory |
| Underground Transit Megastructure | Subterranean urban | Tight infrastructure challenges a machine designed for open combat |
| Mobile Carrier Convoy | Moving industrial platform | Pilots, support crews, drones, and civilians travel through dangerous territory |
| Core-Reactor Crisis Chamber | High-risk interior | The pilot operates outside or beside the mech during a catastrophic systems failure |

### Controlled Unit composition rules

- Controlled Units should visually connect to the pilot’s command system.
- Use formation, signal lines, launch racks, control gestures, or shared markings.
- Do not imply emotional independence unless the unit is specifically transitioning toward autonomy.
- Maintain readable scale between pilot, mech, and drones.
- Background machinery should not obscure the hero silhouette.

### Strong visual motifs

- Maintenance infrastructure
- Crew scale
- Control interfaces
- Launch systems
- Civilian uses of heavy machinery
- Repair scars
- Logistics
- Consequences of machine weight

### Avoid

- Military battlefield as the only setting
- Endless neon cityscapes
- Clean machines with no maintenance logic
- Mechs standing in spaces too small to contain them
- Treating controlled drones like independent Android companions

**Recommended foundation set:** Open Mech Maintenance Hangar, Flooded City Evacuation Route, Desert Salvage Field, Mountain Mining Colony, Mobile Carrier Convoy.

---

## Android

**Core fantasy:** Define purpose and identity beyond the form others designed.

Android environments should explore original function, self-authorship, social integration, machine civilization, abandoned directives, repair, autonomy, memory, and forms that increasingly depart from human expectations.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Decommissioned Manufacturing Line | Industrial ruin | The Android returns to the place of manufacture and confronts its assigned purpose |
| Machine-Citizen Market District | Urban settlement | Humans, Androids, robots, and artificial services coexist with visible social friction |
| Self-Built Workshop Home | Personal interior | Repairs, chosen objects, clothing, art, and modifications reveal individual identity |
| Abandoned Data Center Garden | Technological ruin | Cooling systems, vines, servers, and preserved digital memories create mixed life |
| Autonomous Research Vessel | Mobile laboratory | Independent machines continue a mission without human supervision |
| Synthetic Rights Tribunal | Civic interior | Identity, ownership, responsibility, and personhood become visible political stakes |
| Nanite Desert | Altered landscape | The environment itself is made of programmable matter and unstable machine ecosystems |
| Deep-Space Relay Station | Space interior/exterior | Long isolation tests purpose after the original creators are gone |
| Robot Refuge Beneath the City | Hidden settlement | Discarded machines repair one another and build new culture from obsolete parts |
| Post-Human Machine Sanctuary | Mythic technological realm | Ascended forms create a place no human architect could have imagined |

### Autonomous Unit composition rules

- Autonomous Units should show independent attention, tasks, routes, or decisions.
- Avoid arranging them like remote-controlled military accessories.
- AI entities may be represented through distributed screens, light patterns, moving architecture, or embodied units.
- The Android and autonomous units may cooperate, disagree, negotiate, or share purpose.
- Ascended environments may abandon human-scale architecture.

### Strong visual motifs

- Original manufacturing language
- Repairs and modifications
- Chosen personal objects
- Obsolete technology repurposed
- Machine community
- Distributed intelligence
- Nonhuman architecture
- Tension between ownership and personhood

### Avoid

- Chrome corridors everywhere
- Blue holograms as the only visual language
- Treating all Androids as military products
- Making autonomous units look like Mech Pilot drones
- Assuming post-human forms must be emotionless

**Recommended foundation set:** Decommissioned Manufacturing Line, Self-Built Workshop Home, Machine-Citizen Market District, Abandoned Data Center Garden, Robot Refuge Beneath the City.

---

## Seraph

**Core fantasy:** Carry hope and sacred responsibility into darkness.

Seraph environments should place conviction under pressure. They should show protection, pilgrimage, sacrifice, judgment, doubt, sacred duty, and light entering places where it is genuinely needed.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Ruined Sanctuary at Dawn | Sacred ruin | The Seraph protects survivors where a holy place failed |
| Lantern Procession Through Darkness | Road or city | Ordinary people carry small lights while the Seraph guards their passage |
| Storm Above a Besieged City | Aerial exterior | Wings, weather, defensive positioning, and responsibility over thousands |
| Hospital Chapel During Crisis | Civic sacred interior | Hope appears through care, grief, and exhaustion rather than spectacle |
| Pilgrim Stair Above the Clouds | Mountain sacred route | A difficult ascent tests conviction and the burden of guidance |
| Fallen Celestial Battlefield | Mythic ruin | Broken halos, abandoned standards, and evidence that divine power can fail |
| Sunless Underground Kingdom | Subterranean civilization | The Seraph carries light to people who have never seen the sky |
| Judgment Hall with Empty Throne | Sacred political interior | Authority is absent, forcing the Seraph to decide without certainty |
| Lighthouse at the World’s Edge | Coastal landmark | A solitary guardian maintains hope against an overwhelming darkness |
| Dawn Breaking Through the Void | Ascended cosmic realm | Conviction becomes a world-changing act without erasing the surrounding darkness |

### Strong visual motifs

- Small lights against large darkness
- Protected civilians
- Damaged sacred architecture
- Pilgrimage paths
- Weather and height
- Burdened wings
- Beacons and standards
- Hope expressed through action

### Avoid

- Perfect heaven as the default
- Constant white-and-gold emptiness
- Wings filling the entire background
- Automatic moral certainty
- Light so bright that all environmental detail disappears

**Recommended foundation set:** Ruined Sanctuary at Dawn, Lantern Procession Through Darkness, Hospital Chapel During Crisis, Sunless Underground Kingdom, Lighthouse at the World’s Edge.

---

## Human

**Core fantasy:** Become extraordinary through adaptation and decision.

Human environments should be the broadest in the game. Their strength is not the absence of magic, but their ability to enter unfamiliar situations, learn, build, organize, improvise, and choose what they become.

| Environment | Type | Narrative and visual purpose |
|---|---|---|
| Busy Frontier Crossroads | Mixed settlement | Cultures, professions, travelers, and conflicting opportunities meet |
| Improvised Workshop Under Siege | Interior or exterior | Ordinary tools become solutions under immediate pressure |
| Royal Court of Competing Factions | Political interior | A Human navigates power through judgment, persuasion, or deception |
| Expedition Camp at an Ancient Ruin | Wilderness archaeology | Curiosity, preparation, and adaptation open contact with forgotten history |
| Crowded Harbor Market | Coastal urban | Trade, migration, technology, and cultural exchange create visual variety |
| Farming Village During a Magical Storm | Rural disaster | Everyday people solve supernatural problems without innate archetype protection |
| Mercenary Camp Before Battle | Military camp | Choice, loyalty, fear, economics, and leadership matter more than destiny |
| University of Mixed Traditions | Educational interior | Magic, engineering, history, theology, and martial study coexist |
| Rebuilt City After Catastrophe | Urban recovery | Human collaboration and disagreement shape what replaces destruction |
| Gateway to an Unknown World | Mythic threshold | Adaptability becomes the defining strength when no existing rulebook applies |

### Strong visual motifs

- Mixed tools and materials
- Cultural exchange
- Improvisation
- Construction and rebuilding
- Maps and records
- Crowds with varied professions
- Visible choices
- Environments shaped by ordinary labor

### Avoid

- Treating Humans as the boring default
- Medieval village repetition
- Removing fantasy from Human settings
- Giving Humans no visual identity
- Assuming adaptability means copying another archetype wholesale

**Recommended foundation set:** Busy Frontier Crossroads, Improvised Workshop Under Siege, Expedition Camp at an Ancient Ruin, University of Mixed Traditions, Rebuilt City After Catastrophe.

---

# 4. Cross-Archetype Environment Families

A reusable environment system should allow several archetypes to occupy the same broad location while interpreting it differently.

| Shared location | Archetype-specific interpretation examples |
|---|---|
| Ruined city | Human rebuilding effort; Druid reclamation; Necromancer memory investigation; Mech Pilot evacuation; Vampire preserved district |
| Ancient forest | Druid home; Beastmaster crossing; Barbarian hunting ground; Lycanthrope territory; Human expedition |
| Sacred site | Monk practice; Seraph duty; Barbarian ancestry; Lycanthrope lunar faith; Necromancer funerary record |
| Industrial complex | Mech Pilot maintenance; Android origin site; Human workshop; Necromancer corpse research facility |
| Noble estate | Vampire identity anchor; Human political center; Necromancer ancestral investigation |
| Battlefield | Barbarian inherited loss; Necromancer testimony; Seraph protection; Mech Pilot responsibility; Human leadership |
| Underground realm | Necromancer crypt; Druid root network; Seraph sunless kingdom; Android machine refuge |
| Coastal settlement | Barbarian stronghold; Human market; Beastmaster migration point; Mech Pilot defense wall |
| Mountain route | Monk pilgrimage; Barbarian survival pass; Beastmaster raptor habitat; Seraph sacred ascent |
| Dream or spirit realm | Necromancer memory court; Vampire temptation; Lycanthrope ancestor vision; Android distributed intelligence |

This shared-location approach creates asset reuse without making archetypes visually interchangeable.

---

# 5. Background Generation Safeguards

## 5.1 Character-card composition

For standard full-body card character art:

- Keep the horizon below or near shoulder level unless a dramatic low angle is required.
- Reserve negative space around the head and primary weapon.
- Use environmental framing rather than a literal decorative frame.
- Place major landmarks off-center.
- Avoid objects touching the character silhouette tangentially.
- Keep secondary characters and companions visually subordinate.
- Use atmospheric perspective to reduce background contrast.
- Preserve visible ground beneath the character’s feet.
- Do not bake a trading-card border into the generated artwork.

## 5.2 Variety requirements

A healthy generated set should vary:

- Interior and exterior scenes
- Urban and wilderness settings
- Time of day
- Weather
- Season
- Civilization density
- Emotional mood
- Character purpose
- Camera height
- Environmental scale
- Amount of visible architecture

Do not generate ten versions of the same biome with different adjectives. That is not a library; it is a thesaurus wearing armor.

## 5.3 Environmental storytelling

Every background should include at least one piece of evidence showing what happened, what is happening, or what may happen next.

Examples:

- A repaired wall
- A recently extinguished fire
- Tracks leading out of frame
- An unfinished ritual
- Evacuation marks
- A broken oath object
- Fresh regrowth
- A dormant machine
- An empty chair
- A protected civilian route

---

# 6. Recommended Initial Production Scope

For the first environment-generation pass, use the five recommended foundation settings for each archetype.

This creates:

- 11 archetypes
- 5 initial environment families per archetype
- **55 foundation background families**

Do not immediately generate every possible combination of character, rank, weapon, companion, and background.

A practical first matrix is:

- 1 Foundation character per archetype
- 2 approved environment tests per archetype
- 1 neutral lighting version
- 1 archetype-emphasis lighting version

That produces **44 initial comparison images** before expanding the environment library.

The testing goal should be to determine:

- Whether the character remains readable
- Whether the archetype identity is strengthened
- Whether backgrounds feel meaningfully different
- Whether the prompt structure creates consistent depth
- Whether companion and machinery placement remains usable
- Whether the image can be cropped into the existing Figma card frames

---

# 7. Documentation Synchronization

After approval, this file should become the canonical source for:

1. Archetype environment families
2. Background generation rules
3. Companion placement guidance
4. Cross-archetype environment reuse
5. Environment rank progression
6. Initial background production scope

The Archetype Bibles should reference this document rather than duplicate all environment lists.

The Character Generation Bible and art-prompt pipeline documentation should be updated to add an environment block with:

`Environment Family + Narrative Situation + Time/Weather + Composition Rules + Archetype-Specific Motifs + Negative Prompt Additions`

**Recommended canonical filename:** `Archetype_Environment_and_Background_Reference.md`
