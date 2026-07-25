# Forge scenes — manifest & recipe

Dynamic per-archetype forge backgrounds. Each forge scene is composited from
independent layers so the world transforms with the player's choices while the
card-slot stays fixed. Source of truth for the composed scenes is the Figma file
below; source art is Leonardo (Phoenix). Nothing here is wired into the app yet —
this manifest exists so that implementation (translating layer coords into
`CardForge` CSS) is mechanical.

## Layer model (back → front)
1. `background` — the swappable painted world (per archetype; per tonal path when
   elements oppose, e.g. Druid Nature vs Poison). `FILL`.
2. `anvil` — a transparent cutout, fixed. `FIT`, full-frame, art grounded low.
3. `plume` — the element energy erupting from the anvil, seated + white-fogged.
   `FILL`, full-frame, positioning baked into the PNG (see process_plume.py).
4. `card-slot` — hidden guide rect marking where the real card floats.
5. `card` — the rendered card (placeholder here), floating above the anvil.

Canvas 768×1024 (3:4). Card placeholder: 220×314 at (274, 262).

## Figma — file `2jFwzyv3F85XYyIthQyrQg` ("Card Game — Forge Scene Template")
| Archetype | State | Frame node |
|---|---|---|
| Druid | Entry | 14:2 |
| Druid | Nature | 1:2 |
| Druid | Poison | 12:2 |
| Vampire | Entry | 17:2 |
| Vampire | Blood | 15:2 |
| Vampire | Shadow | 16:2 |
| Vampire | Nocturne | 16:11 |
| Vampire | Sanguine | 16:20 |

Make a new scene = clone a frame, swap the `background` / `anvil` / `plume` fills
(upload_assets with the node id). Hide `card-slot`.

## Leonardo (Phoenix `de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3`, 768×1024)
- Backgrounds: generate anvil-less world. Consistency across a set via Style
  Reference controlnet `preprocessorId 166`, `initImageType GENERATED` → a per-
  tonal-family anchor at `strengthType` Mid (near states) / Low (far states).
- Anvils: generate isolated on plain bg (anti "bull/rhino horn" negatives — see
  lib/vanvil-style negatives), then cut out via `POST /variations/nobg`.
- Plumes: generate billowing smoke on PURE BLACK, then `process_plume.py`.
- Key source image ids — Druid: light-anchor 650ee205, dark-anchor e43ee562;
  Vampire: crypt 6e35416c, anvil(opt2) 8602d41b, blood-plume 249a7896.

## Plume recipe — LOCKED (see lib/process_plume.py)
Smoke shape is never changed; per element RECOLOR the same smoke. White fog at
the base (~y706) grounds it on the anvil. Nocturne = crimson recolor + moon.
Vampire elements: Blood=red, Shadow=purple, Nocturne=blood-red(+moon),
Sanguine=rose — all the SAME smoke, recolored. (Element Bible in
src/data/elementVisualLanguage.ts is reference, but the consistent smoke overlay
was chosen over literal per-element substance.)

## Status
Druid + Vampire complete (2 of 11). Remaining: Barbarian, Monk, Beastmaster,
Necromancer, Lycanthrope, Mech Pilot, Android, Seraph, Human.
