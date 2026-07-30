---
name: trace-environment
description: Turn a painted environment plate into a walkable scene by tracing its occluders and colliders in Figma. Use when a new environment plate has been generated, when an existing environment's objects are wrong (character walks through things, or gets cut off by invisible ground), or when re-tracing after a plate is regenerated.
---

# Trace an environment

Painted plates are one flat image. To become a place you can walk around, each
object in the painting needs two pieces of metadata:

- a **collider** — the footprint on the floor that stops you
- an **occluder** — the object's silhouette, drawn in front of you when you
  stand behind it

Both are traced by a human in Figma. Claude reads them and generates everything
else.

## Why a human traces

Claude has failed at this automatically three separate ways, each costing a round
trip and each caught by Raheem playing the game:

| Method | Why it failed |
|---|---|
| Colour distance from local background | The background estimate sampled wall and greenery, came back dark, and **inverted** the mask — it kept the paving and threw away the lamp post |
| GrabCut | Kept paving wherever the object was also warm stone |
| Watershed | Best of the three, still cannot separate pale stone blended into pale stone |

The plates are painted with soft blends and no consistent outline between an
object and the floor it stands on. There is no edge to find. A person sees the
boundary instantly.

Claude also traced coordinates by cropping and measuring twice, and was wrong
both times — lamp colliders 25px below their posts, and occluder ellipses that
reached into open paving and cut the hero off at the neck.

**Division of labour: Raheem decides where objects begin and end. Claude does
the pipeline, the maths, and the proofs.**

## Why NOT to generate objects separately instead

Tempting, because separately generated props come with free alpha. Rejected on
visual grounds, and there is evidence:

- A 65-generation experiment (pixel ground tiles + wall kit + props) lost
  outright to a single painted plate. See PIXELLAB_PLAYBOOK.md.
- The first shopkeeper read as "not from the same game" — an independently
  generated asset dropped onto a cohesive painting.

One painting has one light direction, one palette, and shadows that agree.
That cohesion IS the look. Cutouts taken from the plate cannot mismatch it,
because they are it. Tracing costs nothing visually; compositing costs the
thing we care about most.

## Figma setup (per environment)

One page per environment. Inside it:

```
plate            frame, x=0 y=0, exactly the plate's pixel size (courtyard: 1536x1152)
                 the plate PNG as its fill, LOCKED so it cannot be nudged
  occluders      group
    lamp-upper-left      filled shape traced around the object's silhouette
    fountain             ...one per object
  colliders      group
    lamp-upper-left      rectangle over the object's FOOTPRINT on the floor
    fountain             ...
```

Rules that matter:

- **Frame origin must be (0,0) and its size must equal the plate's pixel size.**
  Everything is read in frame coordinates and lands on the plate 1:1.
- **Names are the contract.** An occluder and its collider share a name. Claude
  matches them by name, so a typo silently orphans a shape.
- Fill colour and opacity are irrelevant — only the shape is read. Solid white
  is easiest to see.
- Trace the **object only**. Not its shadow, not the floor around it. Floor
  caught inside an occluder will hide characters standing on it.
- A collider is the **footprint where the object meets the floor**, not its
  painted height. A lamp post's collider is the small patch at its foot. In a
  top-down world you walk on the floor, and the floor in front of a lamp is
  walkable — the post covering you is the occluder's job.

## What Claude does with it

1. `get_metadata` on the page → every shape's name, x, y, width, height.
   Colliders are finished at this point; rectangles are exactly what
   `scenery.ts` needs.
2. `download_assets` per occluder node → its exported PNG, which is the
   silhouette's alpha.
3. Composite each silhouette against the plate at its recorded position,
   producing the occluder PNG plus a manifest entry.
4. **`groundY` falls out of the trace** — for an accurate silhouette, the bottom
   of the shape is where the object meets the floor. This is the number Claude
   kept getting wrong by hand.
5. Verify (below), then wire into the scene.

## Big objects need horizontal bands, not one ground line

One ground line assumes an object's whole footprint sits at one depth. True for
a lamp post; false for anything wide.

The fountain's bottom edge runs from y 621 at its sides to y 741 at its centre.
With a single ground line of 742, walking up to it anywhere except the middle
third left the hero stopped *above* that line and drawn behind — "I go under it
when coming from the bottom." Only 3 of 13 sampled columns were correct.

Fix: list the object under `banded` in the traces JSON. The importer slices it
into horizontal strips, each sorting on its own bottom edge.

- **Band things you walk AROUND** — fountains, wide planters, anything with a
  broad base.
- **Never band an overhang.** A lamp's ground contact is the foot of its post
  while its head leans up-screen over floor you can stand on. Banding it would
  draw the head *behind* a player standing behind the post.
- **`BAND_H` must stay below `HERO_FEET.height` (20px).** A band sorts on its
  slice boundary, so its ground line can sit up to `BAND_H` below the object's
  real lowest pixel in a column. The hero stops one feet-box short of a collider,
  so a taller band still draws over him after he has stopped. 24 left two columns
  wrong; 12 clears it.

## Verification — all mechanical, no eyeballing needed

- **Alignment:** max RGB difference between each cutout's opaque pixels and the
  plate underneath must be **0**. Cutouts are lifted from the plate, so anything
  other than zero means a positioning bug. This makes seams impossible.
- **Ground-line agreement:** every occluder's `groundY` must match its
  collider's front (bottom) edge within a few px. A mismatch leaves a band where
  the player stands and vanishes — this bug shipped once, on a bush.
- **No floor in the mask:** render the hero standing just above each object's
  ground line and look. Ground caught in the mask shows as a hard horizontal or
  vertical line slicing the character.
- Then `npm run build`, `npm run lint`, `npm run test`.

## Reviewing with Raheem

Send **hero-behind proofs**, not silhouettes on magenta. A mask can be the right
size and the wrong shape; what matters is whether a character standing behind the
object looks right. Composite the real hero sprite onto the plate at the real
depths offline — this does not depend on driving a browser, which is unreliable.

`/castle?colliders=1` draws every collider over the painting in-game.

## Gotcha: the dev server

Running `npm run build` while verifying in the browser writes files Vite watches,
which reloads the page and drops you out of the scene. Do all builds first, then
verify.
