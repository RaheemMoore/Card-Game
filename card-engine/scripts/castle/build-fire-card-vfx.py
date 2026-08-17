"""Cut the approved Fire Card concept sheet into deterministic Phaser strips."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


FRAME_COUNT = 8
FRAME_SIZE = 64
PALETTE = (
    (255, 248, 205),
    (255, 231, 103),
    (255, 199, 34),
    (255, 148, 10),
    (255, 91, 8),
    (228, 54, 10),
    (157, 35, 12),
    (101, 21, 12),
)


def nearest_fire_colour(red: int, green: int, blue: int) -> tuple[int, int, int]:
    return min(
        PALETTE,
        key=lambda colour: (
            (red - colour[0]) ** 2
            + (green - colour[1]) ** 2
            + (blue - colour[2]) ** 2
        ),
    )


def crisp(frame: Image.Image) -> Image.Image:
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 28:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            colour = nearest_fire_colour(red, green, blue)
            pixels[x, y] = (*colour, 255)
    return frame


def build_strip(source: Image.Image, top: int, output: Path) -> None:
    strip = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE), (0, 0, 0, 0))
    for index in range(FRAME_COUNT):
        left = round(index * source.width / FRAME_COUNT)
        right = round((index + 1) * source.width / FRAME_COUNT)
        crop = source.crop((left, top, right, top + 256))
        frame = crop.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.NEAREST)
        strip.alpha_composite(crisp(frame), (index * FRAME_SIZE, 0))
    output.parent.mkdir(parents=True, exist_ok=True)
    strip.save(output, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGBA")
    build_strip(source, 108, args.output_dir / "fire-card-charge.png")
    build_strip(source, 458, args.output_dir / "fire-card-projectile.png")


if __name__ == "__main__":
    main()
