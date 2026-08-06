#!/usr/bin/env python3
"""
Recolour generated pixel art by exact palette mapping. Free, instant, reversible.

**Colour is a post-process, not a reason to regenerate.** Generated sprites carry a
small fixed palette — the chibi archivist is 23 distinct colours in her entire
sprite — so remapping one colour to another is EXACT rather than approximate.

WHY DETERMINISTIC AND NOT AN AI EDIT. A character exists as four rotations plus
animation frames. `/inpaint-v3` would be run per image and would drift between
them — the failure that already produced a costume changing mid-walk-cycle at
43.7 palette units of drift. A lookup table gives the same output for the same
input in every frame, forever. Consistency is structural rather than hoped for.

THE TRAP THIS TOOL EXISTS TO AVOID: ramps are shared. The archivist's five
silver hair greys also appear in her tunic, hem and shoes — measured, not
assumed. A global swap recolours her outfit. Use --region.

Usage:
  recolor.py <in.png|dir> <out.png|dir> --from R,G,B --to R,G,B [options]

  --from/--to    may repeat for an explicit multi-colour map
  --ramp         derive the WHOLE shadow-to-highlight ramp from one pair,
                 preserving each step's relative value. Hand-listing five greys
                 is how a recolour comes out flat and dead.
  --region x0,y0,x1,y1
                 fractional, against the SPRITE's own bounding box rather than
                 the canvas, so one call works across frames where the subject
                 sits at different offsets
  --dry-run      report what would change and write nothing
"""
import colorsys
import os
import sys

import numpy as np
from PIL import Image

RAMP_HUE_TOL = 0.06      # how far around the anchor hue counts as the same material
RAMP_SAT_TOL = 0.22
ACHROMATIC = 0.12        # below this saturation a colour has no meaningful hue


def _hsv(c):
    return colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)


def _rgb(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (round(r * 255), round(g * 255), round(b * 255))


def palette(arr, alpha_min=200):
    """Distinct opaque colours, most common first."""
    px = arr[arr[..., 3] >= alpha_min][:, :3]
    if not len(px):
        return []
    cols, counts = np.unique(px, axis=0, return_counts=True)
    order = np.argsort(-counts)
    return [(tuple(int(v) for v in cols[i]), int(counts[i])) for i in order]


def build_ramp_map(pal, src, dst):
    """Map an entire ramp from a single anchor pair.

    Every colour that belongs to the same material as `src` is shifted by the
    same hue/saturation transform, and KEEPS ITS OWN VALUE. Preserving value per
    step is what keeps the shading intact — remapping every step to the target's
    value is exactly how a recolour goes flat.
    """
    sh, ss, sv = _hsv(src)
    dh, ds, dv = _hsv(dst)
    src_grey = ss < ACHROMATIC

    mapping = {}
    for col, _ in pal:
        h, s, v = _hsv(col)
        if src_grey:
            # A grey ramp has no hue to match on, so membership is "also grey",
            # and the target saturation scales with how light the step is —
            # highlights stay paler, shadows take more colour.
            member = s < ACHROMATIC
            new_s = ds * (0.55 + 0.45 * (1 - v))
        else:
            hue_gap = min(abs(h - sh), 1 - abs(h - sh))
            member = hue_gap <= RAMP_HUE_TOL and abs(s - ss) <= RAMP_SAT_TOL
            new_s = min(1.0, s * (ds / ss)) if ss else ds
        if not member:
            continue
        mapping[col] = _rgb(dh, new_s, v)
    # The anchor is always mapped exactly as asked, whatever the ramp maths says.
    mapping[tuple(src)] = tuple(dst)
    return mapping


def sprite_bbox(arr, alpha_min=200):
    m = arr[..., 3] >= alpha_min
    rows = np.where(m.any(1))[0]
    cols = np.where(m.any(0))[0]
    if not len(rows) or not len(cols):
        return None
    return cols.min(), rows.min(), cols.max() + 1, rows.max() + 1


def region_mask(arr, region):
    """Fractional region against the sprite's own bounds, not the canvas."""
    if region is None:
        return np.ones(arr.shape[:2], bool)
    bb = sprite_bbox(arr)
    if bb is None:
        return np.zeros(arr.shape[:2], bool)
    x0, y0, x1, y1 = bb
    w, h = x1 - x0, y1 - y0
    fx0, fy0, fx1, fy1 = region
    m = np.zeros(arr.shape[:2], bool)
    m[
        int(y0 + fy0 * h):int(y0 + fy1 * h),
        int(x0 + fx0 * w):int(x0 + fx1 * w),
    ] = True
    return m


def recolor(path, out_path, pairs, use_ramp, region, dry):
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).copy()
    before = palette(arr)

    mapping = {}
    for src, dst in pairs:
        if use_ramp:
            mapping.update(build_ramp_map(before, src, dst))
        else:
            mapping[tuple(src)] = tuple(dst)

    rmask = region_mask(arr, region)
    changed = 0
    for src, dst in mapping.items():
        # EXACT match, no tolerance. Fuzzy matching eats the black outline, and
        # the outline is what makes it read as pixel art.
        m = (
            rmask
            & (arr[..., 0] == src[0])
            & (arr[..., 1] == src[1])
            & (arr[..., 2] == src[2])
        )
        n = int(m.sum())
        if not n:
            continue
        arr[m, 0], arr[m, 1], arr[m, 2] = dst
        changed += n

    after = palette(arr)
    name = os.path.basename(path)
    print(
        f"{name:34s} {changed:5d} px  colours {len(before)} -> {len(after)}"
        + ("  (dry run)" if dry else "")
    )
    if not dry:
        Image.fromarray(arr).save(out_path)
    return changed, len(before), len(after)


def parse_rgb(s):
    parts = [int(p) for p in s.split(",")]
    if len(parts) != 3:
        raise ValueError(f"expected R,G,B — got {s!r}")
    return tuple(parts)


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)

    src_path, dst_path = argv[0], argv[1]
    froms, tos, region, use_ramp, dry = [], [], None, False, False
    i = 2
    while i < len(argv):
        a = argv[i]
        if a == "--from":
            froms.append(parse_rgb(argv[i + 1])); i += 2
        elif a == "--to":
            tos.append(parse_rgb(argv[i + 1])); i += 2
        elif a == "--region":
            region = tuple(float(v) for v in argv[i + 1].split(",")); i += 2
        elif a == "--ramp":
            use_ramp = True; i += 1
        elif a == "--dry-run":
            dry = True; i += 1
        else:
            sys.exit(f"unknown option {a}")

    if len(froms) != len(tos) or not froms:
        sys.exit("need matching --from and --to pairs")
    pairs = list(zip(froms, tos))

    if os.path.isdir(src_path):
        # One identical map across every frame. This is the entire point: an AI
        # edit run per frame drifts, a lookup table cannot.
        if not dry:
            os.makedirs(dst_path, exist_ok=True)
        files = sorted(f for f in os.listdir(src_path) if f.lower().endswith(".png"))
        total = 0
        for f in files:
            n, _, _ = recolor(
                os.path.join(src_path, f), os.path.join(dst_path, f),
                pairs, use_ramp, region, dry,
            )
            total += n
        print(f"\n{len(files)} frame(s), {total} px changed, one identical map")
    else:
        recolor(src_path, dst_path, pairs, use_ramp, region, dry)


if __name__ == "__main__":
    main()
