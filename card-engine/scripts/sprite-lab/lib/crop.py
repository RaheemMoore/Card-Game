#!/usr/bin/env python3
"""
Shave, cut or trim part of a sprite. Non-destructive by default.

WHY THIS EXISTS. Raheem, 2026-08-07: "a small crop feature where I can cut off
the end of a sprite or just cut off one corner." Generated art routinely arrives
with one bad edge — a strip of sky, a merlon that overhangs, a corner that fouls
the piece next to it — and the alternative to a crop is a re-roll, which costs
money and changes everything else about the image.

THREE OPERATIONS, because they are different jobs:

  --shave   Remove pixels from a side. The CANVAS SHRINKS. Use when the art is
            fine but the frame is too big — a sky strip along the top.

  --cut     Make a rectangle TRANSPARENT and keep the canvas size. Use when a
            piece has to keep its dimensions so it stays on the tile grid, but a
            corner needs to disappear so a neighbour can sit there.

  --trim    Remove transparent margin on all four sides automatically. Use after
            a background cut, when the sprite is rattling around inside a frame
            far bigger than the art.

CANVAS SIZE IS LOAD-BEARING IN THIS PROJECT. Pieces sit on a 32px grid with a
ground line at y=1216, so a shaved sprite may no longer be a whole number of
tiles. Every operation prints the before/after size AND whether the result is
still tile-aligned, because a piece that is 287px tall will never line up again
and it is far cheaper to notice now than after it is placed.

NEVER OVERWRITES unless you pass --inplace. The default writes <name>-crop.png
beside the original, so a bad crop costs nothing.

Usage:
  crop.py <in.png> [--out out.png] [--inplace]
          [--shave top=N,bottom=N,left=N,right=N]
          [--cut corner=tl|tr|bl|br,w=N,h=N]  |  [--cut box=x0,y0,x1,y1]
          [--trim]

Examples:
  crop.py gate.png --shave top=32                 # drop a 32px sky strip
  crop.py wall.png --cut corner=br,w=64,h=64      # knock out the bottom-right
  crop.py tower.png --trim                        # tighten to the artwork
"""
import sys
from PIL import Image


def _kv(arg: str) -> dict:
    out = {}
    for part in arg.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def report(before, after, label):
    bw, bh = before
    aw, ah = after
    ok = aw % 32 == 0 and ah % 32 == 0
    print(f"  {label}: {bw}x{bh} -> {aw}x{ah}   ({aw/32:.2f} x {ah/32:.2f} tiles)"
          f"   {'tile-aligned' if ok else 'NOT ON THE 32px GRID — it will not line up'}")


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 1
    src = args[0]
    im = Image.open(src).convert("RGBA")
    before = im.size

    def flag(name):
        for i, a in enumerate(argv):
            if a == f"--{name}" and i + 1 < len(argv):
                return argv[i + 1]
            if a.startswith(f"--{name}="):
                return a.split("=", 1)[1]
        return None

    if (s := flag("shave")) is not None:
        k = _kv(s)
        l, t = int(k.get("left", 0)), int(k.get("top", 0))
        r, b = int(k.get("right", 0)), int(k.get("bottom", 0))
        im = im.crop((l, t, im.width - r, im.height - b))
        report(before, im.size, "shave")

    if (c := flag("cut")) is not None:
        k = _kv(c)
        px = im.load()
        if "box" in c:
            x0, y0, x1, y1 = (int(v) for v in k["box"].split("|")) if "|" in k["box"] else (
                int(v) for v in c.split("box=")[1].split(",")[:4])
        else:
            w, h = int(k.get("w", 32)), int(k.get("h", 32))
            corner = k.get("corner", "br")
            x0 = 0 if corner in ("tl", "bl") else im.width - w
            y0 = 0 if corner in ("tl", "tr") else im.height - h
            x1, y1 = x0 + w, y0 + h
        n = 0
        for y in range(max(0, y0), min(im.height, y1)):
            for x in range(max(0, x0), min(im.width, x1)):
                if px[x, y][3]:
                    px[x, y] = (0, 0, 0, 0)
                    n += 1
        print(f"  cut: cleared {n} px in box ({x0},{y0})-({x1},{y1}); canvas unchanged")
        report(before, im.size, "cut")

    if "--trim" in argv:
        box = im.getbbox()
        if box:
            im = im.crop(box)
        report(before, im.size, "trim")

    out = flag("out") or (src if "--inplace" in argv else src.rsplit(".", 1)[0] + "-crop.png")
    im.save(out)
    print(f"  wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
