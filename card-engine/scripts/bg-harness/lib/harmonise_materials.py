#!/usr/bin/env python3
"""Pull a set of plates onto one shared stone and metal, so a kit reads as one castle.

Raheem, 2026-08-09: "some look bronze, some look gold, less on a middle ground...
make sure the bricks and the metal aligns in these images. Consistency is our
main goal here."

He is right, and it measures. Across the five castle picks:

    piece            metal hue   metal sat   stone RGB
    H2 wall             29.4        0.49     (175,167,156)   pale warm
    V3 side wall        29.1        0.48     (174,161,154)   pale warm
    G5 gate             28.8        0.47     (127,120,129)   dark, violet
    T3 tower            23.5        0.61     (136,134,122)   mid warm
    corner tower        24.7        0.59     (133,131,121)   mid warm

Two groups: walls and gate are GOLD, both towers are BRONZE. Separately the
gate's stone is much darker and cooler than the walls'.

WHY NOT A GLOBAL QUANTIZE. Forcing every plate onto one median-cut palette is
the obvious move and it is wrong here: median cut allocates colours by area, so
the walls (mostly pale stone) would swallow the budget and the towers' copper
would collapse into two or three muddy steps. It also cannot tell stone from
timber from stained glass, so it flattens materials that are supposed to differ.

WHAT THIS DOES INSTEAD. Classify pixels by material, measure each plate's own
median, and move only that material toward the set's median — metal by hue and
saturation, stone by value and warmth. Timber, glass and glow are left alone
because they are meant to vary. It is the same principle as recolor.py's --ramp
and the standing rule in CLAUDE.md that colour is a post-process, never a reason
to re-roll.

    python lib/harmonise_materials.py report  a.png b.png ...
    python lib/harmonise_materials.py apply   a.png b.png ... --out DIR [--strength 1.0]

`report` prints the table and the targets it would converge on, changing
nothing. `apply` writes harmonised copies. --strength 0..1 scales how far each
plate moves, for when a full correction overshoots.
"""
import argparse
import os

import numpy as np
from PIL import Image

# Material classification in HSV. Deliberately narrow: anything not confidently
# stone or metal is left untouched rather than guessed at.
METAL_HUE = (15, 60)      # gold through copper
METAL_SAT_MIN = 0.35
STONE_SAT_MAX = 0.20
STONE_VAL_MIN = 0.35


def to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = h % 360
    c = v * s
    x = c * (1 - np.abs((h / 60) % 2 - 1))
    m = v - c
    z = np.zeros_like(h)
    seg = (h / 60).astype(int) % 6
    r = np.select([seg == 0, seg == 1, seg == 2, seg == 3, seg == 4, seg == 5], [c, x, z, z, x, c])
    g = np.select([seg == 0, seg == 1, seg == 2, seg == 3, seg == 4, seg == 5], [x, c, c, x, z, z])
    b = np.select([seg == 0, seg == 1, seg == 2, seg == 3, seg == 4, seg == 5], [z, z, x, c, c, x])
    return np.stack([r + m, g + m, b + m], -1)


def load(path):
    im = Image.open(path)
    a = np.asarray(im.convert("RGBA"))
    opaque = a[:, :, 3] > 128
    rgb = a[:, :, :3].astype(float) / 255
    return im, a, rgb, opaque


def masks(rgb, opaque):
    h, s, v = to_hsv(rgb)
    # Plates that still carry a white background (the walls and gate are RGB,
    # not RGBA) have JPEG noise in that background: pixels a shade off pure
    # white, low saturation, which the stone test would otherwise accept. Darken
    # them and they stop being invisible — the first pass speckled grey dots
    # across the wall's white surround. Near-white is background, always.
    paper = (v > 0.93) & (s < 0.08)
    live = opaque & (v > 0.12) & (v < 0.98) & ~paper
    metal = live & (s > METAL_SAT_MIN) & (h > METAL_HUE[0]) & (h < METAL_HUE[1])
    stone = live & (s < STONE_SAT_MAX) & (v > STONE_VAL_MIN)
    return h, s, v, metal, stone


def measure(path):
    _, a, rgb, opaque = load(path)
    h, s, v, metal, stone = masks(rgb, opaque)
    out = {"file": path, "metal_n": int(metal.sum()), "stone_n": int(stone.sum())}
    if metal.sum() > 200:
        out["metal_h"] = float(np.median(h[metal]))
        out["metal_s"] = float(np.median(s[metal]))
        out["metal_v"] = float(np.median(v[metal]))
    if stone.sum() > 200:
        out["stone_v"] = float(np.median(v[stone]))
        # warmth: red minus blue, the axis that separates the gate's violet
        # stone from the walls' warm stone
        out["stone_w"] = float(np.median(rgb[..., 0][stone] - rgb[..., 2][stone]))
    return out


KEYS = ("metal_h", "metal_s", "metal_v", "stone_v", "stone_w")


def targets(rows, anchor=None):
    """Where everything converges.

    The set median is the neutral choice, but it is not automatically the right
    one: here it wants stone at 0.54, which darkens both walls by 22% because
    the gate and the two towers outvote them. The walls are the castle's largest
    surface, so that is a taste decision rather than a maths one — hence
    --anchor, which takes one plate as the reference the others move toward.
    """
    if anchor:
        a = measure(anchor)
        return {k: a[k] for k in KEYS if k in a}

    def med(key):
        vals = [r[key] for r in rows if key in r]
        return float(np.median(vals)) if vals else None
    return {k: med(k) for k in KEYS}


def apply_one(path, tgt, out_dir, strength=1.0, do_metal=True, do_stone=True):
    im, a, rgb, opaque = load(path)
    h, s, v, metal, stone = masks(rgb, opaque)
    m = measure(path)
    h2, s2, v2 = h.copy(), s.copy(), v.copy()
    rgb2 = rgb.copy()

    if do_metal and metal.sum() > 200:
        h2[metal] += (tgt["metal_h"] - m["metal_h"]) * strength
        # saturation and value move multiplicatively so highlights and shadows
        # keep their relationship instead of being crushed toward the median
        s2[metal] *= 1 + (tgt["metal_s"] / m["metal_s"] - 1) * strength
        v2[metal] *= 1 + (tgt["metal_v"] / m["metal_v"] - 1) * strength
        conv = hsv_to_rgb(h2, np.clip(s2, 0, 1), np.clip(v2, 0, 1))
        rgb2[metal] = conv[metal]

    if do_stone and stone.sum() > 200:
        # VALUE IS NEVER TOUCHED. The first version scaled all stone by one
        # factor to match a target lightness, and it flattened the wall: the
        # pale walkway on top and the dark outer face below are BOTH stone, and
        # scaling them together compressed the very contrast that makes the wall
        # read as a wall. Raheem caught it — "the darker brick on the outside
        # should stay there, and the top should stay a lighter grey brick, how
        # it is in before."
        #
        # What differs between plates is the stone's COLOUR CAST, not its
        # lightness: the gate's stone is violet, the walls' is warm. So correct
        # temperature only, as a shift split between the red and blue ends so
        # brightness does not drift, and leave every plate's internal light-to-
        # dark structure exactly as painted.
        vs = rgb2[..., :3].copy()
        dw = (tgt["stone_w"] - m["stone_w"]) * strength
        vs[..., 0][stone] += dw / 2
        vs[..., 2][stone] -= dw / 2
        rgb2 = vs

    a2 = a.copy()
    a2[:, :, :3] = np.clip(rgb2, 0, 1) * 255
    os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, os.path.basename(path))
    Image.fromarray(a2, "RGBA").save(dst)
    return dst


def print_table(rows, tgt):
    print(f"{'piece':26s} {'metal hue':>9} {'sat':>6} {'val':>6} {'stone val':>10} {'warmth':>7}")
    for r in rows:
        print(f"{os.path.basename(r['file']):26s} "
              f"{r.get('metal_h', float('nan')):9.1f} {r.get('metal_s', float('nan')):6.2f} "
              f"{r.get('metal_v', float('nan')):6.2f} {r.get('stone_v', float('nan')):10.2f} "
              f"{r.get('stone_w', float('nan')):7.3f}")
    print(f"{'TARGET':26s} {tgt['metal_h']:9.1f} {tgt['metal_s']:6.2f} "
          f"{tgt['metal_v']:6.2f} {tgt['stone_v']:10.2f} {tgt['stone_w']:7.3f}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["report", "apply"])
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", default="out/harmonised")
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--anchor", help="converge on this plate's materials instead of the set median")
    ap.add_argument("--pass", dest="which", choices=["metal", "stone", "both"], default="both",
                    help="run one material pass at a time so each can be judged on its own")
    a = ap.parse_args()

    rows = [measure(f) for f in a.files]
    tgt = targets(rows, a.anchor)
    print_table(rows, tgt)
    if a.cmd == "apply":
        print(f"\npass: {a.which}")
        for f in a.files:
            print("  ->", apply_one(f, tgt, a.out, a.strength,
                                    do_metal=a.which in ("metal", "both"),
                                    do_stone=a.which in ("stone", "both")))


if __name__ == "__main__":
    main()
