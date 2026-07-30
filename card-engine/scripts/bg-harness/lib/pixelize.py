#!/usr/bin/env python3
"""
Turn a Leonardo plate into true pixel art.

Why this exists: Phoenix will not reliably produce pixel art. Asking for it
with Alchemy on returns a 3D render; asking with Alchemy off returns a smooth
painted render. Neither sits correctly behind a PixelLab sprite, and a pixel
actor on a smooth-rendered stage is the exact mismatch the playbook warns about.

Doing it as a post-process is better than another prompt attempt anyway:

  - It is DETERMINISTIC. The same plate always yields the same result, so the
    arena can be regenerated without re-rolling its look.
  - The pixel grid is EXACT, and can be matched to the sprite's own scale
    rather than hoped for.
  - It costs nothing and needs no further generations.

Method: downsample to the native pixel resolution with a box filter (averaging,
so fine detail becomes an honest average rather than an aliased sample), reduce
to a limited palette, then scale back up with NEAREST so every pixel becomes a
hard square block.

  python3 lib/pixelize.py in.png out.png [--scale 4] [--colors 64]
"""
import argparse
from PIL import Image, ImageEnhance


def pixelize(
    src: Image.Image, scale: int = 4, colors: int = 64, saturation: float = 1.0
) -> Image.Image:
    w, h = src.size
    nw, nh = max(1, w // scale), max(1, h // scale)

    # Saturate BEFORE quantising. A palette reduction spends its colours where
    # the pixels are, and these plates are overwhelmingly dark stone — so the
    # few bright, saturated pixels (the lava, the furnace mouths) get merged
    # into near-white and the fire turns cream. Pushing saturation first makes
    # the hot colours survive the cut as hot colours.
    if saturation != 1.0:
        src = ImageEnhance.Color(src.convert("RGB")).enhance(saturation)

    # BOX, not NEAREST, for the downsample. Nearest picks one source pixel per
    # block and throws the rest away, which turns fine texture into speckle;
    # box averages the block, which is what gives clean flat pixel clusters.
    small = src.convert("RGB").resize((nw, nh), Image.BOX)

    # Limited palette is most of what reads as "pixel art". Dithering is off on
    # purpose — dither noise breaks up the flat colour areas that make pixel art
    # legible at a glance, and it fights the sprite's own hard-edged blocks.
    small = small.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    small = small.convert("RGB")

    # NEAREST on the way back up, so each pixel becomes a hard square.
    return small.resize((nw * scale, nh * scale), Image.NEAREST)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--scale", type=int, default=4, help="source px per art px")
    ap.add_argument("--colors", type=int, default=64)
    ap.add_argument("--saturation", type=float, default=1.0)
    a = ap.parse_args()

    src = Image.open(a.src)
    out = pixelize(src, a.scale, a.colors, a.saturation)
    out.save(a.dst)
    print(f"{a.src} {src.size} -> {a.dst} {out.size} "
          f"(native {out.width // a.scale}x{out.height // a.scale}, {a.colors} colours)")


if __name__ == "__main__":
    main()
