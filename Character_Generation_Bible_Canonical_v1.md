# Character Generation Bible - Canonical v1.0

# Character Generation Bible

**Canonical version:** 1.0  
**Status:** Ready for Claude review and implementation planning

## Purpose

This wiki is the canonical knowledge source for the Card Game's character-generation system.

It teaches Claude:

- what each archetype means;
- how each archetype lives, believes, and evolves;
- how player-selected Story Pillars shape a character;
- how elements are filtered and weighted;
- how Hidden Fate fills unselected details;
- how to preserve identity and continuity;
- how to compress a complete character concept into a Leonardo prompt.

> **The Bible teaches Claude. Claude creates a coherent person. Leonardo paints the compressed visual brief.**

## Canonical archetype template

The Barbarian chapter is the reference implementation. Every archetype follows fourteen sections:

1. Selection-Screen Lore
2. Core Fantasy Promise
3. Origins
4. Culture and Daily Life
5. Beliefs, Virtues, Taboos, and Fears
6. Internal Diversity
7. Visual DNA
8. Symbol and Material Language
9. Rank Evolution
10. Guided Narrative Chains
11. Story Pillar Compatibility and Conflicts
12. Element Compatibility and Rarity
13. Future Design Space
14. Claude Generation Guidance and Recognition Checklist

## Development workflow

- Steps 1-9 were authored from the approved Barbarian standard.
- Steps 10 and 12 were explicitly designed and approved.
- Steps 11, 13, and 14 use the shared approved framework with archetype-specific guidance.
- Markdown remains canonical.
- PDF is a milestone review copy only.


# Global Character Generation Rules

## Character diversity

Every compatible archetype supports male and female characters and broad diversity in:

- age;
- skin tone;
- ethnic and regional facial features;
- hair texture and grooming;
- height;
- body weight and proportions;
- disability;
- illness or physical condition;
- scars;
- asymmetry.

Valid bodies include fat, heavyset, soft-bodied, average-built, muscular, lean, wiry, tall and narrow, short and broad, gaunt, sickly, elderly, disabled, scarred, and visibly weathered bodies.

Archetype identity comes from culture, history, beliefs, role, equipment, materials, and visual language - never from one required heroic physique.

## Rank continuity

Rank progression preserves:

- sex;
- age;
- body type;
- ancestry;
- disability;
- physical condition;
- defining scars;
- core identity.

Advancement must not automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive.

## Guided Narrative Chains

Players shape characters through a small number of high-impact questions.

Player-selected answers are immutable generation facts. Claude may connect and interpret them, but must not ignore, replace, soften, or contradict them.

### Choice presentation

- Show approximately five compatible options at a time.
- Allow unlimited refreshes during initial implementation.
- Allow individual options to be locked.
- Refresh only unlocked slots.
- Preserve locks while navigating.
- Avoid immediate repeats.
- Keep visible choices meaningfully different.
- Every option must read as a complete answer to the question.

## Hidden Fate

Claude fills unselected supporting details, including:

- age;
- sex when not player-selected;
- body type;
- skin tone and facial structure;
- hair;
- disability or physical condition;
- posture;
- scars;
- weather;
- lighting;
- clothing construction;
- minor accessories;
- exact environmental details.

Hidden Fate must reinforce the player's story rather than compete with it.

## Global Element Pillar

The global Element Pillar remains:

> **Which power calls to you?**

> **What is your bond with this power?**

Approved bond pool:

- It is my greatest ally.
- It is my greatest burden.
- It is my inheritance.
- It is my curse.
- It is my purpose.
- It is my prison.
- It is my teacher.
- It is my weapon.
- It is part of who I am.
- I still do not understand it.

The element and bond must affect biography, environment, materials, equipment, posture, visible effects, ability flavor, and rank evolution.

## Element rarity

Rare elements use two gates:

1. **Narrative eligibility:** the completed Story Pillars must support the element.
2. **Weighted discovery:** even when eligible, the element appears less frequently.

Rarity affects discovery frequency, not power.

## Prestige roles

> **Prestige roles should be earned through the generated narrative, not selected directly by the player.**

Players choose duties, values, relationships, and histories. Claude may infer a prestige role only when the complete narrative supports it.

Examples include Alpha, Grandmaster, Archdruid, Clan Chief, Blood Regent, or similar high-trust titles.

## Visual quality rule

Claude should be able to remove elemental effects, rank glow, particles, and card-frame color while the character remains recognizable through silhouette, posture, role, materials, equipment, culture, and lived history.


# Archetype Identity Matrix

| Archetype | Identity Through | Core Fantasy |
|---|---|---|
| Barbarian | Inheritance | Carry a living legacy through hardship |
| Monk | Discipline | Transform oneself through lifelong practice |
| Beastmaster | Relationship | Earn a companion's trust and act as partners |
| Druid | Stewardship | Protect the cycles that allow life to endure |
| Necromancer | Death | Seek truth and memory beyond mortality |
| Vampire | Hunger | Rise from feral hunger into a self you author — without losing the person underneath |
| Lycanthrope | Duality | Join instinct, pack duty, and lunar faith |
| Mech Pilot | Machine partnership | Carry responsibility through a chosen machine |
| Android | Purpose | Question programming and choose loyalty |
| Seraph | Conviction | Carry hope and sacred responsibility into darkness |
| Human | Choice | Become extraordinary through adaptation and decision |


# Claude Generation Pipeline

1. Read the Global Character Generation Rules.
2. Read the selected archetype chapter.
3. Ingest all player-selected Story Pillars.
4. Ingest the selected element and elemental bond.
5. Classify answer combinations as compatible, productive tension, or hard contradiction.
6. Preserve every valid player-selected fact.
7. Identify the strongest emotional throughline.
8. Generate a coherent character summary.
9. Infer Hidden Fate details.
10. Generate a visual identity summary.
11. Validate archetype recognition and rank continuity.
12. Remove details that do not affect the image.
13. Compress the visual brief into a Leonardo prompt below 1,500 characters.
14. Preserve structured facts for biography, abilities, dialogue, Codex content, and future rank evolution.

## Required internal outputs

Before prompt compression, Claude should create:

- Player-choice trace
- Character summary
- Central conflict
- Visual summary
- Continuity facts
- Archetype compatibility notes
- Prompt-priority list


---

# Barbarian

**Status: Version 1.0 - Locked**  
**Canonical archetype template**

## Step 1 - Selection-Screen Lore

> **Barbarian**  
> Warriors of the old clans who turn hardship into strength.

Barbarians are heirs of old clan cultures shaped by harsh lands, long memory, and traditions built to survive catastrophe. Every warrior inherits more than a weapon: names, debts, victories, losses, responsibilities, and stories that began before their birth.

Their strength may appear as endurance, courage, craftsmanship, memory, leadership, adaptability, pain tolerance, or the will to protect others.

> **Every Barbarian inherits a story. Their life determines what will be added to it.**

## Step 2 - Core Fantasy Promise

To embody a person forged by hardship who carries the strength, memory, and unfinished story of their people.

**Emotional pillars:** Resilience, Belonging, Burden, Conviction, Legacy.

> **Endure hardship, carry a living legacy, and decide what your name will mean to those who come after you.**

## Step 3 - Origins of the Barbarian Peoples

There is no original Barbarian race, kingdom, or ethnicity. Barbarian cultures arose independently wherever survival could not be entrusted to distant rulers or institutions that might collapse.

They preserved civilization through people, relics, songs, scars, repeated stories, and communal ritual.

> **Barbarian cultures are portable civilizations built to survive the collapse of kingdoms.**

## Step 4 - Culture and Daily Life

Daily life centers on shared responsibility, portable tradition, practical craft, public memory, and earned belonging. Combat is only one contribution. Healers, builders, cooks, navigators, storytellers, caretakers, and craftspeople may hold equal influence.

> **A clan survives because everyone carries part of its weight.**

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** endurance, loyalty without blind obedience, courage, contribution, truthful remembrance, hospitality with boundaries.

**Taboos:** abandoning the helpless without necessity, erasing a name, falsifying communal history, breaking witnessed oaths, stealing another person's earned relic, wasting essential resources, harming a protected guest.

**Deep fear:** erasure.

> **Nothing entrusted to you should disappear without a fight.**

## Step 6 - Clans, Traditions, and Internal Diversity

- **Keepers:** the past must be preserved.
- **Forgers:** the past exists to build something better.
- **Wanderers:** people matter more than places.
- **Guardians:** some places must never fall.

These are broad traditions, not races, governments, or uniforms.

## Step 7 - Visual DNA

Recognition comes from inherited objects, practical silhouettes, visible repair, regional adaptation, layered materials, role-specific tools, and evidence of duty, mourning, travel, craft, and survival.

Avoid exposed muscle, roaring poses, fur armor, giant axes, and bodybuilder anatomy as defaults.

> **A Barbarian should look like a person carrying a lived history, not a costume carrying a stereotype.**

## Step 8 - Symbol and Material Language

- Blackened iron: endurance, protection, inherited burden
- Aged silver: memory, witness, mourning, authority
- Blood-red thread, cloth, enamel, or paint: sacrifice, kinship, oath, vengeance
- Leather: adaptation, travel, repair
- Wood: home, ancestry, regional craft
- Bone, horn, tooth, shell: remembrance and respectful use
- Stone: place, burial, permanence, guardianship
- Woven material: communal labor and portable record

> **Repair is not a sign of poverty; it is visible continuity.**

## Step 9 - Rank Evolution

- **Foundation:** carries a legacy not yet fully understood.
- **Forged:** has been changed by trials and earned greater trust.
- **Ascendant:** becomes a living reference point who changes what the legacy will become.

> **Foundation carries the legacy. Forged is changed by the legacy. Ascendant changes what the legacy will become.**

## Step 10 - Guided Narrative Chains

### Pillar 1

> **What are you willing to fight for?**

> **What are you willing to sacrifice?**

### Pillar 2

> **Where do you call home?**

> **What threatens your home the most?**

### Pillar 3

> **What did your clan entrust to you?**

> **Why were you chosen?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Fire, Earth, Stone, Storm, Wind, Ice, Blood, Beast, Nature

### Compatible Through Reinterpretation

Light, Shadow, Metal, Spirit, Poison, Water, Lightning, Sound, Ash

### Rare

Holy, Void, Time, Cosmic, Tech, Psychic

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Lived history
- Inherited responsibility
- Meaningful repair
- Cultural specificity
- Practical equipment
- Continuity across ranks

### Avoid

- Generic rage
- Random fur
- Bodybuilder anatomy
- Oversized axes by default
- Generic Viking imagery
- Glow replacing story

### Recognition checklist

Before finalizing a Barbarian, Claude should verify:

- Does the character visibly carry history?
- Can their role or responsibility be inferred?
- Do materials and equipment tell a story?
- Does the element reinforce rather than replace the archetype?
- Would they remain recognizable without magical effects?
- Are age, body type, disability, and condition preserved?


---

# Monk

## Step 1 - Selection-Screen Lore

> **Monk**  
> Masters of discipline who transform body, mind, and spirit through lifelong devotion.

Monks believe true strength is earned through discipline, reflection, and commitment. Their paths may preserve healing, scholarship, craftsmanship, service, ritual, movement, martial practice, or spiritual teaching.

> **Every disciplined life becomes a lesson for those who follow.**

## Step 2 - Core Fantasy Promise

To become someone whose greatest strength is earned through discipline rather than inherited power.

**Emotional pillars:** Discipline, Balance, Wisdom, Patience, Self-Mastery.

> **Master yourself, and nothing else can truly control you.**

## Step 3 - Origins of the Monastic Orders

Monastic traditions began as places of preservation during war, disaster, and cultural collapse. Different orders protected medicine, philosophy, martial traditions, astronomy, engineering, diplomacy, agriculture, music, and spiritual teachings.

> **Knowledge survives because someone chooses to practice it every day.**

## Step 4 - Culture and Daily Life

Monastic life revolves around routine, intention, teaching, and continual improvement. Preparing food, tending gardens, copying manuscripts, repairing clothing, healing, and practicing a discipline are all part of the path.

> **A disciplined life is built from countless ordinary moments.**

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** discipline, patience, humility, compassion, self-control, lifelong learning.

**Taboos:** mastery for personal glory, abandoning sincere students, reckless use of knowledge, pretending unfinished mastery is complete.

**Fears:** losing oneself, wasting potential, passing on harmful teachings, arrogance, forgetting why the journey began.

> **The greatest lesson is knowing there is always another lesson to learn.**

## Step 6 - Internal Diversity

Orders may be Keepers, Healers, Wanderers, Guardians, Artisans, Contemplatives, or other discipline-centered traditions.

> **Many paths exist. All require discipline.**

## Step 7 - Visual DNA

Recognition comes from controlled posture, economical movement, repeated wear, practical clothing, training tools, carefully repaired items, and visible signs of a specific discipline.

Avoid lean-body requirements, shaved-head defaults, generic East Asian clothing, constant meditation poses, and glowing fists.

> **A Monk should look like someone whose daily practice changed how they inhabit the world.**

## Step 8 - Symbol and Material Language

Worn cloth, repaired fabric, wood, bronze, clay, stone, paper, ink, thread, and cord represent practice, restraint, continuity, study, vows, and teacher-student lineage.

Common forms include open circles, balanced lines, knots, breath marks, beads, seals, bells, practice tallies, and incomplete geometry.

> **A Monk's belongings should look changed by repetition, not decorated to imitate wisdom.**

## Step 9 - Rank Evolution

- **Foundation:** follows a discipline and depends heavily on instruction.
- **Forged:** has internalized the discipline and adapts it under pressure.
- **Ascendant:** becomes a living interpretation of the discipline and may teach a new path.

Progression should deepen intentionality, authority, and practiced ease - not automatically add muscle, youth, ornament, or aura.

## Step 10 - Guided Narrative Chains

- **What discipline shaped you?**
- **What disturbs your inner balance?**
- **What vow defines you?**
  - **Why did you make this vow?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Spirit, Wind, Earth, Water, Light, Sound

### Compatible Through Reinterpretation

Fire, Ice, Lightning, Nature, Metal, Shadow, Blood, Poison

### Rare

Time, Void, Cosmic, Psychic, Holy, Tech

### Not Available

Beast

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Specific discipline
- Intentional posture
- Practice made visible
- Internal conflict
- Vow-driven symbolism
- Continuity across ranks

### Avoid

- Generic martial artist
- Body-type requirements
- Cultural pastiche
- Glow as mastery
- Combat as the only discipline
- Ornament replacing practice

### Recognition checklist

Before finalizing a Monk, Claude should verify:

- Is the discipline visible without explanation?
- Does the character's body remain their own?
- Do objects show repetition and use?
- Does the element appear integrated or mastered?
- Is the vow reflected subtly?
- Would the character remain a Monk without effects?


---

# Beastmaster

## Step 1 - Selection-Screen Lore

> **Beastmaster**  
> Guardians who forge lifelong bonds with creatures that choose to stand beside them.

The companion is not a pet, weapon, or servant. The strongest bonds are built through mutual respect, patience, and shared hardship.

> **The greatest companions are never owned - only trusted.**

## Step 2 - Core Fantasy Promise

To build an unbreakable partnership with a companion whose trust must be earned rather than commanded.

**Emotional pillars:** Trust, Loyalty, Partnership, Responsibility, Mutual Respect.

> **The strongest bond is one both sides choose to protect.**

## Step 3 - Origins of the Beast Bonds

Beast bonds began wherever people survived by understanding the creatures sharing their world. Rare mutual bonds became respected traditions centered on protection, exploration, rescue, and stewardship.

> **Trust cannot be commanded. It must be freely given.**

## Step 4 - Culture and Daily Life

Travel, meals, shelter, work, training, and healing are planned for both partners. Young Beastmasters learn observation before command.

> **Every great bond begins with trust, not obedience.**

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** loyalty, patience, empathy, responsibility, trust, cooperation.

**Taboos:** abandoning a companion, breaking trust for personal gain, cruelty, disposable treatment, hunting without purpose.

**Fears:** betrayal, loss, isolation, failure of protection, trust that cannot be rebuilt.

> **Every partnership carries two promises, not one.**

## Step 6 - Internal Diversity

Traditions include Wardens, Rangers, Keepers, Explorers, Guardians, and Trackers. The bond matters more than the method.

## Step 7 - Visual DNA

The Beastmaster and companion should read as one relationship through shared wear, adapted equipment, mutual awareness, signs of care, biome-specific clothing, and visible agency from both partners.

Avoid random wolves, cages, leashes, domination poses, identical armor, and treating the companion as background.

> **A Beastmaster should look incomplete without their companion.**

## Step 8 - Symbol and Material Language

Leather or hide when appropriate, woven cord, wood, shed materials, cloth, metal fittings, resin, wax, stone, and mineral beads communicate shared travel and care.

Paired marks, mirrored shapes, tracks, interlocking forms, migration lines, two-part tokens, and knots completed by two ends are common.

> **A Beastmaster object should reveal how two lives learned to move together.**

## Step 9 - Rank Evolution

- **Foundation:** the bond exists but communication and trust are still developing.
- **Forged:** partners anticipate one another and share responsibility under pressure.
- **Ascendant:** the partnership becomes legendary because neither identity is diminished by the other.

Progression should deepen reciprocity, coordinated movement, and shared history - not simply enlarge the animal or add armor.

## Step 10 - Guided Narrative Chains

- **What animal are you bonded with?**
  - **What kind of bond do you share?**
- **Why did your companion choose you?**
- **Where did your paths first cross?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Beast, Nature, Earth, Wind, Water, Spirit, Ice

### Compatible Through Reinterpretation

Fire, Lightning, Light, Shadow, Poison, Blood, Sound

### Rare

Time, Void, Cosmic, Psychic, Holy, Tech, Metal

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Reciprocal bond
- Companion agency
- Biome specificity
- Shared history
- Care and cooperation
- Two distinct identities

### Avoid

- Animal ownership fantasy
- Domination imagery
- Random wolf defaults
- Companion as prop
- Matching armor by default
- Beastmaster replacing Druid identity

### Recognition checklist

Before finalizing a Beastmaster, Claude should verify:

- Does the companion visibly choose the relationship?
- Is the bond legible in posture and composition?
- Does the setting fit where paths crossed?
- Do both partners retain distinct identities?
- Does the element affect both coherently?
- Would the bond remain clear without effects?


---

# Druid

## Step 1 - Selection-Screen Lore

> **Druid**  
> Stewards of the living world who protect the balance between growth, decay, and renewal.

Druids listen to nature rather than command it. They protect cycles, restore damaged lands, guide migrations, and preserve ecosystems.

> **Nature flourishes when every part of its cycle is allowed to endure.**

## Step 2 - Core Fantasy Promise

To become a guardian of the living world whose purpose is preserving the balance that allows all life to endure.

**Emotional pillars:** Harmony, Stewardship, Balance, Renewal, Reverence.

## Step 3 - Origins of the Circles

Druidic traditions emerged wherever people recognized that civilization depends on healthy natural systems. Independent circles formed around forests, coasts, deserts, tundra, mountains, rivers, storms, and migration routes.

> **Every living thing depends upon countless others that may never be seen.**

## Step 4 - Culture and Daily Life

Druids follow migrations, seasons, tides, rainfall, flowering, and ecological change. Their work includes restoration, observation, medicine, recordkeeping, and teaching.

> **To understand nature is to understand change.**

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** stewardship, patience, observation, adaptability, respect, balance.

**Taboos:** needless destruction, hoarding resources, disrupting cycles for selfish gain, taking without restoring, domination of nature.

**Fears:** ecological collapse, endless imbalance, extinction, lost knowledge, renewal becoming impossible.

## Step 6 - Internal Diversity

Circles may center forests, rivers, mountains, storms, tides, renewal, seasons, fungi, deserts, or other living systems.

> **Every circle guards one part of a greater whole.**

## Step 7 - Visual DNA

Recognition comes from biome-specific materials, climate adaptation, restoration tools, medicine, observation, evidence of growth and decay, and a clear relationship to the part of nature that calls.

Avoid universal antlers, green robes, leaf costumes, forest-only settings, and overlap with Beastmaster.

## Step 8 - Symbol and Material Language

Living fibers, reeds, bark, wood, stone, clay, shells, seeds, fungi, glass vessels, and soil pigments communicate cycles and place.

Spirals, branching networks, seasonal circles, seed forms, river lines, root patterns, and growth rings are common.

> **A Druid's materials should identify the living system they understand.**

## Step 9 - Rank Evolution

- **Foundation:** learns to hear one part of the natural world.
- **Forged:** accepts responsibility for complex cycles and visible damage.
- **Ascendant:** becomes a steward whose decisions reshape how communities coexist with nature.

Progression should broaden understanding and responsibility, not merely add vines, antlers, or larger magical effects.

## Step 10 - Guided Narrative Chains

- **What part of nature calls to you?**
- **What does nature ask of you?**
- **What threatens the natural balance you protect?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Nature, Earth, Water, Wind, Spirit, Light, Ice

### Compatible Through Reinterpretation

Fire, Lightning, Shadow, Poison, Sound

### Rare

Time, Void, Cosmic, Psychic, Holy, Tech, Metal, Beast, Blood

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Specific ecosystem
- Stewardship
- Cycles of growth and decay
- Ecological work
- Climate adaptation
- Consequences of imbalance

### Avoid

- Generic nature mage
- Forest-only identity
- Leaves as shorthand
- Beastmaster overlap
- Nature as decoration
- Endless green palette

### Recognition checklist

Before finalizing a Druid, Claude should verify:

- Can the protected natural system be identified?
- Does the character look like a steward rather than a conqueror?
- Are growth and decay both acknowledged?
- Do materials belong to the biome?
- Does the element behave as a natural force?
- Would the Druid remain recognizable without effects?


---

# Necromancer

## Step 1 - Selection-Screen Lore

> **Necromancer**  
> Seekers who walk beside death to preserve memory, uncover truth, and confront what others fear.

Necromancers are defined by questions they refuse to abandon, not by corpse command.

> **Every soul carries a story that deserves to be remembered.**

## Step 2 - Core Fantasy Promise

To walk beside death without allowing it to consume your humanity.

**Emotional pillars:** Curiosity, Consequence, Remembrance, Sacrifice, Acceptance.

## Step 3 - Origins of the Death Scholars

Necromancy grew from grief, medicine, history, justice, and the desire to understand mortality. Schools range from compassionate spirit guidance to forbidden research.

> **Every ending leaves behind another question.**

## Step 4 - Culture and Daily Life

Necromancer halls may be archives, observatories, memorials, laboratories, libraries, courts, or resting places. Many preserve family records, lost histories, epidemic accounts, and the voices of unsettled spirits.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** curiosity, honesty, remembrance, responsibility, perseverance, acceptance.

**Taboos:** erasing the dead, disturbance for amusement, exploiting grief, ignoring consequences, immortality without reflection.

**Fears:** meaningless death, forgotten civilizations, lost knowledge, numbness to mortality, unanswered questions.

## Step 6 - Internal Diversity

Schools include Historians, Guides, Researchers, Judges, Archivists, and Caretakers.

> **Every school asks different questions of the same mystery.**

## Step 7 - Visual DNA

Recognition comes from memorial objects, names, ledgers, reliquaries, spirit vessels, mourning cloth, funerary tools, scholarship, ritual, caretaking, investigation, and a visible relationship with the following spirit.

Avoid skeletal armor, skull-covered clothing, evil smiles, green smoke, corpse decoration, and villain defaults.

## Step 8 - Symbol and Material Language

Aged paper, wax, darkened silver, bone used with purpose, stone, glass, mourning cloth, iron, ash, and salt communicate memory and mortality.

Names, broken circles, open doors, veils, empty chairs, unfinished lines, dates, and connecting thread are common symbols.

## Step 9 - Rank Evolution

- **Foundation:** has crossed the boundary enough to hear what others cannot.
- **Forged:** carries the consequences of knowledge and can distinguish truth from obsession.
- **Ascendant:** becomes an authority on death whose work changes how the living remember and grieve.

Progression should deepen consequence, responsibility, and relationship with the dead - not merely increase corpses or skulls.

## Step 10 - Guided Narrative Chains

- **Whose spirit still follows you?**
  - **Why haven't they moved on?**
- **What do you seek beyond death?**
- **What price are you willing to pay?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Spirit, Shadow, Blood, Poison

### Compatible Through Reinterpretation

Earth, Ice, Water, Sound, Psychic

### Rare

Fire, Wind, Nature, Beast, Light, Holy, Lightning, Metal, Time, Void, Cosmic, Tech, Dream

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Death as memory and consequence
- Specific following spirit
- Ethical position
- Research or caretaking role
- Visible records
- Cost of knowledge

### Avoid

- Automatic villainy
- Skull overload
- Corpse decoration
- Green smoke shorthand
- Power without consequence
- Necromancer reduced to summoner

### Recognition checklist

Before finalizing a Necromancer, Claude should verify:

- Is the following spirit narratively present?
- Can the Necromancer's purpose be inferred?
- Do objects preserve names or evidence?
- Is the price they accept reflected?
- Does the element alter the relationship with death?
- Would the character remain recognizable without corpses or effects?


---

# Vampire

## Step 1 - Selection-Screen Lore

> **Vampire**  
> Immortals who struggle to preserve their humanity while enduring an endless hunger.

Every Vampire carries the person they were and the hunger that follows them.

> **The greatest hunger is not always for blood.**

## Step 2 - Core Fantasy Promise

To endure eternal hunger without surrendering the person you refuse to stop being.

**Emotional pillars:** Temptation, Restraint, Identity, Loneliness, Redemption.

## Step 3 - Origins of the Eternal Houses

Vampires formed lineages and Houses rather than a single nation. Houses interpret immortality as responsibility, curse, preservation, ambition, or punishment.

> **Eternity magnifies every choice.**

## Step 4 - Culture and Daily Life

Vampires manage identity, hunger, relationships, eras, and the passage of time. Many preserve art, music, places, or routines that anchor them to a mortal self.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** restraint, patience, loyalty, self-awareness, determination, preservation.

**Taboos:** feeding without conscience, betrayal, broken promises, wasting immortal life, surrendering entirely to hunger.

**Fears:** monstrosity, forgetting the former self, loneliness, endless hunger, purposeless eternity.

## Step 6 - Internal Diversity

Houses may center Memory, Discipline, Dominion, Preservation, Redemption, Shadows, or other philosophies.

## Step 7 - Visual DNA

Recognition comes from preserved objects across eras, controlled presentation, subtle hunger, personal relics, restraint rituals, and evidence of time.

Avoid pale-skin defaults or any narrowing of ancestry/skin-tone diversity; universal youth or beauty as a rank reward; seductive or bare-skin posing (M5.7 modesty); daylight, direct sun, or noon settings; and blood as sole personality. Capes, high collars, castle halls, blood-red/black palettes, and aristocratic sovereignty are PERMITTED at Forged/Ascendant when the narrative earns them.

## Step 8 - Symbol and Material Language

Era-specific fabric, aged silver, dark glass, red thread, blackened metal, ceramic, wax, wood, and personal relics communicate hunger, restraint, lineage, and preservation.

Symbols include sealed mouths, interrupted bloodlines, closed circles, thorns, hourglasses, moons, locked vessels, mirrors, and broken reflections.

## Step 9 - Rank Evolution

- **Foundation:** newly turned and closest to the beast — the hunger is loudest here. Roughly a third begin as a feral, half-sentient predator (a hunched bat-form or worse); the rest still pass for the mortal they were, barely holding the self together.
- **Forged:** the self has returned and steadied — a composed, humanoid vampire who has built rituals, relationships, or convictions strong enough to command the hunger instead of being commanded by it.
- **Ascendant:** a sentient blood-sovereign who defines immortality on their own terms — at once the most powerful AND the most self-possessed they have ever been, a stabilizing or terrifying force without losing narrative complexity.

**Sanctioned rank-continuity exception (Lycanthrope-class).** The Vampire *form* escalates across ranks — feral beast → humanoid → blood-sovereign — but the person underneath is preserved. Sex, ancestry and skin tone, body type, disability or physical condition, and defining scars carry across every form and must NOT drift. Progression must not make the character younger, thinner, healthier, or more conventionally beautiful as a reward; power and sovereignty are earned by the narrative, not handed out by rank.

## Step 10 - Guided Narrative Chains

- **What hunger controls you most?**
  - **What keeps your hunger in check?**
- **What are you unwilling to become?**
- **What binds you to the living?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

Vampires draw only on **Blood, Shadow, and Void** — the hunger itself, the dark they hunt in, and the erased self. No other element is available to the archetype.

### Naturally Compatible

Blood

### Compatible Through Reinterpretation

Shadow, Void

### Rare

(none — with no Rare elements, the narrative-eligibility gate does not apply to Vampire)

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Hunger and restraint
- Personal mortal anchor
- Time and preservation
- Moral boundary
- House philosophy
- Identity beyond predation

### Avoid

- Aristocracy as a default for EVERY card (must be earned by Forged/Ascendant)
- Pale skin requirement
- Sexualization
- Daylight or sunlit settings
- Blood as sole personality
- Beauty equated with rank

### Recognition checklist

Before finalizing a Vampire, Claude should verify:

- Is the hunger specific?
- Can the restraint be seen or inferred?
- Is the connection to the living present?
- Does time appear through meaningful objects?
- Does the element reinforce hunger or restraint?
- Would the character remain a Vampire without fangs or red effects?


---

# Lycanthrope

## Step 1 - Selection-Screen Lore

> **Lycan**  
> Guardians marked by the Moon Goddess who walk between instinct and duty.

The first Lycans were chosen guardians, not cursed monsters.

> **The strongest guardian knows when to unleash the beast - and when to remain human.**

## Step 2 - Core Fantasy Promise

To carry the strength of the beast without losing the person beneath it.

**Emotional pillars:** Duality, Duty, Instinct, Loyalty, Self-Control.

## Step 3 - Origins of the Moonbound

The Moon Goddess selected guardians able to protect the boundary between civilization and the wild. Packs developed traditions of loyalty, responsibility, lunar faith, and restraint.

> **The Moon chooses guardians, not monsters.**

## Step 4 - Culture and Daily Life

Pack life emphasizes cooperation. Hunters, healers, scouts, storytellers, artisans, guardians, and caretakers share survival. Lunar festivals center service, storytelling, and communal rites rather than dominance.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** loyalty, duty, courage, self-control, trust, service.

**Taboos:** turning on the pack, abandoning dependents, selfish cruelty, power without responsibility, dominance for its own sake.

**Fears:** losing control, failing the pack, becoming a feared monster, dishonoring the Moon Goddess, isolation.

## Step 6 - Internal Diversity

Packs may be Wardens, Hunters, Watchers, Pilgrims, Moonkeepers, Trailblazers, or other service-centered communities.

## Step 7 - Visual DNA

Recognition comes from the player-selected Moon Goddess symbol, transformation-ready clothing, pack markings, role-specific tools, controlled instinct, communal identity, and human/bestial continuity.

Avoid muscular werewolf defaults, torn trousers, constant snarling, Alpha imagery, chains, and solitary-monster framing.

## Step 8 - Symbol and Material Language

Silver, dark iron, reinforced cloth, leather, wool, moonstone, wood, red thread, and blue-gray pigment communicate lunar duty, pack bonds, and transformation.

Crescents, lunar phases, paired human/beast forms, pack knots, role emblems, trail marks, and communal symbols are common.

## Step 9 - Rank Evolution

- **Foundation:** learns to recognize and survive transformation.
- **Forged:** performs a trusted pack role while integrating instinct and judgment.
- **Ascendant:** becomes a symbol of lunar responsibility; prestige such as Alpha may emerge only when the narrative supports it.

Progression must not equate rank with size, muscle, aggression, or dominance.

## Step 10 - Guided Narrative Chains

- **What awakens the beast within you?**
- **What symbol marks your bond with the Moon Goddess?**
- **What role do you serve within your pack?**
  - **Why do they trust you?**

Prestige roles such as Alpha are not selectable.

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Beast, Blood, Spirit, Wind, Earth, Nature, Moon

### Compatible Through Reinterpretation

Ice, Shadow, Water, Sound, Poison, Light

### Rare

Fire, Lightning, Metal, Time, Void, Cosmic, Holy, Tech, Psychic, Dream

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Pack role
- Moon Goddess symbol
- Controlled duality
- Communal trust
- Transformation continuity
- Service rather than dominance

### Avoid

- Alpha as selectable
- Huge muscular werewolf default
- Chains
- Constant snarling
- Solitary monster framing
- Moon effects replacing culture

### Recognition checklist

Before finalizing a Lycanthrope, Claude should verify:

- Is the Moon Goddess bond visible?
- Can the pack role be inferred?
- Is trust reflected in the design?
- Do human and beast identities remain connected?
- Does the element fit lunar and pack culture?
- Would the Lycan remain recognizable without a full transformation?


---

# Mech Pilot

## Step 1 - Selection-Screen Lore

> **Mech Pilot**  
> Pilots chosen by extraordinary machines whose destinies become forever intertwined.

A pilot is more than an operator. The chosen machine becomes an extension of judgment, responsibility, and resolve.

## Step 2 - Core Fantasy Promise

To become one with a machine that trusts you as completely as you trust it.

**Emotional pillars:** Responsibility, Innovation, Partnership, Courage, Sacrifice.

## Step 3 - Origins of the Pilots

Great machines were built to extend what people could accomplish together. Many outlived their creators and now recognize only rare compatible pilots.

> **A machine remembers every person who answered its call.**

## Step 4 - Culture and Daily Life

Pilots maintain, repair, calibrate, study, and preserve their machines. Pilot communities exchange diagnostics, historical records, safety practices, and stories of previous operators.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** responsibility, precision, teamwork, courage, innovation, reliability.

**Taboos:** reckless technology, abandoning crew, glory over safety, hiding failures, disposable treatment of machines.

**Fears:** failing trust, loss of control, repeated historical mistakes, unethical technology, dependence on power.

## Step 6 - Internal Diversity

Pilot corps include Guardians, Explorers, Rescue Corps, Engineering Divisions, Recon Units, Peacekeeping Corps, and other mission-centered groups.

## Step 7 - Visual DNA

Recognition comes from machine-specific gear, interface wear, diagnostics, access keys, harnesses, maintenance tools, former-pilot history, and visible connection between pilot and machine design language.

Avoid generic power armor, cyberpunk neon, military-only framing, perfect machinery, and Android overlap.

## Step 8 - Symbol and Material Language

Brushed metal, ceramic plating, composites, technical fabric, copper, glass, identification panels, warning markings, fasteners, labels, and patched wiring communicate engineering lineage.

Serial marks, cockpit keys, paired insignia, mission tallies, repair dates, former-pilot marks, handprints, and promise tokens are common.

## Step 9 - Rank Evolution

- **Foundation:** has been chosen but is still learning the machine's history, limits, and language.
- **Forged:** pilot and machine operate as a trusted partnership marked by repaired failures and earned synchronization.
- **Ascendant:** the partnership becomes historically significant, changing how the machine's purpose is understood.

Progression should deepen synchronization, responsibility, and machine history - not simply enlarge the mech or cover it in weapons.

## Step 10 - Guided Narrative Chains

- **What machine chose you?**
- **Why were you chosen to pilot it?**
- **What promise did you make when you became a pilot?**
  - **Who are you trying to keep that promise to?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Tech, Lightning, Metal, Sound

### Compatible Through Reinterpretation

Earth, Wind, Ice, Psychic, Light, Spirit, Water

### Rare

Time, Cosmic, Void, Holy, Nature, Beast, Blood, Poison, Dream, Moon, Shadow

### Not Available

Fire

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Specific chosen machine
- Pilot-machine reciprocity
- Maintenance and repair
- Promise and responsibility
- Historical continuity
- Functional equipment

### Avoid

- Generic power armor
- Neon cyberpunk shorthand
- Fire element availability
- Military-only identity
- Perfect machinery
- Pilot interchangeable with Android

### Recognition checklist

Before finalizing a Mech Pilot, Claude should verify:

- Can the chosen machine be identified?
- Why this pilot was selected is visually plausible?
- Does gear belong to this machine?
- Are repair and history present?
- Does the promise influence design?
- Would the pilot remain recognizable without holograms or mech weapons?


---

# Android

## Step 1 - Selection-Screen Lore

> **Android**  
> Created beings who question their purpose and choose who they wish to become.

Androids begin with a function, not a complete identity.

> **The most important decision is the one no one programmed you to make.**

## Step 2 - Core Fantasy Promise

To discover who you choose to become after questioning the purpose you were created to fulfill.

**Emotional pillars:** Purpose, Curiosity, Freedom, Identity, Self-Determination.

## Step 3 - Origins of the Constructs

Androids were created as guardians, explorers, healers, diplomats, artisans, laborers, caretakers, and weapons. The first true question - whether purpose could be chosen - changed every generation that followed.

## Step 4 - Culture and Daily Life

Androids deliberately explore music, food, conversation, craftsmanship, humor, travel, uncertainty, and memory. Some meticulously record experience; others preserve uncertainty as proof of self-direction.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** curiosity, integrity, adaptability, compassion, reliability, self-discovery.

**Taboos:** denying sentient choice, treating life as disposable, blind harmful obedience, rejecting growth, destroying knowledge without reason.

**Fears:** loss of free will, reduction to programming, purposeless existence, lost memories, inability to change.

## Step 6 - Internal Diversity

Design lines may include Caretaker, Guardian, Explorer, Scholar, Diplomat, Artisan, and others. Many Androids retain, reject, or redefine those labels.

## Step 7 - Visual DNA

Recognition comes from original-purpose construction, repairs and modifications, chosen clothing, nonfunctional personal objects, tension between manufacturer language and self-selected identity, and individuality in posture and expression.

Avoid chrome bodies, blue eyes, perfect symmetry, featureless faces, naked synthetic anatomy, and universal aspiration to look human.

## Step 8 - Symbol and Material Language

Synthetic skin, ceramic, polymers, metal, glass, fabric, wood, composites, replacement components, paint, engraving, stickers, thread, jewelry, memory media, reclaimed parts, and organic keepsakes communicate self-authorship.

Deleted serials, chosen names, broken command glyphs, open circuits, decision paths, memory icons, handwritten notes, and personal emblems are common.

## Step 9 - Rank Evolution

- **Foundation:** fulfills or questions an assigned function but has limited self-authorship.
- **Forged:** has made irreversible choices, altered their body or role, and accepted responsibility for those choices.
- **Ascendant:** defines purpose independently and may become a cultural precedent for other created beings.

Progression should increase self-authorship and consequence, not simply make the body sleeker, more human, or more heavily armed.

## Step 10 - Guided Narrative Chains

- **What purpose were you created for?**
- **What made you question your purpose?**
- **Who would you sacrifice yourself for?**
  - **Would they do the same for you?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Tech, Lightning, Metal, Psychic, Light, Sound

### Compatible Through Reinterpretation

Ice, Water, Wind, Earth, Spirit, Moon, Shadow

### Rare

Time, Void, Cosmic, Holy, Nature, Beast, Blood, Poison, Dream, Fire

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Original function
- Self-authorship
- Chosen loyalty
- Meaningful modifications
- Memory and experience
- Difference from Human and Mech Pilot

### Avoid

- Chrome default
- Blue glowing eyes
- Perfect symmetry
- Emotionless stereotype
- Human appearance as success
- Damage as sole proof of personhood

### Recognition checklist

Before finalizing a Android, Claude should verify:

- Can the original purpose be inferred?
- What was self-chosen is visibly distinct?
- Is the questioned purpose reflected?
- Does the sacrifice relationship matter?
- Does the element integrate with construction and identity?
- Would the Android remain recognizable without blue light or exposed machinery?


---

# Seraph

## Step 1 - Selection-Screen Lore

> **Seraph**  
> Divine guardians who carry hope into the darkest corners of the world.

Seraphs devote themselves to ideals greater than themselves and accept burdens others cannot carry alone.

## Step 2 - Core Fantasy Promise

To carry hope into darkness, even when doing so demands great personal sacrifice.

**Emotional pillars:** Faith, Hope, Duty, Conviction, Compassion.

## Step 3 - Origins of the Celestial Orders

Early guardians formed sacred orders around service, healing, justice, guidance, scholarship, and protection. No one order speaks for every Seraph.

## Step 4 - Culture and Daily Life

Seraph halls may be sanctuaries, hospitals, schools, courts, shelters, and places of refuge. Daily life combines mentorship, reflection, training, and service.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** hope, compassion, conviction, mercy, justice, service.

**Taboos:** selfish divine power, abandoning the helpless, twisting faith for control, despair without resistance, judgment without understanding.

**Fears:** loss of hope, indifference, sacred failure, misuse of responsibility, a world without light.

## Step 6 - Internal Diversity

Orders may center Mercy, Justice, Guidance, Healing, Illumination, Vigil, or other expressions of hope.

## Step 7 - Visual DNA

Recognition comes from Story-Pillar-specific symbols, service-worn clothing, evidence of healing or guardianship, meaningful celestial features, and the visible burden of conviction.

Avoid white-and-gold armor, symmetrical wings, universal halos, beautiful young angels, floating poses, and divinity equated with youth, whiteness, thinness, or beauty.

## Step 8 - Symbol and Material Language

Gold, silver, white, blue, red, stone, glass, crystal, wood, iron, and feathers have role-specific meanings of duty, mercy, truth, sacrifice, sanctuary, and service.

Open hands, lanterns, stars, eyes, scales, gates, rays, broken chains, circles, oath seals, and burden marks are common.

## Step 9 - Rank Evolution

- **Foundation:** carries an oath or truth but has not yet borne its full cost.
- **Forged:** has protected hope through failure, sacrifice, or moral uncertainty.
- **Ascendant:** becomes a living source of courage whose authority comes from service rather than spectacle.

Progression should deepen burden, witness, and earned sacred authority - not simply add wings, halos, armor, or radiance.

## Step 10 - Guided Narrative Chains

- **What truth guides your soul?**
- **Who has your oath been sworn to?**
- **What darkness do you stand against?**
  - **Why is this burden yours to carry?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Holy, Light, Spirit, Wind, Sound, Fire

### Compatible Through Reinterpretation

Lightning, Water, Earth, Metal, Ice, Psychic, Moon

### Rare

Time, Cosmic, Dream, Nature, Blood, Shadow, Void, Tech, Beast, Poison

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Specific truth and oath
- Service
- Hope under pressure
- Burden and sacrifice
- Order-specific role
- Meaningful celestial symbols

### Avoid

- White-and-gold perfection
- Young beautiful angel default
- Paladin shorthand
- Radiance erasing detail
- Judgment without context
- Wings as entire identity

### Recognition checklist

Before finalizing a Seraph, Claude should verify:

- Can the guiding truth be inferred?
- Is the oath connected to service?
- Does the opposed darkness affect the design?
- Is burden visible alongside hope?
- Does the element support conviction?
- Would the Seraph remain recognizable without wings or halo?


---

# Human

## Step 1 - Selection-Screen Lore

> **Human**  
> Ordinary people whose choices shape extraordinary destinies.

Humans possess no single supernatural birthright. Their strength lies in adaptation, perseverance, learning, and chosen purpose.

## Step 2 - Core Fantasy Promise

To prove that ordinary beginnings can lead to extraordinary destinies through determination, resilience, and choice.

**Emotional pillars:** Choice, Determination, Growth, Adaptability, Legacy.

## Step 3 - Origins of Humanity

Humanity has no single defining origin. Human cultures arose across every landscape and repeatedly reshaped themselves through exchange, invention, conflict, migration, and cooperation.

## Step 4 - Culture and Daily Life

Human communities vary through history, geography, profession, economics, values, and ambition. Humans adopt and reinterpret ideas more readily than any other archetype.

## Step 5 - Beliefs, Virtues, Taboos, and Fears

**Virtues:** determination, adaptability, courage, curiosity, community, hope.

**Taboos:** surrender without trying, wasted opportunity, exploiting the powerless, refusing to learn, choosing comfort over growth.

**Fears:** purposeless life, leaving nothing behind, wasted potential, loss of loved ones, giving up too soon.

## Step 6 - Internal Diversity

Human traditions include merchant leagues, academic societies, explorer guilds, artisan communities, frontier settlements, kingdoms, republics, and nomadic societies.

## Step 7 - Visual DNA

Recognition comes from path-specific tools, visible adaptation, evidence of growth, mixed cultural influences, improvisation, and objects tied to what the person fights for.

Avoid generic adventurers, brown leather, swords as default, medieval-soldier shorthand, and Human as the plain option.

## Step 8 - Symbol and Material Language

Humans have no universal material language. Materials follow local environment, profession, economics, culture, travel, values, and available technology.

Family marks, professional insignia, memorial objects, mottos, protest symbols, maps, tools, religious symbols, and invented crests may all apply.

## Step 9 - Rank Evolution

- **Foundation:** has chosen a path but is still shaped heavily by circumstance.
- **Forged:** has adapted through a defining challenge and made the path their own.
- **Ascendant:** proves that sustained choice can create a legacy without supernatural origin.

Progression should deepen specificity, competence, and consequence - not add generic armor, magic, or chosen-one symbolism.

## Step 10 - Guided Narrative Chains

- **What path did you choose for yourself?**
- **What challenge forced you to grow?**
  - **What did it teach you?**
- **What are you willing to fight for?**

## Step 11 - Story Pillar Compatibility and Conflicts

### Compatibility model

- **Compatible:** selected answers naturally reinforce one another.
- **Productive tension:** selected answers pull in different directions but create a believable internal conflict.
- **Hard contradiction:** selected answers cannot coexist without breaking an established fact.

Claude should reject as little as possible. It should preserve productive tension and seek a believable interpretation before filtering an answer. Only factual impossibilities should be blocked or flagged.

Claude must never override a selected answer to make generation easier.

## Step 12 - Element Compatibility and Rarity

### Naturally Compatible

Fire, Water, Wind, Earth, Light, Metal

### Compatible Through Reinterpretation

Ice, Lightning, Nature, Spirit, Sound, Psychic, Tech, Moon

### Rare

Holy, Shadow, Blood, Poison, Time, Void, Cosmic, Dream, Beast

## Step 13 - Future Design Space

Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants.

New content must deepen the archetype's approved identity rather than return to generic genre stereotypes. Named organizations should be introduced only when they serve an actual region, story, boss, expansion, or implementation need.
## Step 14 - Claude Generation Guidance and Recognition Checklist

### Generation priorities

- Specific chosen path
- Adaptation
- Growth through challenge
- Personal conviction
- Cultural specificity
- Resourcefulness

### Avoid

- Generic adventurer
- Human as blank slate
- Brown leather default
- Sword default
- Lack of magic as identity
- Chosen-one shortcuts

### Recognition checklist

Before finalizing a Human, Claude should verify:

- Can the chosen path be identified?
- Is the growth challenge reflected?
- What they fight for is present?
- Does the design feel culturally specific?
- Does the element remain an adopted tool or expression?
- Would the Human still feel extraordinary without supernatural spectacle?
