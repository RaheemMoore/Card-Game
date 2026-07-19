# Claude Code Task: Integrate the Fantasy Hair, Fashion, and Clothing Bible

I created a new canonical project resource:

`Fantasy_Hair_Fashion_and_Clothing_Bible.md`

This document is a companion reference for the character portrait and Leonardo prompt-generation pipeline.

Its scope is intentionally limited to:

- hair texture
- hairstyles
- hair color
- grooming
- facial hair
- hair accessories
- headwear interaction
- clothing construction
- textiles
- armor
- footwear
- accessories
- costume roles
- fashion culture
- clothing wear and condition

It does not replace the Archetype Knowledge Bible, Body and Skin Representation Bible, Element Visual Language Bible, or gameplay documentation.

---

## Current Problem

The current portrait-generation system relies too heavily on visual shorthand.

Several archetypes are repeatedly reduced to a small number of familiar costume choices:

- Barbarian becomes fur, wraps, and crude iron.
- Monk becomes a simple robe, sash, and wrapped hands.
- Beastmaster becomes animal pelts and leather straps.
- Druid becomes leaves, vines, antlers, and a robe.
- Necromancer becomes a tattered black robe with skulls.
- Vampire becomes a gothic coat and cape.
- Seraph becomes white cloth and gold armor.
- Mech Pilot becomes generic gray science-fiction armor.
- Android becomes a white or chrome humanoid shell.
- Human becomes modern athletic wear.

These motifs are not automatically wrong. The problem is that they are being used as complete costume direction rather than as small parts of a larger culture.

Hair generation has a similar repetition problem. Generated characters frequently default to:

- long flowing hair
- generic fantasy braids
- shaved sides
- straight black hair
- full white magical hair
- the same hairstyle regardless of culture, occupation, armor, or body type

This causes characters to look visually related even when their lore, archetype, setting, and identity are different.

---

## Purpose of the New Bible

The Fantasy Hair, Fashion, and Clothing Bible teaches the generation pipeline to think like a costume and character designer.

It defines hair and fashion through:

- texture
- density
- length
- grooming
- arrangement
- condition
- adornment
- headwear interaction
- base layers
- primary garments
- structural layers
- armor
- outer layers
- waist systems
- footwear
- gloves and arm treatments
- materials
- textile construction
- wear
- social role
- culture
- rank
- magical or technological integration

It also provides dedicated guidance for all 11 current archetypes:

- Barbarian
- Monk
- Beastmaster
- Druid
- Necromancer
- Vampire
- Lycanthrope
- Mech Pilot
- Android
- Seraph
- Human

Each archetype includes multiple visual directions such as:

- heroic
- villainous
- aristocratic
- scholarly
- practical
- battlefield
- ceremonial
- celestial
- infernal
- industrial
- corrupted

The goal is to prevent each archetype from becoming one repeated costume.

---

## Important Design Direction

An archetype is a cultural and thematic lens, not a uniform.

Examples:

- A Barbarian may be a practical traveler, clan aristocrat, battlefield champion, infernal warlord, or elder chieftain.
- A Monk may be a wandering protector, wealthy temple official, battle monk, corrupted abbot, healer, or ascetic.
- A Necromancer may be a death scholar, funeral priest, aristocrat, battlefield death-priest, or infernal ritualist.
- A Vampire may belong to a desert court, ruined northern house, urban dynasty, military bloodline, or decadent aristocracy.
- A Seraph may be a heroic guardian, severe judge, celestial aristocrat, mourning protector, or abyss-balanced warrior wearing celestial plate over infernal chainmail.
- A Human may be a knight, scholar, artisan, noble, worker, traveler, villain, athlete, or soldier.

Do not assign one costume culture permanently to one archetype.

---

## Expected Use

Please inspect the current portrait-generation and prompt-assembly pipeline and determine the smallest maintainable integration that allows this resource to improve character art.

The system should use the Bible to:

- make hair an intentional design decision
- make costume role an intentional design decision
- build clothing from understandable layers
- use specific textile and armor vocabulary
- connect fashion to setting, lineage, culture, class, profession, and rank
- connect hairstyle to texture, grooming practice, occupation, environment, and headwear
- create multiple fashion directions within each archetype
- avoid repeating the same hair and garment combinations
- preserve approved hair and clothing identity during regeneration and evolution
- show rank progression through craftsmanship, construction, regalia, and narrative detail rather than simply adding more gold

Do not paste the entire Bible into every Leonardo prompt.

Read the relevant sections, select the useful details, and compile them into compact art direction.

---

## Hair Requirements

When hair is visible, the generation system should intentionally determine:

- texture
- density
- length
- hairstyle
- hair color
- condition
- adornment
- facial hair when relevant
- relationship to helmets, crowns, hoods, veils, halos, masks, or machinery

Avoid vague descriptions such as:

- long hair
- dark hair
- braided hair
- fantasy hairstyle

Prefer specific combinations such as:

> dense shoulder-length coils gathered into a high half-knot with two bronze clan rings

or:

> cropped silver locs wrapped close to the scalp beneath a fitted pilot pressure cap

Hair texture and hairstyle must be physically compatible.

Do not force every dark-skinned character into locs or braids.

Do not force every pale magical character into white hair.

Skin tone should affect lighting and contrast—not automatically determine hair culture.

---

## Clothing Requirements

The system should stop treating a single noun as a complete costume.

Avoid prompts that only say:

- robes
- leather armor
- plate armor
- gothic clothing
- pilot suit
- celestial armor
- infernal clothing

Instead, construct the costume from selected layers such as:

1. Base layer
2. Primary garment
3. Structural layer
4. Armor or protection
5. Waist system
6. Outer layer
7. Hand and arm treatment
8. Footwear
9. Accessories
10. Wear state
11. Rank signal
12. Magical or technological integration

Not every outfit needs every layer, but Claude should understand how the outfit is physically assembled.

---

## Texture and Material Requirements

Use precise materials.

Examples include:

- matte linen
- felted wool
- silk brocade
- velvet
- bark-fiber cloth
- mushroom leather
- waxed canvas
- quilted gambeson
- lacquered lamellar
- riveted chainmail
- blackened plate
- celestial micro-chain
- infernal chainmail
- pearl ceramic
- synthetic silk
- ballistic fabric
- brushed alloy

“Infernal chainmail” should not simply mean ordinary chainmail painted red.

The Bible defines it through details such as:

- blackened iron rings
- uneven forged texture
- ember-red inner reflections
- hooked links
- smoke-darkened metal
- scorched leather backing
- volcanic-glass accents
- heat-warped construction

Similarly, “celestial plate” should be constructed through:

- ivory enamel
- polished gold
- pale silver
- feather-shaped articulation
- sunburst fluting
- luminous seams
- halo-like gorgets
- light-woven underlayers

Do not make all infernal fashion generic red fire.

Do not make all celestial fashion white robes and gold breastplates.

---

## Body Compatibility

Use the Body and Skin Representation Bible alongside this resource.

Clothing must be designed for the generated body rather than stretched over a universal hero template.

Verify:

- armor plate shape fits the torso
- belts and closures sit believably
- fabric drape reflects body mass
- clothing accommodates broad, fat, slim, short, tall, stocky, soft, or frail bodies
- costume construction supports transformation, disability, prosthetics, wings, tails, digitigrade legs, or synthetic joints where relevant

Do not hide larger or unusual bodies beneath excessive cloth because the model is uncomfortable rendering them.

---

## Cultural Inspiration

Real cultures may inspire:

- textile construction
- layering
- silhouette
- weaving
- embroidery
- closures
- armor engineering
- grooming traditions
- jewelry
- rank markers
- ceremonial functions

Use inspiration carefully and coherently.

Do not:

- assign one real culture to one archetype
- randomly combine sacred or ceremonial symbols
- use skin tone as a shortcut for culture
- describe cultures as primitive, savage, exotic, or mystical
- copy recognizable historical regalia without adaptation
- reduce an entire culture to one hairstyle or garment

The final costume should feel like original fantasy worldbuilding.

---

## Social and Narrative Roles

Before creating the outfit, determine the character’s costume role.

Possible roles include:

- hero
- villain
- aristocrat
- worker
- scholar
- soldier
- traveler
- priest
- ceremonial leader
- exile
- celestial guardian
- infernal champion
- industrial specialist
- courtier
- hunter
- healer

The same archetype should look different across these roles.

Black clothing alone is not villain design.

Gold clothing alone is not noble or celestial design.

Fur alone is not Barbarian design.

A robe alone is not Monk, Druid, or Necromancer design.

---

## Rank Progression

Fashion progression should support Foundation, Forged, and Ascendant.

### Foundation

Use:

- practical construction
- limited armor
- local materials
- repaired garments
- one signature accessory
- incomplete sets
- modest ornament

### Forged

Use:

- reinforced layers
- better tailoring
- earned insignia
- partial ceremonial elements
- stronger cultural identity
- improved protection
- lore-specific repairs or trophies

### Ascendant

Use:

- complete regalia
- elite craftsmanship
- unmistakable status
- unique silhouette
- integrated magic or technology
- visual references to established lore
- meaningful damage, repair, or inheritance

Do not express Ascendant rank only by adding gold, a crown, more spikes, or more glow.

---

## Repetition Prevention

Please determine whether the current pipeline tracks visual repetition.

The system should ideally compare recent characters across:

- hair texture
- hairstyle
- hair length
- hair color
- facial hair
- headwear
- primary garment
- garment silhouette
- armor type
- primary textile
- outer layer
- cape or mantle use
- signature accessory
- costume role
- cultural construction direction

Regenerate or vary the design when recent cards repeatedly use:

- long flowing hair
- shaved sides
- one thick braid
- black hooded robes
- leather armor
- fur shoulder mantles
- gothic coats
- gold plate
- capes
- thigh-high boots
- identical pilot suits

---

## Investigation Requirements

Before editing, inspect:

- the current portrait prompt builder
- archetype prompt modifiers
- default hairstyle language
- default clothing and armor language
- rank progression prompt logic
- regeneration behavior
- character identity fields
- any recent-output or duplicate tracking
- how the current prompt handles skin tone and body type
- how Lycanthrope transformations handle clothing
- how helmets, wings, tails, digitigrade legs, and synthetic bodies are described

Identify the actual source of repetition before changing the implementation.

The latest reviewed project snapshot still includes several narrow older defaults, including:

- heavily muscled Barbarian
- lean Monk
- pale-skinned gothic Vampire
- idealized Seraph
- realistic athletic Human
- one primary outfit motif per archetype

Treat those as implementation findings to review—not as permanent representation rules.

---

## Recommended Structured Fields

Consider adding or improving fields such as:

```json
{
  "hair": {
    "texture": "",
    "density": "",
    "length": "",
    "style": "",
    "color": "",
    "condition": "",
    "facialHair": "",
    "adornment": "",
    "headwearInteraction": ""
  },
  "fashion": {
    "role": "",
    "baseLayer": "",
    "primaryGarment": "",
    "structuralLayer": "",
    "armor": "",
    "outerLayer": "",
    "waistSystem": "",
    "armAndHandTreatment": "",
    "footwear": "",
    "materials": [],
    "construction": [],
    "wear": "",
    "signatureAccessory": "",
    "rankSignal": "",
    "magicalOrTechnologicalIntegration": ""
  }
}
```

These fields are recommendations, not mandatory schema names. Reuse or extend the current appearance model when possible instead of creating duplicate systems.

---

## Prompt Compilation

The final Leonardo prompt should use a compact, selected description.

Example:

> Deep brown skin, dense shoulder-length coils gathered into a high half-knot with bronze clan rings. Layered indigo wool tunic over a quilted leather vest, blackened iron lamellar protecting one shoulder and the torso, patterned clan sash, wrapped forearms, weather-cracked boots, and a repaired fur-lined mantle fastened with one ancestral clasp.

This is better than:

> A muscular Barbarian with braided hair and fur armor.

Do not include every possible detail from the Bible.

Select the details that create the strongest coherent silhouette.

---

## Preservation Rules

When regenerating or evolving an existing character, preserve approved identity anchors unless the lore explicitly changes them.

Possible anchors include:

- hair texture
- base hair color
- signature hairstyle
- facial hair
- family jewelry
- clan clasp
- house colors
- order sash
- pilot jacket
- Android chosen garment
- Seraphic office insignia
- Lycanthrope identity token

Rank evolution may improve, damage, transform, or ceremonialize these features, but should not randomly replace them.

---

## Non-Goals

Do not:

- rewrite the Archetype Knowledge Bible
- change gameplay mechanics
- change character names
- change body or skin canon
- convert every example into a hardcoded random table
- lock each archetype to one costume culture
- copy the whole Bible into every API prompt
- make paid Leonardo calls unless separately authorized
- rename or redesign existing approved characters without approval
- create permanent factions or cultural canon without documenting and approving them
- implement unrelated visual systems

---

## Desired Result

After integration:

- hairstyles should become more varied and physically coherent
- hair texture should be intentionally described
- clothing should feel constructed rather than randomly assembled
- archetypes should support multiple fashion cultures and roles
- heroes, villains, aristocrats, workers, scholars, celestial figures, and infernal figures should look meaningfully different
- body type and costume should work together
- skin tone should be lit correctly without dictating costume culture
- rank progression should improve craftsmanship and regalia without defaulting to gold
- recent characters should stop sharing the same hair and clothing combinations
- Leonardo prompts should become richer without becoming bloated

---

## Completion Report

When finished, report:

1. Where the current pipeline was using repetitive hair or costume shorthand
2. Files created or updated
3. How the Bible is referenced
4. What hair and fashion fields now exist
5. How archetype, culture, setting, role, body, skin, and rank affect fashion selection
6. How outfit layers are compiled into Leonardo prompts
7. How repetition is detected or reduced
8. How approved hair and clothing traits are preserved during regeneration and evolution
9. Any remaining visual or product decisions that require my approval
