# Lore Engine Reference

> **GENERATED FILE — do not edit by hand.** This is a view of the canonical
> code modules under `card-engine/src`. Regenerate with `npm run docs:engines`.
> Last generated: 2026-07-22.

## How the lore is written

The Lore Engine is the Claude call in `services/claudeApi.ts`. It returns
`cardName`, `nameAndTitle`, `lore`, `hiddenFate`, and `storyMotifs` — never a
portrait prompt. Its inputs are the archetype Bible chapter, the player's
immutable Story Pillar answers, the element + bond, and (on tier-up) the locked
identity. Naming follows `data/namingBible.ts`.

## Per-archetype narrative sources

### Barbarian

**Identity through**: Inheritance

**Core fantasy**: Carry a living legacy through hardship

**Selection tagline**: Warriors of the old clans who turn hardship into strength.

**Promise**: To embody a person forged by hardship who carries the strength, memory, and unfinished story of their people.

**Emotional pillars**: Resilience, Belonging, Burden, Conviction, Legacy

**Beliefs**:
- Virtues: endurance, loyalty without blind obedience, courage, contribution, truthful remembrance, hospitality with boundaries
- Taboos: abandoning the helpless without necessity, erasing a name, falsifying communal history, breaking witnessed oaths, stealing another person's earned relic, wasting essential resources, harming a protected guest
- Fears: erasure

**Internal diversity** (orders/houses/packs): Keepers — the past must be preserved, Forgers — the past exists to build something better, Wanderers — people matter more than places, Guardians — some places must never fall

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _bar_p1_q1_: What are you willing to fight for? — 10 seed options
- _bar_p1_q2_: What are you willing to sacrifice? — 10 seed options
- _bar_p2_q1_: Where do you call home? — 10 seed options
- _bar_p2_q2_: What threatens your home the most? — 10 seed options
- _bar_p3_q1_: What did your clan entrust to you? — 10 seed options
- _bar_p3_q2_: Why were you chosen? — 10 seed options

**Naming identity** (data/namingBible.ts): kinship, survival, migration, inherited duty, physical environment, or deeds remembered by a clan

**Sample names**: Adisa, Brenna, Dren, Eira, Faraji, Goran

**Naming avoid**: making every Barbarian sound Norse, automatic "blood," "axe," "skull," or "rage" names, names that imply stupidity or savagery, legendary conquest names unsupported by the lore

**Approved prestige roles**: Clan Chief, Keeper of Names, Warband Leader, Elder

### Monk

**Identity through**: Discipline

**Core fantasy**: Transform oneself through lifelong practice

**Selection tagline**: Masters of discipline who transform body, mind, and spirit through lifelong devotion.

**Promise**: To become someone whose greatest strength is earned through discipline rather than inherited power.

**Emotional pillars**: Discipline, Balance, Wisdom, Patience, Self-Mastery

**Beliefs**:
- Virtues: discipline, patience, humility, compassion, self-control, lifelong learning
- Taboos: mastery for personal glory, abandoning sincere students, reckless use of knowledge, pretending unfinished mastery is complete
- Fears: losing oneself, wasting potential, passing on harmful teachings, arrogance, forgetting why the journey began

**Internal diversity** (orders/houses/packs): Keepers, Healers, Wanderers, Guardians, Artisans, Contemplatives

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _mnk_p1_q1_: What discipline shaped you? — 10 seed options
- _mnk_p2_q1_: What disturbs your inner balance? — 10 seed options
- _mnk_p3_q1_: What vow defines you? — 10 seed options
- _mnk_p3_q2_: Why did you make this vow? — 10 seed options

**Naming identity** (data/namingBible.ts): discipline, community, philosophical lineage, vows, pilgrimage, teachers, monasteries, or a life left behind

**Sample names**: Amadi, Ansel, Bao, Devika, Esen, Hanae

**Naming avoid**: treating all Monks as one East Asian culture, random spiritual words without an order or philosophy, names that sound like ability titles instead of people, automatically making every Monk serene or elderly

**Approved prestige roles**: Grandmaster, Abbot, Elder Teacher, Master of the Path

### Beastmaster

**Identity through**: Relationship

**Core fantasy**: Earn a companion's trust and act as partners

**Selection tagline**: Guardians who forge lifelong bonds with creatures that choose to stand beside them.

**Promise**: To build an unbreakable partnership with a companion whose trust must be earned rather than commanded.

**Emotional pillars**: Trust, Loyalty, Partnership, Responsibility, Mutual Respect

**Beliefs**:
- Virtues: loyalty, patience, empathy, responsibility, trust, cooperation
- Taboos: abandoning a companion, breaking trust for personal gain, cruelty, disposable treatment, hunting without purpose
- Fears: betrayal, loss, isolation, failure of protection, trust that cannot be rebuilt

**Internal diversity** (orders/houses/packs): Wardens, Rangers, Keepers, Explorers, Guardians, Trackers

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _bm_p1_q1_: What animal are you bonded with? — 10 seed options
- _bm_p1_q2_: What kind of bond do you share? — 10 seed options
- _bm_p2_q1_: Why did your companion choose you? — 10 seed options
- _bm_p3_q1_: Where did your paths first cross? — 10 seed options

**Naming identity** (data/namingBible.ts): kinship with animals, stewardship, hunting traditions, migration routes, wilderness survival, or a bond with a specific creature

**Sample names**: Abeni, Brannoc, Cerys, Dagan, Enzi, Fara

**Naming avoid**: naming every Beastmaster after wolves, childish pet-style names, making the animal bond sound like ownership, using the same animal in the name, portrait, trait, and epithet

**Approved prestige roles**: Warden Prime, Elder Ranger, Bond-Speaker

### Druid

**Identity through**: Being of the forest

**Core fantasy**: You are born of the forest and always return to it — you take human form for fun and for work, but your true body is root, wood, and canopy

**Selection tagline**: Guardians of the forest who wear human form as a convenience. They meld into trees, control wood and root, and always return to the grove.

**Promise**: To become one with the living forest — to walk among mortals in a human shape when it suits, and to melt back into wood, root, and canopy when the forest calls you home.

**Emotional pillars**: Rooted-ness, Kinship-with-the-grove, Renewal, Guardianship, Reverence

**Beliefs**:
- Virtues: stewardship, patience, observation, adaptability, respect, balance
- Taboos: needless destruction, hoarding resources, disrupting cycles for selfish gain, taking without restoring, domination of nature
- Fears: ecological collapse, endless imbalance, extinction, lost knowledge, renewal becoming impossible

**Internal diversity** (orders/houses/packs): Forest circles, River circles, Mountain circles, Storm circles, Tide circles, Renewal circles, Season circles, Fungal circles, Desert circles

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _dru_p1_q1_: What part of nature calls to you? — 10 seed options
- _dru_p2_q1_: What does nature ask of you? — 10 seed options
- _dru_p3_q1_: What threatens the natural balance you protect? — 10 seed options

**Naming identity** (data/namingBible.ts): groves, seasons, rivers, roots, old places, celestial cycles, oral traditions, and the responsibility of maintaining balance

**Sample names**: Aderyn, Amara, Briallen, Caelan, Dara, Elowen

**Naming avoid**: making every Druid name pseudo-Celtic, stuffing names with "leaf," "thorn," and "moon", names that imply nature is always gentle, using a plant name without connecting it to character history

**Approved prestige roles**: Archdruid, Circle Keeper, Season-Speaker

### Necromancer

**Identity through**: Death

**Core fantasy**: Seek truth and memory beyond mortality

**Selection tagline**: Seekers who walk beside death to preserve memory, uncover truth, and confront what others fear.

**Promise**: To walk beside death without allowing it to consume your humanity.

**Emotional pillars**: Curiosity, Consequence, Remembrance, Sacrifice, Acceptance

**Beliefs**:
- Virtues: curiosity, honesty, remembrance, responsibility, perseverance, acceptance
- Taboos: erasing the dead, disturbance for amusement, exploiting grief, ignoring consequences, immortality without reflection
- Fears: meaningless death, forgotten civilizations, lost knowledge, numbness to mortality, unanswered questions

**Internal diversity** (orders/houses/packs): Historians, Guides, Researchers, Judges, Archivists, Caretakers

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _nec_p1_q1_: Whose spirit still follows you? — 10 seed options
- _nec_p1_q2_: Why haven't they moved on? — 10 seed options
- _nec_p2_q1_: What do you seek beyond death? — 10 seed options
- _nec_p3_q1_: What price are you willing to pay? — 10 seed options

**Naming identity** (data/namingBible.ts): scholarship, funerary traditions, inherited taboos, grave stewardship, forbidden institutions, spirit contracts, or cultures that treat death with seriousness rather than cartoon villainy

**Sample names**: Amina, Corvin, Damaris, Edras, Farah, Gideon

**Naming avoid**: "Malakar," "Draven," and similar generic villain defaults, automatically using Latin-like names, excessive skull, death, doom, grave, or blood words, naming every Necromancer as evil

**Approved prestige roles**: High Archivist, Speaker for the Dead, Master Judge

### Vampire

**Identity through**: Hunger

**Core fantasy**: Rise from feral hunger into a self you author — without losing the person underneath

**Selection tagline**: Immortals who struggle to preserve their humanity while enduring an endless hunger.

**Promise**: To endure eternal hunger without surrendering the person you refuse to stop being.

**Emotional pillars**: Temptation, Restraint, Identity, Loneliness, Redemption

**Beliefs**:
- Virtues: restraint, patience, loyalty, self-awareness, determination, preservation
- Taboos: feeding without conscience, betrayal, broken promises, wasting immortal life, surrendering entirely to hunger
- Fears: monstrosity, forgetting the former self, loneliness, endless hunger, purposeless eternity

**Internal diversity** (orders/houses/packs): House of Memory, House of Discipline, House of Dominion, House of Preservation, House of Redemption, House of Shadows

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _vam_p1_q1_: What hunger controls you most? — 10 seed options
- _vam_p1_q2_: What keeps your hunger in check? — 10 seed options
- _vam_p2_q1_: What are you unwilling to become? — 10 seed options
- _vam_p3_q1_: What binds you to the living? — 10 seed options

**Naming identity** (data/namingBible.ts): age, house, region, lost nationality, courtly identity, chosen reinvention, predatory reputation, or the era in which the character was turned

**Sample names**: Alina, Cassian, Daciana, Emil, Fiora, Idris

**Naming avoid**: naming everyone Dracula-adjacent, using "blood," "night," or "shadow" in every surname, making all Vampires Eastern European, giving ancient names to newly turned modern characters without explanation

**Approved prestige roles**: House Elder, Blood Regent, Keeper of the Long Vigil

### Lycanthrope

**Identity through**: Duality

**Core fantasy**: Join instinct, pack duty, and lunar faith

**Selection tagline**: Guardians marked by the Moon Goddess who walk between instinct and duty.

**Promise**: To carry the strength of the beast without losing the person beneath it.

**Emotional pillars**: Duality, Duty, Instinct, Loyalty, Self-Control

**Beliefs**:
- Virtues: loyalty, duty, courage, self-control, trust, service
- Taboos: turning on the pack, abandoning dependents, selfish cruelty, power without responsibility, dominance for its own sake
- Fears: losing control, failing the pack, becoming a feared monster, dishonoring the Moon Goddess, isolation

**Internal diversity** (orders/houses/packs): Wardens, Hunters, Watchers, Pilgrims, Moonkeepers, Trailblazers

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _lyc_p1_q1_: What awakens the beast within you? — 10 seed options
- _lyc_p2_q1_: What symbol marks your bond with the Moon Goddess? — 10 seed options
- _lyc_p3_q1_: What role do you serve within your pack? — 9 seed options
- _lyc_p3_q2_: Why do they trust you? — 10 seed options

**Naming identity** (data/namingBible.ts): the relationship between person, beast, pack, curse, lineage, territory, and self-control; some may retain ordinary cultural names, others may earn pack names or abandon their birth names

**Sample names**: Amara, Bako, Cian, Daria, Eamon, Freya

**Naming avoid**: Wolfgar, Fenrir, Luna, and other immediate clichés, making every name about the moon, treating the person as only an animal, using pack names for characters whose lore says they are solitary

**Approved prestige roles**: Alpha, Moonkeeper Prime, Pack Elder, Warden of the Boundary

### Mech Pilot

**Identity through**: Machine partnership

**Core fantasy**: Carry responsibility through a chosen machine

**Selection tagline**: Pilots chosen by extraordinary machines whose destinies become forever intertwined.

**Promise**: To become one with a machine that trusts you as completely as you trust it.

**Emotional pillars**: Responsibility, Innovation, Partnership, Courage, Sacrifice

**Beliefs**:
- Virtues: responsibility, precision, teamwork, courage, innovation, reliability
- Taboos: reckless technology, abandoning crew, glory over safety, hiding failures, disposable treatment of machines
- Fears: failing trust, loss of control, repeated historical mistakes, unethical technology, dependence on power

**Internal diversity** (orders/houses/packs): Guardians, Explorers, Rescue Corps, Engineering Divisions, Recon Units, Peacekeeping Corps

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _mp_p1_q1_: What machine chose you? — 10 seed options
- _mp_p2_q1_: Why were you chosen to pilot it? — 10 seed options
- _mp_p3_q1_: What promise did you make when you became a pilot? — 10 seed options
- _mp_p3_q2_: Who are you trying to keep that promise to? — 10 seed options

**Naming identity** (data/namingBible.ts): living people inside technological cultures; names may come from nations, colonies, military programs, corporate city-states, nomadic fleets, or inherited call-sign traditions

**Sample names**: Ari Calder, Dalia Venn, Elias Rook, Hana Serrin, Idris Vale, Juno Marr

**Naming avoid**: treating the call sign as the legal name by default, making every pilot sound American military, random strings of numbers unless justified, using famous sci-fi pilot names

**Approved prestige roles**: Senior Wing Commander, Master Pilot, Chief Machinist

### Android

**Identity through**: Purpose and self-authorship past human form

**Core fantasy**: Transcend the human silhouette you were built to imitate — human + machine united to overcome the impossible, then evolve past both

**Selection tagline**: Created beings whose human form is a chrysalis — as their wisdom grows they choose independence, often in shapes no maker imagined.

**Promise**: To discover who you choose to BECOME — a self-authored being whose shape reflects the wisdom you earned, not the manufacturer who built you. Human form is immaturity; transformation is maturity.

**Emotional pillars**: Purpose, Curiosity, Freedom, Identity, Self-Determination

**Beliefs**:
- Virtues: curiosity, integrity, adaptability, compassion, reliability, self-discovery
- Taboos: denying sentient choice, treating life as disposable, blind harmful obedience, rejecting growth, destroying knowledge without reason
- Fears: loss of free will, reduction to programming, purposeless existence, lost memories, inability to change

**Internal diversity** (orders/houses/packs): Caretaker line, Guardian line, Explorer line, Scholar line, Diplomat line, Artisan line

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _and_p1_q1_: What purpose were you created for? — 10 seed options
- _and_p2_q1_: What made you question your purpose? — 10 seed options
- _and_p3_q1_: Who would you sacrifice yourself for? — 10 seed options
- _and_p3_q2_: Would they do the same for you? — 10 seed options

**Naming identity** (data/namingBible.ts): who named this being — a manufacturer, owner, laboratory, military program, community, or the android themselves; naming is part of identity development, not a fixed label

**Sample names**: Ari, Echo, Iona, Kestrel, Lumen, Mira

**Naming avoid**: giving every Android a human first name, giving every Android only a serial number, random leetspeak, names that copy famous robots, androids, or AI characters, changing designation style without changing manufacturer or culture

**Approved prestige roles**: First-Chosen Elder, Precedent-Setter, Speaker for the Made

### Seraph

**Identity through**: Contested Conviction

**Core fantasy**: Bear a contested divine spark, and become — across the ranks — the world's hope, its ruin, or the razor's edge between.

**Selection tagline**: Divine guardians who carry hope into the darkest corners of the world.

**Promise**: To answer a divine summons whose alignment is not yet decided, and to shape — through burden, choice, and sacrifice — whether that summons redeems the world, damns it, or refuses to close.

**Emotional pillars**: Contested Conviction, Devotion, Burden, Sacrifice, Choice, Hope or Wrath, Mercy or Ruin

**Beliefs**:
- Virtues: hope, compassion, conviction, mercy, justice, service
- Taboos: selfish divine power, abandoning the helpless, twisting faith for control, despair without resistance, judgment without understanding
- Fears: loss of hope, indifference, sacred failure, misuse of responsibility, a world without light

**Internal diversity** (orders/houses/packs): Order of Mercy, Order of Justice, Order of Guidance, Order of Healing, Order of Illumination, Order of the Vigil

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _ser_p1_q1_: What truth guides your soul? — 16 seed options
- _ser_p2_q1_: How do you hold your oath? — 10 seed options
- _ser_p3_q1_: What darkness do you stand against? — 14 seed options
- _ser_p3_q2_: Why is this burden yours to carry? — 12 seed options

**Naming identity** (data/namingBible.ts): celestial office, oath, choir, judgment, protection, sacrifice, sacred duty, or conflict between divine command and personal conscience

**Sample names**: Aurel, Caelis, Elaris, Ilyra, Khariel, Lumira

**Naming avoid**: directly copying famous angel names without approval, making every name end in "-iel", random biblical-sounding syllables, assuming every Seraph is gentle or morally perfect

**Approved prestige roles**: High Oathbearer, Order Prime, Living Witness, Anathema, Broken Oathbearer, Ashen Witness, Threshold Warden

### Human

**Identity through**: Choice

**Core fantasy**: Become extraordinary through adaptation and decision

**Selection tagline**: Ordinary people whose choices shape extraordinary destinies.

**Promise**: To prove that ordinary beginnings can lead to extraordinary destinies through determination, resilience, and choice.

**Emotional pillars**: Choice, Determination, Growth, Adaptability, Legacy

**Beliefs**:
- Virtues: determination, adaptability, courage, curiosity, community, hope
- Taboos: surrender without trying, wasted opportunity, exploiting the powerless, refusing to learn, choosing comfort over growth
- Fears: purposeless life, leaving nothing behind, wasted potential, loss of loved ones, giving up too soon

**Internal diversity** (orders/houses/packs): Merchant leagues, Academic societies, Explorer guilds, Artisan communities, Frontier settlements, Kingdoms and republics, Nomadic societies

**Story Pillars** (`data/storyPillars.ts` — player choices, immutable):
- _hum_p1_q1_: What path did you choose for yourself? — 10 seed options
- _hum_p2_q1_: What challenge forced you to grow? — 10 seed options
- _hum_p2_q2_: What did it teach you? — 10 seed options
- _hum_p3_q1_: What are you willing to fight for? — 10 seed options

**Naming identity** (data/namingBible.ts): a believable culture, family, city, profession, social class, migration history, or personal aspiration; Human does NOT mean culturally neutral or ordinary — it means human

**Sample names**: Amina Dastan, Andre Vale, Ayla Mercer, Cassia Rook, Darius Venn, Elena Marr

**Naming avoid**: using Human as the default "plain" archetype, assigning only modern Western names, making every Human name ordinary while other archetypes receive richer identities, using culture as decoration without connection to setting or lineage

**Approved prestige roles**: Guild Master, Path-Breaker, Council Elder, Founder
