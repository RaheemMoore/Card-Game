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


def key(path, dst, shave=1, white=200, fill_enclosed=300, tolerance=14, bleed_pale=200):
    im = Image.open(path).convert("RGBA")
    if shave:
        im = im.crop((shave, shave, im.width - shave, im.height - shave))
    a = np.asarray(im).copy()

    # SELF-CALIBRATING, not a fixed threshold. PixelLab does not return the white
    # it was given: the wall's background came back as warm cream (249,243,221),
    # min channel 221, and a 232 cutoff sailed straight past it. Meanwhile the
    # side wall has NO background — it runs to the frame edge and its border is
    # tan trim — so a lower cutoff would have started eating trim.
    #
    # So: take the most common border colour after the rim is shaved, accept it
    # as background only if it is genuinely pale, and flood on colours near IT.
    # That handles the gate's white and the wall's cream with the same rule, and
    # correctly finds nothing on the side wall.
    border = np.concatenate([a[0, :, :3], a[-1, :, :3], a[:, 0, :3], a[:, -1, :3]])
    vals, counts = np.unique(border, axis=0, return_counts=True)
    bgc = vals[np.argmax(counts)]
    if int(bgc.min()) < white:
        print(f"    border is {tuple(int(x) for x in bgc)} — not a pale background, keying nothing")
        near_white = np.zeros(a.shape[:2], np.uint8)
    else:
        dist = np.abs(a[:, :, :3].astype(int) - bgc.astype(int)).max(2)
        near_white = (dist <= tolerance).astype(np.uint8) * 255
        print(f"    background {tuple(int(x) for x in bgc)}  tolerance {tolerance}")
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

    # Enclosed openings. A border flood deliberately cannot reach them, which is
    # the whole reason to use one — it is what stops mortar highlights and lit
    # windows being punched out. But a gate arch IS a hole, fully ringed by its
    # own stonework, and it stayed opaque white: 2,426px of sky in the middle of
    # the gatehouse. Size is what separates the two cases. A highlight is a few
    # dozen pixels; an opening is hundreds. Anything enclosed and larger than
    # --fill-enclosed is treated as a hole too.
    if fill_enclosed:
        left = (np.asarray(m) == 255)
        lab = Image.fromarray((left * 255).astype(np.uint8), "L").copy()
        seen = np.zeros_like(left)
        ys, xs = np.where(left)
        for y, x in zip(ys, xs):
            if seen[y, x]:
                continue
            probe = Image.fromarray((left * 255).astype(np.uint8), "L").copy()
            ImageDraw.floodfill(probe, (int(x), int(y)), 64, thresh=0)
            blob = np.asarray(probe) == 64
            seen |= blob
            if blob.sum() >= fill_enclosed:
                bg |= blob
                print(f"    enclosed opening: {int(blob.sum()):,}px at "
                      f"x{np.where(blob)[1].min()}-{np.where(blob)[1].max()}")

    # PALE RESIDUE AT THE FOOT. The redraw does not return one flat background:
    # it invents a soft shadow skirt around a subject's base, a single distinct
    # flat colour sitting well outside the tolerance around the true background.
    # On the battle tower that left 2,662px of (225,220,215) banked against the
    # bottom corners — Raheem: "there's still some white at the bottom of the
    # left right corners."
    #
    # Rule: a pale colour that TOUCHES the keyed region and forms a large blob is
    # background the flood could not see. Enclosed pale detail never touches the
    # outside, so it is untouched. Same size-versus-highlight reasoning as
    # --fill-enclosed, applied from the other direction.
    if bleed_pale:
        rgbv = a[:, :, :3]
        # Run to completion, not a fixed few passes. Each iteration grows the
        # keyed region by one pixel, and the tower's shadow skirt is ~90px deep —
        # a 6-pass cap absorbed 230px of a 2,662px residue and looked like the
        # rule was wrong when it was only short of breath.
        for _ in range(1000):
            edge = np.zeros_like(bg)
            edge[1:, :] |= bg[:-1, :]
            edge[:-1, :] |= bg[1:, :]
            edge[:, 1:] |= bg[:, :-1]
            edge[:, :-1] |= bg[:, 1:]
            cand = edge & ~bg & (rgbv.min(2) >= bleed_pale)
            if not cand.any():
                break
            bg |= cand
        removed = int(bg.sum()) - int((np.asarray(m) == 128).sum())
        if removed:
            print(f"    bled {removed:,}px of pale residue off the keyed edge")

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
    ap.add_argument("--white", type=int, default=200,
                    help="a border colour must be at least this pale to count as background at all")
    ap.add_argument("--tolerance", type=int, default=14, help="how far from the background colour still keys")
    ap.add_argument("--bleed-pale", type=int, default=200,
                    help="after keying, absorb pixels at least this pale that touch the keyed region; 0 disables")
    ap.add_argument("--fill-enclosed", type=int, default=300,
                    help="enclosed white blobs at least this big are openings, not highlights; 0 disables")
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
        size, cut = key(s, d, a.shave, a.white, a.fill_enclosed, a.tolerance, a.bleed_pale)
        print(f"  {f:20s} keyed {cut:7,d} px  ->  {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
