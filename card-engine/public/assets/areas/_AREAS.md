# Areas — how the world's assets are organized

A **area** is one place in the game: the forest, the courtyard, the tower. Each one owns its
own folder and its own asset pack, so when you open it in Phaser Editor you see that area's
assets and nothing else.

This is Phaser Editor's own recommended shape — one asset pack per area rather than one big
one — and it is why the Editor's asset browser stays readable as the game grows.

```
areas/
├── areas.json          the registry — an area exists only if it is declared here
├── _AREAS.md           this file
│
└── forest/
    ├── area.json       GENERATED. Never edit by hand.
    ├── ground/         what you stand on — tiles, floor, paths
    ├── props/          what stands on it — trees, rocks, walls, fences
    ├── actors/         what moves — creatures, NPCs
    └── fx/             what plays over it — dust, sparks, weather
```

**The four layers are bottom-to-top, the order a scene is actually built.** Ground first, then
things standing on it, then things that move, then effects over the top. When you are placing
in the Editor, you reach for the layer you are working in.

---

## Adding an asset

1. Drop the PNG into the right layer folder — `areas/forest/props/tree-oak.png`
2. `npm run assets:pack`
3. It appears in Phaser Editor's asset browser, and in the game

If the folder or the name is wrong, step 2 tells you exactly what to fix and **writes nothing**.

## Adding an area

1. Add it to `areas.json`
2. Make the folder with its four layer folders
3. Drop assets in
4. `npm run assets:pack`

---

## Naming

**`<kind>-<subject>[-<variant>].png`** — lowercase, hyphens, nothing else.

```
tree-oak.png            rock-mossy-01.png
tree-oak-snowy.png      wall-stone-corner.png
```

**Directions and frames** keep the vocabulary the sprite pipeline already uses:

```
tree-oak-north-east.png              one of the 8 compass directions
ogre-walk-03.png                     <subject>-<clip>-<NN>, zero-padded
```

**States go in the name. Verdicts never do.**

```
good    wall-stone-intact.png   wall-stone-cracked.png   wall-stone-breached.png
bad     wall-BEST.png   tree-candidate-2.png   rock-final.png   tree-oak-BEFORE-recolor.png
```

A state is part of the game. A verdict — best, ready, candidate, rejected, final — is part of
*choosing*, and choosing happens in the harness review sheet. The linter rejects verdict words,
because that is exactly how ten candidate batches and four competing filename schemes ended up
shipped in `public/assets/combat/`.

---

## The one rule that keeps this clean

**If you are not sure which area something belongs to, it is because it belongs to more than
one — put it in `assets/shared/`.**

Uncertainty has a defined answer, so nothing ever gets parked "for now". `shared/` is for
things genuinely used across areas: the UI kit, icons, badges. If an asset is used by one area,
it lives in that area.

---

## Why this stays organized

`npm test` fails if it drifts.

That is the whole mechanism, and it is not decoration. This repo already had good conventions
written down — and six competing naming schemes grew anyway, because nothing checked. The one
asset convention that has never drifted is the one with a test behind it.

So the checks are:

- every file sits in one of the four declared layers — no loose files, no invented folders
- lowercase and hyphens only
- no verdict words
- every file on disk is in its area's pack, and every pack entry exists on disk
- every area folder is declared in `areas.json`, and every declared area exists

Run them any time with `npm run assets:lint`.

---

## What is NOT here

The existing asset folders — `castle/`, `combat/`, `borders/`, `elements/` — are older than
this scheme and are deliberately left alone. They work, and several are imported directly by
TypeScript. They move into this structure one at a time, when someone is already working on
them, not in one risky sweep.
