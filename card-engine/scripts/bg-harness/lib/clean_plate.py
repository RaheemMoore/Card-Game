#!/usr/bin/env python3
"""Two repairs that are exact, and therefore beat re-generating.

Raheem, 2026-08-09, picking his castle extracts: "G5 - remove the floating
runes" and "V3 - need to fix the gap in the tan wall railing." Both are surgical
fixes on art that is otherwise approved. Re-rolling either would change
everything else on the plate and cost a generation to do worse.

  --drop-floaters   Removes non-white blobs that are disconnected from the main
                    subject and smaller than --min-blob. Floating runes, sparks
                    and stray glyphs sit on white with a clean gap, so they are
                    their own connected components and come off exactly. Prints
                    every blob it finds with its size before deciding, so the
                    threshold is chosen from the data rather than guessed.

  --clone-band      Copies a source row band over a destination band. For a
                    tileable strip whose pattern has a known period, aligning
                    the copy to a whole number of periods makes the repair
                    invisible: the crenels land where the eye already expects
                    them. Hard copy, no blending — blending a pixel plate just
                    smears it.

    python lib/clean_plate.py in.png out.png --drop-floaters --min-blob 4000
    python lib/clean_plate.py in.png out.png --clone-band 148 368 400
"""
import argparse

import numpy as np
from PIL import Image


def components(mask):
    """Label 4-connected components without scipy. Returns (labels, sizes)."""
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    parent = [0]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    nxt = 1
    for y in range(h):
        row, prev = mask[y], mask[y - 1] if y else None
        for x in range(w):
            if not row[x]:
                continue
            up = labels[y - 1, x] if y and prev[x] else 0
            left = labels[y, x - 1] if x and row[x - 1] else 0
            if up and left:
                labels[y, x] = min(up, left)
                union(up, left)
            elif up or left:
                labels[y, x] = up or left
            else:
                labels[y, x] = nxt
                parent.append(nxt)
                nxt += 1
    for y in range(h):
        for x in range(w):
            if labels[y, x]:
                labels[y, x] = find(labels[y, x])
    sizes = np.bincount(labels.ravel())
    return labels, sizes


def drop_floaters(im, min_blob, white=245):
    a = np.asarray(im.convert("RGB")).astype(int)
    mask = a.min(2) < white
    labels, sizes = components(mask)
    keep_ids = [i for i in range(1, len(sizes)) if sizes[i] >= min_blob]
    dropped = [(i, int(sizes[i])) for i in range(1, len(sizes)) if 0 < sizes[i] < min_blob]
    print(f"  {len(sizes) - 1} blobs; keeping {len(keep_ids)} >= {min_blob}px")
    for i, s in sorted(dropped, key=lambda t: -t[1])[:12]:
        ys, xs = np.where(labels == i)
        print(f"    dropped {s:6d}px at x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()}")
    if len(dropped) > 12:
        print(f"    ... and {len(dropped) - 12} smaller")
    out = a.copy()
    kill = mask & ~np.isin(labels, keep_ids)
    out[kill] = 255
    return Image.fromarray(out.astype(np.uint8))


def clone_band(im, sy0, sy1, dy0, x0=None, x1=None):
    a = np.asarray(im.convert("RGB")).copy()
    n = sy1 - sy0
    x0 = 0 if x0 is None else x0
    x1 = a.shape[1] if x1 is None else x1
    a[dy0:dy0 + n, x0:x1] = a[sy0:sy1, x0:x1]
    print(f"  cloned rows {sy0}-{sy1} -> {dy0}-{dy0 + n}, columns {x0}-{x1}")
    return Image.fromarray(a)


def clear_rect(im, x0, y0, x1, y1):
    """Flatten a region to pure white.

    Needed because --drop-floaters only removes what it can SEE: pixels paler
    than the white cutoff are treated as background and left alone, so a very
    pale glyph survives. Raising the cutoff does not help — at 253 the JPEG
    noise in the background bridges every floater into the main component and
    nothing gets dropped at all. So the pale remnants get cleared by region,
    which is exact and cannot touch the architecture.
    """
    a = np.asarray(im.convert("RGB")).copy()
    a[y0:y1, x0:x1] = 255
    print(f"  cleared x{x0}-{x1} y{y0}-{y1} to white")
    return Image.fromarray(a)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--drop-floaters", action="store_true")
    ap.add_argument("--min-blob", type=int, default=4000)
    # Pale glyphs (lavender, cyan) sit only a few levels below pure white, so a
    # 245 cutoff misses them entirely. Raising it also picks up JPEG noise in
    # the background, but that noise is tiny and gets dropped by --min-blob
    # anyway, so the higher threshold is safe on a white-background plate.
    ap.add_argument("--white", type=int, default=245,
                    help="pixels with min channel >= this count as background (default 245)")
    ap.add_argument("--clone-band", nargs=3, type=int, metavar=("SY0", "SY1", "DY0"))
    ap.add_argument("--cols", nargs=2, type=int, metavar=("X0", "X1"))
    ap.add_argument("--clear-rect", nargs=4, type=int, action="append", metavar=("X0", "Y0", "X1", "Y1"),
                    help="flatten a region to white; repeatable")
    a = ap.parse_args()

    im = Image.open(a.src)
    print(a.src)
    if a.drop_floaters:
        im = drop_floaters(im, a.min_blob, a.white)
    for r in (a.clear_rect or []):
        im = clear_rect(im, *r)
    if a.clone_band:
        sy0, sy1, dy0 = a.clone_band
        im = clone_band(im, sy0, sy1, dy0, *(a.cols or (None, None)))
    im.save(a.dst)
    print(f"  -> {a.dst}")


if __name__ == "__main__":
    main()
