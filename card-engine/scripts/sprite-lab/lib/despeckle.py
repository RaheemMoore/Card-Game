#!/usr/bin/env python3
"""
Erase detached junk from a sprite's transparent area, without moving anything.

Two defects, one cause. Both were spotted by Raheem in the castle on 2026-08-07:

  1. A dotted grey grid alongside the side walls. That is the EDITOR'S TRANSPARENCY
     CHECKERBOARD, captured into the PNG — 10,028 pixels of it on wall-side, in
     exactly three shades of grey.
  2. Black speckles floating around the watch tower, not touching it. 1,183 pixels
     in four shades of near-black.

Both are pixels that are (a) not connected to the sprite and (b) a tiny handful of
flat colours. Real art is neither.

CANVAS SIZE IS NEVER CHANGED. Raheem: "if we could just remove those and leave them
exactly where they are." Every piece is already placed against the castle datum, so
a crop — even a one-pixel one — would shift it. This only ever writes transparent
over junk; width, height and every remaining pixel's coordinates are untouched.

WHY DETACHMENT AND NOT COLOUR. Deleting "all pixels near black" would eat the
sprite's own outline, which is the same near-black. Deleting "all light grey" would
eat the pale mortar. Connectivity is what actually distinguishes them: the outline
touches the tower, the speckles do not.

TWO PASSES, BECAUSE DETACHMENT IS NOT ENOUGH. On wall-side the first pass took
10,028 px and Raheem reported it "not enough of them" — 7,246 checkerboard pixels
remained because those squares happened to TOUCH the wall's edge, so they were part
of the main island. They are still background: proved by the fact that not one of
them is surrounded by art, and that removing every one leaves the wall as a single
connected piece with nothing orphaned.

So a second pass removes exact colours, and it refuses to run unless both of those
things hold. That guard is the whole safety argument — "delete all light grey" would
otherwise eat pale mortar on some other sprite.

Usage:
  despeckle.py <png> [--max-frac 0.02] [--colour R,G,B ...] [--dry-run] [--out FILE]

  --max-frac   an island smaller than this fraction of the main body is junk.
               Default 2%. Raise it only after looking at --dry-run output.
  --colour     exact RGB to treat as background. Repeatable. Refused if any such
               pixel sits inside the sprite, or if removal would orphan art.
"""
import argparse
import os
import shutil
import sys
from collections import deque

import numpy as np
from PIL import Image

ALPHA_SOLID = 128


def components(mask: np.ndarray):
    """4-connected islands of solid pixels."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            pix = []
            while q:
                y, x = q.popleft()
                pix.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            out.append(pix)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("png")
    ap.add_argument("--max-frac", type=float, default=0.02)
    ap.add_argument("--colour", action="append", default=[],
                    help="exact R,G,B to erase wherever it appears in the background")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out")
    a = ap.parse_args()

    img = Image.open(a.png).convert("RGBA")
    arr = np.array(img)
    comps = components(arr[:, :, 3] > ALPHA_SOLID)
    if not comps:
        print("nothing solid in this image")
        return
    comps.sort(key=len, reverse=True)
    main_size = len(comps[0])
    junk = [c for c in comps[1:] if len(c) < main_size * a.max_frac]
    keep = [c for c in comps[1:] if len(c) >= main_size * a.max_frac]

    total = sum(len(c) for c in junk)
    colours = {tuple(arr[y, x, :3]) for c in junk for y, x in c}
    print(f"{os.path.basename(a.png)}  {img.width}x{img.height}")
    print(f"  main body      {main_size} px")
    print(f"  detached junk  {len(junk)} islands, {total} px, {len(colours)} distinct colours")
    if keep:
        # Loud on purpose: a large detached piece is more likely a flag, a banner or
        # a floating detail than junk, and deleting one silently would be a bad day.
        print(f"  KEPT {len(keep)} detached island(s) over the threshold: "
              f"{[len(c) for c in keep]} px — check these are meant to be separate")
    if not junk and not a.colour:
        return
    if junk and len(colours) > 12:
        print(f"  WARNING: {len(colours)} colours is a lot for junk. Look before writing.")

    colour_hits = np.zeros(arr.shape[:2], bool)
    if a.colour:
        wanted = [tuple(int(v) for v in c.split(",")) for c in a.colour]
        solid = arr[:, :, 3] > ALPHA_SOLID
        for r, g, b in wanted:
            colour_hits |= (
                (arr[:, :, 0] == r) & (arr[:, :, 1] == g) & (arr[:, :, 2] == b) & solid
            )
        art = solid & ~colour_hits
        h, w = colour_hits.shape

        # Guard 1: nothing being erased may sit INSIDE the sprite.
        inside = 0
        for y, x in zip(*np.where(colour_hits)):
            if all(
                art[y + dy, x + dx]
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
                if 0 <= y + dy < h and 0 <= x + dx < w
            ) and all(
                0 <= y + dy < h and 0 <= x + dx < w
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
            ):
                inside += 1

        # Guard 2: the sprite must survive as ONE piece.
        remaining = components(art)
        orphans = [len(c) for c in sorted(remaining, key=len, reverse=True)[1:]]

        print(f"  colour pass    {int(colour_hits.sum())} px across {len(wanted)} colour(s)")
        print(f"                 inside-sprite: {inside}   orphaned-after: {orphans[:6] or 'none'}")
        if inside or orphans:
            print("  REFUSED: those colours are part of the art, not the background.",
                  file=sys.stderr)
            sys.exit(1)

    if a.dry_run:
        print("  (dry run — nothing written)")
        return

    for c in junk:
        for y, x in c:
            arr[y, x] = (0, 0, 0, 0)
    arr[colour_hits] = (0, 0, 0, 0)

    dst = a.out or a.png
    if dst == a.png and not os.path.exists(a.png + ".orig"):
        shutil.copy2(a.png, a.png + ".orig")
        print(f"  original kept at {os.path.basename(a.png)}.orig")
    out = Image.fromarray(arr, "RGBA")
    assert out.size == img.size, "canvas size changed — that must never happen"
    out.save(dst)
    print(f"  wrote {dst}")


if __name__ == "__main__":
    main()
