#!/usr/bin/env python3
"""Build a visual QA sheet for a Leonardo environment generation.

The sheet puts the untouched provider image beside the deterministic pixel
preview, then repeats the raw image with the gameplay composition contract
drawn over it. This is deliberately a review artifact, never a shipped asset.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BG = (17, 21, 14)
PANEL = (27, 32, 22)
INK = (238, 235, 219)
MUTED = (164, 170, 148)
GOLD = (222, 177, 77)
TEAL = (80, 206, 184)


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for name in names:
        if Path(name).exists():
            return ImageFont.truetype(name, size=size)
    return ImageFont.load_default()


TITLE_FONT = font(26, bold=True)
BODY_FONT = font(17)
SMALL_FONT = font(14, bold=True)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.convert("RGB").copy()
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    panel = Image.new("RGB", (width, height), PANEL)
    panel.paste(copy, ((width - copy.width) // 2, (height - copy.height) // 2))
    return panel


def label(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    color=INK,
    use_font: ImageFont.ImageFont = BODY_FONT,
) -> None:
    draw.text(xy, text, fill=color, font=use_font)


def overlay_contract(
    source: Image.Image,
    ground_y: int,
    castle_end_x: int,
    combat_start_x: int,
) -> Image.Image:
    image = source.convert("RGBA")
    layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    width, height = image.size
    if castle_end_x >= 0:
        draw.rectangle((0, 0, min(castle_end_x, width), height), fill=(*GOLD, 38), outline=(*GOLD, 230), width=4)
        draw.text((18, 18), "CASTLE / HOME ANCHOR", fill=(*GOLD, 255), font=SMALL_FONT)
    if combat_start_x >= 0:
        draw.rectangle((min(combat_start_x, width), 0, width - 1, height - 1), fill=(*TEAL, 24), outline=(*TEAL, 210), width=4)
        draw.text((min(combat_start_x + 18, width - 210), 18), "OPEN COMBAT READ", fill=(*TEAL, 255), font=SMALL_FONT)
    if 0 <= ground_y < height:
        draw.line((0, ground_y, width, ground_y), fill=(255, 104, 80, 255), width=5)
        draw.text((18, max(0, ground_y - 24)), "PLAYER GROUND LINE", fill=(255, 150, 125, 255), font=SMALL_FONT)
    return Image.alpha_composite(image, layer).convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("raw")
    parser.add_argument("pixel")
    parser.add_argument("out")
    parser.add_argument("--title", default="Leonardo environment review")
    parser.add_argument("--ground-y", type=int, default=-1)
    parser.add_argument("--castle-end-x", type=int, default=-1)
    parser.add_argument("--combat-start-x", type=int, default=-1)
    parser.add_argument("--checklist-json", default="[]")
    args = parser.parse_args()

    raw = Image.open(args.raw).convert("RGB")
    pixel = Image.open(args.pixel).convert("RGB")
    checklist = json.loads(args.checklist_json)

    margin = 28
    gap = 20
    header = 82
    panel_w = 720
    panel_h = round(panel_w * raw.height / raw.width)
    overlay_w = panel_w * 2 + gap
    overlay_h = round(overlay_w * raw.height / raw.width)
    checklist_h = max(54, 24 + len(checklist) * 18)
    canvas = Image.new(
        "RGB",
        (margin * 2 + overlay_w, header + panel_h + gap + overlay_h + checklist_h + margin),
        BG,
    )
    draw = ImageDraw.Draw(canvas)
    label(draw, (margin, 14), args.title, GOLD, TITLE_FONT)
    label(draw, (margin, 50), f"Raw provider output {raw.width}x{raw.height} | deterministic pixel preview", MUTED)

    top_y = header
    raw_panel = fit(raw, panel_w, panel_h)
    pixel_panel = fit(pixel, panel_w, panel_h)
    canvas.paste(raw_panel, (margin, top_y))
    canvas.paste(pixel_panel, (margin + panel_w + gap, top_y))
    label(draw, (margin + 10, top_y + 10), "RAW - judge composition and content", INK, SMALL_FONT)
    label(draw, (margin + panel_w + gap + 10, top_y + 10), "PIXEL PREVIEW - judge game cohesion", INK, SMALL_FONT)

    overlay_y = top_y + panel_h + gap
    marked = overlay_contract(raw, args.ground_y, args.castle_end_x, args.combat_start_x)
    canvas.paste(fit(marked, overlay_w, overlay_h), (margin, overlay_y))
    label(draw, (margin + 10, overlay_y + 10), "COMPOSITION CONTRACT OVERLAY", INK, SMALL_FONT)

    checklist_y = overlay_y + overlay_h + 14
    label(draw, (margin, checklist_y), "VISUAL REVIEW CHECKLIST", GOLD)
    for index, item in enumerate(checklist):
        label(draw, (margin, checklist_y + 20 + index * 18), f"[ ] {item}", MUTED)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.out)
    print(f"review sheet -> {args.out} {canvas.size}")


if __name__ == "__main__":
    main()
