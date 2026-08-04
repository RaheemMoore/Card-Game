# PixelLab Playbook

## Studio V2 production decision

PixelLab remains the primary pixel-character/object provider. The default stack is deliberately simple:

1. **Official PixelLab MCP/API** for semantic generation, targeted edits, inpainting, variations, and animation.
2. **The existing `sprite-lab` harness** for repeatable configs, saved jobs, recovery, packing, provenance, validators, sheets, relighting, and manifest integration.
3. **Pixelorama in the PixelLab web environment** for Raheem's manual pixel corrections.
4. **Phaser runtime/visual playtest** for scale, direction, motion, collision, depth, and environment fit.

Aseprite is deferred. Add it only after repeated evidence shows Pixelorama + deterministic local scripts cannot perform required exact multi-frame edits efficiently. Do not create a separate “PixelLab agent”; the `pixel-sprite-director` owns judgment, production skills own workflows, and PixelLab is an execution capability.

### Correction ladder

Use the cheapest, least destructive correction that solves the actual problem:

1. deterministic local operation (palette map, crop, packing, relight/harmonize, alpha, metadata);
2. targeted official PixelLab edit/inpaint with an approved paid batch;
3. Raheem correction in Pixelorama;
4. regeneration only when the source is irrecoverable.

Every paid batch records operation, prompt/settings, expected/actual cost, job/character id, source/reference, outputs, validator result, runtime evidence, and final verdict. Never spend a generative edit to perform an exact local color replacement that existing tooling can do without identity drift.


Hard-won lessons for generating character sprites. Sibling to [LEONARDO_PLAYBOOK.md](LEONARDO_PLAYBOOK.md) (environment plates + card art). **Append to this file every time a run teaches something** — most entries below cost real generations and a human catching a defect in play.

Tooling: `card-engine/scripts/sprite-lab/`. Skills: [create-character-sprite](.claude/skills/create-character-sprite/SKILL.md), [place-character-in-scene](.claude/skills/place-character-in-scene/SKILL.md). Advisor: [pixel-sprite-director](.claude/agents/pixel-sprite-director.md). Practical guide: [SHOPKEEPER_GUIDE.md](SHOPKEEPER_GUIDE.md).

## Stationary characters are ~2.5x cheaper than walkers

A shopkeeper needs **one** direction and a `breathing-idle` — no walk cycle. The walk cycle is where every defect lived (scale, facing, costume drift) and where the cost sat. Hero: ~25 generations. Shopkeeper: ~10–15 including a dialogue portrait. **Only generate a walk cycle for characters the player steers.** The same logic makes duelling bosses cheap: idle + attack + flinch, one facing.

---

## The one rule

**Create the character once; derive every direction and animation from that `character_id`.** Never generate a view or a frame as an independent prompt. Identity consistency has to be structural — the alternative is re-rolling a prompt and hoping, which is exactly how the Leonardo attempt failed (same character returned in two different art styles; two tries at a front view both produced the back of the head).

## Animation mode: what actually works

Measured, in order of trust:

| Mode | Result | Cost |
|---|---|---|
| **v3 + `custom_start_frame` per direction** | ✅ **The only method that has produced a correct walk.** Pinning each direction to its own clean rotation forces both the facing and the identity. | ~1–2 gen/direction |
| `template` | ⚠️ Cheap and fast, but drifts. Produced a rogue frame **43.7 palette units** from its own cycle (healthy frames sit 3–15) — visible in game as the costume changing mid-walk. Also lost the front facing entirely: the `south` walk came back as the back of the head. | 1 gen/direction |
| `pro` | ❌ Failed despite being the "consistency" mode. Grey background artifacts on several frames, and **both side rows rendered facing the same way** (mirror check same=0.542 vs flipped=0.503). Unusable. | **~186 gen** for four directions |

**Default to v3 with per-direction pinning.** `pro` is documented as generating directions sequentially using finished sides as reference; that is not what we observed, and it is by far the most expensive way to fail.

Run one v3 call per direction (`directions: ["south"]` etc.), each with `startFromRotation` set to the matching rotation. v3 returns `frame_count + 1` frames — frame 0 is the pinned pose, which makes an ideal idle.

## Direction labels

**`east` = screen RIGHT. `west` = screen LEFT. `north` = back view. `south` = front.**

This shipped backwards once and the hero walked right while facing left. Two static methods were used to "verify" it and **both were wrong, in opposite directions**:
- head-vs-body centroid heuristic — misled by hair mass on the back of the head
- 4× zoomed crop, read by eye — small pixel faces are genuinely ambiguous

**Walk the character in the game and look.** That is the only authority. Static analysis is for *internal consistency* only (mirror-IoU: resize two alpha masks to a common box, compare IoU normally vs flipped; higher-when-flipped means opposite facings).

## Never mix sources

The idle frame must come from **the same animation** as the walk frames. Rotations and animations are rendered separately and only loosely agree on body scale — mixing them (rotation for idle, animation for walk) produced a **33% size jump** when the character stopped, and a 25% shrink walking left.

This is the second time this bug has hit the repo; `src/data/combat/heroSpriteManifest.ts` documents the first.

## Normalize on the feet

`lib/pack.py` scales every frame to one shared body height and aligns the feet to a common baseline. Two subtleties:
- Anchor horizontally on the **centre of the feet** (bottom ~15%), not the bbox centre — arms and a swinging leg move the bbox sideways and the character slides inside his own cell.
- Keep **one shared crop box** for all frames. Per-frame cropping re-centres him every frame and he jitters.

## Palette references

Passing a scene plate as `color_image` for "harmony" dragged a chibi character toward dark stone tones; his face and apron lost contrast and he read muddy against sunlit paving. **Readability of the character the player controls beats palette cohesion.** Prefer no colour reference for player characters; reserve it for props that should recede.

## "Transparent background" can be drawn LITERALLY

A wall-crack prompt asked for a *"solid blade of brilliant light"* on a *"transparent
background"*. The model returned a **literal transparency checkerboard rendered as actual
pixels** — the grey-and-white squares baked into the image — around a white bar.

The failure mode: when the subject itself is mostly light and the rest of the frame is
described as transparent, there is almost nothing left to draw, so the model draws the
convention for "nothing". Its training data is full of checkerboards meaning transparency.

**Say `no background, no floor, no panel, no square border` instead.** Those describe what must
not be present; "transparent background" names a *thing* the model can render. The three
sibling items in the same call that had solid subjects came back correctly, so this is
specifically a risk when the subject has little substance of its own.

Related and already recorded: PixelLab's `no_background` flag is a request, not a guarantee.


## Colour is a post-process, and offering it is my job

**Standing rule (Raheem, 2026-08-04):** *"Not just known that you can do it — make it known that
I WANT you to do it. Let me know: 'hey, you want me to tweak the colour and make it match the
palette, because this one was a little bit off?' Yes I do. I want you to do it."*

**When an asset's only problem is hue, saturation or value, offer a recolour BEFORE anything
else, unprompted.** Regenerate for composition, pose, silhouette or content. **No paid
generation is ever spent on colour alone.**

The tool is `card-engine/scripts/sprite-lab/lib/recolor.py`.

### Why this is safe

- Generated sprites carry a small fixed palette — the chibi archivist is **23 distinct colours**
  in her whole sprite — so a colour *map* is exact, not approximate.
- A map is deterministic: same input colour, same output, **every frame and every rotation,
  forever**. An AI inpaint runs per image and drifts — the failure that already produced a
  costume changing mid-walk-cycle at 43.7 palette units.
- The correction ladder above already ranked "palette map" at rung one. The policy existed and
  was not followed.

### It cost three regenerations in one session before this was written down

| What happened | Cost | What should have been said |
|---|---|---|
| Arch and fissure came back neutral grey against a warm honey plate | a proposed re-roll of both | *"Want me to remap the stone to the plate's cream and honey?"* |
| The dwarf read Middle Eastern instead of Black | **8 generations** | *"Want me to try the skin ramp first?"* |
| ~~The 8-face weapon rack's teal fittings came back brown~~ **THIS CLAIM WAS FALSE** | measured on 2026-08-04: the rack is **0.2% teal**, i.e. noise. It never had teal fittings; the **trophy rack** (11.7%) is the asset that does. The rotations preserved it faithfully. | Measure before recording a regression |

The last is the worst: the defect was noticed, written down, and still not offered.

### Measure the complaint before acting on it

Three assets were listed as off-palette on 2026-08-04. **Two of the three claims did not survive
measurement**, and both had been written down from eyeballing a small composite:

- *"The weapon rack's teal fittings came back brown"* — the rack is **0.2% teal**. It never had
  them. The trophy rack (11.7%) is the asset with teal.
- *"The v2 reliquary cases flattened to a uniform cyan"* — only partly. Hue histograms show the
  staff kept its green (150°) and the blade kept its gold (30°). **Only the bow** genuinely lost
  its identity: cyan 180° at 2022px edged out gold 30° at 1801px.

A recolour is cheap, but recolouring the wrong thing still damages an asset that was correct.
**Run the hue histogram first.** It takes seconds and it is the difference between a fix and a
new defect.

### The caveat — ramps are shared

Measured, not assumed: the archivist's five silver hair greys **also appear in her tunic, hem
and shoes**. A global swap recolours her outfit, so use `--region x0,y0,x1,y1` (fractional
against the sprite's own bounding box, so one call works across frames at different offsets).

**A quick tell:** after a hue swap, if the distinct-colour count is **unchanged**, the map hit
everything. If it **rises**, the region held and the original ramp survives outside it.

## The art register is a PARAMETER, not an adjective

**`/create-character-v3` has no `proportions` field.** You can write "chibi, big-headed" in the
description all you like; the model will hand back a detailed adult. That is exactly what
happened to the forge apprentice — semi-realistic, adult proportions, standing beside a game
made of big-headed chibis, and Raheem caught it immediately.

**`/create-character-with-4-directions` has a real `proportions` preset**, and that is the route
that produced the hero who is actually in the game.

| Need | Route | Why |
|---|---|---|
| A chibi character for this game | `/create-character-with-4-directions` + `proportions: {type: preset, name: chibi}` | The preset is enforced, not suggested |
| Maximum fidelity, register not critical | `/create-character-v3` | 8 rotations, ~64 colours, but proportions are prose-only |

**The standing rule (Raheem, 2026-08-04):** *"Only generate characters for this game based on
the other characters in the game."* Copy `hero-chibi.json`'s style block verbatim — view,
proportions, outline, shading, detail and size — and change only the identity. Vary body type,
age, sex and ancestry as much as you like; **never vary the register.** A cast generated with
different style blocks looks assembled from different games, which is precisely what happened.

## Parameters worth knowing

- `proportions` presets: `default`, `chibi`, `cartoon`, `stylized`, `realistic_male`, `realistic_female`, `heroic`, or custom head/limb multipliers. At ~100px display height, big heads read and realistic figures turn to mush.
- `view`: `low top-down` (face visible — what Pokémon does), `high top-down` (mostly scalp), `side`, `perspective`.
- **`seed` — always set it explicitly.** It is the difference between "we can rebuild this character" and "that character is gone."
- **The model overrides your requested size.** Asked 128², got 180². Read `size` back off the character detail.
- `pro` ignored `frame_count: 6` and returned 4.

## Objects and scene layers

**~~PixelLab objects cannot be animated.~~ CORRECTED 2026-08-04 — THEY CAN.**
`/objects/{object_id}/animations` ("Add an animation to an existing object") animates an object
created by `/create-1-direction-object` or `/create-8-direction-object`. Both return an
`object_id`; that id is the handle.

- **`mode='v3'` is the default and the cheap one.** `mode='pro'` costs **20-40 generations per
  direction** (160-320 for a full 8-direction set) — the API's own cost warning. Use v3.
- **`frame_count`** is any even number 4-16 (default 8). v3 also stores the input reference
  frame, so `frame_count=8` yields **9** stored frames.
- **Do not pass `directions` for a 1-direction object** — it animates its single internal
  direction and passing the field returns 400. For an 8-direction object, omitting `directions`
  animates all eight, which is how you accidentally buy eight animations.
- **Interpolation mode (v3 only):** pass `end_frame` (and optionally `custom_start_frame`) and
  the model animates *between two poses you supply*. Requires exactly one direction.

**Why this was wrong for so long:** the original finding was correct when written — the object
endpoints themselves return stills, and the *character* animation routes need a `character_id`,
so "objects cannot be animated" followed. PixelLab has since added a separate object-animation
route, and nothing re-checked the spec. Raheem caught it. **Check `GET /openapi.json` against a
claimed limitation before designing around it** — the whole "animate it in Phaser instead"
decision rests on this, and the spec is one unauthenticated fetch away.

Still true: `/animate-with-text` and `/characters/animations` are skeleton-driven and need a
`character_id` — they animate a rigged humanoid, not a fountain. And faking motion with
independent "frame 1/2/3" prompts remains the drift trap that cost 186 generations. The fix is
the real endpoint, not prompt tricks.

*(Superseded original: objects return still images only and there is no object-animation
endpoint.)*

---

# What PixelLab can actually do

**Read this before deciding something is impossible.** The API exposes **79 endpoints**; this
project has been using about six. The "objects can't be animated" mistake happened because a
true-at-the-time limitation was written down and then never re-checked. The spec is one
unauthenticated fetch away:

```bash
curl -s -H "authorization: Bearer $PIXELLAB_API_KEY" https://api.pixellab.ai/v2/openapi.json
```

There is also `GET /v2/llms.txt` — LLM-friendly documentation, written for exactly this purpose.

## ALWAYS CONFIRM THE ANGLE BEFORE ANIMATING

**Standing rule (Raheem, 2026-08-04):** *"Always confirm the angle before animating anything so
we make sure we're animating the right side."*

Animation is **per-direction** — `/objects/{object_id}/animations` queues one job per direction,
so a clip exists only on the faces you paid for. Animating `south` when the object is going
against the left wall (`south-east`) buys a loop the player never sees.

PixelLab's own documentation says the same thing, in the parameter description for
`custom_start_frame`: *"For AI agents calling this endpoint: ASK the user which direction they
want."*

**The workflow:**
1. Generate the angles.
2. Raheem picks the face and places it.
3. **Confirm that face**, then animate it.

**Nothing is lost by animating one direction first.** The response carries an
`animation_group_id`; passing it back later extends the *same* animation to more directions and
charges only for the new ones. So "flutter" is a named clip that can grow — starting narrow
costs nothing.

**Measured cost:** ~2 generations per direction for `mode='v3'` (9 frames). All eight faces
would be ~16, against **40** for a rotation pass. Animation is the cheap half — the reason to
confirm the angle is correctness, not money.

## PixelLab and Phaser are partners, not alternatives

This is the mental model to keep. They do different jobs and the courtyard needs both.

| | PixelLab makes | Phaser makes |
|---|---|---|
| **What kind of motion** | Motion that belongs to the **object itself** — a banner rippling, a crystal pulsing, pages turning, a flame guttering, a creature breathing | Motion that belongs to the **world** — sparkles, dust, drifting motes, glow bloom, proximity reactions, parallax, screen-space light |
| **Cost** | Generations, per animation | **Free**, and re-tunable forever |
| **Changeable later** | Only by regenerating | Instantly, by editing a number |
| **Can it react to the player?** | No — it is a fixed loop | Yes — this is Phaser's whole advantage |

**The rule:** if the motion is *intrinsic to the thing*, PixelLab animates it. If the motion is
*atmosphere around the thing*, or has to **respond to the player**, Phaser does it. A magical
card stand should have PixelLab-animated cards lifting and turning, **and** Phaser sparkles that
brighten as the hero approaches. That is not redundancy — it is the two halves of "alive".

`src/pages/castle/v2-preview/crystalVfx.ts` is the reference implementation of the Phaser half.

## Capability map

### Things that move

| Job | Endpoint | Notes |
|---|---|---|
| **Animate an object** | `POST /objects/{object_id}/animations` | **The one we were missing.** `mode='v3'` (default, cheap). 4–16 frames. 1-direction objects: omit `directions`. |
| Animate a character | `POST /characters/animations` | v3 + per-direction pinning is the only method that has produced a correct walk here |
| Animate between two poses you supply | `POST /interpolation-v2`, or `end_frame` on the object route | **Interpolation mode.** You draw the start and end; the model fills the middle. Enormous for exact control |
| Skeleton-driven animation | `POST /animate-with-skeleton` + `POST /estimate-skeleton` | Unexplored |
| Edit an existing animation | `POST /edit-animation-v2` | Fix a clip without re-rolling it |

### Things that make new art

| Job | Endpoint | Why we should care |
|---|---|---|
| Object, one face | `POST /create-1-direction-object` | 4 objects per call at a ≤170px style ref |
| Object, eight faces | `POST /create-8-direction-object` | `reference_image` re-shoots an existing object from all angles |
| **Map object** | `POST /map-objects` | Purpose-built for game-map props with transparent background. **We have never used it** and it may beat the generic object route for scenery |
| **Convert existing art to pixel art** | `POST /image-to-pixelart` | **Potentially huge.** Input up to 1280², output up to 320². Our Leonardo plates, card art and element crystals could be brought into the pixel register instead of redrawn |
| **UI panels** | `POST /create-ui-asset`, `POST /generate-ui-v2` | Shape-controlled pixel UI panels. Directly relevant to the UI-kit work |
| Tilesets | `POST /create-tileset`, `/create-tiles-pro` | Seamless lower/upper terrain sets |
| Pixel fonts | `POST /generate-font-pro` | Unexplored |

### Things that change art we already have — the cheap correction ladder

**Prefer these over regenerating.** Regeneration risks identity drift; these do not.

| Job | Endpoint |
|---|---|
| **New state of an object** (lit/unlit brazier, open/closed chest) | `POST /objects/{object_id}/states` — a text edit, grouped with the source |
| **New state of a character**, applied consistently across all directions | `POST /create-character-state` |
| Targeted inpaint | `POST /inpaint-v3` — mask or bounding box, text-described |
| Swap a costume across animation frames | `POST /transfer-outfit-v2` |
| Re-angle one image | `POST /rotate` |
| Background removal / resize | `POST /remove-background`, `POST /resize` |

### Review and housekeeping we are not using

| Job | Endpoint |
|---|---|
| **Keep only the good frames** | `POST /objects/{object_id}/select-frames` — promote chosen frames of a review object |
| Throw away a bad generation | `POST /objects/{object_id}/dismiss-review` |
| List everything we own | `GET /objects`, `GET /characters` |
| Export a character | `GET /characters/{character_id}/zip` |
| Tag assets | `PATCH /objects/{id}/tags`, `PATCH /characters/{id}/tags` |

### Talking portraits — nearly free

| Job | Endpoint | Cost |
|---|---|---|
| Generate mouth positions (visemes) for a portrait | `POST /vocal-animation` | **Paid once per expression** |
| Get the frame-by-frame mouth plan for a line of text | `POST /lip-sync` | **FREE and unlimited** |
| Render a talking GIF | `POST /talking-gif` | **FREE** |

`/lip-sync` returns `grid_url`, `row` and `viseme_order` — everything needed to blit the right
mouth cell in Phaser. So **once a keeper has a portrait and one paid viseme set, every line of
dialogue she ever speaks animates for free.** That is the cheapest characterisation available
to this project and nothing in the game uses it yet.

## What this changes about the courtyard

Raheem's brief is that each quadrant should make you want to walk over and explore — sparkle,
movement, things waving in the air, papers drifting off a stand. Nearly all of that is now
buyable rather than faked:

- Cards **actually lifting and turning** on a forging stand — object animation
- A crystal **actually pulsing**, shards **actually orbiting** — object animation
- Pages **actually fluttering** off a lectern — object animation
- A banner **actually rippling** on a side wall — object animation
- Sparkles, dust, bloom, and the reaction when the hero gets close — **Phaser, free**

Design objects with their moving parts already separated and airborne. A piece drawn as one
closed lump animates badly; a piece drawn with its cards already off the stand animates well,
and Phaser can move those parts too if the generation disappoints.

## Standing rule

**Check the live spec before designing around a provider limitation.** This entry exists
because two canonical documents asserted a limitation that had stopped being true, and it
silently shaped a design decision. Cost of checking: one `curl`. Cost of not checking: the
wrong architecture.


Do **not** work around this by prompting "fountain frame 1/2/3" as separate generations. Independent prompts have no shared anchor, and `template` mode drifted **43.7 palette units** even *with* a `character_id` anchoring it. Guaranteed drift, and no validator currently catches it.

**Ambient motion is therefore a Phaser concern on static sprites, and costs zero generations:** glow pulses (additive quad + alpha/scale sine), water shimmer (UV/alpha scroll), banner sway (`Rope`/mesh or skew tween), dust motes (particle emitter), proximity glow (tint tween).

**The style-match rule for a painted plate:** a pixel prop next to a painted prop reads as a bug, not a style. The hero gets away with being a sprite on a painting because he is unambiguously an *actor* — players extend that licence to characters, not to furniture. So:
- **Scenery layers must be cut FROM the plate itself.** Style match is then exact by construction — the pixels came out of the same painting.
- **Reserve PixelLab for new gameplay objects** the player targets or collides with, which inherit the actor licence.
- For those, pass the **hero crop** (≤168×168) as `reference_image` so props match the hero's register — and never the plate as `color_image`.

If a fully layered, fully interactive courtyard is ever wanted, the coherent path is rebuilding it in pixel art via `/create-tileset` — **not** hybridising by accretion.

## The pixel-courtyard experiment — VERDICT: keep the painting (68 generations)

A full pixel-art courtyard was built as a sample (`/dev/courtyard-sample`) and compared against the painted Lucid Origin plate with the same hero in both. **The painting won.** Findings, in order of usefulness:

1. **The hero belongs on the painted plate better than expected.** His palette (honey/teal) already matches it, and "sprite on a painted map" reads as deliberate rather than pasted. This was the main thing the test was for, and it removed the strongest argument for rebuilding.
2. **The painted plate is simply better art** — depth, cast shadows, varied paving, real architecture. A tiled courtyard would need substantial effort to approach it, and would mean discarding a strong asset.
3. **A 2-terrain Wang tileset has only ONE pure ground tile**, so a plain fill shows a hard repeating grid. Breaking it needs numbered stone variants in the description, or a second tileset call. My sample's grid was a composition failure, not a PixelLab limitation — but even corrected, point 2 stands.
4. **The props are excellent and cheap** — fountain, crystal lamppost, striped stall, barrel in one call. Keep this route for genuinely NEW objects. Note the painted plate already contains all four, so we didn't need them.

**Standing direction:** PixelLab for **characters** (hero, shopkeepers, bosses) and for **new objects that don't already exist in the plate**. The painted courtyard stays, and its life comes from plate-derived layers animated in Phaser at zero generation cost.

### Costs measured (previously unknown)

| Call | Generations |
|---|---|
| `/create-tiles-pro` `tile_feature: tileset` (16-tile Wang grid) | **20** |
| `/create-tiles-pro` `tile_feature: building` (56-piece wall kit) | **20** |
| `/create-1-direction-object` (4 props in one call) | **25** |
| `/portrait-character-pro` | **25** |

Tiles are expensive. Budget them as ~20 per call, not "a few".

### Four different result shapes — check all of them

Results are never on the POST response. They arrive as:
- `last_response.images[]` — characters, portraits
- `last_response.tileset_grid_png` — `tile_feature: tileset`
- `last_response.storage_urls` — objects (name→URL map, on the job)
- `GET /tiles-pro/{tile_id}` → `storage_urls` — `tile_feature: building` (nothing inline)

Twice a completed, paid job was discarded because the code looked in the wrong place. **`sprite-lab.mjs recover <subject>` rebuilds manifests and re-downloads from saved jobs, spending nothing** — always save the raw job, and recover rather than re-POST.

`/create-1-direction-object` also **rejects `seed`** ("Extra inputs are not permitted"), so object output is *not* reproducible — unlike every other endpoint.

## Adopting a character made in the web app

A character generated by hand in the PixelLab UI can be pulled straight in: **the `/create-character/<id>` link is all that's needed** — our key reads the character off the API, no export step. Put the id in a config as `characterId` and `sprite-lab.mjs gen` skips creation and only adds animations.

Download the frames with **`GET /characters/{id}/zip`** (authenticated). The raw CDN URLs 403 against a plain `urllib` fetch — node's fetch and `curl` work, but the zip avoids the question entirely.

**`breathing-idle` on one direction cost 1 generation** (reported as 0 by the job; the balance moved by 1). Four frames, all genuinely distinct — a proper subtle loop.

## Every character must agree that `y` means the ground line

The keeper was placed with origin `(0.5, 1)` — `y` is where he stands. The hero still had Phaser's default `(0.5, 0.5)`, so **his `y` was his centre and his physics body sat 50px below it.** Consequences, all real:

- the hero **walked straight through** the shopkeeper (no y-overlap between their bodies)
- depth sorting compared a centre against a ground line
- the contact shadow had been floating 50px high since it was added

Fixed by giving the hero `setOrigin(0.5, 1)`. **Set feet origin on every character sprite**, because three separate systems compare `y`: depth sorting, contact shadows, and collider placement. Mixed conventions fail silently and look like unrelated bugs.

## NEVER DOWNSCALE PIXEL ART — author at display resolution

The single biggest quality bug so far, reported as *"he doesn't feel like he's from the same game"* and *"the muddiness is the problem"*.

Both characters were being rendered at **46% of the resolution they were drawn at**:

| | Authored | On screen |
|---|---|---|
| Keeper | 79 × 125 | 37 × 58 |
| Hero | 78 × 152 | 36 × 70 |

The GPU's nearest-neighbour sampling throws away over half of every row and column, *every frame*. Dreadlocks, beads, fur, buckles and outlines collapse into speckle. And the painted plate does **not** degrade this way, because it isn't pixel art — so the characters were the only degraded thing on screen, which is exactly what reads as "different game".

**The fix is a rendering fix, not an art fix** (a lower-detail sprite downscaled to 46% is still mush):

1. `lib/resample.py` — reduce to display resolution **once, offline**, with BOX area-averaging (every source pixel contributes, so thin features survive) and re-quantise to a tight palette. Alpha is re-binarised or the averaging leaves a semi-transparent halo.
2. Render at **~1:1 or upscaled**. Both are now at effective scale ~1.0.

**Sizing rule:** target frame height = intended world height × the camera's cover zoom. Authoring at that size keeps runtime scale at or just above 1.0 across window sizes. **Upscaling pixel art is fine — chunky is the intended look. Downscaling is what destroys it.**

Corollary for generation: PixelLab's 244² output carries far more detail than a ~58px-tall character can show. Either request a much smaller size, or resample offline as above.

## Measuring animation in an automated browser is unreliable

Three separate measurements said "frozen" when the animation was fine. Both causes are worth knowing:

- **Aliasing.** Sampling a 5fps animation every 200ms hits the same frame every time. Sample over a window several times the frame period, at an interval that is not a multiple of it.
- **rAF throttling.** The automated pane throttles `requestAnimationFrame` while being driven; a 120-tick rAF loop that should take 2s never finished. Timer-based polling then reports a static frame.

Trust instead: a long, off-beat sampling window; sheet geometry (does it divide evenly into the declared grid?); the animation's row mapping (is the reported frame index in the expected row?); and **a human looking at it**.

## Animation templates are PER BODY TEMPLATE — and quadrupeds are richer

`breathing-idle` is **humanoid-only**. Requesting it on `template_id: 'horse'` returns a 422 (free — validation precedes generation), and the error helpfully lists the real set. Never assume a template id transfers between body types.

**Horse / quadruped set:** `attack`, `attack-back`, `dying`, `eat-start`, **`eating`**, `eat-end`, `hit-left`, `hit-right`, `idle-shaking-head`, `lie-down`, `rest-cycle`, `rest-idle`, `running-4-frames`, `running-6-frames`, `running-8-frames`, `running-headbutt`, `running-turn-left`, `running-turn-right`, `sleep-cycle`, `stand-up`, `start-sleep`, `swimming`, `walk-4-frames`, `walk-6-frames`, `walk-8-frames`, `walk-turn-left`, `walk-turn-right`.

So a grazing horse gets a **literal `eating` animation** rather than a head-lowered pose faked with a breathing loop. **Deliberately send a wrong template id to enumerate the valid ones for a body type — it costs nothing.**

Also note the quadruped set has explicit `walk-N-frames` and `running-N-frames` variants, and `rest-idle` for a standing animal — worth remembering for stable scenes and mounts.

## Two character pipelines, and one dangerous parameter

| Pipeline | Route | Result |
|---|---|---|
| **v3 / pixen** | `/create-character-v3` | 8 rotations, ~64 colours, high detail. **The cast quality bar.** Accepts `seed`. No `proportions` field — describe chibi in prose. |
| 4-direction | `/create-character-with-4-directions` | Flatter, fewer colours, has `proportions`. What made the temporary hero. |

**`reference_image` on v3 is NOT a style reference.** It is a south-facing sprite the model *rotates into 8 directions*. Passing an existing character to "match its style" regenerates **that character** wearing the new description. There is no style-reference parameter for characters — register comes from the description plus `outline`/`detail`.

Native size follows the pipeline and is not controllable: v3 returned 244² canvases with body heights of 119px (dwarf) and 222px (archivist) from the same settings. Normalize apparent size in code with an intended world height; never trust native size.

## Jobs can stall and be auto-failed — clear the record before retrying

A horse `eating` animation ran to `status: "failed"` with `"Generation stalled and was automatically failed. Please try again."` **Nothing was charged** (usage 0). The tell beforehand was `progress` moving *backwards* — 0.4 → 0.05 → 0.18 — which is the service retrying internally before giving up.

The trap is on our side: the dead job id sits in the manifest, so every later run "resumes" a job that can never finish and the config is **permanently wedged**. `sprite-lab.mjs` now deletes the animation record when a job reports failed/cancelled, so a re-run re-submits.

Related: don't poll by re-running `gen` on a loop. Poll the job id directly. Repeatedly invoking the command adds nothing and makes the log hard to read.

## API gotchas

- **Animations do not move the character's status.** It already reads `completed` from the rotation pass, so polling *the character* returns instantly and silently yields `animation_count: 0`. Poll the `background_job_ids` instead.
- **Results live on the finished job**, at `job.last_response.images[]` (base64) — not on the POST response, which returns only a job id.
- **`POST /characters/{id}/portrait` is a setter**, not a generator; it stores an image you supply. The generator is **`POST /portrait-character-pro`** with `direction: character_to_portrait`, which derives a bust portrait *from the character's own sprite* — so a shopkeeper's chat portrait is provably the same person. Cost: 25 generations.
- **The asset CDN returns transient 503s.** One threw away an entire completed run's download pass — generations already paid for. `download()` retries with backoff; keep it that way.
- Animation array order in `character.json` **changes** as animations are added. Never name files by array index; name them semantically (an index-based scheme silently remapped an existing file to a different animation between two runs).
- Frames arrive already transparent — `bg-harness/lib/cutout.py` is only for Leonardo plates.
- Validation errors return the allowed enum values in `detail`, so a deliberately bad value is a free way to discover options.

## Gate everything: `lib/validate.py`

Blocks packing on failure. Calibrated against real data — sound rows measured 3–15 palette drift, the broken frame **43.7**, the corrupt `pro` frames **191**. The gap is wide, so failures are unambiguous.

Checks: per-frame body height vs row median (±4%), idle vs walk height (±4%), feet baseline swing (8% of body height), idle ground line (4%), per-frame palette vs **row median** (20), idle vs walk palette (20), left/right mirror.

**Measure palette drift against the row's MEDIAN, never a chosen reference frame.** An earlier version compared to frame 1; when the rogue frame landed in the idle slot the reported drift fell 51.7 → 16.8 and "passed" while the defect was still plainly visible in game.

Feet baseline must be a **fraction of body height, not raw pixels** — a flat 2px rule false-positived the healthy row, because in any real walk cycle the lowest pixel rises as a leg lifts.

## A packer must never be able to crop its own subject

`pack_row.py` derived frame width from the widest source image, then shoved each
frame sideways by the anchor offset. Those two facts are incompatible: a frame
anchored far from centre runs off the canvas, and `Image.paste` crops it
**silently** — no error, no warning, no failing gate.

The grazing horse lost his entire hindquarters this way and shipped. So did the
archivist, whose sheet was clipped on the left and right. Raheem found the horse
by looking at him: *"we only have 70% of a horse."*

The cause was the anchor. `foot_x` is the centroid of the bottom 15% of the
silhouette, which approximates the body centre for anything standing on two
legs. For a **head-down quadruped** the bottom 15% is muzzle, hay and front
hooves clustered at one end, so the anchor sat 21% of the frame away from centre.

Three fixes, all of which matter:

1. **Compute every paste offset first, then size the canvas to the real extent.**
   Now no anchor choice can clip, whatever it is.
2. **`--anchor {feet,bbox}`**, defaulting to `feet`. Auto-detection is a
   *warning*, never a decision — it prints the anchor and the disagreement, and
   shouts past 20%. A packer that changes its own behaviour quietly is what
   caused this.
3. **Assert inside the packer** that no opaque pixel lands within 1px of a frame
   edge, independent of the validator.

## The gate was blind to a feature MOVING

`palette()` is deliberately robust to the subject shifting inside the frame.
That robustness is a blind spot: the archivist's belt ledger teleported
hip-to-hip across her four frames — left hip, front-centre, right hip, absent —
and whole-frame drift barely twitched, because every colour was still present,
just somewhere else. The gate said **PASSED**. Raheem said she "turns back and
forth."

Fix: run the same signature over a **3×3 grid** and compare each cell against the
row median *for that cell*. Calibrated on a matched pair — same pipeline, same
frame count, one clean and one broken:

| Sheet | Worst cell | Verdict |
|---|---|---|
| dwarf (clean) | 6.7 | passes with 1.8× margin |
| archivist (broken) | 20.8, lowest frame 15.4 | fails every frame |

`BLOCK_DRIFT_LIMIT = 12.0`. It also names the region — it reported "bottom left,"
which is exactly where the pouch sits.

Both defects are frozen as fixtures and asserted in `test-validator.sh`, together
with a **healthy-dwarf control** so the suite proves the gate isn't simply
failing everything.

## Prop drift is unfixable by generation — use one frame and a tween

No parameter stops the animation service redrawing props between frames. It
changed the hero's costume mid-walk and moved the archivist's ledger between
hips. Do not spend generations re-rolling it hoping for better dice.

Ship **one frame** and synthesize the motion in Phaser. Drift becomes
structurally impossible: there is only one image, so nothing can move that isn't
meant to.

- **`scaleY` only, never `y`.** `y` is the ground line and three systems compare
  it — depth sorting, contact shadow, collider placement. With a feet origin,
  `scaleY` already produces the head rise a bob would duplicate.
- **Match the register across the cast.** The dwarf's real loop at `fps 5` was a
  0.8s cycle — 75 breaths/min — against a 3.0s tween. A 4× mismatch is more
  legible on screen than either motion alone. He is now `fps 2`.
- **Random phase per keeper**, or a courtyard of them breathes in lockstep.
- **Amplitude is a real tuning knob.** At ~68 display px, 1.015 is under a pixel,
  and under NEAREST filtering that pops a single row in and out rather than
  animating. 1.03 (~2px) reads as deliberate. Never past 1.04 — a uniform
  `scaleY` lengthens legs that shouldn't move.
- **Do not apply this to a quadruped.** A uniform `scaleY` on a head-down horse
  raises rump and muzzle equally, which reads as the whole animal inflating.
  Ambiguous enough to pass for breathing on a biped; unmistakably wrong on a
  horse.

## Choose the animation template by what is likely to COMPLETE

`eating` stalled server-side twice (progress running backwards 0.4 → 0.05 →
0.18, then auto-failed; nothing charged). The API splitting `eat-start` /
`eating` / `eat-end` is the tell that `eating` is the long looping middle, and a
watchdog timeout is what that failure signature looks like.

Prefer the **idle family** (`rest-idle`, `rest-cycle`, `idle-shaking-head`):
shorter, more standard, more likely to finish. Two further arguments that turned
out to matter more than the original brief:

- **Reusability.** A chewing loop only works where there is hay. A resting idle
  drops into a stable, a road, an inn yard.
- **Legibility.** At 84px a jaw is a couple of pixels. A head-and-mane shake
  reads across the whole courtyard.

Also check what is **baked into the sprite**. The horse's hay is part of his own
image, so any template that lifts his head detaches him from his own hay pile.
That ruled the idle family out until the brief was widened.

## Occlusion: cut it out of the plate, sort it by its ground line

Characters sort by `setDepth(y)`, so a piece of the painting cut out as its own
PNG and drawn at the depth of ITS OWN GROUND LINE occludes them automatically.
Zero generations. Two rules learned the hard way:

**Colour keying does not work on this plate.** `slice_plate.py` keys the water on
cyan because water is the only strongly saturated thing there. Applying the same
idea per-object failed twice over: the background estimate taken from each box's
border ring clipped wall and greenery, came back dark, and INVERTED the mask —
paving scored distance 122 against the lamp post's 28. And even with a correct
background the crates do not separate at all (56 vs 32). Painted wood on painted
stone is the same colour. Use hand-authored shape primitives instead.

**A cutout is invisible where it duplicates the plate.** It is composited over a
painting that still contains the object, so extra pixels are byte-identical to
what is underneath. Cutting *tight* is what shows, as a character leaking through
the gap. Verify with an alignment diff — max RGB difference where alpha ≥ 250
must be **0**, which makes seams impossible by construction rather than by eye.

**`groundY` belongs on the collider's front edge, not the visual front.** The
south-east bush was first set to the front of its leaves, 18px past its
collider's edge, leaving a band where the player stood inside the bush with only
his hair showing. The moment you step clear of a thing you should draw in front
of it.

**Light must sort with the thing emitting it.** The lamp glows sat at a fixed
depth of 4–5, under every character. Harmless while nothing occluded; an obvious
contradiction the moment a lamp post can cover the hero.

Verify offline by compositing the real hero sprite onto the plate at a y above
and below each ground line, in depth order. That exercises the actual assets and
the actual numbers, and does not depend on driving a browser.

## The human gate is not optional

The validator proves a sheet is internally *consistent*. It cannot prove the character faces where he walks, or that he looks good. Every one of the five defects Raheem reported (shrinking, backwards facing, costume change, wrong proportions, "fix the walking") was found **by playing**, not by analysis.

So: validator passes → wire it → drive all four directions and screenshot → **get Raheem's sign-off**. He has asked to be used this way.

## Cost log

| Run | Generations | Result |
|---|---|---|
| hero-cardwright: character + 4 rotations + template walk + v3 front walk | 11 | Shipped, then rejected on 5 defects |
| hero-cardwright: dialogue portrait (`portrait-character-pro`) | 25 | ✅ Good |
| hero-chibi v1: character + `pro` walk | ~186 | ❌ Corrupt frames, both sides facing same way |
| archivist (v3, 8 rotations + breathing idle) | ~15 | ⚠️ **The gate's pass was false.** Ledger teleported hip-to-hip across all 4 frames; Raheem caught it in play. Now ships as ONE frame + a Phaser breath tween. Her seed was never recorded — she can never be rebuilt |
| horse (v3, `horse` template, 8 rotations) | ~7 | ⚠️ Rotations good, hay attached. Sheet then **clipped by the packer** — 30% of him missing, caught by Raheem, not by any gate |
| horse `eating` animation | 0 | ❌ Stalled server-side twice, auto-failed. Nothing charged |
| horse `rest-idle` (idle family, east only) | 1 | ⏸️ **Abandoned in flight.** Accepted cleanly (no 422 — `rest-idle` IS valid for quadrupeds) but had not returned after ~15 min, same shape as the `eating` stalls. Killed locally, job record cleared. Horse ships static |

**Quadruped animation on this service is a bad bet — stop reaching for it.** Three
attempts across two templates, zero usable frames, and a lot of wall-clock time
spent waiting. The requests are accepted and then never finish. Character *rotations*
for the same body template came back fine (~7 generations), so the problem is the
animation endpoint on quadrupeds specifically, not the horse.

If a moving animal is ever genuinely needed, budget it as a speculative side quest
that may return nothing — never as a step on the critical path to shipping a scene.
A well-posed still reads fine at 84px; the grazing pose carried the courtyard on its
own and nobody noticed until they were told to look.
| pixel courtyard sample: ground tileset 20 + wall kit 20 + 4 props 25 | 65 | ❌ **Painting won** — see the verdict section above. Cheap answer to a months-long question |
| hero-chibi v2: character + 4× v3 pinned walk (3 gen each) | ~25 | ✅ **Passed the gate first try** — drift 5.2–9.3, heights identical, baselines aligned, correct mirror, and verified facing correctly in game |
| tower-quadrant: 4 wall-furniture objects, one call | 25 | ✅ Portcullis, muster board, trophy rack, weapon rack. Palette and outline weight match the shipped forge counter/bench closely — the hero-crop anchor held the register |
| tower-quadrant: 2 yard fixtures, one call | 25 | ⚠️ **The call returned 4 objects, not the 2 requested.** Brazier and tally pillar came as asked; two unrequested extras (a stone winch, usable; a stone floor patch, not an object) filled the remaining slots of the 4-cap. The tally pillar came back **isometric** while every other object is elevation or three-quarter |

| side-walls: 8 faces of the weapon rack via `/create-8-direction-object` + `reference_image` | 25 | ✅ **Genuinely turned faces, not skews.** `south-east` serves the left wall, `south-west` the right. Palette regressed — the teal-green fittings came back brown |

### Objects CAN be re-shot from other angles — just not animated

`/create-8-direction-object` accepts a **`reference_image`**, documented as
*"generates 8 rotations of this exact image"*. So an object that already works can be turned
into its other seven faces instead of re-invented from a description — which is what produced
the wrong forge angle twice. This does **not** contradict the no-animation finding above:
these are eight stills of one object, not motion.

**Rotating a finished sprite in code is not a substitute and was tested.** It aligns the
footprint to a diagonal wall but cannot invent the face the object should be showing — a
rotated weapon rack still presents its front to the camera. Only convincing for thin flat
things like boards and banners.

| | Cost | Yield |
|---|---|---|
| `/create-1-direction-object` | 25 | **4 objects**, 1 face each |
| `/create-8-direction-object` + `reference_image` | 25 | **1 object**, 8 faces |

So a side-wall object is ~4× a back-wall object, but one run serves *both* side walls — no
mirrored batches needed.

**The response carries an `object_id`,** reusable as `style_object_id` on later calls. That
anchors new objects to a real 8-angle sibling rather than to a single hero crop, which is the
cheapest route to a set that agrees at every angle.

**Three 422 traps, all distinct from the 1-direction endpoint:**
1. `view` is `low top-down` | `high top-down` | `side` — **not** `top-down`.
2. `size` caps at 168, where 1-direction allows 256.
3. `size` **cannot be set at all** alongside `reference_image` — the reference's dimensions
   determine output size.

`reference_image` is also mutually exclusive with `style_image`, so a rotation spec must carry
no hero anchor. `sprite-lab.mjs` clears it rather than trusting a config to remember.

**Two object lessons from the tower batch:**

1. **`item_descriptions` does not cap the object count — the style image does.** Asking for 2
   items against a 146px reference still returns 4, because the cap comes from the reference's
   size bucket (`<=85` → 8, `<=170` → 4, else 1). **Always request a full bucket.** Two calls
   of 4+2 cost the same 50 generations as 4+4 would have, so the 2-item call wasted half its
   slots on inventions nobody briefed.
2. **Objects arrive untrimmed and fail the anchor check by construction.** All 8 came back on
   a 146² canvas with the subject floating 5–21px above the bottom, which
   `validate_object.py` correctly rejects ("the object will float when anchored on its
   baseline"). Trimming to the alpha bounding box fixes every one and flips the gate to PASS.
   This is a mandatory post-process, not a defect — do it before judging anything.

**Style-anchor ruling (environment-art-director, 2026-08-04):** objects stay anchored to the
**hero crop**, never to a crop of shipped furniture. `counter-depth.png` and `bench-depth.png`
are small and dense with unique content (a gem cluster and a card; a folded item and thin
legs), so any 85px crop lands on either a one-off feature or featureless wood — the Still
Season failure in miniature, where a shipped asset's incidental detail rides into an unrelated
brief. Re-extracting the hero at `<=85px` to unlock the 8-object bucket was also rejected: his
source frames are 152px, so an 85px cap is a **56% downscale**, and 46% already shredded him.
Pay the extra call instead of shredding the reference that defines the register.
| **Still Season** (boss 2): create 1 + idle v1 4 + idle v2 4 + windup 6 + attack 6 + defeat 6 + hit 4 | **31** | ✅ **4 of 5 clips shipped.** Seated pose held across all 31 frames (bbox bottom y=208 throughout); packer reported zero clipped frames and one clean 155×170 shared box. idle v1 wasted 4 gens by asking a glow to animate and not naming the flowers. `hit` dropped — invented a crown and sparkles |

**The comparison that matters:** `pro` cost **~186 generations** and produced an unusable sheet (drift 191, both sides facing the same way). `v3` with per-direction pinning cost **~25** and passed the gate on the first attempt. Cheaper *and* better — do not reach for `pro` again without a specific reason.

Tier 1 "Pixel Apprentice" = 2000 generations/period. USD credits have never been touched — the subscription absorbs everything.

## `/create-character-pro` — the only endpoint that takes a DESIGN reference

Discovered by probing with deliberately invalid bodies. **Validation errors are free and
return the schema in `detail`**, so the whole contract below cost nothing:

```
description      str              required
image_size       {width,height}   required, max 168 x 168
reference_image  {base64}         optional — a real DESIGN reference
view             'low top-down' | 'high top-down' | 'side'
seed             int
no_background    bool
template_id      str
```

`init_image`, `style_image`, `color_image`, `proportions`, `outline`, `shading`,
`detail`, `negative_description` and `text_guidance_scale` all return
**"extra inputs are not permitted"** — they belong to the other creation endpoints.

**This is the only path we have where approved concept art drives a sprite** rather than
being paraphrased into a description. Do not confuse it with v3's `reference_image`,
which is a south-facing sprite to ROTATE (`sprite-lab.mjs:289`) — same field name,
completely different job. Driver: `scripts/sprite-lab/create-boss-pro.mjs`.

### It returns bigger than its own cap, and not in the response

- Requested **168²** (the documented maximum) and got **256²** back. It upscales its own
  output. **Read `size` off the character detail** — never trust the request.
- Results arrive as **`rotation_urls`** (a name→URL map on the character), not inline.
  That is a fourth result shape on top of the three already recorded above, and it is the
  same class of trap that twice discarded completed paid jobs. `create-boss-pro.mjs`
  dumps the payload rather than silently finishing with nothing on disk.
- One call returned **all 8 rotations**, unasked. A frontal boss only needs `south`, but
  the rest are free and are worth keeping if a stage ever goes side-on.

### `view` has no true front-on option

Only `low top-down`, `high top-down`, `side`. For a frontal boss stage, `low top-down`
is the one that keeps the face visible.

### Silhouette outranks surface, and now there is proof

The Debt-Bearer's 168px reference had already lost its rune work before PixelLab saw it.
What came through the pixelisation was **mass, shoulder line, head shape and the big fire
accents** (belt core, feet, armour cracks); what died was fine filigree. Judge boss
concepts on silhouette and accept that detail is decoration.

## The animation template list, and how to read it safely

`/characters/animations` validates `template_animation_id` **against the character's
skeleton**, and the error names the skeleton: *"Invalid template_animation_id 'attack'
for template 'mannequin'"*. There is no catalogue endpoint — `/animation-templates`,
`/templates`, `/animations/templates` are all 404. The list only ever arrives inside a
validation error, and **the generic error truncates it after ten entries**; you get the
full list only from the skeleton-specific one.

For `mannequin` (what `create-character-pro` produced for the Debt-Bearer):

> backflip, breathing-idle, cross-punch, crouched-walking, crouching, drinking,
> falling-back-death, fight-stance-idle-8-frames, fireball, flying-kick, front-flip,
> getting-up, high-kick, hurricane-kick, jumping-1, jumping-2, lead-jab, leg-sweep,
> picking-up, pull-heavy-object, pushing, roundhouse-kick, running-4-frames,
> running-6-frames, running-8-frames, running-jump, running-slide, sad-walk,
> scary-walk, surprise-… *(still truncated at the tail)*

**Note `attack`, `angry` and `bark` are NOT in it** despite appearing in the generic
message. Do not assume a template exists because some other error listed it.

Duelling bosses are well served: `fight-stance-idle-8-frames` (combat idle),
`cross-punch` / `lead-jab` / `roundhouse-kick` / `high-kick` (attacks), `fireball`
(cast), `falling-back-death` (defeat).

### The unsafe probe that nearly cost real generations

Probing by sending a **valid** template with a deliberately invalid `directions` value,
on the assumption that the bad sibling field would block the request, **does not work**.
`directions` is not validated up front: the call returned **200 and started a real
background job**.

It happened to cost nothing — balance unchanged, `animation_count` 0, job `usage` $0.00,
because it was animating a direction that does not exist and failed downstream. That was
luck, not design.

**The rule: put the invalid value in the field you are actually testing, and nowhere
else.** An invalid `template_animation_id` is rejected before any work starts and is
genuinely free. An invalid value in a *neighbouring* field may sail straight through into
a paid job.

## `/characters/animations` v3 — the constraints the docs did not mention

Run: Debt-Bearer animation set, 2026-07-30. 20 generations total (idle 0*, attack 8,
windup 6, smash 6). *idle landed in a partial earlier run.

**`frame_count` must be EVEN and >= 4** (4, 6, 8, 10, 12, 14, 16). Asking 3 and asking 7
were both rejected `422` — before any generation was charged, so probing this is free.

**v3 returns `frame_count + 1`.** Measured, twice: asked 4 -> 5 frames, asked 8 -> 9.
Frame 0 is the pinned `custom_start_frame` pose. Size clips against the returned count,
not the requested one, or every clip runs one frame longer than the manifest claims.

**Frames are named by `slug(display_name)` and nothing else.** The character detail's
`animations[]` entries carry no `name` or `animation_name` field. Matching on the name you
requested silently finds nothing and downloads zero files.

## ONE clip = ONE action. Compound descriptions return no motion at all

The first Debt-Bearer attack asked for *"raising both clawed arms high overhead and
smashing them down forward, then recovering to a planted stance"* — three actions in one
clip. What came back had **no arm movement whatsoever**: the figure stood nearly still
while fire erupted around it, then returned to standing. One frame also contained a large
brown wing-shaped artifact belonging to nothing in the design.

Splitting it into two clips fixed it completely on the first retry:

- `windup` — *"slowly lifting both long clawed arms upward and back above its head ...
  ending with both fists raised high overhead"* -> arms genuinely raise.
- `smash` — *"swinging both raised fists downward through a wide arc and striking the
  ground"* -> arms genuinely come down, with motion streaks.

**The heuristic: if the action description contains "and then", it is two clips.** The
model appears to average a compound instruction into ambient motion plus an effect.

## Chaining a start frame — when the anchor rule should be broken

Standing rule (still correct): pin every clip's `custom_start_frame` to the SAME rotation,
so one image anchors the whole set's identity.

The exception is CONTINUITY between two clips that must join. A downward strike has to
begin from the raised-fists pose the wind-up ended on; pinned to the shared rotation it
begins standing and visibly snaps back before swinging. So `smash` chains
`startFromFile: anim-windup-south-06.png`.

**One hop only.** Chaining a chain compounds drift generation over generation. And the
frames of the clip being chained FROM must be on disk when the next request is built —
the bulk download at the end of a run is too late, which cost two failed runs before
`pullAnimationFrames()` was added to fetch each clip as it completes.

## The packer's ground line is NOT part of the union box

Every clip must share one frame box or the figure changes size when clips switch. But the
box's BOTTOM must come from the resting clip alone, not from the union.

The Debt-Bearer's attack throws flame **29px below his own soles**. Including that in the
union pushed the box bottom down, and since the stage anchors the platform to the box
bottom, the standing pose then hovered **33px above the ground he stands on** — the exact
"the boss is floating" complaint the animation work existed to fix, reintroduced by the
packer. `lib/pack_boss_clips.py` now takes the ground line from a nominated clip and clips
below it: on a flat stage, fire beneath the soles is fire underneath the floor.

## THE MANNEQUIN SKELETON CAN HOLD A SEATED POSE

The open question before the Still Season was whether a cross-legged boss was viable at all:
`create-character-pro` builds a `mannequin` skeleton, v3 drives that skeleton, and a lotus pose gives
it no standing leg chain to find. The expected failure was not an error but a boss that quietly
**stands up out of his chair**, discovered ~28 generations later.

**It held.** Across all 31 frames of five clips, the alpha bbox bottom sat at **y=208** — he never
rose, and the ground line was already consistent before the packer touched it. `pack_boss_clips.py`
then reported **zero clipped frames** and a clean shared box.

So throned, mounted and kneeling bosses are all on the table. Two things bought it, and both are
cheap enough to just always do:

- **The word `seated` in EVERY action string**, not only the description. The clip prompt is the
  model's most recent instruction and it drifts to a standing default without it.
- **A reference cropped to a genuinely seated figure.** Silhouette drives the rig.

The prepared fallback was never needed but is worth keeping: if a seated figure does stand, re-crop
the reference **from mid-thigh up** and let a throne plate cover the lower body — a skeleton cannot
stand out of a chair it has no legs in.

## NEVER ask a clip to animate a glow, and NAME EVERY FEATURE IN EVERY CLIP

The Still Season's first idle cost 4 generations and came back with the character's entire signature
deleted. Measured, per frame, on the same clip before and after the prompt fix:

| | f0 | f1 | f2 | f3 | f4 |
|---|---|---|---|---|---|
| core-glow px, v1 | 225 | 32 | 10 | 7 | **8** |
| core-glow px, v2 | 225 | 234 | 290 | 281 | **282** |
| flower px, v1 | 107 | 2 | 4 | 2 | **3** |
| flower px, v2 | 107 | 83 | 84 | 90 | **86** |

Two separate mistakes, both of which already had rules in this file:

1. The action asked for the ribcage light **"brightening and dimming"**. The model dimmed it and
   never brought it back — by frame 2 the ribcage was plain white bone. **A glow is a code layer**
   (alpha/scale sine, zero generations, cannot lose the feature). Asking a sprite to pulse does not
   buy a pulse; it buys a coin flip on keeping the feature at all.
2. The action **did not name the flowers**, so they dissolved into green moss blobs. This is the
   same "repeat the costume nouns verbatim" rule the Debt-Bearer config already carried, and it is
   stronger than it looks: **anything not named in the clip action is treated as optional.**

The fix was to give every clip the identical feature clause and ask for **no change** in any of it.
All four later clips then held both features across every frame.

### The check this implies: named-feature retention

Counting pixels that match a signature colour, per frame, and failing if any drops below ~40% of
frame 0 is a **two-line test that would have caught this before a human looked**. `lib/validate.py`'s
palette drift cannot: it is whole-frame and deliberately robust to a feature *moving*, which is the
identical blind spot that passed the archivist's teleporting ledger. Worth adding as a boss gate.

## Invented artifacts scale with how much motion you ask for

The Still Season's `hit` clip — *"recoiling sharply backward, head snapping back"* — came back with a
**cyan/yellow crown on the skull and magenta sparkles** belonging to nothing in the design. Same
class as the Debt-Bearer's "large brown wing-shaped artifact". The pattern across both bosses: the
clips asking for the largest, fastest displacement are the ones that hallucinate decoration.

It was dropped rather than re-shot. `getBossClip` already falls back to the boss's own idle for any
missing state, and a CSS flash plus the existing hit-shake carries the beat — so `hit` is the
correct clip to cut first when a run misbehaves, and should be generated last for that reason.

## RE-SHOOTING A CLIP UNDER THE SAME NAME SILENTLY RETURNS THE OLD ONE

Animations accumulate on the character and **display names are not unique**. After
re-shooting the Still Season's `hit`, `GET /characters/{id}` listed **two entries
both named `hit`** (and two named `idle` from an earlier re-shoot).

`pullAnimationFrames` matches on `slug(display_name)` and nothing else — the only
name the API returns — so it downloaded the **first** match, which is the OLD clip.
The run reported `1/1 done · 4 generation(s)`, wrote files, and produced a sheet
byte-identical to the version being replaced. Nothing errored. The tell was that
the new frames had the *same alpha bboxes* as the old ones.

**Give a re-shot clip a NEW `name`.** Clearing the local manifest record is not
enough: that makes the job re-submit, but it does nothing about the collision on
the character. Deleting the local record and reusing the name is the exact recipe
for paying for a generation you can never address.

### Recovering a clip you cannot address by name

The frames are on the JOB, so this costs nothing:

```
GET /background-jobs/{id} -> last_response.images[]
```

**`last_response.images[]` on an animation job is `type: "rgba_bytes"` — RAW RGBA
PIXEL DATA, not a PNG.** Writing those bytes to a `.png` produces a 262144-byte
file (256×256×4) that every image tool rejects as corrupt. Rebuild it:

```python
Image.frombytes('RGBA', (im['width'], im['height']), base64.b64decode(im['base64']))
```

That is a **fifth** result shape on top of the four already recorded here, and the
same class of trap: the work was finished and paid for, and only the decoding was
wrong. `last_response.storage_urls.frames[]` carries the same frames as real PNGs
if you would rather download them.

## Two more result-shape traps, found by shipping the second boss

Both were **already documented in this file and still not handled in the code**, which is its own
lesson: a playbook entry is not a fix.

- **`rotation_urls` was never actually read.** `create-boss-pro.mjs` looked only at
  `detail.rotations ?? detail.images`, so a completed, paid job printed `NO IMAGES EXTRACTED`. The
  first boss must have been downloaded by hand. Now handled, with retry/backoff for the CDN's
  transient 503s.
- **`failed` is NOT terminal on character creation.** The Still Season went
  `pending → failed → failed (9 consecutive polls) → completed`, with all 8 rotations present. The
  old code threw on the first `failed` and would have thrown away a job that was still working.
  Require a sustained streak before giving up. (Note this is the *opposite* of the animation-job
  behaviour recorded above, where a failed job must have its record cleared — check which endpoint
  you are polling.)
- Rotations were also being written as `<dir>.png` while `startFromRotation` looks up
  `rot-<dir>.png`, so files had to be renamed by hand before any clip could be pinned.

Second data point on sizing: requested **168²**, received **256²** again. It always upscales.

## Review a boss by WATCHING the packed strips

`sprite-lab.mjs sheet` is the walker reviewer — it reads `manifest.frames[].trail`, which a boss
manifest does not have, so it throws. It also only shows stills, and **stills cannot answer the
question a boss review asks.** Every defect this repo has shipped was found by watching motion.

`boss-sheet.mjs <packed_dir>` plays the **packed strips** at manifest cadence, on a checkerboard so
baked-in backgrounds show up. Reviewing the packed output rather than the raw frames matters: it is
what the game actually mounts, so a sheet the packer broke cannot pass. It also re-derives the frame
box from each PNG header and fails loudly if any strip is not a whole number of shared cells — the
"boss changes size mid-fight" bug, caught before the manifest instead of after the player.

The browser pane refuses `file://`, so there is a `sprite-lab-sheets` static server in
`.claude/launch.json` for it.

## Wind-up and strike must be different clips, or the telegraph is unreadable

`bossClipForBeat` mapped both `boss_intent_declared` and the boss's `damage_dealt` to
`attack`, so the warning and the blow played the identical animation. A telegraph the
player can only read in the banner text is not a telegraph. `windup` is now its own state
and LOOPS — a charge stays on screen for however many hero turns the party takes, so a
one-shot would freeze on a raised-fists pose for the rest of the round.

## Combat effects: PixelLab makes MOMENTS, not repeating path pieces (6 generations)

First effect-art batch for the Ability Performance System. Six 1-generation probes, all
Blood except one Fire transfer test, deliberately cheap because the question was not "which
material looks best" but **"does generated pixel art composite onto code-drawn SVG geometry
at 32px?"** — the same two-register risk that lost the pixel-courtyard experiment above.

**The finding, and it was predicted before a generation was spent:** ask for a *segment* and
the model returns a *finished object*. Every one of the four "segment" probes came back as a
complete thing with both ends resolved and closed — a claw at 32px on Pixen, a ribbon on
Pixflux, a leather cuff at 64px, a whole flame icon for Fire. They look good in isolation,
which is the trap. Tiled nine times along the lash spline the closed ends collide into a row
of separate hooks instead of one continuous whip.

**The impact burst succeeded, and succeeded easily.** A splash IS a self-contained object,
so asking for a self-contained object was the right question. Radial splatter, heavy
rounded droplets flung outward, wet highlight — legible as blood specifically, not as a
generic red burst, and legible with the colour removed.

**Standing direction:** the travelling BODY of an effect stays code-drawn — a spline with a
per-material thickness profile and wobble tracks its target responsively and never seams,
which is exactly what generated pieces cannot do. Spend generations on the moments that are
already objects: **impacts, residue, ground tells, bursts, persistent barrier states.**

Secondary results, all one generation each:
- **Pixflux beats Pixen on material for small effect pieces.** Identical prompt and seed;
  Pixflux read as a wet ribbon, Pixen as a horn. Permanent finding, one generation.
- **A bigger canvas does not help a small piece.** 64px did not buy detail, it bought MASS —
  the wetness that makes blood blood was gone entirely. Consistent with the never-downscale
  rule above: author at display resolution.
- **The material language transfers across elements.** The Fire probe failed structurally
  for the same reason as the others but was unmistakably fire beside the blood pieces —
  bright core, dark ember edge, jagged forks. Once the piece SHAPE is solved, the remaining
  elements are cheap.
- `create_image_pixen` has **no `shading` parameter** (Pixflux does). Its canvas sides must
  be multiples of 4.

Reviewed in `/dev/ability-theater` → **Generated art**, which shows every candidate at 1× on
the real arena background, its cutout on three backgrounds, and — for anything meant to
repeat — nine copies laid along the actual lash curve next to the procedural stroke they
would replace. That tiling panel is what makes the failure visible in one glance rather than
after an hour of debugging pivots.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch A | 4 lash segments, 1 tip, 1 impact | 6 | 1 recommend, 4 reject, 1 undecided |

## The fix for "it returns objects, not pieces": ask for a TEXTURE (2 generations)

Batch A concluded PixelLab cannot make repeating path pieces. Batch B narrows that: it
cannot make **discrete segments**, but it will happily make a **continuous band** — and a
band is what a stream actually needs.

The prompt is the whole difference. Batch A asked for "a single short curved segment ... with
open cut ends on both sides" and got a claw, a ribbon, a cuff and a flame icon. Batch B asked
for:

> a horizontal band of flowing blood, **continuous from left edge to right edge** ... seamless
> repeating texture, **no ends, no tip, no tapering**, no droplets leaving the band

and got exactly that, first try, 128×32, 1 generation. The words doing the work are
*band*, *continuous*, and the three explicit negations. "Segment" and "piece" invite an
object; "band" and "texture" do not.

**Pair it with mirror-tiling and the seam question disappears.** Repeating the tile with
every other copy flipped horizontally means each seam meets its own mirror image, so a
discontinuity is geometrically impossible regardless of what the generator returned. That is
what makes this technique safe where the segment approach was a gamble — see
`pages/battle/performance/StreamBody.tsx`.

**`animate_image` on a texture: promising, not settled.** 9 frames of the 128×32 band for 1
generation. The highlights genuinely travel and the scallops shift, which is life that
scrolling alone cannot supply. But the band thins around the middle frames, so a loop may
pulse rather than flow. Verdict deferred to Raheem — for Blood a pulse may be perfect.

**Frames come back as separate images, and this repo has no image-composition dependency.**
Rather than adding one to pack a strip, the tiles are `<img>` elements whose `src` swaps per
frame. That is also the technically correct choice here: a packed strip needs
`background-repeat: no-repeat` to isolate a frame, which is exactly what a tiled stream
cannot use. Scroll (`transform`) and churn (`src`) stay on independent axes.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch B | stream tile + 9-frame churn | 2 | 1 recommend, 1 undecided |

## A second element cost 4 generations and zero code (Batch C — Water)

The Blood recipe transferred to Water first try, with only the material words changed in the
prompt. Stream tile + churn + splash + splash animation = **4 generations, no code edited** —
a new element is a manifest entry, because the renderers read the material kit rather than
hard-coding anything.

The important part is that it did not come back as *blue blood*:

- **Stream:** rolling foam crests along the top edge, where Blood is a smooth beaded band.
- **Splash:** an upward crown, where Blood is a flat radial splatter. Water throws itself UP
  off a surface; blood does not.

Both are **silhouette** differences, so the two remain distinguishable with the colour off —
which is the Bible rule the whole material axis exists to satisfy. Colour was doing none of
the work.

Also settled here: **a splash must not loop.** It resolves once and parks on its final frame,
because the aftermath stage keeps it on the boss for most of a second. A looping splash reads
as a sprinkler.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch C (Water) | stream + churn, splash + animation | 4 | all 4 kept |

## Three elements in, the effect recipe is a process (Batch D — Fire)

Fire landed on the identical 4-generation recipe: stream tile + churn, splash + animation, no
code. Three for three now, which is enough to stop calling it luck.

The three streams differ at the **top edge** — jagged licking tongues (Fire), rounded foam
crests (Water), smooth beads (Blood) — and the three splashes differ in **silhouette** — a
spiked starburst, an upward crown, a flat radial splatter. None of it is carried by hue, which
is the Bible rule the material axis exists to satisfy.

Fire is also the only kit whose **core is brighter than its edge**; the other two are darker in
the middle. That inversion is the single strongest no-colour cue produced so far, and it came
free from writing the palette in the kit as core/edge/accent rather than as a hue.

**The standing recipe, now proven:**

1. `create_image_pixen`, 128x32, `no_background`, `selective outline`, `low detail`, side view.
   Prompt for a *band*: "continuous from left edge to right edge ... no ends, no tip, no
   tapering".
2. `animate_image` on it, 8 frames — returns 9 including the input.
3. Same for a 64x64 impact, prompting for a complete object, because an impact IS one.
4. Register in `assetKits.ts`. Nothing else.

**A test lesson worth more than the art:** the guard asserting "these pieces are not generated
yet" went stale three times in one afternoon, once per element. Naming subjects in a test that
tracks a moving frontier guarantees churn. Rewritten to assert the RULE instead — availability
follows `approvalStatus`, never a truthy path — and it can no longer go stale.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch D (Fire) | stream + churn, splash + animation | 4 | all 4 kept |

## Materials are not all liquids — the assumption hiding in a "generic" component

Two elements landed this round and both exposed the same design bug: the shared pieces had a
LIQUID assumption baked into them under a generic-sounding name.

- The charge tell drew a **pool** for every material, so Fire charged with a puddle of flame.
- The stream body **scrolled** for every material, so anything non-liquid read as a hose.

Fixed by making both an explicit axis on the material kit — `chargeForm`
(pool / flame / ground / bloom / halo / motes) and `streamFlow` (jet / wisp / creep) — rather
than a hardcoded default. The lesson generalises: when a shared renderer has exactly one
behaviour and a generic name, check whether that behaviour is actually generic or is just the
first case that was written.

**Fire needed a different generation parameter, not a different prompt.** Every tile until now
used `outline: 'selective outline'`, which is what made them all solid and hose-like. Asking
for `lineless` returned translucent feathery streamers immediately. Outline is the single
biggest lever on whether a piece reads as a substance or an object.

**Explicit negations are how you escape a strong prior.** "A burst of flame spreading outward"
returned a radial starburst twice, because *burst* and *outward* both point at a firework. The
reroll only worked with "NOT a star, NOT radial, NOT symmetrical, wider than it is tall".

**An accident became an element.** A Fire set came back as lava — solid, black-and-orange,
mineral. Rather than discard it, it was rehomed as **Infernal**, and Fire was re-briefed as
something airy. Two elements sharing a damage family and no movement at all is the strongest
evidence so far that the material axis does real work.

**And the no-colour guard earned its keep.** Authoring Infernal made it structurally identical
to Fire — same silhouette, edge, particle, impact, residue — and the test failed immediately,
correctly, because at that moment the only thing separating them was hue. Fire's impact became
`spreading_sheet` (flame crawls along a surface) against Infernal's `ember_burst` (molten rock
detonates off it). Without that test the collision would have shipped.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch E (Fire, re-briefed) | wispy stream + churn, spread impact + animation | 5 | 4 kept, 1 rejected starburst |
| Effects batch F (Nature) | root wrap + churn, bloom + animation | 4 | all 4 kept |

## Sanguine: the Batch A failure, finally cashed in (2 generations)

Batch A established that PixelLab insists on returning **finished objects with resolved
edges**, which is why lash segments could not be made — every "fragment" came back as a
complete thing. Sanguine is the element where that stops being a limitation.

A crystal shard SHOULD be a finished object with hard resolved edges. So the delivery is a
**volley** — five discrete shards thrown in sequence with air between them — rather than a
continuous body, and the generator's strongest habit becomes the requirement. Two
generations, first try, no rerolls: one shard and one shatter.

**A still, deliberately, not a flipbook.** Crystal has no internal motion; animating it would
contradict the material. Blood churns, fire flickers, smoke billows — crystal is rigid, and
the movement it has is the tumble the CODE gives it in flight.

**Delivery grammars are now five, and none of them is a recolour of another:**

| Element | Delivery |
|---|---|
| Blood, Water, Infernal | continuous pressurised jet |
| Fire | airy wisp, blown and translucent |
| Nature | erupts from the ground, does not travel at all |
| Shadow | wisp, and an impact that hangs rather than resolves |
| Sanguine | discrete solid shards with air between them |

**Watch item recorded honestly:** Sanguine's shatter is radial like Infernal's starburst. The
separator is faceted-geometric against glowing-rayed, which is real but narrower than the rest
of the set enjoys. Worth a look if the two ever appear in the same fight.

| Batch | Pieces | Cost | Verdict |
|---|---|---|---|
| Effects batch H (Sanguine) | shard + shatter | 2 | both kept, no rerolls |

## UI chrome IS generatable — the 9-slice probe passed (20 generations)

`configs/ui-kit-pixel.json`. Four core UI pieces (panel frame, button, slot, bar trough) in
one `/create-1-direction-object` call. The open question was whether PixelLab can hold a
**9-slice frame** — its advertised UI surface is buttons, health bars and menu items, and
frames are never mentioned.

**It can.** Measured on the returned frame:

- **Centre came back genuinely hollow** — 0 opaque pixels out of 1849 in the centre third.
  A frame with a painted interior cannot become a 9-slice; this one can.
- **The edges tile.** Top-edge brightness from x=32→96 is flat (50–58), and the gold
  ornaments sit at x≈16–24 and 104–112 — *inside* the corner regions. So a **32px corner
  slice on a 128px source** captures the ornaments and leaves a stretchable middle. Verified
  by actually 9-slicing it to 860×560 over the courtyard plate: no seams, corners intact.

### Costs and API facts (correcting the table above)

- `/create-1-direction-object` with 4 `item_descriptions` came back at **20 generations**,
  not the 25 recorded from the courtyard run. Budget 20–25.
- **Three free 422s taught the object endpoint's real schema** (validation precedes billing):
  `size` is a **single integer**, not `{width,height}`; `view` accepts only **`top-down` or
  `sidescroller`** (there is no `side`); `outline_mode` is **not permitted** here (it is a
  tiles parameter) — steer outline through the description instead.
- `cmdScene` requires `styleReference` to **exist on disk** even when every spec sets
  `styleAnchor: false`. Stage the file regardless.

### The real defect is value range, not geometry

The pieces came back dark-brown-and-gold against a courtyard plate that is bright honey,
turquoise and red. Technically correct, tonally from a grimmer game. Chrome must be judged
**over the plate at game scale on both a light and a dark ground** — `review-contrast.png`
in the out dir is that test, and it is what caught this. On the light plate the slot reads as
a black hole and the bar trough nearly vanishes; the button is the strongest piece.

**Next attempt should raise value and saturation to meet the plate**, and make the bar
chunkier. Do not re-roll blind: `/create-1-direction-object` **rejects `seed`**, so nothing
here is reproducible — keep anything good.
