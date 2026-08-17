#!/usr/bin/env python3
"""
Compose the Castle Front frame from the REAL shipped art, at any frame height.

WHY THIS EXISTS. Raheem wants the castle grand, its towers' tops on screen, and a
doorway his character could believably walk through — and at the current 720-unit
frame those three cannot all be true at once. Deciding between them by argument is
how a day gets spent; deciding by looking costs nothing, because every asset the
decision turns on is already on disk. *"Let me see some examples without wasting
any generations."*

It is NOT a renderer. It does not run Phaser, it ignores parallax, and it draws one
still frame with the camera at the level's west end. What it reproduces exactly is
the only thing under discussion: how tall each thing is relative to the frame and
to the man standing in front of it.

Usage:
    frame_mock.py <out.png> [frame_height] [tower_scale] [hero_scale] [label]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
KIT = ROOT / "public/assets/kits/castle-front"
CASTLE = ROOT / "public/assets/castle"

# The scene's own constants, so the mock cannot quietly disagree with the game.
FRAME_W = 1280
BASE_FRAME_H = 720
BASE_GROUND_Y = 590
#: How much ground shows below the contact line. Held constant as the frame grows,
#: so extra height becomes SKY rather than more dirt — the whole point of the change.
GROUND_BAND = BASE_FRAME_H - BASE_GROUND_Y

HERO_FRAME = (36, 71)
HERO_COLS = 7
HERO_IDLE_RIGHT = 21
#: 2 rows of transparent padding below his feet, measured off the sheet.
HERO_FEET = 70 / 71


def load(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def hero_cell() -> Image.Image:
    sheet = load(CASTLE / "hero/chibi.png")
    fw, fh = HERO_FRAME
    row, col = divmod(HERO_IDLE_RIGHT, HERO_COLS)
    return sheet.crop((col * fw, row * fh, (col + 1) * fw, (row + 1) * fh))


def scaled(img: Image.Image, factor: float) -> Image.Image:
    # NEAREST throughout: this is pixel art, and a smooth resample would show him a
    # softness the game will never produce.
    return img.resize(
        (max(1, round(img.width * factor)), max(1, round(img.height * factor))),
        Image.Resampling.NEAREST,
    )


def compose(frame_h: int, tower_scale: float, hero_scale: float, label: str) -> Image.Image:
    ground_y = frame_h - GROUND_BAND
    frame = Image.new("RGBA", (FRAME_W, frame_h), (0, 0, 0, 255))

    # Sky, cover-fitted exactly as backdrop.ts does it.
    sky = load(KIT / "background/sky/castle-front-sunset-sky.png")
    cover = max(FRAME_W / sky.width, frame_h / sky.height)
    sky = scaled(sky, cover)
    frame.alpha_composite(sky, ((FRAME_W - sky.width) // 2, 0))

    # Mountains and forest: bottom-aligned on the contact line, at the fractions of
    # the frame the harness composition approved.
    for name, fraction, alpha in [
        ("background/mountains/castle-front-mountains-loop.png", 0.55, 0.82),
        ("background/forest/castle-front-forest-loop.png", 0.28, 0.92),
    ]:
        strip = load(KIT / name)
        s = (frame_h * fraction) / strip.height
        strip = scaled(strip, s)
        band = Image.new("RGBA", (FRAME_W, strip.height), (0, 0, 0, 0))
        for x in range(0, FRAME_W, strip.width):
            band.alpha_composite(strip, (x, 0))
        band.putalpha(band.getchannel("A").point(lambda v: round(v * alpha)))
        frame.alpha_composite(band, (0, ground_y - band.height))

    # Clouds, at the approved percentages of the frame.
    for shape, x_pct, y_pct, w_pct in [
        ("broad", 7, 15, 27), ("mound", 34, 39, 23),
        ("puffs", 62, 8, 13), ("sweep", 70, 28, 28),
    ]:
        c = load(KIT / f"background/clouds/cloud-{shape}-sunset.png")
        c = scaled(c, (FRAME_W * w_pct / 100) / c.width)
        frame.alpha_composite(c, (round(FRAME_W * x_pct / 100), round(frame_h * y_pct / 100)))

    # The tower, standing on the contact line at the level's west end.
    tower = scaled(load(KIT / "structures/castle-front-tower-v3.png"), tower_scale)
    tower_x = -9
    frame.alpha_composite(tower, (tower_x, ground_y - tower.height))

    # Ground: the authored earth slab first, then the grass band on top of it.
    # The slab matters — without it a taller frame shows sky below the band, which
    # is a defect in the mock rather than in the composition being judged.
    d0 = ImageDraw.Draw(frame)
    d0.rectangle([0, ground_y, FRAME_W, frame_h], fill=(0x3d, 0x2a, 0x1f, 255))
    band = load(KIT / "terrain/castle-front-ground-band-grass.png")
    for x in range(0, FRAME_W, band.width):
        frame.alpha_composite(band, (x, ground_y - 16))

    # The man, at the tower's door, which is the whole question.
    hero = scaled(hero_cell(), hero_scale)
    hero_x = tower_x + round(tower.width * 0.5) - hero.width // 2
    frame.alpha_composite(hero, (hero_x, ground_y - round(hero.height * HERO_FEET)))

    # The readout. Every number the decision turns on, on the picture it describes.
    d = ImageDraw.Draw(frame)
    door_px = 38 * tower_scale
    hero_px = 69 * hero_scale
    lines = [
        label,
        f"frame {FRAME_W}x{frame_h}  ground y={ground_y}",
        f"tower {tower_scale}x = {tower.height}px  ({tower.height * 100 / frame_h:.0f}% of frame)"
        + ("" if tower.height <= ground_y else "   << TOP IS CUT OFF"),
        f"hero {hero_scale}x = {hero_px:.0f}px  ({hero_px * 100 / frame_h:.0f}% of frame)",
        f"door {door_px:.0f}px = {door_px / hero_px:.2f}x his height",
        f"tower : hero = {tower.height / hero_px:.1f} : 1",
    ]
    box_h = 16 * len(lines) + 12
    plate = Image.new("RGBA", (430, box_h), (10, 12, 20, 200))
    frame.alpha_composite(plate, (12, 12))
    for i, line in enumerate(lines):
        d.text((22, 18 + i * 16), line, fill=(255, 214, 140, 255) if i == 0 else (226, 226, 226, 255))
    return frame


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    out = Path(sys.argv[1])
    frame_h = int(sys.argv[2]) if len(sys.argv) > 2 else BASE_FRAME_H
    tower = float(sys.argv[3]) if len(sys.argv) > 3 else 3.5
    hero = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
    label = sys.argv[5] if len(sys.argv) > 5 else ""
    compose(frame_h, tower, hero, label).convert("RGB").save(out, quality=95)
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
