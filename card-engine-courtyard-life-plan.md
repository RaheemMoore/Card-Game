# Courtyard Life — Design & Implementation Plan

**Status:** proposed, awaiting Raheem's approval
**Scope:** make the castle courtyard feel alive without regenerating the painted plate

---

## Context

`/castle` works: a painted Lucid Origin plate, a gate-passed chibi hero who walks it correctly in four directions, colliders, proximity ribbons, keyboard traversal, a Directory fallback, reduced motion. What it lacks is **life**. Everything is baked into one flat image — the fountain can't shimmer, the crystal lampposts can't pulse, banners can't move, and stalls can't glow when you approach, because there is no stall *object*, only paint.

The obvious plan was "generate PixelLab objects and layer them over the painting." **That plan is mostly wrong**, and the sprite director's consult is the reason this document exists.

## The two findings that reshape this

**1. ~~PixelLab objects cannot be animated.~~ CORRECTED 2026-08-04 — they can, via `/objects/{object_id}/animations` (`mode='v3'`). See PIXELLAB_PLAYBOOK.md. The reasoning below was sound when written and is kept for the record, but it no longer forces scenery motion into Phaser. Phaser motion is still the right call for anything painted INTO the plate, which cannot become an object at all.** Original finding: `/create-1-direction-object` and `/create-8-direction-object` return still images. `/animate-with-text` and `/characters/animations` are skeleton-driven and need a `character_id` — they animate a rigged humanoid, not a fountain. There is no object-animation endpoint. And faking it with "frame 1/2/3" prompts is the drift trap the playbook already paid 186 generations to learn: independent prompts share no anchor, and `template` mode drifted 43.7 palette units *with* an anchor.

**2. Pixel scenery beside painted scenery reads as a bug, not a style.** The hero gets away with being a sprite on a painting because he is unambiguously an **actor** — players extend that licence to characters, not to furniture. A pixel crate next to a painted crate is the single worst outcome available here.

**Therefore: cut the layers out of the plate itself.** Style match becomes exact by construction — those pixels came from that painting. Ambient motion becomes a Phaser concern on static sprites. **Most of what "bring it to life" means costs zero generations.**

PixelLab stays reserved for *new gameplay objects* the player targets or collides with, which inherit the actor licence.

## Phase A — Layer the plate, animate in code (0 generations)

Slice `public/assets/castle/courtyard.png` into a small set of PNG layers with authored masks, then drive them in Phaser.

**Layers** (`public/assets/castle/courtyard/`):
- `base.png` — the plate with the animated regions painted out or simply left beneath
- `water.png` — the fountain basin's water region
- `glow-*.png` — the crystal lamppost light regions
- `occluder-*.png` — foreground pieces the hero must be able to walk *behind*: stall fronts, barrels, the fountain rim

**Tooling:** `scripts/sprite-lab/lib/slice_plate.py` (PIL, already a dependency) reading a region manifest so the cuts are reproducible and re-runnable after any plate regeneration.

**Effects** (all zero-cost, all Phaser):

| Element | Mechanism |
|---|---|
| Crystal lamppost pulse | additive quad, alpha + scale sine, period ≥2s, low amplitude |
| Fountain shimmer | UV/alpha scroll on the water layer + sparse sparkle emitter |
| Banner sway | `Rope`/mesh sine bone offset, or a 2px skew tween |
| Dust motes / pollen | particle emitter, one 4×4 soft dot |
| Stall glow on proximity | tint/brightness tween on that stall's plate cutout |

**Motion budget — binding.** Project memory says minimal; the UX consult added specifics:
- **Proximity-mute every emitter and pulse within ~80px of the hero**, or the eye loses the player
- Periods ≥2s, low amplitude, **no camera movement ever**
- **No more than three ambient sources visible at once**, phases staggered — twelve independently-phased effects read as noise even at legal distances
- `useMotionLevel() === 'off'` freezes all ambient layers entirely

## Phase B — Depth sorting and occlusion

A flat plate carries no depth data, so this is **authored**, not derived.

- **One sort key: `baselineY`** — the world Y of ground contact. Hero, occluder cutouts, and any future objects all enter the same display list sorted on it. Without the cutouts in that list, painted stalls can *never* occlude the hero, which is the whole reason Phase A cuts them.
- New manifest `src/data/castle/courtyardObjects.ts`: `{ id, x, y, baselineY, depthOffset, anchor, occluder? }`.
- `depthOffset` per object handles cheats where the visual base sits above the collision base.
- Reuse the existing feet-anchor discipline from `heroSprite.ts` / `pack.py`.

**Expected failure mode:** the hero's feet clipping *through* an occluder whose baseline was traced too high. Only found by walking the full perimeter of each object and looking.

## Phase C — One PixelLab probe object (a few generations)

Before committing to any object generation, prove the register with a single object.

- A **market crate** via `/create-1-direction-object`
- Pass the **hero crop** (≤168×168) as `reference_image` so it matches the hero's register — **not** the plate as `color_image` (that move dragged the chibi toward dark stone and cost him face contrast)
- Explicit `seed`; read `size` back off the response, since the model overrides requested sizes
- Composite it at three depths and judge it honestly **in the same screenshot as the painted crates**

If it clashes, we learned that for ~1 generation instead of twelve, and Phase A still delivers the life.

**Object cost is unmeasured in this repo.** Treat any estimate as a guess; this probe is also the cost measurement, and the number goes in the playbook.

## Phase D — Shopkeepers (parallel, Raheem-driven)

Covered by [SHOPKEEPER_GUIDE.md](SHOPKEEPER_GUIDE.md). Stationary, one direction, `breathing-idle`, plus a `portrait-character-pro` bust — ~10–15 generations each, ~2.5× cheaper than the hero because there's no walk cycle. Placement hooks into the existing `stalls.ts`.

## The object gate — `lib/validate_object.py`

`lib/validate.py` is 4-row-directional by construction (row medians, idle-vs-walk, mirror-IoU) and has **no meaning** for a still prop. **Do not loosen it to make objects pass** — that's how the sprite gate gets lost.

A separate object validator measuring:
1. **Alpha coverage** 5–70% — catches empty output and near-solid rectangles
2. **Edge opacity / flat-colour alpha spike** — this is the `pro` grey-background defect (drift 191); expect it to recur on objects
3. **Anchor validity** — bottom opaque row within 1px of crop bottom; ground-contact centroid written to the manifest
4. **Scale ratio** — object height ÷ hero body height within a declared per-class range
5. **Palette distance to the hero** via the existing `drift()`; calibrate from the first 2–3 objects
6. **No baked shadow** — ship shadows as separate sprites so they render *under* the hero, not over his feet

Freeze the first failing object into `scripts/sprite-lab/fixtures/` and extend `test-validator.sh` to assert the gate still catches it.

## Verification

- `npm run build`, `npm run test` (same 3 pre-existing failures), `./test-validator.sh` still 6/6
- Phaser stays in its own async chunk
- **Occlusion proof:** walk the hero the full way around each occluder; screenshot behind and in front
- **Ambient proof:** confirm effects visibly move, then confirm they **mute within 80px** of the hero
- **Reduced motion:** `motion-off` freezes every ambient layer while movement still works
- Exit/re-enter still 0→1 canvases; `/forge`, `/collection`, `/battle` unaffected
- Screenshots for Raheem — and for anything about *feel*, his judgement decides, not mine

## Risks, ranked

1. Generating pixel props that duplicate painted props — looks unfixable; avoided by going plate-derived
2. Faking object animation with independent prompts — guaranteed drift, no gate catches it
3. Spending generations before the zero-cost glow/dust test proves whether they're needed at all
4. Occluders traced with wrong baselines — hero clips through scenery
5. Ambient noise: too many effects, or effects too close to the hero
6. Loosening `validate.py` to accommodate objects

## Non-goals

No plate regeneration. No stall→feature wiring. No chat window UI. No combat/boss sprites. No tileset rebuild of the courtyard (a deliberate decision to make later, if ever — not by accretion). No new castle areas. No landing-route change.

## Sequencing

**Phase A first, and show Raheem before anything is generated.** It may satisfy "bring it to life" outright and make half the object work unnecessary. Spending generations before that test is the most likely way to waste them.
