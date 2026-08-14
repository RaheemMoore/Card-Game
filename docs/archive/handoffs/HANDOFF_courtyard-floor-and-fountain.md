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

> **The day/night cycle is the point.** Read section 2 before anything else — it reverses the
> caution this handoff originally carried.

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

### 2. The floor — and the reason it matters more than it first looked

**Raheem's long-term goal is a DAY/NIGHT CYCLE**: the sun crossing the sky and setting, the moon
rising and setting. That reframes this entire question, and it reverses the caution written in
the first draft of this handoff.

**A painted-in shadow is a fixed sun.** The plate's big diagonal cast shadow is not merely
"depth we would lose" — it is the single thing that makes a day/night cycle impossible. You
cannot move the sun while the shadow is welded to the floor.

So replacing the floor is not a risk to the day/night goal. **It is the prerequisite for it.**

**Generate the floor EVENLY LIT, with no cast shadows and no directional light baked in.** That
is easier for Leonardo than matching a specific shadow, not harder. The light then moves out of
the art and into code, where it can actually move.

**Tool split (Raheem, explicit):** *"I was only referring to using Leonardo for the floor.
Leonardo is what we use for pretty backgrounds. We use PixelLab to generate the fountain."*
Correct, and it matches CLAUDE.md — Lucid Origin for flat top-down plates, PixelLab for objects.
Ignore the tileset discussion above except as the record of why tiles are not the route.

#### What day/night then needs, in layers

| Layer | What it is | Where it lives |
|---|---|---|
| Ground | Evenly lit paving, no baked shadow | Leonardo plate, via `bg-harness` |
| Structures | Walls, towers, keep, gate — cut from the current plate or regenerated | image layers |
| **Cast shadows** | A shadow map that ROTATES with the sun | **Phaser, generated** |
| Time-of-day grade | Warm dawn, white noon, amber dusk, blue night | **Phaser tint over everything** |
| Lights | Braziers, crystals, lanterns that only matter after dark | **Phaser, additive** |

The last three are free and re-tunable forever.
`src/pages/castle/v2-preview/crystalVfx.ts` is already a working example of the code-side half —
bloom, glints and motes driven entirely by numbers rather than art.

**The structures still carry their own baked shadows too.** Full day/night eventually needs the
whole plate separated into ground + structures + dynamic shadow. The floor is step one, not the
whole job — but it is the step that unblocks the rest, and it can be done alone.

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
- **The Proving Hall (top-left)** is now the pitch, and its centrepiece is a row of **floating
  weapon reliquary cases** rather than a weapon rack — Raheem: *"not a regular weapon stand,
  that's not cool."* The weapons in them are **canon**, taken from
  `Archetype_Weapon_and_Companion_Reference.md`, so the hall displays the archetypes' real
  signature arms: Halo Blade (Seraph), Living Staff (Druid), Open-Hand Gauntlets (Monk),
  Judgment Bow (Seraph). Each weapon is drawn already floating clear of its base so it can be
  bobbed or rotated as an object animation for ~2 generations.
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
