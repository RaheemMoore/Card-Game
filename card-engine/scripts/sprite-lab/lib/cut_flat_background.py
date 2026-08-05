#!/usr/bin/env python3
"""
Flood-fill a flat background off a generated sprite, starting from the frame edge.

**PixelLab's `no_background` is a request, not a guarantee.** The high-resolution
tower rug was generated with `no_background: true` and came back fully opaque on
a flat grey field. This removes that field.

WHY FLOOD-FILL FROM THE EDGE, NOT A COLOUR THRESHOLD. A colour threshold kills
every pixel of that colour anywhere in the image — including the grey inside the
subject, which for a stone rug or an iron fitting is most of the artwork. A flood
fill only removes background that is CONNECTED to the frame edge, so an enclosed
grey stays. That is the whole difference between matting a sprite and gutting it.

Sibling to lib/dehalo.py: that one peels a pale fringe off an already-transparent
sprite, this one creates the transparency in the first place. Run this first,
then dehalo the residue.

Usage:
  cut_flat_background.py <in.png|dir> <out.png|dir> [--tolerance 18] [--feather 1]
                                                    [--dry-run]
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image


def cut(path, out_path, tol, feather, dry):
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img).copy()
    h, w = arr.shape[:2]
    rgb = arr[..., :3].astype(int)

    # The background colour is whatever occupies the frame's corners. Sampling
    # the corners rather than the most common colour matters: on a full-bleed
    # image the subject can easily be the most common colour.
    # The MOST COMMON colour along the whole frame border, not the corner median.
    # Corners alone mis-sampled three of four rugs — a vignette or a dark
    # gradient in the corners produced a background colour that matched almost
    # nothing, so the fill barely spread. The full border is a much larger and
    # more representative sample of what the background actually is.
    border = np.concatenate([rgb[0], rgb[h - 1], rgb[:, 0], rgb[:, w - 1]])
    cols, counts = np.unique(border, axis=0, return_counts=True)
    bg = cols[counts.argmax()]

    matched = (np.abs(rgb - bg).sum(2) <= tol)

    # Flood from every edge pixel that matches, four-connected.
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if matched[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if matched[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and matched[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    # Feather: also clear pixels adjacent to the cut, which is where the
    # anti-aliased halo lives. Kept to whole pixels — no partial alpha, because
    # partial alpha on pixel art reads as blur.
    for _ in range(feather):
        pad = np.pad(seen, 1, constant_values=False)
        nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
        grow = nb & ~seen & (np.abs(rgb - bg).sum(2) <= tol * 3)
        if not grow.any():
            break
        seen |= grow

    arr[seen, 3] = 0
    kept = int((arr[..., 3] > 200).sum())
    print(
        f"{os.path.basename(path):32s} bg rgb{tuple(int(v) for v in bg)}  "
        f"cut {int(seen.sum()):6d} px  kept {kept}"
        + ("  (dry run)" if dry else "")
    )
    if not dry:
        Image.fromarray(arr).save(out_path)
    return int(seen.sum())


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)
    src, dst = argv[0], argv[1]
    tol, feather, dry = 18, 1, False
    i = 2
    while i < len(argv):
        a = argv[i]
        if a == "--tolerance":
            tol = int(argv[i + 1]); i += 2
        elif a == "--feather":
            feather = int(argv[i + 1]); i += 2
        elif a == "--dry-run":
            dry = True; i += 1
        else:
            sys.exit(f"unknown option {a}")

    if os.path.isdir(src):
        if not dry:
            os.makedirs(dst, exist_ok=True)
        files = sorted(f for f in os.listdir(src) if f.lower().endswith(".png"))
        for f in files:
            cut(os.path.join(src, f), os.path.join(dst, f), tol, feather, dry)
    else:
        cut(src, dst, tol, feather, dry)


if __name__ == "__main__":
    main()
