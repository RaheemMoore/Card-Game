# PixelLab Playbook

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

## Parameters worth knowing

- `proportions` presets: `default`, `chibi`, `cartoon`, `stylized`, `realistic_male`, `realistic_female`, `heroic`, or custom head/limb multipliers. At ~100px display height, big heads read and realistic figures turn to mush.
- `view`: `low top-down` (face visible — what Pokémon does), `high top-down` (mostly scalp), `side`, `perspective`.
- **`seed` — always set it explicitly.** It is the difference between "we can rebuild this character" and "that character is gone."
- **The model overrides your requested size.** Asked 128², got 180². Read `size` back off the character detail.
- `pro` ignored `frame_count: 6` and returned 4.

## Objects and scene layers

**PixelLab objects cannot be animated.** `/create-1-direction-object` and `/create-8-direction-object` return **still images only**. `/animate-with-text` and `/characters/animations` are skeleton-driven and require a `character_id` — they animate a rigged humanoid, not a fountain. There is no object-animation endpoint.

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
