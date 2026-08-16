#!/usr/bin/env python3
"""Extract the connected foreground mountain mass from the approved Leonardo proof.

The source is preserved untouched.  A hand-traced skyline excludes the sky and
painted cloud bands that Leonardo added despite the extraction-plate prompt.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


SKYLINE = [
    (0, 478), (50, 472), (100, 465), (150, 458), (200, 452),
    (250, 443), (300, 434), (350, 425), (400, 414), (450, 401),
    (500, 385), (540, 364), (575, 341), (610, 300), (640, 264),
    (670, 225), (690, 198),
    (705, 212), (721, 238), (742, 266), (763, 287), (790, 304),
    (820, 320), (854, 331), (892, 339), (928, 352), (967, 374),
    (1007, 397), (1048, 409), (1090, 420), (1133, 431), (1174, 445),
    (1210, 458), (1242, 469), (1279, 477),
]


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: extract_mountain_layer.py <source.png> <output.png>")
        return 2

    source = Path(sys.argv[1]).resolve()
    output = Path(sys.argv[2]).resolve()
    image = Image.open(source).convert("RGBA")
    scale_x = image.width / 1280
    scale_y = image.height / 720

    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    skyline = [(round(x * scale_x), round(y * scale_y)) for x, y in SKYLINE]
    polygon = skyline + [(image.width - 1, image.height - 1), (0, image.height - 1)]
    draw.polygon(polygon, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.45))
    reduced = image.convert("RGB").quantize(colors=64).convert("RGBA")
    reduced.putalpha(mask)

    # Clear hidden RGB data so the transparent upper field compresses to almost
    # nothing instead of carrying the rejected Leonardo sky inside the PNG.
    pixels = np.asarray(reduced).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    image = Image.fromarray(pixels, "RGBA")

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)
    print(f"{output} {image.width}x{image.height}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
