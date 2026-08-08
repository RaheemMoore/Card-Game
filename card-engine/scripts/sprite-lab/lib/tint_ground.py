#!/usr/bin/env python3
"""
Retint ONE material inside a two-material Wang tileset.

A grass/dirt Wang set is two materials sharing one image. A global recolour turns
the dirt green as well, which is how a "forest floor" ends up looking like mould on
a path. So pixels are classified by hue first and each material transformed on its
own terms.

The split is measured, not assumed. On castle-ground-grass-dirt-wang-32.png the
histogram is cleanly bimodal (2026-08-07):

    hue  20-29   6397 px   dirt
    hue  50-79    319 px   dirt highlights
    hue 110-119  7645 px   grass
    hue 240-249  1984 px   the tile outline

Nothing sits between 80 and 110, so a boundary there cannot cut a ramp in half —
which is the failure that makes a recolour look posterised.

Colour is a post-process (CLAUDE.md standing rule). This is free, exact, applied
identically to all 16 tiles, and reversible. It does NOT invent leaf litter, roots
or twigs — that is structure, and structure has to be generated.

Usage:
  tint_ground.py <in.png> <out.png> --hue H --sat M --val M
                 [--other-sat M] [--other-val M] [--outline-val M]
"""
import argparse
import colorsys
import os
import sys

from PIL import Image

# Hue window that counts as the "green" material. Wide enough to catch every step
# of the grass ramp, narrow enough to exclude the dirt and the outline.
GREEN_LO, GREEN_HI = 90.0, 180.0
# Above this is the blue-grey tile outline, which is neither material.
OUTLINE_LO = 180.0


def retint(
    img: Image.Image,
    hue: float,
    sat_mul: float,
    val_mul: float,
    other_sat: float,
    other_val: float,
    outline_val: float,
) -> tuple:
    out = img.convert("RGBA")
    counts = {"green": 0, "other": 0, "outline": 0, "clear": 0}
    new = []
    for r, g, b, a in out.get_flattened_data():
        if a == 0:
            counts["clear"] += 1
            new.append((r, g, b, a))
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        deg = h * 360
        if GREEN_LO <= deg <= GREEN_HI:
            counts["green"] += 1
            # Hue is SET so the result does not depend on the input's green; sat and
            # val are SCALED so the blades and speckles keep their relative contrast.
            h2, s2, v2 = hue / 360, s * sat_mul, v * val_mul
        elif deg > OUTLINE_LO:
            counts["outline"] += 1
            h2, s2, v2 = h, s, v * outline_val
        else:
            counts["other"] += 1
            # Dirt is not recoloured, only put in shade — it is the same earth, seen
            # under a canopy. Changing its hue would break the transition tiles,
            # where it has to read as continuous with the dirt outside the forest.
            h2, s2, v2 = h, s * other_sat, v * other_val
        rr, gg, bb = colorsys.hsv_to_rgb(h2, min(1.0, s2), min(1.0, v2))
        new.append((int(rr * 255), int(gg * 255), int(bb * 255), a))
    out.putdata(new)
    return out, counts


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--hue", type=float, required=True)
    ap.add_argument("--sat", type=float, required=True)
    ap.add_argument("--val", type=float, required=True)
    ap.add_argument("--other-sat", type=float, default=1.0)
    ap.add_argument("--other-val", type=float, default=1.0)
    ap.add_argument("--outline-val", type=float, default=1.0)
    a = ap.parse_args()

    if os.path.exists(a.dst):
        print(f"refusing to overwrite {a.dst}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(a.src)
    out, counts = retint(
        img, a.hue, a.sat, a.val, a.other_sat, a.other_val, a.outline_val
    )
    out.save(a.dst)
    print(f"{a.src} -> {a.dst}")
    print(f"  green {counts['green']}  dirt {counts['other']}  outline {counts['outline']}")


if __name__ == "__main__":
    main()
