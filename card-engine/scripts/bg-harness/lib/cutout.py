#!/usr/bin/env python3
"""
Turn a Leonardo sprite plate into a game-ready cutout.

The model returns a small character centred in a large flat-white canvas.
This knocks the white background out to transparency, trims to the character's
bounding box, and writes a tight PNG — what Phaser actually wants to load.

Usage: cutout.py <in.png> <out.png> [--threshold 236] [--keep-shadow]

The shadow under the feet is a soft grey ellipse. By default it is kept (it
grounds the sprite on the paving); --no-shadow style thresholds would eat it,
so the threshold is deliberately high rather than a pure-white match.
"""
import sys
from PIL import Image


def cutout(src: str, dst: str, threshold: int = 236) -> None:
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size

    # Flood from the border inward: only background white connected to the
    # edge is removed, so white *inside* the character (an eye highlight, a
    # tunic trim) survives.
    seen = [[False] * h for _ in range(w)]
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        r, g, b, a = px[x, y]
        if a == 0 or (r >= threshold and g >= threshold and b >= threshold):
            seen[x][y] = True
            px[x, y] = (r, g, b, 0)
            stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(dst)
    print(f"{dst}  {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    thr = 236
    for a in sys.argv[1:]:
        if a.startswith("--threshold"):
            thr = int(a.split("=", 1)[1])
    cutout(args[0], args[1], thr)
