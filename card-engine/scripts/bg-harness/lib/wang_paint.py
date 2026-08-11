#!/usr/bin/env python3
"""Paint a corner-Wang tileset over a region, and show how it indexes.

WHAT A CORNER-WANG SET ACTUALLY IS, because this is the bit that is unintuitive.

You do not choose a tile for a cell. You colour the CORNERS — the grid vertices —
and every cell then looks at its own four corners and picks the one tile that
matches. Four corners, two terrains, so sixteen possible tiles. That is the whole
set, and it is why sixteen tiles can draw any shape you paint: bays, peninsulas,
isthmuses, holes. There is no "corner piece" or "end cap" to place, and no shape
you can draw that the set does not already cover.

A cell's corners are the vertices at (x,y), (x+1,y), (x,y+1), (x+1,y+1) — so a
region defined on an N x M vertex grid renders as (N-1) x (M-1) cells.

THE INDEX IS MEASURED, NOT ASSUMED. The tile filenames carry an r/c that turns
out to be a sparse irregular layout, useless as an index. So each tile's identity
is read from its own pixels: sample its four corners, decide which terrain each
one is, and that 4-bit signature IS the tile's address. wang_autotile.py does the
same thing for the ground sets and re-verifies on every run, for the same reason
— a silently wrong bit order produces a map that is wrong everywhere at once and
merely looks "noisy".

    python lib/wang_paint.py <tileset-dir> <map.txt> <out.png> [--tile 32]

map.txt marks VERTICES, '#' upper terrain and '.' lower:

    ..........
    ..####....
    ..####....
    ..........
"""
import argparse
import glob
import os

import numpy as np
from PIL import Image

CORNERS = ["NW", "NE", "SW", "SE"]


def corner_samples(a, k=2):
    return [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]


def build_index(tile_dir, k=2):
    """signature -> [tiles]. Signature is (NW,NE,SW,SE) with True = upper."""
    files = sorted(f for f in glob.glob(os.path.join(tile_dir, "*.png"))
                   if not os.path.basename(f).startswith("_"))
    arrays = [(f, np.asarray(Image.open(f).convert("RGB")).astype(int)) for f in files]

    # The two terrain colours are learned from the SET, not hard-coded: take the
    # two most common corner colours across every tile. A pure-lower tile and a
    # pure-upper tile always exist in a complete set, so those two dominate.
    allc = []
    for _, a in arrays:
        allc += [tuple(int(v) for v in c.mean(axis=(0, 1))) for c in corner_samples(a, k)]
    uniq = {}
    for c in allc:
        key = tuple(v // 12 for v in c)
        uniq.setdefault(key, []).append(c)
    top = sorted(uniq.values(), key=len, reverse=True)[:2]
    term = [tuple(int(np.mean([x[i] for x in g])) for i in range(3)) for g in top]
    # Order them: lower terrain is the brighter one (sand over plateau here).
    term.sort(key=lambda c: -sum(c))
    lower, upper = term[0], term[1]

    index = {}
    for f, a in arrays:
        sig = []
        for c in corner_samples(a, k):
            m = c.mean(axis=(0, 1))
            dl = sum((m[i] - lower[i]) ** 2 for i in range(3))
            du = sum((m[i] - upper[i]) ** 2 for i in range(3))
            sig.append(du < dl)
        index.setdefault(tuple(sig), []).append(Image.open(f).convert("RGBA"))
    return index, lower, upper


def paint(index, verts, tile=32):
    h = len(verts) - 1
    w = max(len(r) for r in verts) - 1
    up = lambda x, y: (0 <= y < len(verts) and 0 <= x < len(verts[y]) and verts[y][x] == "#")  # noqa: E731

    canvas = Image.new("RGBA", (w * tile, h * tile), (0, 0, 0, 0))
    missing = set()
    for y in range(h):
        for x in range(w):
            sig = (up(x, y), up(x + 1, y), up(x, y + 1), up(x + 1, y + 1))
            opts = index.get(sig)
            if not opts:
                # The two diagonal signatures — plateaus touching at a single
                # corner point — are commonly absent from a generated set because
                # they are genuinely ambiguous art. Fall back to the nearest
                # signature by Hamming distance so the map still renders and the
                # gap is reported rather than punched as a hole.
                missing.add(sig)
                best = min(index, key=lambda s2: sum(p != q for p, q in zip(s2, sig)))
                opts = index[best]
            # Deterministic variant choice: same cell always picks the same tile,
            # so a map renders identically every run.
            im = opts[(x * 7 + y * 13) % len(opts)]
            canvas.alpha_composite(im, (x * tile, y * tile))
    return canvas, missing


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tiles")
    ap.add_argument("map")
    ap.add_argument("out")
    ap.add_argument("--tile", type=int, default=32)
    ap.add_argument("--k", type=int, default=2,
                    help="corner sample size. Measured: k<=4 resolves 14/16 signatures, k=6 only 10 "
                         "and k=8 only 8, because a bigger sample slides off pure terrain onto the "
                         "dark rock boundary and reads it as plateau.")
    a = ap.parse_args()

    index, lower, upper = build_index(a.tiles, a.k)
    print(f"terrains learned from the set: lower {lower}  upper {upper}")
    print(f"{len(index)}/16 corner signatures covered")
    for sig in [(a_, b_, c_, d_) for a_ in (0, 1) for b_ in (0, 1) for c_ in (0, 1) for d_ in (0, 1)]:
        s = tuple(bool(v) for v in sig)
        mark = f"{len(index[s])} tile(s)" if s in index else "MISSING"
        print(f"   NW{int(s[0])} NE{int(s[1])} SW{int(s[2])} SE{int(s[3])}  {mark}")

    verts = [l.rstrip("\n") for l in open(a.map, encoding="utf-8") if l.strip()]
    im, missing = paint(index, verts, a.tile)
    if missing:
        print(f"\n{len(missing)} signature(s) needed by this map but absent from the set")
    im.save(a.out)
    print(f"\n{len(verts[0]) - 1}x{len(verts) - 1} cells -> {im.width}x{im.height}  {a.out}")


if __name__ == "__main__":
    main()
