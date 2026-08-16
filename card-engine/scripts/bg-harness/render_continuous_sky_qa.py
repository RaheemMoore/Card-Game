#!/usr/bin/env python3
"""Render deterministic stills of the harness cloud-recycling composition."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


CONFIG = [
    {"y": .14, "width": .35, "start": 28,  "rate": .23, "period": 225, "flip": False, "opacity": 1.00},
    {"y": .44, "width": .28, "start": 112, "rate": .15, "period": 237, "flip": True,  "opacity": .96},
    {"y": .06, "width": .22, "start": 186, "rate": .10, "period": 251, "flip": False, "opacity": .92},
]


def wrap(value: float, period: float) -> float:
    return value % period


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: render_continuous_sky_qa.py <output-dir>")
        return 2

    root = Path(__file__).resolve().parent
    sky_path = root / "out/castle-front-v4-user-sky/sky-clean-upper-proof.png"
    sprite_dir = root / "out/castle-front-v4-cloud-sprites/extracted"
    output_dir = Path(sys.argv[1]).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    sky = Image.open(sky_path).convert("RGBA").resize((1280, 720), Image.Resampling.LANCZOS)

    for distance in (0, 2400, 7200, 16000):
        frame = sky.copy()
        for config in CONFIG:
            sprite = Image.open(sprite_dir / "cloud-approved-orange.png").convert("RGBA")
            target_width = round(1280 * config["width"])
            target_height = round(sprite.height * target_width / sprite.width)
            sprite = sprite.resize((target_width, target_height), Image.Resampling.LANCZOS)
            if config["flip"]:
                sprite = sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            alpha = sprite.getchannel("A").point(lambda value: round(value * config["opacity"]))
            sprite.putalpha(alpha)
            x_percent = wrap(config["start"] - distance * config["rate"] / 10 + 32, config["period"]) - 32
            x = round(1280 * x_percent / 100)
            y = round(720 * config["y"])
            frame.alpha_composite(sprite, (x, y))
        destination = output_dir / f"continuous-sky-{distance:05d}.png"
        frame.convert("RGB").save(destination, quality=95)
        print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
