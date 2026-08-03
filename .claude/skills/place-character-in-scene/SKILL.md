---
name: place-character-in-scene
description: Integrate an approved generated character into a Phaser scene with correct sheet packing, four-direction animations, feet-origin collider/depth conventions, scale, movement, and runtime evidence. Use after create-character-sprite or when repairing character placement. Do NOT use for PixelLab generation, Figma tracing, React-only effects, or static-only direction approval.
---

# Skill: place-character-in-scene

Getting a character *into* the scene is a separate craft from generating it. This is where "it looks right" and "it feels like walking" diverge.

Reference implementation: `card-engine/src/pages/castle/courtyard/` — `CourtyardScene.ts`, `layout.ts`, `stalls.ts`, `controls.ts`.

## 1. Sprite sheet + manifest

Pack frames into one sheet per character and load with `load.spritesheet`. Record frame size, the direction→animation-key map, frame rate, and the feet anchor in a data module (precedent: `card-engine/src/data/combat/heroSpriteManifest.ts`).

### NEVER MIX SOURCES

**The idle frame must come from the same animation as the walk frames.** Taking idle from a *rotation* and the cycle from an *animation* shipped a hero who grew 33% the moment he stopped walking, because the two endpoints don't agree on body scale. The generator's rotations and its animations are separately rendered and only loosely agree on size — the measured mismatch was 25% on one direction.

This is the second time this exact bug has appeared in this repo. `heroSpriteManifest.ts` documents the first: two art sources framed characters differently (one left ~23% dead space under the feet, the other ran to the edge), so `object-contain object-bottom` aligned the **image** bottoms rather than the **feet** and scaled the sources to wildly different apparent sizes.

### ALIGN ON THE FEET, NORMALIZE THE HEIGHT

`lib/pack.py` scales every frame to one shared body height and pastes it so the feet land on a common baseline. Two details that matter:

- Anchor horizontally on the **centre of the feet** (bottom ~15% of the silhouette), not the bounding-box centre. Arms and a swinging leg move the bbox sideways every frame, which makes the character slide inside his own cell.
- Keep **one shared crop box** across all frames. Per-frame cropping re-centres him every frame and he jitters.

Measure with `card-engine/scripts/measure-hero-sprites.py`, which uses the **largest connected opaque region** — not the raw alpha bbox, because a floating decorative element in a corner skews both height normalization and centering.

## 2. Animations, and the bug that hides

```ts
this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers(...), frameRate: 8, repeat: -1 });
```

- One animation per screen direction; **idle = frame 0** of the facing direction.
- **Never call `play()` unconditionally every update.** Restarting an already-playing animation pins it on frame 0 forever — it looks exactly like a static sprite sliding around, which is the symptom you were trying to fix. Guard on the current key, or use `play(key, true)`'s ignoreIfPlaying semantics deliberately.
- Map animations to **screen** directions: for PixelLab, `east` = screen RIGHT and `west` = screen LEFT. This shipped backwards once. Confirm by **walking him in the game**, never by analysing the art (see `create-character-sprite` §3 — two static methods disagreed and the wrong one won).

## 3. Colliders and anchoring

- **Feet-only collider**, far smaller than the sprite: `body.setSize(FEET_W, FEET_H)` then `setOffset((width - FEET_W)/2, height - FEET_H)`. The character can then visually overlap awnings and railings without being blocked by them, which is what makes a 2D scene read as having depth.
- **Re-apply `setSize`/`setOffset` after any texture change** — frame dimensions can differ per direction, and stale offsets drift the body away from the feet.
- Pixel art needs `NEAREST` filtering, but set it **per texture** (`this.textures.get('hero').setFilter(...)`), never globally via `pixelArt: true` — a global setting also hard-edges the smooth painted plate.

## 4. Tracing the scene

Colliders must sit on the thing they represent. Trace coordinates onto the actual plate and say so in a comment, including that they must be re-traced if the art is regenerated.

- Keep an explicit walkable rect rather than a centered box — painted courtyards are rarely symmetric (walls and steps eat the upper third).
- Distinguish **where interactive things may sit** (guaranteed visible on every target device) from **where the player may walk** (larger). Confining movement to the safe box makes a wide screen feel like a postage stamp. See `layout.ts` for the cover-scale derivation.

## 5. Walking *feel* — beyond frames

- Tie animation rate to speed, or the character skates.
- A short acceleration ramp beats instant full velocity.
- Tune speed against the paving scale, with real frames in place.
- Reduced motion (`useMotionLevel() === 'off'`): hold the idle frame, keep the movement. The hero still goes where you send it; it just doesn't animate.

## 6. Verification — the check that actually matters

**A screenshot cannot distinguish a playing walk cycle from one frozen on frame 0.** Assert on the frame index:

```js
// via the dev-only handle, mid-walk
const s = window.__courtyardGame.scene.getScene('courtyard');
// sample s.player.anims.currentFrame.index at two points; it MUST change
```

Automation gotchas learned the hard way:
- Synthetic key presses are **shorter than one frame**, so `isDown` never overlaps an update and the character never moves. Dispatch `keydown`, wait, then `keyup`.
- Programmatic `.focus()` sets `activeElement` but fires **no focus event** when the automated window lacks OS focus — use real Tab presses to test focus behaviour.

Also confirm: idle returns to a standing frame; reduced-motion holds the frame while position still changes; exit/re-enter leaves exactly 0 canvases then 1; and Phaser stays in its own async chunk (a value-import from a scene file collapsed it into the main bundle once).

## Studio V2 runtime gate

For new or changed character integration, define or reuse a named scenario (normally `courtyard-character-walk` or `sprite-direction-validation`) and invoke `visual-playtest`. Evidence must include runtime direction/animation state plus screenshot or video. Static pixel similarity, sheet labels, or a single screenshot cannot prove that left/right mapping and movement agree. Follow `.claude/studio/PHASER_RUNTIME_BRIDGE_SPEC.md` and return PASS, FAIL, or HUMAN REVIEW. Consult `phaser-runtime-director` only when lifecycle, camera, physics architecture, or reusable runtime-component boundaries change.
