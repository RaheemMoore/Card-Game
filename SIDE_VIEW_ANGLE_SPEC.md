# The Angle — 2D flat side elevation

**Ruled by Raheem, 2026-08-16.** This supersedes the "every character is `low
top-down`" lock in CLAUDE.md. That lock existed because the top-down angle was paid
for; the game is no longer top-down, so it no longer binds.

> *"Figure out what the right angle of this game is. Two d front facing, side to
> side, and don't use any objects that's not at that angle."*

---

## The angle, stated once

**The camera looks horizontally at the world.** Flat orthographic elevation, like a
stage seen from the stalls. Everything is drawn as if you are standing on the same
ground as it, looking straight at it.

## The test that settles every argument

**If you can see the TOP of a thing, it is the wrong angle.**

Not a matter of taste, and it takes one second to apply:

| Wrong | Right |
|---|---|
| A wall whose parapet walkway is visible | A wall that is a flat face and a silhouette of crenellations |
| A tower showing its roof, or the inside of its battlement ring | A tower as a vertical column with a roof seen edge-on |
| A table with its surface showing | A table as a horizontal line with legs under it |
| Ground receding toward a horizon | Ground as a single contact line with a cross-section below it |
| A figure seen from above the shoulders | A figure in profile, facing left or right |

**Do not trust the `view` field in a config.** This document exists because a
`view: "side"` label was believed over the actual pixels: the Halo Stone
`wall-straight-v3` and `tower-corner-v3` are labelled `side` and are plainly
three-quarter — the tower shows its whole top face. They were placed in the scene
on the strength of that label and had to be pulled straight back out. **Open the
PNG and look at it.** The label is a claim; the art is the evidence.

## What to ask PixelLab for

The enum differs per endpoint, which is its own trap:

| Route | Ask for |
|---|---|
| Character routes (`/create-character-*`, 4-direction) | `view: "side"` |
| Object and tile routes (`/create-1-direction-object`, `/create-tiles-pro`) | `view: "sidescroller"` |
| `/create-image-pixen` (one-shot images) | `side` **plus** an explicit prose clause — see below |

`/create-image-pixen` is where the mislabelled kit art came from, so its `side`
alone is not sufficient. Say it in the prompt as well, and say it negatively:

> *flat side elevation, orthographic, camera at ground level looking straight on,
> no top surface visible, no roof visible, no perspective, no isometric, no
> three-quarter view, no overhead angle*

## What we already have at the correct angle

Only three things, and that is the honest total:

| Asset | Why it qualifies |
|---|---|
| **Ember Jelly** (`castle/construct/ember-jelly.png`) | A symmetric blob with zero directions by design. Reads identically from any camera, so the perspective change costs nothing. Recolours stay free. |
| **All 545 elemental effect strips** (`combat/effects/packed/`) | Bursts and streams with no baked facing; the renderer rotates them to the shot. |
| **The Card-wright's walk + card-blast, left and right rows only** | Technically generated `low top-down`, and the one accepted caveat: Raheem has seen these in the side-view scene and approved the look. Everything else from that sheet — the up/down rows, the knockdown, the summon slam — is front-facing and out. |

**Everything else in the repository is the wrong angle.** The castle kit, the
terrain, the keepers, the props, the wildlife, the ground tilesets, the occluders:
all authored for a top-down or three-quarter camera. None of it goes in.

## What needs generating

Nothing here is authorised yet — this is the shopping list, priced. Counts are from
`PIXELLAB_PLAYBOOK.md` and verified against the configs that produced comparable
work. Budget is 2000 generations per period, so cost is not the constraint; getting
the angle right on the first batch is.

**Rule for every batch: generate ONE piece first, look at it, and only then order
the rest.** A whole kit at the wrong angle is the failure this document exists to
prevent, and it has already happened twice in this repo (the part-isometric tower
batch, and the wall kit that would not tile).

| Priority | What | Route / view | Est. generations |
|---|---|---|---|
| 1 | **Castle front**: gate house, curtain wall (horizontally tileable), corner tower | `/create-image-pixen`, `side` + prose clause | ~1 each, 3–6 total incl. one calibration piece |
| 2 | **Ground**: a side-view ground strip — surface line plus the earth cross-section beneath, tileable | `/create-tiles-pro`, `sidescroller` | ~20 for a small kit |
| 3 | **Hero knockdown**, side profile | character route, `side` | ~8 |
| 4 | **Props**: barrel, crate, brazier, banner, signpost | `/create-1-direction-object`, `sidescroller` | ~1–2 each |
| 5 | **Trees / foliage**, side elevation | `/create-1-direction-object`, `sidescroller` | ~1–2 each |
| 6 | **Hero summon slam**, side profile | character route, `side` | ~8 |
| 7 | **Keepers / NPCs** (Card-wright dwarf, Archivist) | character route, `side` | ~25 each — and note their original seeds were never recorded, so these are new characters rather than re-rolls |

Sky and parallax backdrops are **not** on this list: Raheem generated those himself
in the bg-harness workstream, and they shipped 2026-08-16 — a fixed sunset plate,
seamless mountain and forest loops, and four cloud actors, all in the `castle-front`
kit and placed from Phaser Editor as `BG_*` objects.

## Background life — the castle as a scene you run past

Raheem, 2026-08-16, with Wonder Boy on screen: the castle stays WEST and the
entrance stays west, closed by a hard wall. Running east is *leaving*, out into the
countryside. So the castle is not the level's destination — it is a **big living
scene you run past on the way to its door**, with workers tending it and a farm
being managed outside while the fight happens in front. *"Add life that's gonna
give us a little bit flexibility."*

Almost none of this needed engine work, which was the surprise. An object dragged
into the Editor already lands behind the hero (`DEPTH.world` is 7, the hero is 12)
and already has no collision unless it is a `WALL*` or the `GROUND`. A whole castle
could go back there today. The only thing missing was motion — **a worker who does
not move is a statue** — so one label was added:

- **`LIVE_*`** — plays its texture's `<key>-loop` animation, forever, from the first
  frame. No trigger, no state, no proximity: ambient is what scenery *is*, and the
  moment it needs logic it has stopped being scenery. It must be a **Sprite** in the
  Editor, not an Image; an Image has no `anims` and simply shows its first frame.
  A missing loop is not an error — art and animation land in separate runs.

The snapshot reports `authoredWorld.live` as `{placed, animating}`. Both numbers,
because **a castle full of statues photographs exactly like a castle full of
workers** and the gap between them is the only way to tell without standing there.

Art for it is the shopping list above, ordered one piece at a time: castle
elevation (modular, so it can be damaged later), a farm strip, one worker, then
animated dressing. Everything still passes the one-second test before it is placed.

## Until the art exists

`/castle` runs a code-drawn placeholder — a dusk gradient, hill silhouettes, a
castle block and a ground line. It says *"CASTLE — provisional silhouette"* on
itself so no screenshot of it can be mistaken for approved art. It is deliberately
plain: a placeholder that tries to look finished is how a placeholder gets shipped.

The game underneath it is complete and playable, which is the point — walk, cycle,
charge, fire, telegraph, leap, evade, knockdown, scatter, recover. Dropping real
art in changes how it looks and nothing about how it plays.
