#!/usr/bin/env python3
"""Cut a subject out of a painted landscape by keying the grass, not by tracing it.

The castle towers all came back standing in a full scene — grass, trees, a pond,
distant walls, an approach path. A polygon is the wrong tool for these: the
silhouette is railings, pipe runs, banner poles and machicolation brackets, and
tracing it by hand would take an hour and still clip something.

Grass is the one thing in the frame that is reliably green, so key on that and
take the connected component that contains the subject. Trees, walls and the
pond are separate islands and drop away on their own. The path is the only thing
actually joined to the subject, and it is cut with a single row.

    python lib/cut_from_scene.py in.png out-prefix --seed 512 350 --floor 640
                                 [--green 18] [--pad 24] [--scale 2]

Writes <out-prefix>-cut.png (transparent) and <out-prefix>-reference.png
(flattened on white — a transparent surround uploads to Leonardo as black and
drags the palette dark; see building-forge.json).

Flood fill is done with PIL rather than a hand-rolled label pass because this is
a megapixel image and the pure-Python component labeller used elsewhere in this
folder takes the better part of a minute on one.
"""
import argparse

import numpy as np
from PIL import Image, ImageDraw


def cut(path, seed, floor, green=18, pad=24, scale=2, box=None, sever=None):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(int)

    # Grass: green channel clearly ahead of both others. This survives the
    # tower's cast shadow (darker green, same hue) and does not catch the grey
    # stonework, the copper pipework or the pale path.
    g = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2])
    subject = (g < green).astype(np.uint8) * 255
    print(f"  grass keyed: {100 - subject.mean() / 2.55:.0f}% of frame is background")

    # Anything the subject physically touches comes with it. On the tower plates
    # the banner poles reach up and meet the wall arch, so the whole curtain wall
    # arrives as part of the same island. A box around the subject severs those
    # bridges before the fill runs, which is far simpler than trying to detect
    # them.
    if box:
        bx0, by0, bx1, by1 = box
        clip = np.zeros_like(subject)
        clip[by0:by1, bx0:bx1] = subject[by0:by1, bx0:bx1]
        subject = clip
        print(f"  clipped to box x{bx0}-{bx1} y{by0}-{by1}")

    # A box alone is often too blunt: on the tower the crown's top rim and the
    # curtain wall overlap in Y, so any box low enough to sever the wall also
    # slices the crown. --sever zeroes small rectangles instead, cutting the
    # specific bridges while leaving the subject whole.
    for sx0, sy0, sx1, sy1 in (sever or []):
        subject[sy0:sy1, sx0:sx1] = 0
        print(f"  severed x{sx0}-{sx1} y{sy0}-{sy1}")

    # Take only the island containing the seed. Trees, distant walls and the
    # pond are their own islands and disappear without being named.
    # .copy() is load-bearing: Image.fromarray shares the numpy buffer, which is
    # read-only here, and floodfill then silently does nothing and reports an
    # empty island rather than raising.
    m = Image.fromarray(subject, "L").copy()
    if m.getpixel(seed) == 0:
        raise SystemExit(f"seed {seed} landed on grass — pick a point inside the subject")
    ImageDraw.floodfill(m, seed, 128, thresh=0)
    keep = np.asarray(m) == 128
    print(f"  subject island: {keep.sum():,}px of {keep.size:,}")

    # The approach path is the one thing genuinely joined to the subject.
    keep[floor:] = False

    out = np.dstack([a, np.where(keep, 255, 0)]).astype(np.uint8)
    piece = Image.fromarray(out, "RGBA").crop(Image.fromarray(out, "RGBA").getbbox())

    ref = Image.new("RGB", (piece.width + pad * 2, piece.height + pad * 2), (255, 255, 255))
    ref.paste(piece, (pad, pad), piece)
    if scale > 1:
        ref = ref.resize((ref.width * scale, ref.height * scale), Image.NEAREST)
    return piece, ref


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("out_prefix")
    ap.add_argument("--seed", nargs=2, type=int, required=True, metavar=("X", "Y"),
                    help="a point inside the subject")
    ap.add_argument("--floor", type=int, required=True,
                    help="row at which to cut the approach path away")
    ap.add_argument("--green", type=int, default=18, help="how far ahead green must be (default 18)")
    ap.add_argument("--pad", type=int, default=24)
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--box", nargs=4, type=int, metavar=("X0", "Y0", "X1", "Y1"),
                    help="clip the subject mask before filling, to sever anything it touches")
    ap.add_argument("--sever", nargs=4, type=int, action="append", metavar=("X0", "Y0", "X1", "Y1"),
                    help="zero a rectangle of the subject mask; repeatable, for cutting specific bridges")
    a = ap.parse_args()

    print(a.src)
    piece, ref = cut(a.src, tuple(a.seed), a.floor, a.green, a.pad, a.scale, a.box, a.sever)
    piece.save(f"{a.out_prefix}-cut.png")
    ref.save(f"{a.out_prefix}-reference.png")
    print(f"  -> {a.out_prefix}-cut.png        {piece.width}x{piece.height}  transparent")
    print(f"  -> {a.out_prefix}-reference.png  {ref.width}x{ref.height}  flattened on white")


if __name__ == "__main__":
    main()
