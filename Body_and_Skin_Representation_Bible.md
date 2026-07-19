# Body and Skin Representation Bible
**Version:** 1.0  
**Project:** Card Game  
**Purpose:** Canonical visual reference for body diversity, skin tone, skin texture, and prompt guidance in character generation  
**Primary users:** Claude Code, Claude API prompt generation, Leonardo prompt construction, lore and art-direction workflows

---

# 1. Why This Resource Exists

The current character art pipeline has a strong tendency to default toward a narrow heroic body standard:

- muscular
- lean
- conventionally athletic
- proportionally similar from card to card
- visually “safe” instead of distinctive

That weakens the fantasy of the game.

This project needs characters who feel powerful, memorable, and visually diverse across:

- body type
- height
- frame
- fat distribution
- muscle distribution
- age-coded features
- disability or fragility cues where appropriate
- skin tone
- skin texture
- undertones
- visible lived experience

The goal is **not** to make characters less cool.

The goal is to make more kinds of people look cool.

A thin necromancer, a heavyset monk, a broad soft-bodied druid, a short thick barbarian, a tall narrow human duelist, a scarred beastmaster with deep brown skin, or a pale android-inspired seraphic figure should all feel equally intentional and visually compelling.

This Bible gives Claude a clear body and skin vocabulary so prompts stop defaulting to one body ideal.

---

# 2. Core Principles

## 2.1 Diversity is intentional, not random decoration

Body type and skin presentation should reflect:

- lineage
- culture
- age
- archetype expression
- personal history
- labor or lifestyle
- environment
- illness, blessing, curse, training, or transformation where relevant
- individual identity

## 2.2 Power is not limited to one physique

A character can be:

- fat and powerful
- slim and dangerous
- soft-bodied and divine
- thick and graceful
- narrow-framed and resilient
- short and commanding
- lanky and intimidating
- sickly-looking and magically overwhelming
- broad and gentle
- scarred and elegant

## 2.3 Avoid one-to-one assumptions

Do not assume:

- Barbarian = huge muscular man
- Monk = lean and wiry only
- Druid = thin elf-like body only
- Necromancer = frail white goth body only
- Human = generic average fit body
- Female-presenting = slim hourglass
- Male-presenting = broad V-shape
- Power = visible muscle
- Beauty = smooth flawless skin
- Dark skin = always warm/golden
- Light skin = always noble or fragile

## 2.4 Body diversity should remain visually readable

The goal is not chaos.

Generated bodies should still be:

- clear in silhouette
- anatomically intentional
- believable within the art style
- appropriate to clothing and pose
- consistent with the character’s power fantasy

## 2.5 Skin is not just a color

Skin presentation includes:

- depth of tone
- undertone
- texture
- reflectivity
- weathering
- age
- freckles
- scars
- dryness or oiliness
- vitiligo or mottling when relevant
- tattoos, paint, ritual marks, and cosmetic adornment
- lighting response

---

# 3. Global Representation Rules

## Required default mindset

Claude should assume:

- every archetype can appear across multiple body types
- every archetype can appear across multiple skin tones
- every gender presentation can appear across multiple body shapes
- body diversity is canonical, not exceptional
- skin diversity is canonical, not exceptional

## Required prompt behavior

If a character body type is not specifically locked, Claude should:
- treat body type as an active design decision
- not default to “muscular athletic”
- vary height, build, proportions, and softness
- ensure the final prompt names the body type clearly

If skin tone is not specifically locked, Claude should:
- treat skin tone and undertone as active design decisions
- not default to light-to-medium tan fantasy skin
- use clear descriptive tone language
- include surface or lighting behavior when useful

---

# 4. Body Type Design Framework

A body type should be described through several independent dimensions, not a single word.

## 4.1 Height

Use relative descriptors such as:

- very short
- short
- below-average height
- average height
- tall
- very tall

## 4.2 Frame

Frame refers to the underlying skeletal or structural impression.

Examples:

- slight frame
- narrow frame
- compact frame
- medium frame
- broad frame
- heavy frame
- long-limbed frame

## 4.3 Mass Distribution

Examples:

- slim
- soft
- thick
- stocky
- broad
- heavyset
- fat
- fleshy
- dense
- padded
- burly
- solid

## 4.4 Muscle Visibility

Examples:

- low visible muscle definition
- modest muscle definition
- functional musculature
- thick musculature
- highly defined musculature

Do not treat visible abs as the default proof of strength.

## 4.5 Silhouette

Examples:

- rectangular
- triangular
- inverted triangle
- oval
- columnar
- pear-shaped
- apple-shaped
- softly rounded
- top-heavy
- bottom-heavy
- evenly distributed
- long and narrow
- short and powerful

Use silhouette language carefully and respectfully. It is a design tool, not a value judgment.

## 4.6 Posture and Carriage

Power can also come from how the body is carried.

Examples:

- grounded stance
- poised posture
- stooped but intense
- relaxed and immovable
- predatory stillness
- devotional openness
- coiled precision
- floating grace
- exhausted but defiant

---

# 5. Body Type Vocabulary Library

Use these as building blocks.

## 5.1 Lean / slender bodies

Useful terms:

- slim
- slender
- wiry
- narrow-framed
- long-limbed
- taut
- lightly built
- lean but not muscular
- fine-boned
- reed-like

Good for:
- not only agile characters
- also mystics, nobles, scholars, cursed beings, distant aristocrats, elegant duelists, or fragile-looking powerhouses

Avoid:
- making all slim bodies delicate or passive
- making all slender bodies youthful or feminine

## 5.2 Athletic / balanced bodies

Useful terms:

- balanced build
- athletic
- well-conditioned
- functional musculature
- sturdy
- training-built
- capable
- field-hardened

Avoid:
- using this as the default when no body decision was made

## 5.3 Broad / thick bodies

Useful terms:

- broad-shouldered
- thick-built
- barrel-chested
- dense
- sturdy
- solid
- broad-framed
- powerful through mass

Avoid:
- equating thickness with clumsiness

## 5.4 Fat / heavy bodies

Useful terms:

- fat
- heavyset
- full-bodied
- soft-bodied
- fleshy
- thick-waisted
- large-bodied
- generously built
- round-bellied
- broad and soft
- plush
- padded

Important:
“fat” is acceptable when used neutrally and respectfully in internal design language, but if Claude tends to overcorrect awkwardly, phrases like “large-bodied” or “soft-bodied” may be better in final prompts.

Good use:
- “a powerful fat barbarian with a heavy frame and commanding presence”
- “a soft-bodied monk whose calm posture and grounded strength make the body feel intentional and disciplined”

Avoid:
- comic relief treatment
- gluttony assumptions
- lazy or foolish coding
- hiding the body under excessive cloth because Claude is uncomfortable depicting it

## 5.5 Stocky / compact bodies

Useful terms:

- stocky
- compact
- short and solid
- low center of gravity
- thick-limbed
- compressed power
- grounded build

Useful for:
- wrestlers
- shield bearers
- earth-aligned figures
- stubborn survivors
- surprisingly agile fighters

## 5.6 Frail / sickly / delicate bodies

Useful terms:

- frail-looking
- gaunt
- hollow-cheeked
- underfed
- delicate frame
- thin to the point of fragility
- visibly exhausted
- sickly
- weakened in flesh but intense in presence

Useful for:
- necromancers
- cursed humans
- ascetics
- plague survivors
- haunted prophets

Avoid:
- assuming frailty means weakness
- making all magical characters underweight
- glamorizing illness without purpose

## 5.7 Mature / aged bodies

Useful terms:

- weathered
- age-lined
- thickened with age
- softened with age
- sinewy and older
- timeworn
- scar-marked
- lived-in body

Avoid:
- making all older bodies either frail or heroic elder-muscular

---

# 6. Body Type Composition Formula

When describing a body, Claude should usually combine 3–5 traits:

`height + frame + mass distribution + muscle visibility + posture/carriage`

Examples:

- tall, narrow-framed, soft-bodied, with low visible muscle definition and a calm upright posture
- short, stocky, thick-limbed, with dense functional musculature and a grounded fighter’s stance
- average height, broad-framed, large-bodied, softly rounded, with regal posture and controlled hand gestures
- tall, slight-framed, gaunt, long-limbed, with a haunted stoop and unsettling stillness

This is much stronger than writing only:
- athletic
- muscular
- slim

---

# 7. Archetype Body Type Guidance

These are tendencies and possibilities, not restrictions.

## BARBARIAN

Possible successful body directions:
- broad, thick, scarred, dense
- short and stocky
- tall and heavyset
- fat but immensely imposing
- lean and weather-beaten
- older and timeworn
- wide-hipped and powerful
- soft-bodied with enormous presence

Good keywords:
- survival-built
- dense
- heavy frame
- powerful through mass
- scarred
- sun-worn
- weathered

Avoid:
- every barbarian being a giant shredded bodybuilder

## MONK

Possible successful body directions:
- compact and grounded
- soft-bodied but disciplined
- lean and controlled
- wiry and calloused
- heavyset with calm balance
- older and timeworn
- broad but gentle
- slight but intense

Good keywords:
- balanced
- grounded
- centered
- disciplined posture
- controlled body

Avoid:
- every monk being thin, shirtless, and six-packed

## BEASTMASTER

Possible successful body directions:
- practical and weathered
- lean and sun-browned
- broad and fur-clad
- thick but mobile
- scar-marked and hardy
- compact and strong
- soft-bodied but rugged
- asymmetrical from field life

Avoid:
- every beastmaster looking like a fantasy ranger clone

## DRUID

Possible successful body directions:
- broad and rooted
- soft-bodied and ancient-feeling
- willow-thin and eerie
- older and gnarled
- fat and generous-looking
- compact and earthy
- long-limbed and forest-haunted
- physically ordinary but spiritually immense

Avoid:
- every druid being slender, youthful, and elven-coded

## NECROMANCER

Possible successful body directions:
- gaunt and sleep-deprived
- delicate and pale or dark-skinned with striking contrast
- soft-bodied scholar
- hollow-eyed and narrow
- older and parchment-skinned
- physically unimposing but visually commanding
- sickly-looking but majestic
- refined and ritualized

Avoid:
- every necromancer being the same thin white goth silhouette

## VAMPIRE

Possible successful body directions:
- elegant and slim
- broad and aristocratic
- full-bodied and luxurious
- ageless and smooth
- starved-looking and predatory
- statuesque
- thick and regal
- fragile-looking but dangerous

Avoid:
- every vampire being a thin seductive model

## LYCANTHROPE

Possible successful body directions:
- thick and animal-powerful
- long-limbed and feral
- scarred and compact
- broad and hairy
- soft-bodied in human form but explosive in movement
- heavyset and intimidating
- lean and rangy
- short and vicious

Avoid:
- every lycanthrope being a tall ab-focused wolf-man

## MECH PILOT

Possible successful body directions:
- average and practical
- broad and armored
- short and compact
- fat and skilled
- slim and sleep-deprived
- disabled or asymmetrical if lore supports it
- athletic from training
- tall and awkward outside the mech

Avoid:
- every pilot being a clean military action hero

## ANDROID

Possible successful body directions:
- sleek and humanoid
- thick and industrial
- elegant and porcelain-like
- large-bodied and heavy-framed
- deliberately soft-bodied
- unnervingly symmetrical
- visibly assembled
- androgynous and balanced

Important:
Android bodies are designed. That means their body type can express purpose, status, maker philosophy, or rebellion.

Avoid:
- assuming all androids should be skinny silver mannequins

## SERAPH

Possible successful body directions:
- broad and monumental
- soft-bodied and luminous
- androgynous and elegant
- full-bodied and divine
- thin and ascetic
- statuesque and towering
- aged and holy
- physically unusual but serene

Avoid:
- every seraph being a slim flawless runway angel

## HUMAN

Possible successful body directions:
- any of the above

Important:
Human is not the default body template.

Use Humans to show the broadest possible physical diversity:
- fat
- slim
- stocky
- broad
- frail
- average
- short
- tall
- older
- young adult
- visibly worked, soft, elegant, scarred, rural, urban, noble, practical

Avoid:
- using Human as the “normal fit person” fallback

---

# 8. Skin Tone Design Framework

Skin tone should be chosen intentionally, not left vague.

Use a combination of:

- depth
- undertone
- surface quality
- environmental effect
- visible detail

## 8.1 Depth Range

Examples:

- very fair
- fair
- light
- light-medium
- medium
- medium-deep
- deep
- very deep

## 8.2 Undertone

Examples:

- cool
- neutral
- warm
- olive
- golden
- red-brown
- blue-red
- peach
- bronze
- ashy
- umber

## 8.3 Surface / Texture Language

Examples:

- smooth
- weathered
- freckled
- sun-worn
- scar-marked
- dry
- luminous
- matte
- reflective
- dewy
- roughened
- tattooed
- painted
- vitiligo-patterned
- ritual-marked
- ash-dusted
- frost-touched

## 8.4 Lighting Response

Examples:

- warm highlights across deep brown skin
- cool moonlight over blue-black skin
- golden reflected light over olive skin
- soft diffuse light on pale freckled skin
- ember light catching textured dark skin
- wet specular highlights over bronze skin

---

# 9. Skin Tone Vocabulary Library

These are useful descriptive directions, not rigid categories.

## Very light to fair skin examples

- very fair skin with cool pink undertones
- fair skin with scattered freckles
- pale skin with olive undertones
- light skin weathered by wind and sun
- porcelain-toned skin with visible age texture

Avoid:
- using “pale” as a synonym for beauty, nobility, or magic by default

## Medium to tan skin examples

- medium skin with warm golden undertones
- tan skin with olive undertones
- bronze skin with sun-weathered texture
- medium-deep skin with copper warmth
- warm brown skin with visible freckles

Avoid:
- describing every medium tone as simply “tan”

## Deep brown skin examples

- deep brown skin with warm red undertones
- rich brown skin with golden highlights
- deep umber skin with matte texture
- dark brown skin with cool undertones
- deep skin with luminous reflected light

Avoid:
- flattening all dark skin into one descriptor
- forgetting how light reflects on darker skin

## Very deep skin examples

- very deep brown skin with blue-red undertones
- blue-black skin under cool moonlight
- rich espresso-toned skin with soft sheen
- very deep skin with bronze edge highlights
- dark umber skin with weathered texture

Avoid:
- underlighting so severely that darker skin loses all detail
- treating very deep skin as a silhouette instead of skin

---

# 10. Skin Texture and Surface Detail

Skin texture helps characters feel lived-in.

Possible details:
- freckles
- moles
- sun damage
- scars
- stretch marks
- ritual paint
- calluses
- healed burns
- cracked lips
- dry cheeks
- subtle sheen
- acne scarring
- facial hair texture
- vitiligo
- tattoos
- age lines
- rough hands
- worn knees or elbows
- weather-beaten skin

Use these intentionally, not all at once.

---

# 11. Special Representation Notes

## Vitiligo

Can be used when visually and narratively appropriate.

Describe respectfully:
- patterned vitiligo across the face and hands
- soft depigmented patches across rich brown skin

Do not treat it as fantasy corruption unless the story explicitly says so.

## Scars

Scars can represent survival, ritual, profession, violence, or transformation.

Avoid:
- covering every “tough” character in meaningless scars
- putting facial scars on nearly every cool character

## Acne, texture, and pores

Not every face should be porcelain smooth.

Subtle realistic texture can improve authenticity.

## Body hair and facial hair

Use intentionally:
- arm hair
- chest hair
- facial hair
- braided beard
- soft body hair
- shaved head with stubble
- older facial texture

Avoid:
- making all female-presenting characters hairless
- making all male-presenting characters hyper-bearded

## Disability or bodily difference

When appropriate and approved, characters may include:
- limb difference
- prosthetics
- visible mobility support
- posture differences
- asymmetry
- scarring
- clouded eye
- missing fingers

These should be treated as part of character identity, not pity coding.

---

# 12. Prompt Assembly Guidance

## Body prompt formula

Use a clear sentence or clause that names the body intentionally.

Examples:

- a short, stocky, thick-limbed woman with a grounded fighter’s build
- a tall, soft-bodied man with a broad frame and calm commanding posture
- a lean, narrow-framed person with long limbs and a haunted stoop
- a large-bodied monk with a centered stance, low visible muscle definition, and controlled presence
- a fat druid with a broad soft frame, powerful hands, and a rooted stance

## Skin prompt formula

Examples:

- deep brown skin with warm golden undertones and weathered texture
- fair freckled skin with cool undertones and wind-worn cheeks
- medium-deep bronze skin with olive undertones and soft reflective highlights
- very deep umber skin with a subtle sheen and scar-marked hands
- pale olive skin with age lines and soft moonlit contrast

## Combined examples

- a tall, broad-framed, soft-bodied seraph with deep umber skin, cool undertones, and luminous golden edge light
- a short, compact barbarian with a thick powerful build, medium-deep brown skin, weathered texture, and old ritual scars
- a slim necromancer with a delicate frame, very deep skin, cool undertones, and hollow sleepless eyes
- a fat human knight with a large-bodied silhouette, practical posture, rich brown skin, and sun-worn cheeks
- a broad soft-bodied druid with warm brown skin, mossy ritual markings, and heavy grounded hands

---

# 13. Negative Prompt Guidance

Claude should explicitly avoid default body narrowing.

Useful exclusions when relevant:

- do not default to shredded abs
- avoid exaggerated bodybuilder proportions
- avoid identical athletic physiques across characters
- avoid pin-up sexualization
- avoid hyper-hourglass default anatomy
- avoid superhero V-torso as the universal body
- avoid porcelain-smooth skin on every character
- avoid flattening dark skin into shadow
- avoid treating fatness as comedic
- avoid making disability or bodily difference grotesque
- avoid stereotyped race-to-archetype pairings

---

# 14. Validation Checklist

Before accepting a prompt, verify:

## Body
- Is the body type clearly described?
- Is it more specific than “athletic” or “slim”?
- Does it avoid default hero-body repetition?
- Does it fit the character’s archetype, history, and vibe?
- Does it feel cool, intentional, and dignified?
- Would this character still look interesting without armor?
- Is the pose or posture supporting the body fantasy?

## Skin
- Is the skin tone clearly described?
- Is the undertone identified where useful?
- Is lighting likely to preserve skin detail?
- Is texture or surface detail included where useful?
- Does the description avoid flattening the character into a generic shade?

## Representation
- Does the prompt reinforce that multiple kinds of bodies can be powerful?
- Does it avoid archetype stereotypes?
- Does it avoid beauty hierarchy bias?
- Does it treat diversity as core design rather than token variation?

If several answers are weak, revise the prompt.

---

# 15. Recommended Implementation Guidance for Claude Code

This document should function as a companion reference resource for character generation.

Suggested integration:
1. Read this Bible when building portrait prompts.
2. Treat body type and skin tone as active prompt inputs.
3. Do not leave them implied.
4. Add structured fields for:
   - height
   - frame
   - build
   - muscle visibility
   - posture
   - skin depth
   - undertone
   - skin texture
   - distinctive physical details
5. Vary body and skin traits across generated characters.
6. Prevent overuse of one default physique.
7. Preserve locked body or skin traits during regeneration or evolution unless the lore says they change.
8. Ensure positive representation across archetypes and genders.

---

# 16. Suggested Structured Output

```json
{
  "bodyType": {
    "height": "short",
    "frame": "broad",
    "build": "large-bodied and soft but powerful",
    "muscleVisibility": "low visible muscle definition",
    "posture": "grounded and commanding"
  },
  "skinPresentation": {
    "depth": "deep brown",
    "undertone": "warm golden",
    "texture": "weathered with subtle scars",
    "lightingResponse": "warm reflected highlights across textured skin"
  },
  "designReason": "This body and skin direction reinforces a veteran barbarian who draws authority from survival, endurance, and presence rather than conventional athletic beauty."
}
```

---

# 17. Final Principle

A character should not need a narrow beauty standard to feel legendary.

Body diversity is part of the fantasy.

Skin diversity is part of the fantasy.

Claude should use these traits to make the cast feel larger, richer, and more human, not less heroic.
