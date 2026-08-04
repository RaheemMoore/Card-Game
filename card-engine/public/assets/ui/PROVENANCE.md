# Pixel UI art — provenance and intended use

Generated via PixelLab, `scripts/sprite-lab/configs/ui-kit-pixel.json`, 2026-08-04.
**60 generations across three rounds.** Review sheet:

```bash
node scripts/sprite-lab/sprite-lab.mjs sheet ui-kit-pixel
```

> ## NOTHING HERE IS REPRODUCIBLE
> `/create-1-direction-object` **rejects `seed`** — the only endpoint in the sprite-lab
> harness that cannot be pinned. A re-roll returns different art, not the same art. Treat
> every file in this directory as a **one-of-one original**. Do not delete, overwrite, or
> "clean up" any of it without Raheem saying so explicitly.

## `kit/` — the approved set (Round 3)

Raheem approved R3 2026-08-04: *"I like version three."* Wood body, slim gold trim, one small
turquoise crystal per piece. Chosen as the in-between of R1 (too plain) and R2 (too gaudy).

| File | Primitive | Notes |
|---|---|---|
| `panel-frame.png` | Panel | **9-slice at 32px corners** on the 128px source — measured, not guessed. Interior is genuinely hollow (0/1849 centre px opaque). |
| `button.png` | Button | Idle state; hover/pressed via CSS on this one asset. |
| `slot.png` | Chip/tile | Card slot for collection grids. |
| `bar-trough.png` | Bar | Empty trough; the fill is drawn by the component, not baked in. |

**`panel-frame.png` was repaired, not regenerated.** It came back with a fully opaque painted
interior (1849/1849 centre px). Re-rolling would have cost 20 generations and could not have
returned the same frame, so the interior was cleared deterministically with
`scripts/sprite-lab/lib/knockout_interior.py` (7,832 px cleared). Correction ladder rung 1.

## `library/` — kept alternates, not dead files

Raheem 2026-08-04: *"Don't throw away the other frames. I feel like we can maybe use them for
later UIs for the other shops."* Different stalls carrying different frames is the intent.

| File | Round | Intended use |
|---|---|---|
| `frame-wood-plain.png` | R1 | Plainest frame. Candidate for a utilitarian stall. |
| `frame-arcane-ornate.png` | R2 | Heavy gold + turquoise crystal filigree. Candidate for a high-magic stall. |
| `slot-rune.png` | R2 | Violet rune slot, gold beading. |
| `item-potion.png` | R2 | **Item art, not chrome.** Inventory/ability icon. |
| `item-key.png` | R2 | **Item art, not chrome.** Inventory/ability icon. |

The potion and key exist because R2's prompt led with *"enchanted"* on an **object** endpoint,
so the model built enchanted *items* instead of UI. A prompting failure that produced two
genuinely good assets — kept deliberately, per Raheem.

## Style rule this art implements

**Painted is what you look at; pixel is what you touch.** Chrome is pixel because it is
touched. The card — portrait and painted frame edges — stays painterly. See
`card-engine-ui-kit-contract.md`.

---

## Assembly rules — learned expensively, 2026-08-04

Every one of these came from a defect Raheem caught in review. The art was never
the problem; the assembly was. Read this before wiring a new piece.

### 1. `fill` for solid pieces. No `fill` for frames.

`border-image` **paints only the ring** and discards the middle of the source.
That is correct for `panel-frame.png`, whose centre is genuinely hollow, so the
element's own `background` shows through.

It is completely wrong for the button, bar and slot, whose art **is** their face.
Without the `fill` keyword their generated wood and gold were thrown away and
replaced by a flat CSS rectangle — the "giant dark boxes" in review.

### 2. Trim before you slice.

PixelLab returns every object on a fixed square canvas regardless of shape. As
generated: button **112×34**, bar **120×30**, slot **45×47** — all inside 128×128.
A slice measured from the canvas edge therefore samples mostly transparency.

Run `scripts/sprite-lab/lib/trim_ui_piece.py` on every new piece. It crops to the
content box and prints a usable slice.

### 3. Measure the slice off the art. Never assume symmetry.

The button's crystal cap is on the **left only** (16px); its right edge is a plain
6px rim. A symmetric slice invented a cap on the right and shoved every label
onto the real one. Its slice is `10 6 10 16 fill` — top/right/bottom/left.

The bar's channel is x 14–106, y 6–24 of 120×30. The fill is inset to that, so it
cannot cover the gold end caps.

### 4. Rendered width is not the slice.

`Slot` takes `frameWidth` separately from its fixed 13px slice. A smaller width
draws the same beading **thinner**, it does not crop it. The crest rack uses 6 so
the emblem gets the tile; card slots use the default.

### 5. Pixel fills shade in bands, not gradients.

The bar's fill is three flat bands with hard stops and no glow. A smooth gradient
with a bloom is the single most obvious way to make CSS look like CSS sitting
inside pixel art.

### 6. Review over the plate, on both grounds.

`lib/ui_kit_review.py` composites every piece over the courtyard on light AND dark
and 9-slices the frame at game scale. Round 1 looked fine as loose PNGs and was
tonally wrong the moment it sat on the courtyard.
