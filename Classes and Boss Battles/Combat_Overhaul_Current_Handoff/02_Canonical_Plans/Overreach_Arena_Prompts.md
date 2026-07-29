# Overreach Arena Prompts — Leonardo Generation Guide

Three arena backgrounds for the boss tower's first champions. Written to be
pasted straight into the Leonardo web UI.

**Status:** ready to generate. Code side is already plumbed — a new arena is a
data change, not a code change.

---

## Before you start

**Model:** Leonardo Phoenix 1.0 — the same model that produced the existing
`forbidden-mountain-passage` arena. Do not switch models between arenas: pixel
cluster density is the most visible consistency cue and it is model-specific.

**Settings:**
- Aspect ratio **16:9**, target **1360 × 768**
- Same preset/style used for `p1-candidate-4` (the approved existing arena)
- Alchemy / photoreal **OFF** — this is a pixel-art set

**Reference the existing arena.** Open
`card-engine/public/assets/combat/arenas/forbidden-mountain-passage/base.png`
and keep it beside you while reviewing candidates. The new arenas must sit
next to it, not fight it.

### The shell that makes them a set

All three inherit the same stage: frontal symmetric composition, flanking
vertical framing elements, a raised circular central dais, dark upper corners,
crisp 16-bit pixel treatment. **Only the material, palette, and what the light
is doing change.** That is what makes a tower read as one building rather than
three unrelated scenes.

### Composition is load-bearing, not taste

The sprites are positioned by code against these bands. Get them wrong and the
boss floats or the party stands in a wall.

| Thing | Where it must sit |
|---|---|
| **Dais top surface** | Centre. Top face at **y ≈ 52–59%** of frame height. Dais width ~30–40% of frame. |
| **Hero floor line** | Flat, unobstructed, **y ≈ 80–91%**, full width. Keep it low-contrast — the existing lava web is at the edge of too busy. |
| **Boss HUD safe zone** | Top-LEFT ~372 × 196px. No bright detail, no high-frequency noise. |
| **Journal safe zone** | Top-RIGHT ~320px wide. Same rule. |
| **Bottom 8.5rem** | Covered by the command shelf. Anything painted there is thrown away. |
| **Bleed margin** | Keep 4–5% clear on all sides — the image is `cover`-cropped, so edges get trimmed on wide screens. |

The dais needs **visible step risers** — the steps are what sell the height
difference between the boss and the party.

---

## Generation order

Generate in this order, and review each batch before spending on the next.

1. **The Still Season** — furthest from the existing arena in palette and
   material, so it is the real test of whether the shared shell survives a big
   tonal jump. Expect **4–6 candidates**.
2. **The Debt-Bearer** — closest to the existing stone vocabulary, lowest
   risk. Expect **3–4 candidates**.
3. **The Unclosed Summons** — budget for this one. The brief asks for a bright
   scene with dark upper corners, which fights the model's instincts. Expect
   **6–8 candidates**.

**Total ~13–18 images.** Generate 3–4 at a time, review, then decide whether
to spend more on that arena or move on.

---

## 1. The Still Season — floor 2 (Druid)

*He was asked to keep the grove through a hard winter. He kept it. He is
keeping it still — the same afternoon, held open, every leaf where it was.*

**Prompt:**

> Premium 16-bit dark-fantasy pixel-art battle arena, widescreen 16:9, fixed frontal combat-stage composition. An ancient grove clearing caught in a single unmoving late afternoon: enormous moss-clad trees flanking the stage like pillars, their canopy closed overhead, every leaf perfectly still. Fallen leaves hang motionless in mid-air at various heights, suspended, never landing. A broad raised circular dais of flat mossed flagstone with stepped risers in the exact centre, ringed by unbroken grass, its flat top surface just above the middle of the frame, and a wide flat uncluttered floor across the lower third where three figures can stand. Heavy horizontal shafts of warm gold-green light slanting through the trunks at one fixed low angle, thick with unmoving pollen. Deep olive and umber shadow, muted sage and old-gold palette. Dark low-detail negative space across the upper-left and upper-right corners for interface panels, no bright detail in the top corners. Atmospheric depth, premium RPG environment, low-contrast background, crisp pixel clusters, coherent lighting, no boss, no heroes, no creatures, no cards, no UI, no text, no logo, no watermark, no frame.

**Negative prompt:**

> snow, ice, frost, winter, bare branches, dead trees, autumn orange, decay, rot, lava, fire, animals, birds, deer, wolves, spirits, faces in the trees, glowing eyes, flowers in bloom, characters, figures, statues, UI, text, watermark, frame, vignette

**Reject a candidate if:**
- It gives you **literal winter — snow, ice, bare branches.** His sin is that
  nothing dies, not that it froze. This is the most common failure.
- The **suspended mid-air leaves are missing.** That single image carries the
  whole concept. Reject regardless of how pretty the rest is.
- There is an **animal, a companion, or a face in the bark.** Druid §14
  forbids both the Beastmaster overlap and nature-as-decoration — he *is* the
  terrain, he does not have a pet.

---

## 2. The Debt-Bearer — floor 1 (Barbarian)

*Every technique she was given, she wrote down as something owed. The ledger
grew longer than the life, and there was no one left to repay.*

**Prompt:**

> Premium 16-bit dark-fantasy pixel-art battle arena, widescreen 16:9, fixed frontal combat-stage composition. A vast cold hall of grey tally-stone: every wall surface covered edge to edge in shallow carved notches and scored counting marks, thousands of them, worn smooth in places by hands. Flanking the stage are towering stacked slabs of inscribed stone rising out of frame like columns of accounts. A broad raised circular stone dais with stepped risers in the exact centre, its flat top surface just above the middle of the frame, and a wide flat uncluttered floor across the lower third where three figures can stand. Cold blue-grey daylight from a high unseen opening, long still shadows, drifting stone dust. Restrained bronze-amber glow low near the floor. Dark low-detail negative space across the upper-left and upper-right corners for interface panels, no bright detail in the top corners. Atmospheric depth, premium RPG environment, low-contrast background, crisp pixel clusters, coherent lighting, no boss, no heroes, no creatures, no cards, no UI, no text, no logo, no watermark, no frame.

**Negative prompt:**

> text, letters, numbers, runes, written language, signage, books, scrolls, banners, lava, fire, molten rock, gothic cathedral windows, chains, braziers, skulls, blood, characters, figures, statues, silhouettes, UI, watermark, frame, border, vignette, tilted camera, isometric view

**Reject a candidate if:**
- The marks read as **writing, numerals or runes.** They are carved *notches*.
  Ask a model for numbers and it returns garbled pseudo-text every time — that
  is why "text, letters, numbers" is in the negative.
- It looks like a **war hall** — pelts, skulls, trophies. Barbarian §14 assigns
  feral vocabulary to the Lycanthrope. Her power is memory and endurance, and
  tally marks are what memory looks like.

---

## 3. The Unclosed Summons — floor 3 (Seraph)

*She was called, and she answered, and then she was asked to choose what the
answer meant. She has not chosen.*

**Prompt:**

> Premium 16-bit dark-fantasy pixel-art battle arena, widescreen 16:9, fixed frontal combat-stage composition. A roofless pale stone sanctum open to a blank white sky, its far wall an enormous unfinished arch that opens onto nothing. Light pours in from every direction at once with no single source and casts no consistent shadow, pooling in the air as thick diffuse haze. Flanking the stage are tall plain pale pillars, their upper halves lost in glare. A broad raised circular dais of seamless white stone with stepped risers in the exact centre, its flat top surface just above the middle of the frame, and a wide flat uncluttered floor across the lower third where three figures can stand. Palette of bone-white, cool pearl grey and thin pale gold, with deep neutral charcoal shadow held in the upper corners. Dark low-detail negative space across the upper-left and upper-right corners for interface panels, no bright detail in the top corners. Atmospheric depth, premium RPG environment, low-contrast background, crisp pixel clusters, coherent lighting, no boss, no heroes, no creatures, no cards, no UI, no text, no logo, no watermark, no frame.

**Negative prompt:**

> wings, angel, halo, feathers, holy symbols, crosses, stained glass, cathedral, altar, molten obsidian, black light, infernal, hellfire, demonic, horns, blood, gold ornament, ornate filigree, rainbow, lens flare, sun disc, characters, figures, statues, UI, text, watermark, frame, blown-out white, overexposed

**Reject a candidate if:**
- **The upper corners are blown out.** "Light everywhere" is a near-guaranteed
  way to destroy HUD legibility. The corners staying dark is the deliberate
  tension in this prompt and the reason it needs the most candidates.
- It has **wings, a halo, or stained glass.** That pre-empts the boss sprite
  and turns the arena into a cathedral rather than an unclosed call.
- It reads as **Fallen** — molten obsidian, black light, hellfire. She is
  Balanced-paralysis, not Fallen. Infernal is player-exclusive and must not
  appear here.

---

## Universal rejection criteria

Applies to all three:

- **No throne, no trophy, no victim.** These are tragic figures, not villains.
  An arena that reads as a villain lair is wrong even if it looks great.
- **No figures of any kind** — the negatives forbid characters, statues and
  silhouettes, so no body can appear and portrait modesty rules cannot be
  violated.
- **Dais and floor line must land in the bands above**, or the sprites float.

---

## After you pick winners

Send me the chosen files and I will wire them up. What I need per arena:

1. The image file (PNG, 1360 × 768)
2. The Leonardo **job/seed id** — it goes in the manifest `notes` field, which
   is the only provenance we have and has already earned its keep once
3. Which candidate number won, so the losers can be kept on disk for reference

I will then add the `ARENA_MANIFEST` row, set each boss's `arenaId`, and add a
`ARENA_GROUND_TINT` entry so the arena's own light colours the fighters.

**That last part matters.** The ground tint used to be hardcoded warm ember to
match the lava veins — drop a grove under it and you get a forest lit from
below by a lava pool that isn't there. It is per-arena data now, and the
suggested values are:

| Arena | Mid tint | Low tint |
|---|---|---|
| The Debt-Bearer | `rgba(70,55,30,0.45)` | cold bronze |
| The Still Season | `rgba(60,60,20,0.45)` | warm olive-gold |
| The Unclosed Summons | `rgba(70,70,80,0.40)` | neutral pale |

---

## Open question worth deciding first

If all eleven floors are coming reasonably soon, these three should be
designed as **biome anchors** for a 3–4 biome set with per-boss lighting
variants, rather than as one-offs. It changes nothing about the prompts above
— only how they are named and versioned. Eleven fully bespoke arenas is a
different conversation and a much larger spend.
