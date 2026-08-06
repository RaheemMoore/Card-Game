#!/usr/bin/env python3
"""
Strip the pale matting halo from a generated sprite's edge.

PixelLab sometimes returns a sprite ringed by near-white pixels — leftover from
whatever it matted the subject off. Raheem, on the crystal cart: *"Those white
edges around it, they have to go."* Measured on that asset: **42% of its edge
pixels were near-white**, against 0% on the sorting table and lift winch beside
it, so this is a per-asset defect rather than a pipeline-wide one.

WHY ONLY THE OUTERMOST RING. A pale pixel in the MIDDLE of a sprite is art — a
highlight, a glow, a white crystal facet. A pale pixel sitting directly against
transparency is matting residue, because real pixel art is enclosed by its
outline. So this only ever touches pixels on the alpha boundary, and it peels
one ring at a time rather than thresholding the whole image.

RUN THIS BEFORE A ROTATION PASS. `/create-8-direction-object` takes the sprite as
its `reference_image`, so a halo in the source propagates into all eight faces —
one cheap fix beforehand, or eight dirty sprites afterwards.

Usage:
  dehalo.py <in.png|dir> <out.png|dir> [--passes N] [--min-value 215]
                                       [--max-chroma 28] [--dry-run]
"""
import os
import sys

import numpy as np
from PIL import Image


def edge_mask(opaque):
    """Opaque pixels that touch transparency on any of the four sides."""
    pad = np.pad(opaque, 1, constant_values=False)
    touching = (
        ~pad[:-2, 1:-1] | ~pad[2:, 1:-1] | ~pad[1:-1, :-2] | ~pad[1:-1, 2:]
    )
    return opaque & touching


def dehalo(path, out_path, passes, min_value, max_chroma, dry):
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).copy()
    removed = 0

    for _ in range(passes):
        opaque = arr[..., 3] > 200
        edge = edge_mask(opaque)
        rgb = arr[..., :3].astype(int)
        mx = rgb.max(2)
        mn = rgb.min(2)
        # Near-white: bright AND desaturated. Both conditions matter — a bright
        # SATURATED pixel is a glowing crystal, not matting residue.
        pale = (mx >= min_value) & ((mx - mn) <= max_chroma)
        kill = edge & pale
        n = int(kill.sum())
        if not n:
            break
        arr[kill, 3] = 0        # alpha only; the RGB underneath is left alone
        removed += n

    before = int((np.asarray(img)[..., 3] > 200).sum())
    after = int((arr[..., 3] > 200).sum())
    print(
        f"{os.path.basename(path):32s} removed {removed:4d} halo px  "
        f"opaque {before} -> {after}" + ("  (dry run)" if dry else "")
    )
    if not dry:
        Image.fromarray(arr).save(out_path)
    return removed


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)
    src, dst = argv[0], argv[1]
    passes, min_value, max_chroma, dry = 2, 215, 28, False
    i = 2
    while i < len(argv):
        a = argv[i]
        if a == "--passes":
            passes = int(argv[i + 1]); i += 2
        elif a == "--min-value":
            min_value = int(argv[i + 1]); i += 2
        elif a == "--max-chroma":
            max_chroma = int(argv[i + 1]); i += 2
        elif a == "--dry-run":
            dry = True; i += 1
        else:
            sys.exit(f"unknown option {a}")

    if os.path.isdir(src):
        if not dry:
            os.makedirs(dst, exist_ok=True)
        files = sorted(f for f in os.listdir(src) if f.lower().endswith(".png"))
        total = sum(
            dehalo(os.path.join(src, f), os.path.join(dst, f),
                   passes, min_value, max_chroma, dry)
            for f in files
        )
        print(f"\n{len(files)} frame(s), {total} halo px removed")
    else:
        dehalo(src, dst, passes, min_value, max_chroma, dry)


if __name__ == "__main__":
    main()
