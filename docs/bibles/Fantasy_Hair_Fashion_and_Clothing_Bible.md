> **STATUS — DESIGN SOURCE (not canonical implementation).** The canonical, current-state reference is generated from code: see [`IMAGE_ENGINE_REFERENCE.md`](IMAGE_ENGINE_REFERENCE.md) at the repo root, regenerated via `npm run docs:engines`. This document is the original design rationale the code was built from — consult it for intent, not current values.

# Fantasy Hair, Fashion, and Clothing Bible

**Version:** 1.0  
**Project:** Card Game  
**Purpose:** Canonical visual reference for hairstyle, hair texture, grooming, clothing, armor, textiles, accessories, and costume culture in generated character portraits  
**Primary users:** Claude Code, Claude API prompt generation, Leonardo prompt construction, lore direction, and future art-direction workflows  
**Scope:** Hair and fashion only  
**Current archetypes covered:** Barbarian, Monk, Beastmaster, Druid, Necromancer, Vampire, Lycanthrope, Mech Pilot, Android, Seraph, Human

---

# 1. Why This Resource Exists

The portrait-generation system currently relies too heavily on costume shorthand.

Examples of weak shorthand include:

- Barbarian = fur and crude iron
- Monk = simple robe and wraps
- Beastmaster = animal pelt and leather straps
- Druid = leaves and vines
- Necromancer = tattered black robe and skulls
- Vampire = gothic coat and cape
- Seraph = white robe and gold plate
- Mech Pilot = gray armor and blue lights
- Android = white chrome body
- Human = modern athletic wear

These ideas can be valid, but they are not complete visual cultures.

When Claude only knows a few surface-level motifs, Leonardo tends to repeat the same:

- long flowing hair
- shaved sides
- generic braid
- straight white magical hair
- black hood
- leather armor
- fur shoulder mantle
- generic robe
- decorative cape
- polished plate armor

This Bible teaches Claude to think like a fantasy costume designer.

Hair and clothing should communicate:

- culture
- social class
- profession
- rank
- age
- climate
- environment
- belief
- history
- wealth
- labor
- warfare
- ritual
- rebellion
- transformation
- whether the character is heroic, villainous, aristocratic, practical, celestial, infernal, scholarly, feral, synthetic, or ordinary

The objective is not to make every outfit more complicated.

The objective is to make every visual decision more intentional.

---

# 2. Core Principles

## 2.1 Hair is identity, not filler

Hair can communicate:

- ancestry
- grooming tradition
- religious practice
- rank
- occupation
- age
- status
- grief
- exile
- vanity
- practicality
- transformation
- supernatural influence

Do not leave hair as “long dark hair” unless simplicity is a deliberate character decision.

## 2.2 Clothing is constructed in layers

Do not think:

> robes

Think:

> soft linen undertunic, quilted shoulder yoke, overlapping wool robe panels, braided sash, wrapped forearms, worn prayer beads, and a weatherproof traveling mantle

Do not think:

> armor

Think:

> padded arming coat beneath articulated steel plates, riveted leather faulds, engraved gorget, fitted vambraces, and a scarred half-cape fastened with a clan brooch

## 2.3 Archetype is a culture lens, not a uniform

Each archetype must support multiple costume roles:

- hero
- villain
- aristocrat
- worker
- scholar
- wanderer
- soldier
- priest
- exile
- monarch
- cultist
- survivor
- celestial
- infernal
- ceremonial
- battlefield

A Vampire can be a ruined courtier, battlefield noble, decadent aristocrat, plague physician, monastery predator, or armored house champion.

A Monk can be a village guardian, desert ascetic, wealthy temple official, wandering healer, masked enforcer, or corrupted abbess.

## 2.4 Real cultures inspire systems, not stereotypes

Cultural inspiration may inform:

- textile construction
- silhouette
- layering
- closures
- weaving
- embroidery
- armor engineering
- hair practice
- jewelry
- headwear
- ceremonial roles

Do not assign one real culture permanently to one archetype.

Do not use a culture as shorthand for:

- primitive
- savage
- mystical
- evil
- exotic
- technologically advanced
- spiritually superior

## 2.5 Skin tone does not determine costume culture

Hair texture may interact naturally with ancestry and grooming traditions, but skin tone alone must never dictate:

- clothing culture
- archetype
- class
- morality
- wealth
- hairstyle
- historical inspiration

A deep-skinned Vampire may belong to a desert court, an island dynasty, a northern city, or an invented culture. Do not force every dark-skinned character into the same visual language.

## 2.6 Clothing should fit the body

The costume must be designed around the character’s actual body.

Examples:

- armor plates shaped for a large soft torso
- wrapped robes that drape correctly over a broad body
- tailored coats fitted to a narrow frame
- high-waisted armor that supports a pear-shaped silhouette
- belts, straps, and closures placed believably
- fabric tension and folds consistent with body mass
- protective garments adapted for transformation or prosthetics

Do not generate one standard costume silhouette and simply stretch it over different bodies.

---

# 3. Hair Design Framework

A complete hair description should consider:

1. texture
2. density
3. length
4. silhouette
5. grooming method
6. parting or arrangement
7. condition
8. adornment
9. movement
10. relationship to headwear or armor
11. color
12. magical or environmental influence

---

# 4. Hair Texture Vocabulary

Use texture precisely.

## Straight textures

- pin-straight
- fine straight
- thick straight
- coarse straight
- silky straight
- heavy straight
- blunt straight
- wind-whipped straight

## Wavy textures

- loose waves
- broad waves
- deep waves
- beach-worn waves
- thick undulating hair
- uneven natural waves
- brushed waves
- wet waves

## Curly textures

- loose curls
- springy curls
- dense curls
- ringlets
- corkscrew curls
- broad curls
- cloud-like curls
- frizzed curls
- weather-expanded curls

## Coily textures

- tight coils
- dense coils
- compact coils
- soft coils
- spring-like coils
- cloud-shaped coils
- stretched coils
- twist-defined coils
- tightly coiled crown

## Locs and locked styles

- short locs
- long locs
- freeform locs
- maintained locs
- thick locs
- micro-locs
- high loc crown
- half-tied locs
- braided locs
- wrapped locs
- silver-threaded locs

## Braided structures

- single heavy braid
- twin braids
- crown braid
- side braid
- rope braid
- box braids
- cornrow-inspired geometric braids
- braided topknot
- multiple narrow warrior braids
- braided beard
- woven braid loops
- asymmetrical braiding

## Shaved and cropped styles

- clean-shaven scalp
- close crop
- textured crop
- shaved sides
- temple shave
- undercut
- high fade
- low fade
- cropped coils
- shaved ceremonial pattern
- uneven field-cut hair

Use culturally specific terminology only when the cultural reference is intentional and researched.

---

# 5. Hair Color Vocabulary

## Natural dark colors

- blue-black
- soft black
- warm black
- espresso
- dark chocolate
- black-brown
- deep chestnut
- mahogany
- dark auburn

## Medium and warm colors

- chestnut
- walnut brown
- copper brown
- auburn
- burnt sienna
- cinnamon
- bronze-brown
- honey brown
- warm umber

## Light colors

- ash brown
- sandy brown
- dark blonde
- wheat blonde
- honey blonde
- pale gold
- flaxen
- silver-blonde
- cream-white

## Gray and age-related colors

- iron gray
- salt-and-pepper
- silver
- white at the temples
- smoke gray
- pewter
- streaked gray
- snow white

## Fantasy colors

Use only when supported by lore:

- moon-silver
- blood-red
- ember-copper
- spectral violet
- frost-blue
- moss-green
- star-white
- obsidian-black with colored sheen

Fantasy color should usually appear through:

- streaks
- tips
- light response
- magical veins
- ritual dye
- transformation
- supernatural aging

Avoid making every magical character’s entire head of hair neon.

---

# 6. Hair Condition and Surface

Useful descriptors:

- polished
- oiled
- carefully groomed
- brushed smooth
- wind-tangled
- rain-darkened
- sweat-damp
- ash-dusted
- salt-stiffened
- sun-bleached
- frayed
- matted
- battlefield-cut
- ceremonially perfumed
- frost-crusted
- braided with waxed cord
- singed at the ends
- wet with mist
- dust-coated
- unevenly self-cut

Condition should reflect the setting and lifestyle.

---

# 7. Facial Hair and Grooming

Facial hair can communicate age, culture, profession, discipline, neglect, status, or transformation.

Options include:

- clean-shaven
- faint stubble
- heavy stubble
- close-trimmed beard
- full beard
- forked beard
- braided beard
- mustache
- curled mustache
- chin beard
- sideburns
- ritual beard rings
- patchy beard
- silver beard
- wolfish facial fur
- synthetic beard plating
- ceremonial false beard

Do not assume:

- every male-presenting Barbarian has a beard
- every Monk is clean-shaven
- every Vampire is smooth-faced
- every older person has gray facial hair
- facial hair must be masculine

---

# 8. Hair Accessories

## Practical

- leather ties
- cloth wraps
- waxed cord
- bone pins
- wooden combs
- metal clasps
- hair cages
- helmet braids
- braid weights
- protective scarves
- sweat bands

## Aristocratic

- jeweled pins
- gold combs
- pearl chains
- silver filigree
- velvet ribbons
- enamel clasps
- miniature crowns
- hair nets
- ornamental veils

## Sacred

- prayer cords
- vow ribbons
- holy beads
- halo pins
- moon crescents
- funeral veils
- sacred thread
- shrine bells
- carved wooden pins

## Infernal or villainous

- blackened chains
- thorned combs
- iron rings
- charred beads
- bone hooks
- blood-red silk cords
- spiked crowns
- metal cages

Avoid loading every hairstyle with accessories. Choose one or two that matter.

---

# 9. Hair and Headwear Interaction

Claude must describe whether hair is:

- fully covered
- partially visible
- braided beneath a helmet
- compressed beneath a hood
- spilling around a crown
- threaded through armor
- shaved for a sealed helmet
- gathered above a gorget
- tucked beneath a veil
- floating around a halo
- emerging through mechanical ports

Common failures to avoid:

- hair clipping through armor
- giant hair under a close helmet
- hoods floating above hair volume
- crowns resting impossibly on thick curls
- locs passing through solid plate
- loose hair near exposed machinery without explanation

---

# 10. Clothing Construction Framework

Build outfits through layers.

A useful order is:

1. base layer
2. primary garment
3. structural layer
4. armor or protection
5. waist system
6. outer layer
7. footwear
8. hand and arm treatment
9. accessories
10. weathering
11. rank-specific ornament
12. magical or technological integration

Not every costume needs all twelve.

---

# 11. Base Layers

Examples:

- linen undershirt
- sleeveless cotton tunic
- padded arming coat
- quilted gambeson
- wool under-robe
- silk shift
- wrapped chest cloth
- fitted leather underlayer
- breathable mesh
- synthetic pressure suit
- ceremonial body wrap
- bark-fiber inner garment
- chainmail shirt
- infernal chainmail underlayer
- celestial woven-light lining

Base layers explain how the outfit works.

---

# 12. Fabric and Textile Library

## Linen

Visual qualities:

- breathable
- matte
- lightly wrinkled
- practical
- capable of fine embroidery
- good for desert, monastery, village, healer, and worker clothing

## Wool

Visual qualities:

- heavy
- warm
- textured
- woven
- felted
- weather-resistant
- suitable for cloaks, tunics, cold climates, and rugged travel

## Cotton-like fantasy textiles

Visual qualities:

- soft
- practical
- dyed
- quilted
- layered
- suitable for everyday city, village, military, and ceremonial wear

## Silk

Visual qualities:

- flowing
- reflective
- aristocratic
- ceremonial
- delicate or heavily brocaded
- suitable for Vampire courts, Seraphic robes, noble Humans, and elite Monks

## Velvet

Visual qualities:

- deep color
- light-absorbing
- rich
- heavy
- dramatic
- suitable for aristocrats, villains, Vampires, and court clothing

## Brocade

Visual qualities:

- woven motifs
- metallic thread
- formal
- dense
- ceremonial
- suitable for royal, sacred, and elite costume

## Leather

Differentiate:

- soft leather
- vegetable-tanned leather
- boiled leather
- lacquered leather
- cracked leather
- suede
- rawhide
- embossed leather
- stitched leather
- scale-cut leather

Do not use “leather armor” as a complete outfit.

## Fur and hide

Differentiate:

- short fur
- shaggy fur
- trimmed fur
- spotted hide
- weathered pelt
- shearling lining
- fur-edged collar
- raw hide panels
- ceremonial animal-free imitation fur where lore requires it

## Bark cloth and plant fiber

- bark-fiber weave
- nettle cloth
- reed matting
- woven grass
- leaf-fiber textile
- root-cord mesh
- mushroom leather
- pressed petals
- living vine lattice

## Metal textiles

- chainmail
- ring mesh
- scale mail
- lamellar
- bead-like metal weave
- flexible plate links
- silver-thread mesh
- celestial chain
- infernal chainmail
- mechanical cable weave

---

# 13. Armor Library

## Padded armor

- quilted gambeson
- layered felt armor
- padded vest
- stitched shoulder guards
- reinforced cloth coat

Useful for Foundation warriors and practical cultures.

## Leather armor

- molded cuirass
- layered leather plates
- lacquered leather scales
- reinforced harness
- boiled-leather shoulder caps
- flexible leather faulds

## Chainmail

- fine ring mail
- heavy chain shirt
- riveted mail
- blackened mail
- silvered mail
- bronze ring mesh
- infernal chainmail
- celestial micro-chain

## Scale and lamellar

- overlapping bronze scales
- lacquered lamellar
- bone lamellar
- horn scales
- leaf-shaped metal scales
- moon-silver lamellae
- synthetic ceramic scales

## Plate armor

- partial plate
- articulated plate
- fluted plate
- engraved plate
- blackened plate
- gilded plate
- celestial plate
- infernal plate
- asymmetrical salvaged plate
- ceremonial parade plate
- battlefield plate
- aristocratic dueling plate

## Celestial plate

Celestial plate may include:

- ivory enamel
- polished gold
- pale silver
- sunburst fluting
- feather-shaped articulation
- halo-like gorgets
- blue-white luminous seams
- scripture-like engraving without real-world sacred text
- light-woven underlayers

It should not always be clean and benevolent.

Possible variants:

- radiant hero plate
- war-scarred guardian plate
- severe judgment plate
- fallen celestial plate
- mourning plate
- eclipse plate

## Infernal chainmail

Infernal chainmail may include:

- blackened iron rings
- ember-red inner glow
- hooked links
- uneven forged texture
- smoke-darkened metal
- heat-warped rings
- chain curtains
- ritual chains
- red enamel rivets
- scorched leather backing
- volcanic glass accents

Avoid:
- covering it in generic red fire
- making it indistinguishable from normal black chainmail
- adding spikes everywhere without construction logic

---

# 14. Garment Construction Vocabulary

Use words such as:

- wrapped
- pleated
- layered
- belted
- draped
- tailored
- quilted
- stitched
- riveted
- laced
- buckled
- knotted
- braided
- embroidered
- appliquéd
- beaded
- patched
- mended
- fringed
- scalloped
- folded
- panelled
- split-skirted
- asymmetrical
- high-collared
- open-fronted
- cross-wrapped
- side-fastened

---

# 15. Wear and Condition

## New or elite

- polished
- immaculate
- sharply tailored
- mirror-bright
- ceremonial
- freshly dyed
- carefully maintained
- heirloom quality

## Used

- softened by wear
- faded
- creased
- scratched
- repaired
- patched
- oil-darkened
- edge-worn
- travel-stained
- sun-bleached

## Battlefield

- cut
- scorched
- dented
- blood-stained
- mud-caked
- torn
- hastily stitched
- notched
- smoke-blackened
- cracked

## Ancient

- tarnished
- oxidized
- moth-eaten
- brittle
- threadbare
- funerary-preserved
- salt-stained
- mineral-encrusted
- time-darkened

Wear should tell a story. Do not add “battle-worn” without specifying how.

---

# 16. Fashion Roles

## Heroic

Heroic clothing should communicate:

- clarity
- purpose
- readiness
- recognizable silhouette
- a meaningful personal emblem
- practical movement
- aspirational detail

Heroic does not mean clean, bright, or muscular.

## Villainous

Villain fashion should communicate:

- control
- ideology
- threat
- status
- obsession
- distortion
- ritual
- violation of expected construction

Useful tools:

- severe tailoring
- asymmetry
- restrictive silhouettes
- excessive collars
- chain veils
- hidden hands
- blood-dark textiles
- inverted sacred motifs
- pristine clothing in ruined settings
- ceremonial armor built for intimidation

Avoid:
- black clothing alone as villain coding
- random spikes
- skulls everywhere

## Aristocratic

Aristocratic clothing may include:

- tailored coats
- brocade
- velvet
- silk lining
- heirloom jewelry
- house colors
- fitted gloves
- decorative armor
- long controlled silhouettes
- layered collars
- court shoes or boots
- subtle wealth rather than excessive gold

Aristocratic does not mean European-only.

## Common or working

Useful elements:

- practical layers
- repaired seams
- regional weaving
- apron-like panels
- carrying straps
- durable footwear
- weatherproof cloaks
- tool belts
- reused material
- family jewelry
- local dye

## Ceremonial

Ceremonial clothing can be:

- impractical
- symbolic
- highly layered
- color-coded
- masked
- crowned
- veiled
- embroidered
- restricted in movement
- worn only for vows, funerals, coronations, hunts, or transformations

## Celestial

Celestial fashion may include:

- luminous textiles
- floating hems
- feather-shaped plate
- star-thread embroidery
- gold filigree
- ivory and pale blue layers
- radiant veils
- halo crowns
- severe judgment armor
- mourning whites
- sun-black eclipse cloth

## Infernal

Infernal fashion may include:

- charred velvet
- blackened chainmail
- heat-warped plate
- crimson lining
- hooked clasps
- scorched ceremonial robes
- smoke-dark leather
- ash veils
- volcanic glass jewelry
- chains used as rank markers
- furnace-like vents
- ritualized damage

Infernal does not automatically mean naked, demonic, or covered in flame.

---

# 17. Rank Progression Through Fashion

## Foundation

- practical materials
- incomplete sets
- repaired items
- one signature accessory
- little ornament
- local or personal clothing
- obvious construction
- limited armor coverage

## Forged

- reinforced garments
- purposeful layering
- improved tailoring
- clearer cultural identity
- earned trophies or insignia
- partial ceremonial elements
- stronger material contrast
- improved armor articulation

## Ascendant

- complete visual language
- elite or legendary craftsmanship
- meaningful regalia
- lore-specific damage or repair
- unique silhouette
- integrated magic or technology
- unmistakable status
- accessories tied to established history

Ascendant does not always mean “more gold.”

---

# 18. Archetype Hair and Fashion Guides

---

## BARBARIAN

### Costume Culture

Barbarian fashion should communicate:

- clan history
- survival knowledge
- regional climate
- inherited craft
- trophies with meaning
- practical repair
- ritual identity

Do not reduce the archetype to fur underwear and bare abs.

### Hair Directions

- dense coils tied with leather cord
- freeform locs wrapped in clan-colored cloth
- short practical crop
- thick wind-tangled waves
- shaved temples with a braided central strip
- long iron-gray hair in a low knot
- compact curls under a fur-lined hood
- multiple narrow braids with bronze weights
- asymmetrical battlefield cut
- full unbound hair used as a dramatic silhouette
- clean-shaven head marked with ritual paint
- braided beard or beaded mustache when culturally supported

### Clothing Directions

#### Hero

- layered wool and hide over a quilted vest
- clan-woven sash
- reinforced bracers
- practical boots
- repaired iron shoulder plate
- one meaningful trophy
- weatherproof traveling cloak

#### Villain

- blackened scale armor over dark woven cloth
- trophy chains
- severe fur collar
- ritual face veil
- polished execution weapon harness
- clan symbols intentionally defaced

#### Aristocrat or chieftain

- richly dyed wool
- patterned woven coat
- bronze or silver torc
- embroidered hide mantle
- heirloom lamellar
- carved belt fittings
- ceremonial boots
- controlled silhouette rather than random trophies

#### Infernal

- heat-darkened hide
- infernal chainmail
- ember-red stitching
- charred wool mantle
- hooked iron clasps
- volcanic glass beads
- no generic flames

### Textures

- shaggy fur
- felted wool
- cracked leather
- hammered iron
- bone polish
- woven geometric cloth
- scarred hide
- rain-darkened fabric

### Avoid

- identical shirtless bodybuilders
- one fur shoulder on every card
- horned helmet as default
- random “tribal” decoration without a culture
- Viking-only styling

---

## MONK

### Costume Culture

Monk fashion should communicate:

- discipline
- order
- climate
- labor
- training
- philosophy
- ritual hierarchy
- personal vows

Monks can come from desert, mountain, forest, urban, maritime, or synthetic orders.

### Hair Directions

- shaved head
- close-cropped coils
- long hair tied in a practical knot
- crown braid
- wrapped locs
- short curls
- silver hair gathered with a vow cord
- temple shave with remaining hair braided
- hair fully covered by a training scarf
- uncut hair as a sacred vow
- severe blunt bob for an urban order
- carefully groomed beard or deliberate clean shave

### Clothing Directions

#### Hero

- layered linen robe
- wrapped forearms
- split skirt panels for movement
- practical sash
- soft training shoes or bare feet where appropriate
- prayer beads
- weatherproof mantle

#### Villain or corrupted abbot

- immaculate dark robes
- restrictive high collar
- weighted sleeves
- chain prayer beads
- severe embroidered rank panels
- polished mask
- hidden hands

#### Aristocratic temple official

- fine silk-brocade robe
- structured shoulder panels
- gold-thread order insignia
- formal over-vest
- carved bead necklace
- layered cuffs
- ceremonial headpiece

#### Battle monk

- quilted robe armor
- lacquered forearm guards
- lamellar shoulder pieces
- wrapped torso
- split coat tails
- reinforced boots
- compact traveling pack

### Textures

- matte linen
- quilted cotton
- worn wraps
- polished wood beads
- lacquered leather
- brushed silk
- weathered wool

### Avoid

- every Monk being bald
- one generic orange robe
- using sacred real-world symbols casually
- all Monks being thin and barefoot

---

## BEASTMASTER

### Costume Culture

Beastmaster fashion should reflect:

- the animals they live beside
- the climate they travel through
- practical movement
- stewardship
- hunting or tracking
- mutual bonds
- regional craft

Animal material use must match the lore. A Beastmaster who protects animals may use shed feathers, naturally lost antlers, woven imitations, or inherited materials rather than fresh kills.

### Hair Directions

- wind-tangled curls
- long braid wrapped in tracking cord
- cropped coils beneath a leather cap
- feather-threaded braids
- thick locs tied high for mobility
- rain-darkened straight hair
- shaggy layered cut
- animal-inspired grooming without becoming costume
- shaved sides with a long tracking braid
- soft gray hair under a hood
- beard braided with carved companion tokens

### Clothing Directions

#### Hero

- weatherproof layered leather and cloth
- animal-safe harness
- map pouches
- reinforced knees
- feather or shed-antler jewelry
- textured cloak
- protective gloves
- quiet boots

#### Villain

- overly pristine trophy coat
- tooth and claw display
- restrictive animal masks
- chain leashes
- lacquered hunting armor
- red-lined cloak
- visual evidence of domination rather than companionship

#### Aristocratic huntmaster

- tailored forest coat
- embroidered animal heraldry
- polished riding boots
- fitted gloves
- ceremonial horn
- brocade vest
- feathered shoulder cape
- ornate belt

#### Spiritual guardian

- woven reed mantle
- fur-edged but non-exploitative robe
- carved wood clasps
- beadwork representing animal bonds
- layered natural fibers
- ritual face paint

### Textures

- suede
- short fur
- feather softness
- horn polish
- waxed canvas
- rainproof leather
- woven grass
- scratched buckles

### Avoid

- wolf pelt on every Beastmaster
- random fang necklace
- animal-skin overload
- fantasy ranger uniform repeated across the archetype

---

## DRUID

### Costume Culture

Druid fashion should communicate:

- ecological relationship
- local material knowledge
- seasonal ritual
- growth and decay
- stewardship
- grove identity
- transformation

A Druid does not have to look like a leaf-covered elf.

### Hair Directions

- thick curls threaded with seed beads
- long locs wrapped in vine-fiber cord
- moss-dusted braids
- cropped silver coils
- root-like braided crown
- loose waves with pressed flowers
- shaved head painted with growth rings
- heavy gray braid
- windblown hair carrying pollen
- hair partially transformed into soft leaves or fine roots at high rank
- practical hooded styles for marsh or alpine Druids

### Clothing Directions

#### Hero

- layered linen and wool
- bark-fiber vest
- root-cord belt
- leaf-shaped clasps
- mud-stained hem
- herb pouches
- woven mantle
- practical boots

#### Villain or blight Druid

- fungal leather
- black root lattice
- diseased silk
- thorn closures
- spore veil
- decayed ceremonial robe
- beautiful but unsettling botanical construction

#### Aristocratic grove keeper

- finely woven plant silk
- embroidered seasonal panels
- polished wood jewelry
- gold-leaf clasps
- antler-inspired crown
- layered formal mantle
- ceremonial staff harness

#### Warrior Druid

- bark-lamellar armor
- quilted moss cloth
- root-braced vambraces
- leather-free woven straps
- stone or wood plate
- split robe panels
- weatherproof hood

### Textures

- bark grain
- moss
- woven reed
- mushroom leather
- nettle cloth
- petal silk
- polished wood
- damp wool
- living vine seams

### Avoid

- leaves glued randomly to robes
- antlers on every Druid
- green as the only design choice
- all Druids appearing youthful and elegant

---

## NECROMANCER

### Costume Culture

Necromancer fashion should communicate:

- death scholarship
- funerary office
- spirit contracts
- grave stewardship
- taboo knowledge
- inherited ritual
- corruption or restraint

The archetype can look academic, priestly, military, aristocratic, medical, or monastic—not merely ragged.

### Hair Directions

- severe straight bob
- long black hair bound with funeral cord
- shaved scalp covered in script-like markings
- iron-gray locs
- thin wispy hair
- carefully curled aristocratic hair
- cropped dark coils beneath a scholar cap
- white streak caused by spirit contact
- funeral veil over braided hair
- loose hair floating in spectral currents
- immaculate grooming that contrasts with deathly work

### Clothing Directions

#### Scholar

- high-collared academic robe
- layered black and bone-gray textiles
- ink-stained cuffs
- leather manuscript harness
- narrow chain belt
- archival gloves
- embroidered funerary diagrams

#### Villain

- severe bone-ribbed coat
- black velvet
- chain veil
- articulated skeletal gorget
- restrictive long silhouette
- spirit vessels
- polished funeral mask

#### Aristocrat

- tailored mourning coat
- midnight velvet
- silver embroidery
- bone-white silk shirt
- narrow gloves
- heirloom brooch
- long controlled cape
- blackened silver jewelry

#### Battlefield death-priest

- blackened chainmail
- padded grave-cloth coat
- bone lamellar
- censer chains
- reinforced boots
- ritual tabard
- scarred gauntlets

#### Infernal necromancer

- infernal chainmail beneath scorched robes
- hooked clasps
- ember-dark stitching
- ash veil
- heat-warped bone ornaments
- no generic red fire

### Textures

- velvet
- parchment
- blackened silver
- bone polish
- brittle lace
- ink-stained linen
- tarnished chain
- smoke-soft cloth
- funerary silk

### Avoid

- tattered robe on every Necromancer
- skull overload
- pale skin as a costume requirement
- generic hooded silhouette
- cartoon evil wizard clothing

---

## VAMPIRE

### Costume Culture

Vampire fashion should communicate:

- era
- house
- wealth
- predation
- reinvention
- secrecy
- court rank
- immortality
- regional origin

Vampires should not all look Victorian or European.

### Hair Directions

- glossy blue-black waves
- close-cropped coils with jeweled temple chains
- silver locs
- severe aristocratic bob
- long straight hair in a low ribbon tie
- sculpted curls
- shaved head with a bloodline crown
- elaborate braided court style
- loose decadent hair
- period-specific grooming
- modern undercut paired with ancient jewelry
- immaculate beard, fine mustache, or deliberate stubble

### Clothing Directions

#### Heroic or restrained vampire

- fitted dark traveling coat
- protective high collar
- practical gloves
- silver fasteners
- restrained house emblem
- weathered boots
- subtle red lining

#### Villain

- severe black tailoring
- blood-red velvet
- exaggerated collar
- chain drapery
- polished gloves
- narrow predatory silhouette
- ornamental armor
- immaculate fabric untouched by the setting

#### Aristocrat

- brocade coat
- silk shirt
- fitted waistcoat
- jeweled cravat or neckpiece
- embroidered house colors
- velvet cape
- heirloom rings
- court shoes or tall boots

#### Armored house champion

- dark articulated plate
- silvered chainmail
- crimson undercoat
- bat-wing fluting without literal bat costume
- engraved house crest
- long battle skirt
- polished gauntlets

#### Desert or warm-climate vampire court

- layered fine linen
- dark translucent veil
- gold-edged robe
- wrapped waist sash
- jeweled sandals or boots
- sun-protective mantle
- blood-red enamel jewelry

### Textures

- velvet
- satin
- brocade
- polished leather
- silver chain
- dark enamel
- lace
- silk
- mirror-bright plate

### Avoid

- pale skin as mandatory
- cape on every Vampire
- Victorian-only clothing
- random bat motifs everywhere
- hypersexual clothing as default

---

## LYCANTHROPE

### Costume Culture

Lycanthrope clothing must account for transformation.

It should communicate:

- pack identity
- devotion to the Moon Goddess
- survival through shifting
- breakaway construction
- preserved identity tokens
- rank progression toward increasingly lupine form

### Hair Directions

#### Foundation

- long mane in the future fur color
- thick curls or coils with wolfish volume
- cropped practical hair with pointed ear silhouette
- locs tied with moon cords
- shaggy layered cut
- silver temple streak
- heavy beard or clean-shaven face depending on identity

#### Forged

- human hair merging visibly into fur
- hairline disrupted by wolf anatomy
- mane thickening across neck and shoulders
- braids partially broken by transformation
- identity beads still trapped in fur
- no clean salon hairstyle on a mid-shift head

#### Ascendant

- full mane and ruff
- fur pattern functioning as the hairstyle language
- silver streaks
- scar-lightened patches
- braided mane sections where anatomically plausible
- ceremonial moon rings attached to armor rather than clipping through fur

### Clothing Directions

#### Foundation

- practical leather kilt or split trousers
- breakaway seams
- wrapped forearms
- moon token
- light shoulder armor
- twin-blade harness

#### Forged

- torn but engineered clothing
- expandable waist construction
- reinforced split panels
- shoulder straps broken by growing fur
- claw-compatible gauntlet remnants
- identity token preserved at chest

#### Ascendant

- articulated dark plate adapted to digitigrade anatomy
- silver moon-sigil filigree
- open fur zones
- tail accommodation
- talon-compatible hand armor
- segmented thigh and hock protection
- moonlit chain or leather harness
- no human trousers stretched over wolf legs

#### Pack aristocrat

- silver-trimmed mantle
- moonstone clasps
- pack heraldry
- dark tailored transformation coat
- ceremonial claw guards
- layered fur-compatible armor

#### Infernal or corrupted

- blackened chain
- eclipse motifs
- red-orange moon glass
- scorched breakaway straps
- chained muzzle symbolism used carefully
- transformation scars visible in garment damage

### Textures

- coarse fur
- torn leather
- moon-silver plate
- flexible chain
- scratched metal
- waxed cord
- weathered wool
- matted ruff

### Avoid

- clean gym-body costume
- generic wolf pelt
- ordinary boots on digitigrade legs
- hair and fur treated as separate wigs
- clothing that ignores the transformation

---

## MECH PILOT

### Costume Culture

Mech Pilot fashion should distinguish:

- the pilot
- the cockpit
- the exosuit
- the mech chassis
- squadron culture
- maintenance work
- military or civilian origin

### Hair Directions

- close crop for helmet fit
- braided coils routed beneath a pressure cap
- short locs held by a sealed wrap
- shaved sides with a compact top
- sweat-damp curls after deployment
- long hair tightly bundled at the nape
- silver hair under a transparent cranial interface
- practical field cut
- ceremonial squadron style outside combat
- no loose hair floating into exposed machinery without explanation

### Clothing Directions

#### Pilot underlayer

- fitted pressure suit
- ribbed cooling channels
- reinforced joints
- interface ports
- harness points
- squadron patches
- utility belt
- gloves with control contacts

#### Heroic ace

- customized flight jacket
- clean squadron colors
- decorated but functional helmet
- family token
- polished interface gloves
- fitted boots
- restrained call-sign marking

#### Villain commander

- severe black pressure coat
- rigid high collar
- rank bars
- polished prosthetic interfaces
- red warning lines
- immaculate gloves
- no unnecessary exposed skin

#### Aristocratic pilot

- tailored command coat
- silk-lined pressure suit
- engraved interface collar
- house crest
- ceremonial shoulder armor
- fine gloves
- elite boots

#### Heavy mech integration

- hydraulic braces
- armored neck seal
- cable bundles
- modular chest plate
- reinforced hip frame
- helmet locked into the chassis
- visible pilot only through visor or cockpit opening

### Textures

- ballistic fabric
- rubber seals
- brushed metal
- ceramic armor
- scratched polymer
- illuminated interface glass
- braided cable
- oil-stained canvas

### Avoid

- generic sci-fi armor
- casual hair under sealed helmets
- turning every pilot into a soldier
- losing the human clothing culture beneath the mech

---

## ANDROID

### Costume Culture

Android fashion should reveal:

- maker philosophy
- assigned function
- social integration
- self-expression
- rebellion
- imitation of humanity
- synthetic ritual
- status

An Android may wear clothing, integrate clothing into the chassis, reject clothing, or create its own fashion language.

### Hair Directions

- synthetic fiber curls
- filament locs
- metallic micro-braids
- smooth molded scalp
- translucent fiber hair
- cable ponytail
- optic-thread bob
- removable wig chosen for social identity
- light-emitting hair strands
- soft realistic hair contrasted with exposed machinery
- hard-shell crest
- magnetic floating strands

### Clothing Directions

#### Integrated formalwear

- chassis panels shaped like tailored lapels
- metallic pleats
- synthetic silk mantle
- illuminated seams
- detachable collar
- polished limb coverings

#### Heroic synthetic

- practical fabric coat over exposed chassis
- chosen scarf or family garment
- repair patches
- modular utility harness
- identity badge
- non-matching replacement panels

#### Villain

- severe mirrored shell
- black synthetic drapery
- cable veil
- restrictive geometric silhouette
- featureless collar
- perfectly repeated patterns
- weaponized garment edges

#### Aristocratic

- pearl-white shell
- silver filigree
- fine synthetic mesh
- holographic brocade
- floating train
- gemstone data ports
- elegant gloves integrated into hands

#### Industrial

- heavy cable weave
- ceramic work plates
- warning stripes
- maintenance harness
- reinforced joint covers
- tool docks
- oil-darkened surfaces

### Textures

- polished chrome
- pearl ceramic
- matte polymer
- synthetic silk
- translucent mesh
- carbon weave
- brushed alloy
- illuminated filament

### Avoid

- white chrome body as the only Android fashion
- assuming clothing is unnecessary
- giving every Android straight silver hair
- copying famous android designs
- using skin-tight bodysuits as the universal solution

---

## SERAPH

### Costume Culture

Seraph fashion should communicate:

- celestial office
- protection
- judgment
- sacrifice
- choir
- hierarchy
- mercy
- war
- balance between radiance and abyss

Seraphs can be heroic, severe, aristocratic, martial, mourning, fallen, infernal-touched, or compassionate.

### Hair Directions

- luminous coils
- flowing silver hair
- close-cropped gold curls
- braided white locs
- shaved radiant scalp
- crown braid beneath a halo
- dark hair with star-like highlights
- floating fine strands
- heavy celestial braids
- flame-like gold hair used sparingly
- age-white hair
- hair fully hidden beneath a mask or crown

### Clothing Directions

#### Heroic guardian

- ivory under-robe
- celestial plate
- feather-shaped pauldrons
- blue-white sash
- gold filigree
- practical armored skirt
- protective gauntlets

#### Judgment Seraph

- severe gold plate
- black or deep blue underlayers
- rigid halo-crown
- narrow eye slit
- long chain tabard
- geometric scripture-like engraving
- no soft angel clichés

#### Aristocratic celestial

- layered silk and brocade
- pearl embroidery
- gold shoulder mantle
- floating translucent veil
- jeweled crown
- formal wing harness
- immaculate gloves

#### Fallen or abyss-balanced Seraph

- pale gold plate over infernal chainmail
- crimson lower lining
- smoke-dark feather mantle
- cracked halo
- heat-warped gold
- restrained volcanic glass
- celestial construction still visible beneath corruption

#### Celestial male fashion

Do not default to bare-chested winged men.

Use:

- fitted ivory tunic
- articulated gold breastplate
- layered ceremonial skirt
- high celestial boots
- embroidered mantle
- ornate gorget
- full sleeves
- long structured coat
- luminous chain underlayer

### Textures

- ivory enamel
- celestial silk
- feather softness
- polished gold
- pale silver
- blue-white light weave
- infernal black chain
- cracked halo glass

### Avoid

- slim white angel in a robe every time
- bare chest as divine masculinity
- gold overload without textile contrast
- six unrelated wings clipping through clothing
- infernal influence represented only as red fire

---

## HUMAN

### Costume Culture

Human fashion should contain the broadest variety.

Human clothing may represent:

- village
- city
- military
- athletics
- nobility
- scholarship
- craft
- travel
- religion
- rebellion
- ordinary work
- elite heroism
- villainy

The current older prompt direction treats Human as “realistic athletic wear.” That is too narrow for the broader fantasy card world unless the specific card is intentionally modern or athletic.

### Hair Directions

All realistic human hair textures and grooming traditions are available.

Examples:

- cropped coils
- box braids
- long locs
- loose waves
- blunt bob
- shaved head
- thick curls
- long straight hair
- crown braid
- gray bun
- undercut
- short textured crop
- practical ponytail
- wrapped hair
- elaborate court style
- simple worker cut

### Clothing Directions

#### Hero

- practical layered travel clothing
- regional textile
- functional armor
- family emblem
- weathered boots
- repaired cloak
- clear silhouette

#### Villain

- severe tailoring
- oppressive uniform
- immaculate gloves
- restrictive collar
- symbolic insignia
- concealed armor
- controlled palette

#### Aristocrat

- brocade coat
- fitted formal robe
- layered silk
- embroidered vest
- polished shoes or boots
- heirloom jewelry
- region-specific headwear

#### Knight

- padded arming coat
- chainmail
- fitted plate
- heraldic tabard
- articulated gauntlets
- practical cloak
- no generic silver armor

#### Scholar

- layered robes or coat
- ink-stained cuffs
- book harness
- spectacle or lens device
- practical satchel
- regional fabric

#### Worker or artisan

- apron
- rolled sleeves
- tool belt
- patched trousers
- sturdy boots
- protective gloves
- local jewelry

#### Athlete

- only when the card’s setting supports it
- fitted training wear
- layered performance textile
- wraps
- practical shoes
- realistic seams
- no supernatural costume creep

### Textures

Any textile and armor texture may apply when culturally and historically coherent.

### Avoid

- Human as generic modern fit person
- modern athletic wear on every Human
- culturally blank costume
- “normal clothes” as an art direction

---

# 19. Skin Tone, Hair, and Costume Coordination

Skin tone should influence lighting and contrast decisions, not cultural stereotyping.

## Contrast guidance

For deep skin:

- preserve facial detail with controlled edge light
- use metallic jewelry that catches light
- distinguish black hair from dark backgrounds
- avoid crushing all values into shadow
- use fabric color intentionally

For fair skin:

- avoid overexposure under celestial light
- preserve freckles, warmth, and texture
- avoid treating pale skin as pure white
- use dark garments without making the face corpse-like unless intended

For medium and olive skin:

- identify undertones
- avoid generic orange grading
- use gold, bronze, silver, and fabric colors based on character identity

## Hair and skin examples

- very deep umber skin with thick silver-threaded locs and a moon-silver clasp
- rich brown skin with a close crop and a tailored crimson velvet Vampire coat
- fair freckled skin with copper curls beneath a weathered Druid hood
- medium olive skin with black crown braids and ivory celestial plate
- deep bronze skin with shaved temples, coiled top hair, and cobalt pilot gear

These are examples of visual coordination, not locked combinations.

---

# 20. Prompt Construction Formula

A useful fashion prompt should include:

`hair texture + hairstyle + grooming condition + primary base layer + major garment + armor/protection + material + accessory + wear state + rank signal`

Example:

> Deep brown skin, dense shoulder-length coils gathered into a high half-knot with bronze clan rings. Layered indigo wool tunic over a quilted leather vest, asymmetrical blackened-iron shoulder plate, patterned clan sash, wrapped forearms, weather-cracked boots, and a repaired fur-lined mantle bearing one carved ancestral clasp.

This is stronger than:

> A Barbarian with braided hair and fur armor.

---

# 21. Style Mixing Rules

Good fantasy fashion often combines:

- archetype culture
- setting culture
- social role
- rank
- moral direction
- material history

Examples:

## Vampire aristocrat + desert court

- fine layered linen
- dark translucent veil
- gold-edged coat
- blood-red enamel jewelry
- sun-protective mantle
- tightly arranged curls or locs

## Necromancer scholar + battlefield priest

- academic robe
- blackened chainmail
- manuscript harness
- bone clasps
- censer chain
- ink-stained gloves

## Seraph guardian + infernal corruption

- celestial gold plate
- infernal chainmail underlayer
- ivory cloth
- crimson inner lining
- cracked halo
- smoke-dark feather mantle

## Barbarian chieftain + aristocratic craft

- richly woven wool coat
- heirloom bronze lamellar
- embroidered hide mantle
- polished torc
- carefully braided hair
- clan-pattern boots

## Mech Pilot + hereditary noble

- silk-lined pressure suit
- tailored command coat
- engraved interface collar
- house crest
- ceremonial shoulder plate
- compact helmet-compatible hair

The mix must remain coherent. Do not combine random prestige words.

---

# 22. Negative Prompt and Failure Guidance

Avoid:

- generic fantasy clothing
- generic leather armor
- random fur shoulder
- identical black robes
- identical capes
- every woman in a corset
- every man in bare-chested armor
- hypersexualized armor
- cleavage armor
- high heels in battlefield gear without reason
- excessive exposed skin
- modern clothing leaking into fantasy settings
- random cultural symbol mixing
- random sacred symbols
- costume pieces clipping through hair or anatomy
- hair passing through helmets
- capes attached without clasps
- armor with no underlayer
- belts and straps leading nowhere
- chainmail painted like cloth
- every villain in black
- every celestial in white and gold
- every infernal figure covered in flames
- every aristocrat overloaded with jewels
- every Barbarian looking Norse
- every Monk looking East Asian
- every Druid looking Celtic
- every Vampire looking Victorian
- every Human looking modern Western
- repeated hairstyles across recent cards

---

# 23. Repetition Prevention

The generator should track recent use of:

- hair texture
- hairstyle
- hair length
- hair color
- facial hair
- headwear
- main garment silhouette
- primary material
- armor type
- cape or mantle
- dominant accessory
- costume role
- cultural construction pattern

Regenerate or revise when:

- several recent characters share the same long flowing hair
- the same archetype repeatedly receives the same garment
- every villain receives a black high-collared coat
- every female-presenting character receives long hair
- every male-presenting character receives short hair
- every dark-skinned character receives locs
- every pale character receives white hair
- every Ascendant receives gold plate

---

# 24. Suggested Structured Output

```json
{
  "hair": {
    "texture": "dense coils",
    "length": "shoulder length",
    "style": "high half-knot with loose volume",
    "color": "blue-black",
    "condition": "wind-tossed and lightly rain-darkened",
    "adornment": "two bronze clan rings",
    "headwearInteraction": "kept clear of the asymmetrical shoulder mantle"
  },
  "fashion": {
    "role": "heroic clan champion",
    "baseLayer": "quilted indigo wool tunic",
    "primaryGarment": "patterned clan-woven overcoat",
    "armor": "blackened iron lamellar over one shoulder and the torso",
    "outerLayer": "repaired fur-lined traveling mantle",
    "waist": "broad woven sash with carved bronze fittings",
    "footwear": "weather-cracked leather boots",
    "materials": [
      "wool",
      "blackened iron",
      "vegetable-tanned leather",
      "trimmed fur"
    ],
    "wear": "repaired and travel-worn",
    "signatureAccessory": "ancestral bronze clasp",
    "rankSignal": "earned lamellar and clan insignia"
  }
}
```

---

# 25. Validation Checklist

Before accepting a portrait prompt, verify:

## Hair

- Is the hair texture specific?
- Is the style physically compatible with the texture?
- Does the hairstyle fit the character’s life and culture?
- Does it interact correctly with helmets, crowns, veils, or hoods?
- Is hair color intentional?
- Is the hairstyle too similar to recent cards?
- Is facial hair intentional rather than defaulted?

## Clothing

- Does the outfit have understandable layers?
- Are the materials specific?
- Does the clothing fit the body type?
- Does the armor have a believable underlayer?
- Does the costume reflect setting, culture, status, and archetype?
- Is the role clear: hero, villain, aristocrat, worker, scholar, celestial, infernal, or other?
- Does wear tell a specific story?
- Is the silhouette distinct from recent cards?
- Is the rank progression visible without merely adding gold?
- Are accessories meaningful rather than decorative noise?

## Representation

- Is the costume culturally coherent without stereotyping?
- Is skin tone being used only for lighting and contrast—not costume assignment?
- Are male, female, and androgynous presentations given equal fashion depth?
- Is the costume dignified and cool across body types?
- Does the design avoid sexualized defaults?

If several answers are weak, revise before generation.

---

# 26. Implementation Guidance for Claude Code

This Bible should become a companion reference for portrait prompt construction.

It should not be pasted in full into every Leonardo request.

Recommended approach:

1. Read the relevant archetype section.
2. Read the character’s lore, setting, lineage, role, rank, body, and skin data.
3. Decide the costume role.
4. Select a coherent hair direction.
5. Construct the outfit in layers.
6. Choose specific textiles, armor, and surface condition.
7. Check body compatibility.
8. Check headwear and hair interaction.
9. Check recent outputs for repetition.
10. Convert only the selected details into compact Leonardo prompt language.
11. Preserve approved hair and costume identity during regeneration and rank evolution.
12. Allow meaningful changes when the lore documents them.

Suggested structured fields:

- hair texture
- hair length
- hairstyle
- hair color
- hair condition
- facial hair
- hair adornment
- headwear interaction
- costume role
- base layer
- primary garment
- structural layer
- armor
- outer layer
- waist system
- arm and hand treatment
- footwear
- materials
- construction
- wear
- accessories
- rank signal
- magical or technological integration

---

# 27. Final Principle

Hair and clothing are not finishing details.

They are visible worldbuilding.

A strong character should reveal culture, class, history, rank, belief, and personality before the player reads a single line of lore.
