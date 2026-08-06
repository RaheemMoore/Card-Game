# Courtyard V2 — tower quadrant objects

Generated 2026-08-04 via `scripts/sprite-lab/configs/tower-quadrant.json`
(two `/create-1-direction-object` calls, 50 generations total).

**These files are source art, not build output.** `/create-1-direction-object`
rejects `seed`, so nothing here is reproducible — if these PNGs are lost, the
50 generations are lost with them. `scripts/sprite-lab/out/` is gitignored,
which is why they are kept here instead.

Every file is trimmed to its alpha bounding box. Objects arrive from the API on
a 146² canvas floating 5–21px above the bottom, which `validate_object.py`
rejects outright; the trim is what makes them anchorable on a feet baseline.
`validate_object.py object` PASSES on all seven as committed.

| File | Status |
|---|---|
| `portcullis.png` | Wall anchor. Matches the shipped forge register well |
| `muster-board.png` | Matches well |
| `trophy-rack.png` | Matches well |
| `weapon-rack.png` | Matches well |
| `watch-brazier.png` | Usable; reads flatter than the counter's three-quarter view |
| `tally-pillar.png` | ⚠️ Came back **isometric** while everything else is elevation or three-quarter. It is a floor object, so its projection is the one that has to agree with the counter. Awaiting Raheem's call |
| `stone-winch.png` | Unrequested extra the API returned to fill its 4-object bucket. Plausible tower content, never briefed |

A stone floor patch was returned in the same batch and discarded — 95.7% alpha
coverage, a floor rather than an object.

## Where to look at them

All seven are uploaded into the Courtyard v2 Figma file
(`MpUs9WJKMvwTtpH9Akz4Rm`) as `art-tower-*` layers **inside the `plate` frame**,
sized to their native pixel dimensions. Because the plate is the game's
1536x1152 coordinate space at 1:1, what you see in Figma is true in-game scale —
no conversion, and nothing to cut.

| Layer | Figma node |
|---|---|
| `art-tower-portcullis` | `72:2` |
| `art-tower-muster-board` | `72:3` |
| `art-tower-trophy-rack` | `72:4` |
| `art-tower-weapon-rack` | `72:5` |
| `art-tower-watch-brazier` | `72:6` |
| `art-tower-tally-pillar` | `72:7` |
| `art-tower-stone-winch` | `72:8` |

They are parked loosely in the tower quadrant, deliberately not yet against the
wall — where a piece sits decides which faces it has to show, and that is read
off a position rather than guessed from a description.

Delete the layer for anything that should not exist. A deleted mark is the
cheapest possible way to change your mind, and it is the same convention the
`place-` marks already use.

Positions are not yet imported back into the scene, and no colliders are traced.

---

## `rotations/` — real side faces, for the left and right walls

Every object above faces the camera, which only works against the **back** wall.
Measured off the plate, the left wall runs about **13°** off vertical and the
right about **12°**, mirrored, splaying outward toward the viewer. An object
dropped against a side wall reads as dropped there rather than built there.

**Rotating a finished sprite was tested and rejected.** It aligns the footprint
to the wall but cannot invent the face the object should be showing — a rotated
weapon rack still presents its front to the camera.

The fix is `/create-8-direction-object` with `reference_image`, which the API
documents as *"generates 8 rotations of this exact image"*. An object we already
like becomes its other seven faces instead of being re-invented from a
description — which is what produced the wrong forge angle twice.

| Wall | Use this face |
|---|---|
| LEFT (west) | `south-east` |
| RIGHT (east) | `south-west` |
| Back (north) | `south` — the original |

**Measured cost: 25 generations for all 8 faces of one object.** Compare
`/create-1-direction-object`, which is also 25 but yields 4 objects at 1 face
each. So a side-wall object is ~4× a back-wall object, and the two side walls
share one run rather than needing mirrored batches.

**Reusable style handle:** this run returned `object_id`
`4cadad75-8989-4ff4-aa8f-48008d20d536`. Later calls can pass it as
`style_object_id` to anchor new objects to a real 8-angle sibling instead of to a
single hero crop — the cheapest route to a courtyard set that agrees at every
angle.

**Three 422 traps on this endpoint**, all learned for free:
1. `view` is `low top-down` | `high top-down` | `side` — *not* the `top-down`
   that `/create-1-direction-object` takes.
2. `size` is capped at 168, where 1-direction allows 256.
3. `size` **cannot be set at all** alongside `reference_image` — the reference's
   dimensions determine output size.

**Known regression:** the rotation pass lost the teal-green metal fittings; the
faces read all-brown against the original's teal accents. The forms also read
more three-dimensional than the flat original, which suits the perspective but
is a change. Both are Raheem's call before this is repeated across a set.
