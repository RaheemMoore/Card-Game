# Matching the courtyard — the four layers

**Raheem, 2026-08-04:** *"Everything you generate should match the tone, the colour, the floor.
We should be trying to match bricks. It should always match. Is there something we can implement
to make sure that happens?"*

Yes. Four layers, cheapest first. Use them together — no single one is sufficient.

The failure this exists to stop: the Ascent arch and the Wellspring fissure came back **neutral
mid-grey**, and neutral grey matches nothing in this plate. Measured:

| Sampled | RGB |
|---|---|
| Plate paving, open sunlit | **229, 202, 115** — warm honey |
| Plate wall stone, shadow | **82, 85, 96** — dark cool grey |
| Asset `arch-stair` | 184, 176, 163 — light neutral |
| Asset `fissure` | 173, 181, 175 — light neutral |

The castle's stone is either **bright cream-yellow in sun** or **dark blue-grey in shadow**.
Mid-grey is neither, so it reads as pasted on.

---

## ANSWER #1 — recolour it afterwards. Free, exact, and my job to offer.

**This is the answer to "make everything match the bricks", and it should have been at the top
of this document from the start.**

`lib/recolor.py` maps any exact colour to any other. Generated sprites carry a small fixed
palette, so the map is exact rather than approximate, and it applies **one identical map across
every frame and rotation** — which an AI edit cannot, because it drifts between frames.

**Standing rule (Raheem, 2026-08-04):** when an asset comes back off-palette, I *offer the
recolour unprompted*. Colour is never a reason to regenerate. Regenerate for composition, pose,
silhouette or content.

```bash
# pull a grey stone ramp toward the plate's warm cream, hair-region only
recolor.py in.png out.png --from 173,181,175 --to 214,196,158 --ramp
```

Caveat, measured: **ramps are shared.** The archivist's silver hair greys also appear in her
tunic and shoes. Region-constrain with `--region`. If the distinct-colour count is unchanged
after a hue swap, the map hit everything; if it rises, the region held.

---

## Answer #2 — name the plate's real colours in the prompt

Still worth doing, because it reduces how much correcting is needed. This is the layer that
measurably worked: naming warm honey paving turned the v2 fissures' ground from neutral grey to
matching stone at the source.

---

## Answer #3 — ask Raheem to cut baked ground in Figma

He offered, and he can see what is art and what is backing where a threshold cannot.

---

## ~~Layer 1 — `color_image`, the plate itself~~ NOT POSSIBLE FOR SCENERY — kept as a dead end

**Tested and rejected, 2026-08-04.** `/create-1-direction-object` accepts only `description`,
`size`, `view`, `style_images` and `item_descriptions`. Passing `color_image` returns
**422 "Extra inputs are not permitted"**.

Only the **character** endpoints take a colour reference — which is the exact inverse of what
this project needs, because characters are the one thing that must NOT be palette-matched:
the plate as a colour reference dragged the chibi hero toward dark stone and cost him face
contrast.

So scenery matches the courtyard through layers 2, 3 and 4 only. **Layer 2 is doing the real
work** — see below; it is what turned the v2 fissures' paving from neutral grey to warm honey.

### The original (wrong) claim, kept so it is not re-attempted

`lib/palette_ref.py` shrinks the plate to a 192px thumbnail and it goes to PixelLab as
`color_image`, so generation happens **into** the plate's colours.

This existed and was connected to the **character** path only. Scenery never used it, which is
exactly why the arch and fissure went off-palette. It is now on by default for objects.

```json
"palette": { "reference": "src/assets/dev-preview/courtyard-v2-figma.png" }
```

Per-object opt-out: `"matchPlate": false`. Add `"forceColors": true` to clamp hard to the
plate's palette — strong, and worth it for anything that must recede.

**CHARACTERS ARE DELIBERATELY EXEMPT.** Passing the plate as `color_image` dragged the chibi
hero toward dark stone and cost him face contrast. Readability of someone the player tracks
beats palette cohesion. Scenery is the opposite case — it *should* recede.

## Layer 2 — the palette clause in the prompt

Name the actual colours, every time. Vague words like "stone" produce neutral grey.

> honey-amber paving and warm cream sunlit stone, dark blue-grey stone in shadow, honey-amber
> wood, dark iron and teal-green metal fittings, black pixel outline, basic shading

**The teal-green fittings are the strongest single tell.** Every object that carries them —
counter, bench, sorting table, cart, winch — sat down in the plate instantly. Every object
without them stood out.

## Layer 3 — the deterministic grade, after the fact

`lib/relight.py` and `lib/harmonize.py` already do this and are free and re-runnable. Reach for
them before re-rolling: a grade costs nothing and a re-roll costs generations and risks losing a
composition that was otherwise good.

## Layer 4 — ASK RAHEEM TO CUT IT

**Standing offer (Raheem, 2026-08-04):** *"I can use Figma to cut things out. If you generate
something and we need to cut the bricks off, I can cut them out. Ask me to do it."*

When an asset arrives with **baked ground, its own paving slab, or a backing panel**, do not
write a clever auto-matte. Put it in Figma and ask. He can see what is art and what is backing;
a saturation threshold cannot, and it will eat the artwork it was meant to save.

Known cases waiting on a cut:
- `fissure.png` — carries its own square of pale paving
- `arch-stair.png` — carries a pale rounded backing panel that makes it read as a freestanding
  tower rather than a way into the wall

---

## The checklist before generating scenery

1. Is `palette.reference` set to the plate? (objects: on by default)
2. Does the prompt name honey-amber, cream, dark blue-grey, **teal-green fittings**?
3. Is it a character? Then turn the plate palette OFF — readability wins.
4. Will it carry its own ground? Say "no background, no floor, no paving" — and if it arrives
   with one anyway, **ask Raheem to cut it** rather than auto-matting.
