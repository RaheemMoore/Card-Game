#!/usr/bin/env python3
"""
Ground-tone comparison sheet.

Built 2026-08-07 for one decision: which ground the forest stands on. Eight grass
variants exist on disk and picking between them from hue/saturation numbers is not
possible — the question is whether the TREES read against it, which is a thing you
can only see.

So each row is one candidate ground, with the same real trees and the same hero
standing on it, on a shared floor line. Rows are labelled on the left, the live
variant is marked, and the measured HSV sits under each name so a choice can be
turned back into a number afterwards.

This follows the sheet convention (HARNESS_INDEX.md Rule Zero (b)): rows are the
subject, one uniform cell throughout, label left, everything bottom-aligned on one
floor line. A hero appears in every row because scale and tone are both invisible
without a figure — the wall kit shipped at a third of its intended size for want of
exactly this.

Usage:
  ground_tone_sheet.py [out.png]
"""
import colorsys
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.dirname(HERE)
CARD_ENGINE = os.path.dirname(os.path.dirname(LAB))
PUBLIC = os.path.join(CARD_ENGINE, "public")
KIT = os.path.join(PUBLIC, "assets", "kits", "halo-stone-castle")
TILESETS = os.path.join(KIT, "ground", "tilesets")
LIVE = os.path.join(TILESETS, "castle-ground-grass-dirt-wang-32.png")
HERO = os.path.join(PUBLIC, "assets", "castle", "hero", "chibi.png")

DEFAULT_OUT = os.path.join(KIT, "review", "ground", "ground-tone-compare.png")

TILE = 32
# Index 15 is all-four-corners grass. Measured by sampling, not assumed — index 0
# is full dirt, and getting these backwards produces a very confident wrong sheet.
GRASS_TILE = 15

# The world is viewed at 2x, so the sheet is drawn at 2x. Judging tone at 1x would
# be judging an image the game never shows.
ZOOM = 2

LABEL_W = 190
# Tall enough that a tree fits INSIDE its row. The first build used 210 and the
# canopies grew up into the row above, so every band was judged against the wrong
# ground.
ROW_H = 250
TREE_GAP = 215
TREE_ROW_H = 185
PAD = 14

# THE TREES THAT ARE ACTUALLY PLANTED.
#
# The first build of this sheet used the eight recovered trees, and Raheem rejected
# them for the canopy on 2026-08-07: "those don't look like great canopy trees in
# this situation." The forest is 34 of `nature-tree-broadleaf-large` at scale 3. A
# ground chosen against trees that are not in the map is a ground chosen wrong.
TREES = [
    ("nature/trees/castle-tree-broadleaf-large.png", 3.0),
    ("nature/trees/castle-tree-broadleaf-large.png", 3.0),
    ("nature/trees/castle-tree-broadleaf-small.png", 3.0),
    ("nature/shrubs/castle-shrub-young-tree-cluster.png", 3.0),
]

# Measured, not guessed (2026-08-07):
#   canopy  hue 114  sat 0.34  val 0.45
#   grass   hue 127  sat 0.49  val 0.45   <- same brightness, MORE saturated
#
# That is the whole defect. The floor is as bright as the canopy and louder than it,
# so the trees have nothing to stand against. A forest floor has to go darker than
# the canopy, quieter than the canopy, and off pure green towards earth.
#
# These are computed live from the current tileset rather than written to disk, so
# nothing is committed until one is chosen.
CANOPY = (114.0, 0.34, 0.45)  # nature-tree-broadleaf-large, measured 2026-08-07

CANDIDATES = [
    ("humus", 74, 0.62, 0.66),
    ("leafmould", 60, 0.70, 0.60),
    ("mossdark", 96, 0.55, 0.62),
    ("peat", 46, 0.60, 0.55),
]


def tile_from(sheet: Image.Image, index: int) -> Image.Image:
    cols = sheet.width // TILE
    ty, tx = divmod(index, cols)
    return sheet.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE))


def hsv_of(tile: Image.Image) -> tuple:
    px = list(tile.convert("RGB").get_flattened_data())
    n = len(px)
    h = s = v = 0.0
    for r, g, b in px:
        hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        h += hh * 360
        s += ss
        v += vv
    return h / n, s / n, v / n


def retarget(img: Image.Image, hue: float, sat_mul: float, val_mul: float) -> Image.Image:
    """
    Push a whole tile towards a hue, scaling saturation and value.

    Hue is SET rather than rotated so the result is predictable regardless of what
    it started as; saturation and value are SCALED so the tile's internal contrast —
    the blades, speckles and shading that make it read as ground rather than a flat
    colour — survives. Setting all three absolutely produces a paint chip.
    """
    out = img.convert("RGBA")
    px = list(out.get_flattened_data())
    new = []
    for r, g, b, a in px:
        if a == 0:
            new.append((r, g, b, a))
            continue
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        rr, gg, bb = colorsys.hsv_to_rgb(hue / 360, min(1.0, s * sat_mul), min(1.0, v * val_mul))
        new.append((int(rr * 255), int(gg * 255), int(bb * 255), a))
    out.putdata(new)
    return out


def variant_label(path: str) -> str:
    base = os.path.basename(path).replace("castle-ground-grass-dirt-wang-32", "")
    return base.replace(".png", "").lstrip("-") or "current"


def font(size: int):
    for name in ("seguisb.ttf", "segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def build(out_path: str) -> None:
    live_bytes = open(LIVE, "rb").read()

    # Rows are (label, tile, live?, note).
    #
    # Deliberately NOT all eight greens. The measurement settled that question:
    # every existing variant is a saturated green between 0.31 and 0.50, and the
    # canopy is 0.34 — so all of them are as loud as or louder than the trees. Only
    # the current one and the darkest one are kept, as the reference points, and the
    # rest of the sheet is candidate forest FLOORS.
    rows = []
    for suffix, note in (("deepvivid", "the lawn today"), ("forest", "darkest green we have")):
        p = os.path.join(TILESETS, f"castle-ground-grass-dirt-wang-32-{suffix}.png")
        if not os.path.exists(p):
            continue
        is_live = open(p, "rb").read() == live_bytes
        rows.append((suffix, tile_from(Image.open(p).convert("RGBA"), GRASS_TILE), is_live, note))

    base = tile_from(Image.open(LIVE).convert("RGBA"), GRASS_TILE)
    for label, hue, sat_mul, val_mul in CANDIDATES:
        rows.append(
            (label, retarget(base, hue, sat_mul, val_mul), False, "proposed — not on disk")
        )

    # Scaled to fit the row rather than to true world size. This sheet answers a
    # COLOUR question; the scale question is answered by the hero in the map. The
    # relative sizes between the trees are preserved.
    raw = [(Image.open(os.path.join(KIT, p)).convert("RGBA"), s) for p, s in TREES]
    tallest = max(im.height * s for im, s in raw)
    fit = TREE_ROW_H / tallest
    trees = [
        im.resize((max(1, int(im.width * s * fit)), max(1, int(im.height * s * fit))), Image.NEAREST)
        for im, s in raw
    ]
    hero_sheet = Image.open(HERO).convert("RGBA")
    # Column 0 of row 0 is the south-facing idle frame.
    fw, fh = hero_sheet.width // 7, hero_sheet.height // 4
    hero = hero_sheet.crop((0, 0, fw, fh))

    # Trees laid out on their own gaps, then a clear lane for the hero. He is the
    # scale reference and must never end up behind a canopy.
    strip_w = 40 + TREE_GAP * len(TREES) + 170
    sheet_w = LABEL_W + strip_w
    sheet_h = ROW_H * len(rows) + PAD
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (16, 16, 18, 255))
    draw = ImageDraw.Draw(sheet)
    f_name, f_meta = font(17), font(13)

    for i, (name, tile, is_live, note) in enumerate(rows):
        top = i * ROW_H
        floor = top + ROW_H - 26  # the shared floor line every row stands on

        h, s, v = hsv_of(tile)
        big = tile.resize((TILE * ZOOM, TILE * ZOOM), Image.NEAREST)

        # Ground fills the row's full height so tone is judged over an area, not a
        # sliver — a strip too thin reads lighter than the same colour does in game.
        for y in range(top, top + ROW_H, big.height):
            for x in range(LABEL_W, sheet_w, big.width):
                sheet.paste(big, (x, y))

        for j, tree in enumerate(trees):
            x = LABEL_W + 40 + j * TREE_GAP
            sheet.alpha_composite(tree, (x, floor - tree.height))

        hw = int(fw * ZOOM * 0.8)
        hh = int(fh * ZOOM * 0.8)
        hero_big = hero.resize((hw, hh), Image.NEAREST)
        sheet.alpha_composite(hero_big, (LABEL_W + strip_w - 120, floor - hh))

        draw.rectangle([0, top, LABEL_W - 1, top + ROW_H - 1], fill=(16, 16, 18, 255))
        colour = (251, 191, 36) if is_live else (230, 216, 176)
        draw.text((14, top + 16), name, font=f_name, fill=colour)
        draw.text(
            (14, top + 40),
            "IN THE MAP NOW" if is_live else note,
            font=f_meta,
            fill=(251, 191, 36) if is_live else (120, 120, 126),
        )
        draw.text(
            (14, top + 68),
            f"hue {h:.0f}°\nsat {s:.2f}\nval {v:.2f}",
            font=f_meta,
            fill=(150, 150, 155),
        )
        # The measurement the whole sheet turns on: is this floor quieter and darker
        # than the canopy standing on it?
        verdict = "quieter + darker" if (s < CANOPY[1] and v < CANOPY[2]) else "louder than canopy"
        draw.text(
            (14, top + 128),
            verdict,
            font=f_meta,
            fill=(134, 200, 134) if "quieter" in verdict else (216, 120, 120),
        )
        draw.line([(0, top), (sheet_w, top)], fill=(60, 60, 66), width=1)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.convert("RGB").save(out_path)
    print(f"{len(rows)} rows -> {out_path}  ({sheet_w}x{sheet_h})")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT)
