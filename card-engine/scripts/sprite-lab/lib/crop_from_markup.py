#!/usr/bin/env python3
"""
Cut a sprite using a RED BOX drawn on a screenshot of it.

WHY THIS EXISTS. Raheem, 2026-08-07: "if I take a screenshot of a sprite and
then draw a red square round a part I want cut off, could you do that, and put
it back on the shelf?" Typing pixel coordinates at each other is slow and
error-prone; pointing at the thing is not. This turns a marked-up screenshot
into an exact edit on the real asset.

HOW IT WORKS
  1. Find every strongly-red (or blue) pixel in the marked-up image.
  2. Take their bounding box — that is the region you circled.
  3. Convert it to FRACTIONS of the screenshot, so it does not matter what
     resolution you screenshotted at or how the editor scaled it.
  4. Apply those fractions to the real sprite and cut.

SCREENSHOT THE SPRITE ALONE, EDGE TO EDGE. The fraction mapping assumes the
screenshot IS the sprite. If it contains half the map as well, the box will land
somewhere meaningless. Zoom to the sprite, screenshot, draw, send.

TWO MODES, matching the two things a red box can mean:
  --mode cut    (default) make the boxed region TRANSPARENT, canvas unchanged.
                Use for "delete this corner / this overhang".
  --mode keep   crop AWAY everything outside the box. Use for "I only want this
                bit".

CANVAS SIZE IS LOAD-BEARING. Pieces sit on a 32px grid against a ground line at
y=1216, so the result's tile alignment is printed every time. A piece that ends
up 287px tall will never line up again, and it is much cheaper to see that here
than after it is placed.

NEVER OVERWRITES. Writes <name>-crop.png beside the original unless --inplace.

Usage:
  crop_from_markup.py <marked.png> <sprite.png> [--mode cut|keep]
                      [--colour red|blue] [--out out.png] [--inplace]
"""
import sys
from PIL import Image
import numpy as np


def find_box(marked: Image.Image, colour: str):
    a = np.asarray(marked.convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # STRICT. A loose test picked up the castle's honey-gold trim as "red"
    # (rgb 250,196,71 -> r-g 54, r-b 179) and selected the whole sprite. So the
    # OTHER two channels must both be genuinely dark: this only matches a pure
    # marker colour, never art.
    if colour == "blue":
        mask = (b > 150) & (r < 90) & (g < 110)
    else:
        mask = (r > 150) & (g < 90) & (b < 90)
    if mask.sum() < 20:
        raise SystemExit(
            f"no {colour} marking found ({mask.sum()} px). Draw a solid box in pure "
            f"{colour} — a thin anti-aliased line may not register."
        )
    ys, xs = np.where(mask)
    return xs.min(), ys.min(), xs.max(), ys.max(), mask.sum()


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        return 1
    marked_p, sprite_p = args[0], args[1]

    def flag(name, default=None):
        for i, a in enumerate(argv):
            if a == f"--{name}" and i + 1 < len(argv):
                return argv[i + 1]
            if a.startswith(f"--{name}="):
                return a.split("=", 1)[1]
        return default

    colour = flag("colour", "red")
    mode = flag("mode", "cut")
    marked = Image.open(marked_p)
    sprite = Image.open(sprite_p).convert("RGBA")

    x0, y0, x1, y1, n = find_box(marked, colour)
    mw, mh = marked.size
    fx0, fy0, fx1, fy1 = x0 / mw, y0 / mh, (x1 + 1) / mw, (y1 + 1) / mh
    sw, sh = sprite.size
    bx0, by0 = int(round(fx0 * sw)), int(round(fy0 * sh))
    bx1, by1 = int(round(fx1 * sw)), int(round(fy1 * sh))
    print(f"  {colour} box found: {n} px, screenshot ({x0},{y0})-({x1},{y1}) of {mw}x{mh}")
    print(f"  maps to sprite ({bx0},{by0})-({bx1},{by1}) of {sw}x{sh}")

    if mode == "keep":
        out_im = sprite.crop((bx0, by0, bx1, by1))
        print(f"  mode keep: cropped to the box")
    else:
        out_im = sprite.copy()
        px = out_im.load()
        cleared = 0
        for y in range(max(0, by0), min(sh, by1)):
            for x in range(max(0, bx0), min(sw, bx1)):
                if px[x, y][3]:
                    px[x, y] = (0, 0, 0, 0)
                    cleared += 1
        print(f"  mode cut: cleared {cleared} px, canvas unchanged")

    w, h = out_im.size
    aligned = (w % 32 == 0) and (h % 32 == 0)
    print(f"  result {w}x{h}  ({w/32:.2f} x {h/32:.2f} tiles)  "
          f"{'tile-aligned' if aligned else 'NOT ON THE 32px GRID — it will not line up'}")

    out = flag("out") or (sprite_p if "--inplace" in argv else
                          sprite_p.rsplit(".", 1)[0] + "-crop.png")
    out_im.save(out)
    print(f"  wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
