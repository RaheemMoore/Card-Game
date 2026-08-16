#!/usr/bin/env python3
"""Build compact, horizontally seamless parallax strips for the art preview.

Each source is cropped to its alpha bounds, reduced to the shared chunky pixel
scale, palette-limited, then paired with its horizontal mirror.  The mirrored
pair makes both the middle join and the outer repeat join exact without another
paid/generated image.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


def prepare(source: Path, output: Path, colors: int) -> None:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError(f"{source} has no visible pixels")

    image = image.crop(bbox)
    target_width = max(1, image.width // 2)
    target_height = max(1, round(image.height * target_width / image.width))
    image = image.resize((target_width, target_height), Image.Resampling.NEAREST)

    # Pixel actors need crisp silhouettes.  Remove the soft chroma matte before
    # palette reduction so no translucent magenta/green fringe survives.
    hard_alpha = image.getchannel("A").point(lambda value: 255 if value >= 128 else 0)
    reduced = image.convert("RGB").quantize(colors=colors).convert("RGBA")
    reduced.putalpha(hard_alpha)

    pair = Image.new("RGBA", (reduced.width * 2, reduced.height))
    pair.alpha_composite(reduced, (0, 0))
    pair.alpha_composite(ImageOps.mirror(reduced), (reduced.width, 0))

    pixels = np.asarray(pair).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    pair = Image.fromarray(pixels, "RGBA")

    output.parent.mkdir(parents=True, exist_ok=True)
    pair.save(output, optimize=True)
    print(f"{output} {pair.width}x{pair.height} {output.stat().st_size:,} bytes")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--colors", type=int, default=12)
    args = parser.parse_args()
    prepare(args.source, args.output, args.colors)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
