#!/usr/bin/env python3
"""Force a set of pieces onto ONE palette — the step that makes a kit a kit.

Two things come out of this and only this:

1. FLATNESS. CLAUDE.md is explicit that the quantize, not the redraw, is "what
   lands on the kit's flatness". Straight out of /image-to-pixelart the castle
   pieces measured 12-25% flat with 6,000-42,000 colours — antialiased, not yet
   pixel art. The shipped kit sits at 59% / 48 colours.

2. EXACT PALETTE SHARING. Harmonising materials gets pieces close; this makes
   them identical. Afterwards every piece is drawable from the same 48 entries,
   which is what stops a wall and the tower beside it being subtly different
   greys forever.

EQUAL SAMPLING IS THE WHOLE TRICK. Median cut allocates palette entries by area,
so pooling the raw pixels lets the biggest piece write the palette: the wall is
5x the tower's pixel count and would spend the budget on pale stone, collapsing
the tower's copper into two or three muddy steps. Sampling the SAME number of
pixels from each piece gives every piece an equal vote regardless of size.

    python lib/quantize_shared.py a.png b.png ... --out DIR [--colors 48]
                                  [--palette-png p.png]

Transparency is preserved: alpha is carried through untouched and transparent
pixels are excluded from the palette vote, so a cutout does not spend entries on
whatever is hiding underneath it.
"""
import argparse
import os

import numpy as np
from PIL import Image


def sample(path, n):
    """Take n opaque pixels from a piece, evenly spread, for the palette vote."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    rgb = a[:, :, :3].reshape(-1, 3)
    alpha = a[:, :, 3].reshape(-1)
    live = rgb[alpha > 128]
    if len(live) == 0:
        return np.zeros((0, 3), np.uint8)
    idx = np.linspace(0, len(live) - 1, min(n, len(live))).astype(int)
    return live[idx]


def build_palette(paths, colors, per_piece):
    pool = np.concatenate([sample(p, per_piece) for p in paths])
    side = int(np.ceil(np.sqrt(len(pool))))
    canvas = np.zeros((side * side, 3), np.uint8)
    canvas[: len(pool)] = pool
    canvas[len(pool):] = pool[-1] if len(pool) else 0
    img = Image.fromarray(canvas.reshape(side, side, 3), "RGB")
    pal_img = img.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(pal_img.getpalette()[: colors * 3], dtype=np.uint8).reshape(-1, 3)
    return pal_img, pal


def apply_palette(path, pal_img, out_dir):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    rgb = Image.fromarray(a[:, :, :3], "RGB")
    # dither=NONE is not optional. Dithering scatters two palette entries to fake
    # a third, which is the exact opposite of flatness: it would drive the
    # neighbour-equality score down while appearing to reduce colour count.
    q = rgb.quantize(palette=pal_img, dither=Image.Dither.NONE).convert("RGB")
    out = np.dstack([np.asarray(q), a[:, :, 3]])
    os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, os.path.basename(path))
    Image.fromarray(out, "RGBA").save(dst)
    return dst


def flatness(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    h = (a[:, 1:] == a[:, :-1]).all(2).mean()
    v = (a[1:, :] == a[:-1, :]).all(2).mean()
    return (h + v) / 2 * 100, len(np.unique(a.reshape(-1, 3), axis=0))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--colors", type=int, default=48)
    ap.add_argument("--per-piece", type=int, default=40000,
                    help="pixels sampled from EACH piece, so size does not buy palette share")
    ap.add_argument("--palette-png", help="also write the palette as a swatch strip")
    a = ap.parse_args()

    pal_img, pal = build_palette(a.files, a.colors, a.per_piece)
    print(f"palette: {len(pal)} colours, {a.per_piece:,} px sampled from each of {len(a.files)} pieces\n")
    print(f"{'piece':22s} {'flat before':>12} {'colours':>9}   {'flat after':>11} {'colours':>9}")
    for f in a.files:
        f0, c0 = flatness(f)
        dst = apply_palette(f, pal_img, a.out)
        f1, c1 = flatness(dst)
        print(f"{os.path.basename(f):22s} {f0:11.1f}% {c0:9,d}   {f1:10.1f}% {c1:9,d}")

    if a.palette_png:
        sw = 24
        strip = Image.new("RGB", (sw * len(pal), sw * 2))
        for i, c in enumerate(pal):
            strip.paste(tuple(int(x) for x in c), (i * sw, 0, (i + 1) * sw, sw * 2))
        strip.save(a.palette_png)
        print(f"\npalette strip -> {a.palette_png}")


if __name__ == "__main__":
    main()
