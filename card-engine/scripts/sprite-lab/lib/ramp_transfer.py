#!/usr/bin/env python3
"""
Force one sprite to use ANOTHER sprite's palette, by luminance rank.

THE BUG THIS EXISTS TO KILL. Matching two pieces of art by their *average*
colour, or by snapping each pixel to its nearest neighbour in a reference
palette, both pass a numeric check while looking completely wrong. Measured on
the castle cliff kit, 2026-08-06:

    rock face   stone R-B  +20.4   (warm yellow sandstone)
    mossy face  stone R-B   -5.5   (cool grey)
    after nearest-colour snap      -> "0 colours not in the reference"
                                      and it still looked cold and white

Nearest-neighbour *preserves hue* — a grey pixel finds the reference's grey and
stays grey. That is the opposite of what a palette match is for. Raheem, looking
at the result: "the greens might be the same, but the rocks are different
colours. One is yellow, and the other one's rocks are more white."

WHAT THIS DOES INSTEAD. Rank both pixel sets by luminance and map rank to rank,
so the source's darkest pixel takes the reference's darkest colour and its
brightest takes the reference's brightest. Every pixel inherits the reference's
HUE AT THAT BRIGHTNESS, which is where the yellow actually lives. The output
palette ends up identical to the reference's, colour for colour and percentage
for percentage.

STONE AND FOLIAGE ARE MAPPED SEPARATELY. Run as one pass, moss maps onto rock
and the plants turn to stone. The split is a simple green test, which is crude
but held up across six assets.

Structure is untouched — only colour is reassigned — so this stays disciplined
pixel art rather than becoming a gradient. It is deterministic and reversible:
same inputs, same output, forever.

ALWAYS SHOW THE PALETTE. --strip writes a bar of the output's colours weighted
by area. A colour claim without the bar attached is how three rounds got burned
arguing about averages.

Usage:
  ramp_transfer.py <reference.png> <in.png> <out.png> [--strip bar.png]
"""
import sys
import numpy as np
from PIL import Image


def _green(rgb: np.ndarray) -> np.ndarray:
    """Crude foliage test: clearly greener than both other channels."""
    return (rgb[..., 1] > rgb[..., 0] + 12) & (rgb[..., 1] > rgb[..., 2] + 12)


def _lum(x: np.ndarray) -> np.ndarray:
    return 0.299 * x[:, 0] + 0.587 * x[:, 1] + 0.114 * x[:, 2]


def transfer(ref_path: str, src_path: str, out_path: str) -> Image.Image:
    ref = np.asarray(Image.open(ref_path).convert("RGBA")).astype(int)
    src = np.asarray(Image.open(src_path).convert("RGBA")).astype(int).copy()
    ro, so = ref[..., 3] > 128, src[..., 3] > 128

    for rmask, smask in (
        ((~_green(ref[..., :3])) & ro, (~_green(src[..., :3])) & so),
        (_green(ref[..., :3]) & ro, _green(src[..., :3]) & so),
    ):
        pool = ref[..., :3][rmask]
        if len(pool) == 0:
            continue
        pool = pool[np.argsort(_lum(pool.astype(float)))]  # dark -> light
        px = src[..., :3][smask]
        if len(px) == 0:
            continue
        rank = np.argsort(np.argsort(_lum(px.astype(float))))
        idx = (rank * (len(pool) - 1) // max(len(rank) - 1, 1)).astype(int)
        src[..., :3][smask] = pool[idx]

    img = Image.fromarray(src.astype(np.uint8))
    img.save(out_path)
    return img


def strip(png_path: str, out_path: str, width: int = 520, height: int = 34, top: int = 14) -> None:
    """A bar of the image's colours, each segment sized by how much area it covers."""
    from collections import Counter
    from PIL import ImageDraw

    a = np.asarray(Image.open(png_path).convert("RGBA")).astype(int)
    px = [tuple(c) for c in a[..., :3][a[..., 3] > 128]]
    common = Counter(px).most_common(top)
    total = sum(n for _, n in common) or 1
    im = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 0
    for colour, n in common:
        w = max(2, int(width * n / total))
        d.rectangle([x, 0, x + w, height], fill=tuple(int(v) for v in colour) + (255,))
        x += w
    im.save(out_path)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 3:
        print(__doc__)
        raise SystemExit(1)
    ref, src, dst = args[0], args[1], args[2]
    transfer(ref, src, dst)
    a = np.asarray(Image.open(dst).convert("RGBA")).astype(int)
    r = np.asarray(Image.open(ref).convert("RGBA")).astype(int)
    rp = {tuple(p[:3]) for p in r.reshape(-1, 4) if p[3] > 128}
    mp = {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3] > 128}
    stone = a[..., :3][(~_green(a[..., :3])) & (a[..., 3] > 128)]
    warm = (stone[:, 0] - stone[:, 2]).mean() if len(stone) else 0
    print(f"{dst}  palette {len(mp)}  outside-reference {len(mp - rp)}  stone R-B {warm:+.1f}")
    if "--strip" in sys.argv:
        i = sys.argv.index("--strip")
        strip(dst, sys.argv[i + 1])
