# Courtyard V2 — tower quadrant objects

Generated 2026-08-04 via `scripts/sprite-lab/configs/tower-quadrant.json`
(two `/create-1-direction-object` calls, 50 generations total).

**These files are source art, not build output.** `/create-1-direction-object`
rejects `seed`, so nothing here is reproducible — if these PNGs are lost, the
50 generations are lost with them. `scripts/sprite-lab/out/` is gitignored,
which is why they are kept here instead.

Every file is trimmed to its alpha bounding box. Objects arrive from the API on
a 146² canvas floating 5–21px above the bottom, which `validate_object.py`
rejects outright; the trim is what makes them anchorable on a feet baseline.
`validate_object.py object` PASSES on all seven as committed.

| File | Status |
|---|---|
| `portcullis.png` | Wall anchor. Matches the shipped forge register well |
| `muster-board.png` | Matches well |
| `trophy-rack.png` | Matches well |
| `weapon-rack.png` | Matches well |
| `watch-brazier.png` | Usable; reads flatter than the counter's three-quarter view |
| `tally-pillar.png` | ⚠️ Came back **isometric** while everything else is elevation or three-quarter. It is a floor object, so its projection is the one that has to agree with the counter. Awaiting Raheem's call |
| `stone-winch.png` | Unrequested extra the API returned to fill its 4-object bucket. Plausible tower content, never briefed |

A stone floor patch was returned in the same batch and discarded — 95.7% alpha
coverage, a floor rather than an object.

Nothing here is placed in a scene yet. Next step is Raheem positioning them in
Figma, then tracing colliders.
