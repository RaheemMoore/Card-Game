# Handoff — replacing the courtyard floor, and freeing the fountain

**Written 2026-08-04 at the end of a long session. Start a fresh session with this file.**
Raheem's question: *"Could we just replace the entire floor of the castle with a beautiful
generation... and then actually make the fountain instead of it all looking like one melded in
thing?"*

---

## Read these first

1. `PIXELLAB_PLAYBOOK.md` §"What PixelLab can actually do" — the capability map, and the
   verdict section where this was partly tested before.
2. `card-engine/scripts/sprite-lab/COURTYARD_PALETTE.md` — how anything new is made to match
   the plate. Layer 1 does not exist; layer 2 does the work.
3. `HARNESS_INDEX.md` §Rule Zero — never show work in chat, show it in a harness.
4. `card-engine-courtyard-v2-quadrants.md` — what each quadrant is for.

## The prior test, and why it does not settle this

A full pixel-art courtyard was built (`/dev/courtyard-sample`) and lost to the painted plate at
**65 generations**. But the loss is narrower than it sounds:

- It replaced **everything**, including walls and towers. Raheem is proposing to keep those.
- The tileset grid was called out in the playbook as *"a composition failure, not a PixelLab
  limitation."*
- The same test produced a **fountain prop** described as *"excellent and cheap."*

So: **the tileset route is spent, the prop route is proven.**

## Recommendation, ranked

### 1. Free the fountain first — low risk, high payoff

It is currently painted into the plate, which is why it can never ripple, never catch light, and
never let the hero walk convincingly behind its rim. As its own object it gets all three, and
object animation costs ~2 generations (`POST /objects/{id}/animations`, `mode='v3'`).

Two routes, both viable:
- **Raheem cuts it out of the plate in Figma.** He has explicitly offered this and it beats any
  auto-matte — he can see what is art and what is backing. Style match is then exact by
  construction, because those pixels came from that painting.
- **Generate a new one** as a 1-direction object. Precedent exists and was rated excellent.

Do this one even if the floor idea is dropped.

### 2. The floor — the hard part is the LIGHT, not the bricks

**The plate's floor carries a large diagonal cast shadow, and that shadow is what gives the
courtyard depth.** A new floor that is evenly lit will read flatter than what exists now, even
if the paving is more beautiful. Solve this before judging any paving.

Routes, best first:
- **Leonardo painted floor** via `card-engine/scripts/bg-harness` — same pipeline that made the
  plate, so the register matches by construction. Consult `environment-art-director` first.
- **One large paving texture** seated with `lib/lay_flat.py` (built this session; a true
  8-coefficient projective solve, not a shear).
- ~~PixelLab Wang tileset~~ — **already tested and lost.** Do not re-spend here without a
  reason that answers the grid-repetition finding.

### 3. What replacing the floor would break

All of this is keyed to the current plate's exact geometry. Changing the floor's perspective
invalidates it; changing only its surface does not.

| Keyed to the plate | Where |
|---|---|
| Forge colliders (traced by Raheem in Figma) | `scripts/sprite-lab/figma-traces/courtyard-v2-forge-preview.json` |
| Counter / bench occluders + ground lines | `src/pages/castle/v2-preview/CourtyardV2PreviewScene.ts` |
| Crystal VFX anchor positions | `src/pages/castle/v2-preview/crystalTuning.ts` |
| Walk routes and footprint guides | Figma `MpUs9WJKMvwTtpH9Akz4Rm`, inside `plate` |
| Measured wall lean (left ~13°, right ~12°) | `card-engine-courtyard-v2-quadrants.md` |

**Keep the 1536x1152 coordinate space and the wall geometry identical** and none of it breaks.

## Where the work stands right now

- **Figma** `MpUs9WJKMvwTtpH9Akz4Rm` — the plate, a collider workspace with red footprints and
  green walk routes, and `SPRITE SHEET — every approved courtyard asset` (18 rows, node `78:2`).
  Raheem wants a **second sprite board to the LEFT of it**, reserved for quadrant assets.
- **Review harness** — `python3 scripts/sprite-lab/lib/review_sheet.py build`, published at
  https://claude.ai/code/artifact/499f9a5c-fff1-4b92-9fd5-6bb2884d7eac
- **Quadrants:** forge built · collection/archive settled (the lectern goes there) ·
  bottom-left is **the Wellspring**, a crystal fissure, four explosive variants awaiting a pick ·
  top-left is **the Proving Hall**, pitched but not approved, and it reuses six already-approved
  assets for zero new generations.
- **The Ascent tower quadrant is CUT** — the keep already stands top-middle. Its four v2 arch
  variants are shelved for the middle-tower redesign, which is Raheem's next stated interest.

## Standing rules that bit hardest this session

- **Never show work in chat — show it in a harness.** Register assets before showing them.
- **Present art as a sprite sheet** — rows are the object, columns are frames, one uniform cell.
- **Confirm the angle before animating.** Animation is per-direction; PixelLab's own docs say to
  ask the user which direction they want.
- **Characters are 2D chibi.** Copy `hero-chibi.json`'s style block verbatim and change only the
  identity. `/create-character-v3` has no `proportions` field, so "chibi" in prose does not hold.
- **Always record a `seed`.** Three keepers now exist that can never be rebuilt.
- **Ask Raheem to cut baked ground off in Figma** rather than writing an auto-matte.
- **Check the live spec before declaring a provider limitation.** Two canonical documents
  asserted PixelLab could not animate objects. It can.
