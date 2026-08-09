#!/usr/bin/env python3
"""Key the white surround off a PixelLab redraw, working around its frame border.

sprite-lab/lib/cut_flat_background.py is the right tool in general — flood from
the frame edge, never a global threshold, so enclosed light pixels survive. It
fails on /image-to-pixelart output for one specific reason: PixelLab draws a
dark rim into the outermost pixels of its own frame, so the "most common border
colour" vote returns near-black instead of white and the flood starts on the rim
and stops there. On the castle kit that cut 640px of a 68,000px plate and left
the entire white surround in place.

So: shave the rim first, then flood explicitly on WHITE rather than on whatever
happens to be most common at the edge. Still a flood from the border, never a
global threshold — a global threshold would punch holes in the pale stone
highlights and the cream parapet, which is most of this artwork.

    python lib/key_white.py <in.png|dir> <out.png|dir> [--shave 1] [--white 232]
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw


def key(path, dst, shave=1, white=232):
    im = Image.open(path).convert("RGBA")
    if shave:
        im = im.crop((shave, shave, im.width - shave, im.height - shave))
    a = np.asarray(im).copy()

    near_white = (a[:, :, :3].min(2) >= white).astype(np.uint8) * 255
    m = Image.fromarray(near_white, "L").copy()   # .copy(): fromarray shares a
                                                  # read-only buffer and floodfill
                                                  # silently no-ops on it
    h, w = near_white.shape
    seeds = ([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] +
             [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
    for s in seeds:
        if m.getpixel(s) == 255:
            ImageDraw.floodfill(m, s, 128, thresh=0)
    bg = np.asarray(m) == 128
    a[:, :, 3][bg] = 0

    out = Image.fromarray(a, "RGBA")
    box = out.getbbox()
    if box:
        out = out.crop(box)
    out.save(dst)
    return out.size, int(bg.sum())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--shave", type=int, default=1, help="pixels of PixelLab frame rim to remove first")
    ap.add_argument("--white", type=int, default=232, help="min channel value counted as white")
    a = ap.parse_args()

    if os.path.isdir(a.src):
        os.makedirs(a.dst, exist_ok=True)
        files = [f for f in sorted(os.listdir(a.src)) if f.endswith(".png") and not f.startswith("_")]
    else:
        files = [os.path.basename(a.src)]
        a.src = os.path.dirname(a.src) or "."
        if not os.path.isdir(a.dst):
            os.makedirs(os.path.dirname(a.dst) or ".", exist_ok=True)

    for f in files:
        s = os.path.join(a.src, f)
        d = os.path.join(a.dst, f) if os.path.isdir(a.dst) else a.dst
        size, cut = key(s, d, a.shave, a.white)
        print(f"  {f:20s} keyed {cut:7,d} px  ->  {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
