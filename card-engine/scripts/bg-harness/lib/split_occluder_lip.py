#!/usr/bin/env python3
"""Split the raised NORTH lip off a sunken ground feature, as an occluder overlay.

The problem this solves is a depth lie. A pond, crater or quarry has no vertical
relief across most of its area, so it belongs on the ground layer where
sceneDepth.ts keeps it out of the y-sort band entirely — otherwise, in that
file's own words, "a pebble decal sorted into the band would draw over the hero's
head". But a feature with a raised rocky lip along its north edge DOES have
relief there, and that lip is usually the whole reason the art was chosen. Baked
into the ground decal, the hero walks straight over the top of it and the depth
the art was bought for disappears at runtime.

So the lip is emitted a SECOND time as its own sprite, which the scene sorts
normally at its base. Nothing is removed from the base plate:

  * the overlay is an exact pixel duplicate of what is already underneath it, so
    wherever the hero is not behind it, it is invisible — which means the cut
    edges never need to be clean, and there is no seam to solve;
  * if the overlay ever fails to load, the art is still complete and correct;
  * the base plate stays a single self-contained asset for anyone who does not
    care about occlusion.

The lip is cut at the WATERLINE, found per column rather than as one straight
row, because the boundary between rock and water is irregular and a level cut
would slice through the rock face on some columns and leave a band of water
stranded on the overlay on others.

Both files are written on the SAME canvas as the input, so the overlay is placed
at the identical position as the base with no offset arithmetic. That is
deliberate: a stored x/y offset is one more thing to get wrong in the Editor, and
the wasted transparent pixels cost nothing.

    python lib/split_occluder_lip.py <feature.png> <lip-out.png>
           [--overlap 2] [--max-depth 90] [--report]
"""
import argparse

from PIL import Image


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--overlap", type=int, default=2,
                    help="rows to carry PAST the waterline, so the lip's foot is never a hairline")
    ap.add_argument("--max-depth", type=int, default=90,
                    help="ignore columns whose waterline sits below this; they are side bank, not north lip")
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()

    im = Image.open(a.src).convert("RGBA")
    w, h = im.size
    p = im.load()

    def is_water(c):
        r, g, b, al = c
        return al > 127 and b > r + 20 and g > r + 10

    # Per-column waterline. None where the column never reaches water inside the
    # allowed depth — that is side bank, and taking it would drag the whole left
    # and right rim onto the overlay.
    line = []
    for x in range(w):
        y0 = None
        for y in range(h):
            if is_water(p[x, y]):
                y0 = y
                break
        line.append(y0 if (y0 is not None and y0 <= a.max_depth) else None)

    valid = [x for x, y in enumerate(line) if y is not None]
    if not valid:
        raise SystemExit("no north waterline found — check --max-depth")
    lo, hi = valid[0], valid[-1]

    # Bridge gaps inside the span from the nearest valid neighbour, so a few
    # ragged columns cannot punch holes through the lip.
    for x in range(lo, hi + 1):
        if line[x] is None:
            left = next((line[i] for i in range(x, lo - 1, -1) if line[i] is not None), None)
            right = next((line[i] for i in range(x, hi + 1) if line[i] is not None), None)
            line[x] = max(v for v in (left, right) if v is not None)

    lip = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    lp = lip.load()
    kept = 0
    for x in range(lo, hi + 1):
        for y in range(0, min(h, line[x] + a.overlap)):
            if p[x, y][3] > 127:
                lp[x, y] = p[x, y]
                kept += 1
    lip.save(a.dst)

    print(f"{a.src} -> {a.dst}  same canvas {w}x{h}, no offset")
    if a.report:
        ys = [line[x] for x in range(lo, hi + 1)]
        print(f"   lip spans x {lo}..{hi}, waterline y {min(ys)}..{max(ys)} (median {sorted(ys)[len(ys) // 2]})")
        print(f"   {kept} px on the overlay ({100 * kept / (w * h):.0f}% of canvas)")
        print(f"   sort the overlay at its BASE row (y={max(ys) + a.overlap}), the base plate on the ground layer")


if __name__ == "__main__":
    main()
