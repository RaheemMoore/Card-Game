# Courtyard V2 — the four quadrants

**Status:** forge built; tower, archive and training designed and awaiting Raheem's approval
**Plate:** 1536 x 1152, Figma `MpUs9WJKMvwTtpH9Akz4Rm` (page `0:1`), quadrant marks `1:3`–`1:6`

---

## The shape a quadrant takes

The forge established it, and the other three follow it rather than inventing their own:

| Piece | Forge's version | Generation shape |
|---|---|---|
| One anchoring structure against the wall | the forge itself | 1-direction static object |
| A work surface | the crystal counter | 1-direction static object |
| Somewhere to sit or wait | the bench | 1-direction static object |
| A rug or ground treatment | star / charcoal rug | painted or 1-direction |
| A keeper | the dwarf | stationary character, south only, `breathing-idle` |
| Optionally, a small creature | the forge pet | see the pet's own note below |

**This batch is low-directional by instruction.** Every object below is a
`/create-1-direction-object`. Every keeper is one south-facing Pixen character with a
south-only `breathing-idle`. No walk cycles — that is where every documented defect in this
project has lived.

---

## Build order: Tower → Archive → Training

1. **Tower first.** The tower is the game's gate — beating it unlocks the rest of the game
   (CLAUDE.md). Its door is the only one carrying narrative weight rather than decoration.
2. **Archive second.** Its keeper *already exists* — see the correction below — so only the
   shell around her is new work. Cheapest remaining lift.
3. **Training last.** Pure flavour, no unlock dependency, least-specified fiction.

---

## Quadrant — Tower (top-left, Figma `1:6`)

**What it is.** The muster point for the climb, not a shop. It exists so the tower reads as a
threshold you check in at rather than a menu you open: a warden who has seen every hero who
ever went up, and knows exactly how many came back down. Her tally is the diegetic form of the
first-clear/repeat reward ledger already specced in `card-engine-boss-battle-spec.md`.

**Anchor:** a raised iron **portcullis with chain-and-winch** set into the wall — the literal
gate mechanism, and readable at a glance as *the way up*.

**Supporting objects:** chalked **muster board** naming the current boss · **trophy rack** of
tokens and horns from past clears · iron **watch-brazier** · **weapon-return rack** (practice
arms borrowed and returned, never sold) · scarred stone **tally pillar**, hand-scratched.

**Keeper — the Tower Warden.** Woman in her 60s, stocky and broad-built, human. **Left forearm
missing below the elbow, empty sleeve pinned at the wrist, no prosthetic.** Cropped grey hair,
long healed scar through one eyebrow.
- *Signature tool:* a tally-horn slung at her hip — for counting ascents, not fighting.
- *Garment:* riveted leather gate-warden's tabard over a heavy watch-cloak.
- *Detail:* the stone beside her is scratched with hundreds of tally marks she keeps by hand.
- *Personality:* "Doesn't matter how many times you fall — matters that you keep asking to go
  back up."

She is where this cast finally carries the disability representation `SHOPKEEPER_GUIDE.md`
explicitly asked for and that neither existing keeper holds. Bible §Rank continuity is why the
missing forearm is shown plainly and never "solved" by a magical fix.

**Creature:** none. The tower's fiction is solitary vigilance, and a companion animal would
soften exactly the read it needs to keep.

**Collision check:** clear. She is staff, not a hero character, and claims no `identityThrough`.

---

## Quadrant — Archive (bottom-right, Figma `1:4`)

**What it is.** The vault of every card ever forged — where a player's roster lives between
runs. A records hall, not a shop.

**Anchor:** tall **card-catalog shelving unit** against the wall, ledgers and card boxes
stacked to the ceiling — matching her existing ledger-and-card-case identity exactly.

**Supporting objects:** **reading table with a lamp** · **rolling library ladder** · glass
**display case** for one notable card · **ink-and-quill stand**.

**Keeper — already built. Do not re-propose.** The Archivist exists in
`card-engine/src/data/castle/keepers.ts:126-161` and
`card-engine/scripts/sprite-lab/configs/keeper-archivist.json`: young adult woman, pale
freckled skin, curly red hair, slender build, bound ledger, ink-guard sleeve, brass card case,
reading lenses pushed into her hair. She is placed in V1 at the Collection stall.

> **Her seed was never recorded.** She can never be rebuilt; the committed PNGs are the only
> copy of this character that will ever exist. Treat her identity as locked.

**Creature:** optional small owl on the shelving. Lowest priority of the three — the archive
reads complete without one.

**Collision check:** clear. The archive is meta-narrative — the collection of characters, not
a character itself.

---

## Quadrant — Training (bottom-left, Figma `1:5`)

**What it is.** A drilling ground for technique and minigames. Repetition and practice, not
combat stakes.

> **The one trap here.** This must read as a **drill instructor's yard, not a monastery**.
> Monk's `identityThrough: 'Discipline'`
> (`card-engine/src/data/archetypeBible/monk.ts`) already owns discipline-as-identity as an
> archetype fantasy. A contemplative, ascetic training yard quietly annexes Monk's core
> fantasy into generic courtyard flavour. Keep it sweaty, loud and practical.

**Anchor:** a wooden **pell / quintain post** bolted against the wall — the universal "this is
where you drill" read.

**Supporting objects:** **practice-weapon rack** (wooden sabers, blunted spears) · **target
board** pocked with arrow and dart holes · chalk-lined **sparring circle** on the ground ·
hanging **scoreboard slate**.

**Keeper — the Drillmaster.** Broad-shouldered, heavily muscled woman in her 20s, half-orc
(small lower tusks, olive-grey skin), no disability. Hands wrapped in tape, thin practice-scar
through one eyebrow.
- *Signature tool:* twin wooden practice sabers worn crossed on her back, never drawn as real
  weapons.
- *Garment:* padded training gambeson, wrapped forearms.
- *Detail:* taped knuckles and a permanently ink-stained scorecard tucked in her belt.
- *Personality:* "You leave tired or you leave lucky — pick one."

**Creature:** yes — a small scruffy **terrier-type dog** darting around the pell. Warranted
because the yard should feel kinetic against the tower's solemnity, and a dog is trivially a
1-direction sit-and-pant asset.

---

## Keeper variation across the finished set

The guide warns specifically against four keepers who are all able-bodied men in their
thirties. Checked as a set:

| | Age | Sex | Build | Ancestry | Disability |
|---|---|---|---|---|---|
| Forge — the Dwarf | adult | male | stocky | Black dwarf | — |
| Archive — the Archivist | young adult | female | slender | pale human | — |
| Tower — the Warden | 60s | female | stocky/broad | human | left forearm missing |
| Training — the Drillmaster | 20s | female | heavily muscled | half-orc | — |

Modesty rule M5.7 applies to every one of them and to the creatures: clothed, armoured or
covered neck to feet, no exceptions, sex- and species-neutral.

---

## Generation budget — Tower batch only

Nothing here is generated until Raheem approves the batch.

| Item | Endpoint | Budget | Stop condition |
|---|---|---|---|
| 5 tower objects (portcullis, muster board, trophy rack, brazier, weapon rack, tally pillar) | `/create-1-direction-object` | ~6 gens each; 25 gens produced 4 props previously | **One attempt each.** The endpoint rejects `seed`, so a bad object is a reroll, not a fix — change the design rather than re-rolling blind |
| Tower Warden | `/create-character-v3` (Pixen), south only | 10–15 gens | Two same-parameter rerolls with no improvement → change seed/description, do not spin |
| Warden `breathing-idle` | `/characters/animations`, south only | 1 gen | — |
| Warden dialogue portrait | `/portrait-character-pro` | **25 gens flat** | **Deferred.** Only when she actually has dialogue |

**Every new config carries an explicit numeric `seed`.** Both `keeper-dwarf` and
`keeper-archivist` shipped without one and can never be regenerated. That has now happened
twice, with two different people generating. A config without a seed is a blocking review
comment, not a nice-to-have.

**Validation:** `lib/validate_object.py` for each object — alpha coverage, edge-opacity spike,
anchor validity, scale ratio against hero body height, palette distance, no baked shadow.
Never loosen the gate to make an asset pass; freeze the first failure into
`scripts/sprite-lab/fixtures/` and extend `test-validator.sh` instead.

---

## Open questions for Raheem

1. **The Warden's missing forearm** — build as specified (empty pinned sleeve, no prosthetic),
   or defer disability representation to a later pass?
2. **The forge pet** — no config or asset for it exists anywhere in git, and it is not an
   `art-` layer in `MpUs9WJKMvwTtpH9Akz4Rm`. What and where is it?
3. **Rugs** — the star vs charcoal comparison in the Figma file is still unresolved for the
   forge, and each new quadrant wants the same decision.
