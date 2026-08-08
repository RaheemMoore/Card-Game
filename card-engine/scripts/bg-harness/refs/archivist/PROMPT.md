# The Archivist — Leonardo prompt

Use the **same model as the approved forge**: `gemini-2.5-flash-image`, 1024x1024.
(That model is web-UI only — it returns "Unsupported model" on the REST API, so this
cannot be run from a script. Generation `1f192915-fc78-6320-98b3-a468ddc3aacd` is the forge.)

Built on the exact skeleton of your forge prompt, so it lands in the same register.
Where the forge got **a wizard tower + an alchemy annex**, the Archivist gets
**a domed reading rotunda + a keeper's statue + a scriptorium annex**.

Deliberately NOT reused from the forge, so the two read as different buildings:
- no swirling rainbow portal (the forge owns that) — a warm lamplit archway instead
- cooler palette: deep blues, teal, parchment, silver — against the forge's warm gold and fire
- vertical domed silhouette against the forge's long low hall

---

## Prompt

Create a front-facing pixel art exterior of a magical fantasy archive and library building in a castle courtyard, designed for keeping a codex of discovered abilities and lore rather than ordinary books. Keep the building readable as a standalone exterior asset with medieval stone walls, wooden roofing, and castle-style materials that match a neighbouring magical forge building. Integrate the magical theme directly into the architecture with carved emblems, subtle banners, glowing windows, rune carvings and built-in fantasy details, rather than floating symbols above the roof. The signature feature is a GREAT DOMED READING ROTUNDA rising from the centre, with a glass oculus at its top glowing softly, and tall arched stained-glass windows down the front through which tiers of bookshelves and warm lamplight are visible. Beside the recessed arched entrance stands a tall carved stone statue of a robed keeper holding an open book, fully robed and covered from neck to feet, weathered and mossy on its plinth. Add a small scriptorium annex to one side with hints of scrolls, ink, candles and star charts. Make the roof visually interesting with ornate trim, decorative details, and a slender astrolabe or orrery mounted at the ridge. The entrance is a deep recessed stone archway with a warm golden lamplit glow, NOT a swirling portal. Cooler palette than a forge: deep blues, teal, parchment and silver, with gold trim. Keep the exterior clean, exciting, and game-readable, with a strong silhouette and professional indie pixel art quality. Plain flat solid white background, no ground, no grass, no scenery, no cast shadow.

---

## Two things I added that the forge prompt lacked, and why

1. **"Plain flat solid white background, no ground, no grass, no scenery, no cast shadow."**
   The forge came back with a dirt-and-grass skirt that had to be cut off at the foundation
   line before it could sit on the courtyard's paving. Asking up front is free.

2. **"fully robed and covered from neck to feet"** on the statue. Required by the project's
   figure-modesty rule, which applies to every generated figure without exception — including
   statues.

## What I'll do with whatever comes back

Same pipeline as the forge, all free and deterministic:
BOX-downsample to the native grid (no quantize — quantizing cost 12.6% saturation on the forge)
-> key the white surround -> stone value-matched toward the castle ramp, hue and saturation
untouched -> cut at the foundation line -> register in the kit manifest -> place in CourtyardV2.

## Open question

Which wall the stone should be matched against is still unsettled — CourtyardV2 has both the
lavender `wall-straight-v2` and a warmer salmon-toned wall, and the A/B forge comparison in
`L5_QUADRANT_NW` exists to settle it. Whatever wins there applies to the Archivist too.
