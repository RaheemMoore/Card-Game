# Courtyard V2 — magical draft 1

Generated 2026-08-04 via `scripts/sprite-lab/configs/courtyard-magical.json`
(one `/create-1-direction-object` call, 25 generations, 4 concepts).

**Why these exist.** The tower batch was briefed as a barracks — portcullis,
weapon rack, muster board, trophy rack. Raheem's verdict was "pretty cool, but
very, very boring," and the deeper note is that it was off-brief: *this is a
magical fantasy card game. We forge cards, not weapons.* The goal is that a
player looks at a quadrant and wants to walk over.

**Visual anchor** is the game's own element-crystal art
(`public/assets/elements/*.jpg`): a prism hovering over a cracked base, shards
suspended around it, a halo, colour bleeding into the air. That is this game's
established language for "magical" and the best-looking art it has.

**Every piece is drawn with its moving parts already airborne** — cards off the
stand, shards off the crystal, pages off the book. That is deliberate and serves
both halves of the motion plan:

- **PixelLab animates the object itself** — `POST /objects/{object_id}/animations`,
  `mode='v3'`. The cards can really turn and rise.
- **Phaser layers the world's motion on top** — sparkle, dust, bloom, and the
  reaction when the hero walks up. Free and re-tunable, as
  `src/pages/castle/v2-preview/crystalVfx.ts` already does for the counter gems.

A piece drawn as one closed lump animates badly in either system.

| File | Concept |
|---|---|
| `card-stand.png` | Cards blasting up off a forging stand on coloured magic trails |
| `element-crystal.png` | Prism crystal hovering in an aura above a cracked stone base |
| `mana-font.png` | Basin of glowing turquoise light, crystal shards around the rim |
| `rune-lectern.png` | Open spellbook with pages torn free and flying — the "papers floating off a stand" brief |

All four are PENDING in the review harness. Nothing is approved and nothing is
in the castle. Per the standing rule (Raheem, 2026-08-04), an item is judged
first and only then does it earn its animation and its other seven faces.

Rebuild the harness: `python3 scripts/sprite-lab/lib/review_sheet.py build`
