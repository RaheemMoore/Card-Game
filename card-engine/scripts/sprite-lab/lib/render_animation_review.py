#!/usr/bin/env python3
"""Render generated PNG frames as an animated GIF and numbered contact sheet."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, "#26322f")
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#303e3a")
    return image


def composite(frame: Image.Image, scale: int) -> Image.Image:
    backdrop = checkerboard(frame.size)
    backdrop.alpha_composite(frame)
    return backdrop.resize(
        (frame.width * scale, frame.height * scale), Image.Resampling.NEAREST
    ).convert("P", palette=Image.Palette.ADAPTIVE, colors=255)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("prefix")
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--scale", type=int, default=2)
    args = parser.parse_args()

    files = sorted(args.input_dir.glob(f"{args.prefix}*.png"))
    if not files:
        raise SystemExit(f"no frames matching {args.prefix}*.png")
    frames = [Image.open(file).convert("RGBA") for file in files]
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Hold the source and final poses, then play the generated in-betweens evenly.
    durations = [350] + [90] * (len(frames) - 2) + [500]
    gif_frames = [composite(frame, args.scale) for frame in frames]
    gif_frames[0].save(
        args.output_dir / "card-blast-south-preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        optimize=False,
    )

    columns = 4
    label_height = 22
    cell_width = frames[0].width * args.scale
    cell_height = frames[0].height * args.scale + label_height
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#17201e")
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        rendered = composite(frame, args.scale).convert("RGB")
        sheet.paste(rendered, (x, y))
        draw.text((x + 8, y + rendered.height + 4), f"Frame {index:02d}", fill="#f2dfb1")
    sheet.save(args.output_dir / "card-blast-south-contact-sheet.png")

    print(f"rendered {len(frames)} frames to {args.output_dir}")


if __name__ == "__main__":
    main()
