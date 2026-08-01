# The Still Season — arena handoff

**Status 2026-07-30:** Raheem is generating the arena plate himself in Leonardo.
The colosseum plate I produced (`out/arena-still-season/`) and the throne cut are
**abandoned**. This file is what I need from that image and what I will do to it.

---

## What to send me

One image. That is all — no variants needed unless you want to pick between them.

**Aspect:** as close to **16:9** as you can get. Everything ends up 1360×768.

Anything else I can fix. Read the rest of this only if you want to know what
survives the pipeline and what does not.

---

## What the code needs from the composition

These are not style notes, they are contracts. The sprites are positioned against
these bands, so getting them wrong means the boss floats or the party stands in a
wall.

| Region | Requirement | Why |
|---|---|---|
| **Top-left ~372×196, top-right ~320px** | Dark, low detail | HUD panels sit there. Bright detail makes the interface unreadable. |
| **Centre-middle** | Open and uncluttered | The boss and his platform go here. |
| **Lower third** | Flat, low contrast, unobstructed | The party stands here and must read against it. |
| **Bottom ~8.5rem** | Anything painted here is thrown away | Covered by the command shelf. |
| **All edges, 4–5%** | Keep clear | The plate is `cover`-cropped, so edges are trimmed on wide screens. |

**A painted dais is FINE.** The old blanket "no dais" rule was over-broad and has
been retired. `BossPlatform.tsx` draws a **contact shadow, not a slab** — its own
docstring says the backgrounds already contain their own ground — so a painted
floor plus a code contact ring is the *good* case, not a double platform.

The real rule is: **no raised platform the sprite must stand on top of**, and the
measurable contract is that the boss sprite box's bottom edge lands at a stable
**66–70% of viewport height** across every supported size. Anything the boss sits
on must be flat and continuous through that band. The Still Season's plate has a
dais whose far edge is at y 0.611 and near edge at ~0.92, so the box bottom lands
on flat stone with room either side.

**Nobody in the frame.** No figures, no silhouettes. And do not describe the space
by its occupants — the phrase "a floor where three figures can stand" once made
Leonardo paint three tiny fighters onto it.

---

## Two things that are load-bearing for gameplay, not taste

**Keep the arena's own pink dull, or leave it out entirely.** His area attack
`act_season_root` erupts the floor in BRIGHT magenta as a code layer. If the plate
already glows that colour, the attack reads as more floor instead of as something
he just did. Dormant stain in the plate, acute flare in code — that contrast is
how the player learns "the floor is blooming = everyone is about to be hit".

**Leave the greenery to the plate, not to a grade.** Established the hard way on
the last attempt: I tried tinting grey stone green to make it feel druidic and
Raheem rejected it, correctly —

> "Making the stone the colour of moss doesn't make the environment more
> nature-like. That would be including more plants or more overgrowth — actually
> changing the image, not just tinting the stones."

So if you want it to feel overgrown, **put plants in the image.** A colour grade
cannot add a subject. `finish_arena.py` now only does a mild warm correction.

---

## What I will do to it (all deterministic, all free)

1. **`lib/finish_arena.py`** — crops any sky band, relays the discarded canopy
   over the top, mild warm correction, darkens the two HUD corners, damps any
   magenta to a matte stain, flattens the lower third, then pixelises.
   - The sky crop exists because **ten Leonardo images across four rounds could
     not be prompted out of putting a bright band across the upper middle.** A
     wide symmetrical exterior wants a horizon; the HUD wants dark corners. It is
     a framing problem, so it is solved in post. If your image has no sky, this
     step no-ops.
2. **`lib/pixelize.py`** — box-downsample to a native grid, quantise to 64
   colours, scale back with NEAREST. This is what makes it sit with the other
   arenas; asking Leonardo for pixel art in words is unreliable.
3. Register in `ARENA_MANIFEST` + a matching **`ARENA_GROUND_TINT`** row. The tint
   must be authored per arena — without its own row a forest is lit from below by
   the Debt-Bearer's lava pool.

```bash
cd card-engine/scripts/bg-harness
python3 lib/finish_arena.py <your.png> \
  ../../public/assets/combat/arenas/still-season-<name>/base.png
```

---

## Model notes, if you want them

- **Phoenix**, Alchemy **off**, `presetStyle: NONE`. Both shipped arenas are
  Phoenix and pixel-cluster density is model-specific — it is the most visible
  cue that the tower is one building.
- **Do not use another arena as a style reference for a green brief.** Even at
  `Low` strength it imported the stone room's *content*: grey stone trunks and a
  recoloured lava-web floor, on every single direction.
- Hard caps: **prompt 1500 chars, negative_prompt 1000.** Both are enforced at
  submit, possibly part-way through a paid batch. `harness.mjs` now checks the
  prompt locally first.
- Negatives only reliably kill **specific named nouns**. "No paving" loses;
  `cobblestone, flagstone, pavers` helps. Name what you DO want as the surface
  material instead, and say it first.

---

## Abandoned with this change

- `out/arena-still-season/` — the colosseum plate and its rejects (r1, r3).
  Kept on disk as a record of the four rounds, not for use.
- `decal/throne.png` — the carved seat cut from the source art. Dropped on
  Raheem's call. `bossSignatureManifest.dressing.throne` still reads it; remove
  that entry when the new arena lands, or repoint it if the new plate wants one.
- The `still_season_colosseum` row in `ARENA_MANIFEST` and its `ARENA_GROUND_TINT`
  entry — replace both rather than editing, so the old one stays greppable.

## NOT abandoned — these are independent of the background

The sprite work and the effect layers all stand: five clips, the rune halo, the
flower bed, the scene dressing (overgrowth drape, wash, shafts, motes), and the
action→layer signature binding. Only the plate underneath them changes.
