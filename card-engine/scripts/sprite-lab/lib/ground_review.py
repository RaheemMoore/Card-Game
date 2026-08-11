#!/usr/bin/env python3
"""
Compose ground-scatter candidates onto the REAL courtyard ground, at game scale.

WHY THIS EXISTS. Six ground assets — four overlays, a rock cluster, a shrub
cluster — sat at `HUMAN REVIEW` in the kit manifest for weeks, which correctly
kept them out of `asset-pack.json` and therefore out of the game. Nobody could
clear them because the only way to look at them was to open six PNGs on a
transparent checkerboard, where the one question that matters is unanswerable:
*does this read against our grass, at the size a player sees it, next to our
hero?* A prop that looks good at 4x on a checkerboard routinely disappears at
1x on grass.

WHAT IT ANSWERS, AND ONLY IT. Three things a file browser cannot:

1. **Contrast against the real floor.** The ground is tiled from the shipped
   wang tileset, so an asset is judged against the exact pixels it will sit on.
2. **Size against the hero.** The hero is drawn from his shipped sheet at his
   shipped world height, so "too big" and "too small" are observations rather
   than guesses.
3. **Scatter density.** A single prop on a field says nothing about whether ten
   of them fix a flat lawn. The right-hand panel lays them down at real spacing.

GAME SCALE IS NOT NATIVE SCALE. Everything is drawn at `--zoom` (default 1.5,
the courtyard camera's zoom as of 2026-08-08), because native size is the scale
at which every asset looks fine. Nearest-neighbour throughout — smoothing here
would flatter the art and defeat the point.

Usage:
  ground_review.py <out.png> --tileset <grass.png> [--zoom 1.5] [--tile 32]
                   [--hero <sheet.png>:<meta.json>]
                   [--prop <label>=<file.png>]...
                   [--overlay <label>=<file.png>]...
"""
import json
import os
import random
import sys

from PIL import Image, ImageDraw

NEAREST = Image.NEAREST
LABEL_H = 22
PAD = 16
BG = (24, 26, 22, 255)
INK = (232, 230, 220, 255)
DIM = (150, 148, 138, 255)


def field_cell(tileset: Image.Image, tile: int, index: int | None) -> Image.Image:
    """The cell of a wang grid that is a single terrain all the way across.

    Low colour count is NOT the test — a transition cell can be as flat as a
    field cell and this harness rendered a grass/dirt checkerboard the first time
    on exactly that mistake. A field cell is defined by its QUADRANTS agreeing:
    split it in four, and if all four have near-identical mean colour it is one
    terrain, whereas any corner-wang transition has at least one quadrant that
    differs by construction.

    Ties are broken toward green, because the courtyard's field is grass and its
    dirt is the path cut through it. `--tile-index` overrides all of this for a
    set that does not follow the convention.
    """
    cols, rows = tileset.width // tile, tileset.height // tile
    if index is not None:
        ty, tx = divmod(index, cols)
        return tileset.crop((tx * tile, ty * tile, (tx + 1) * tile, (ty + 1) * tile))

    best, best_score = None, None
    half = tile // 2
    for ty in range(rows):
        for tx in range(cols):
            c = tileset.crop((tx * tile, ty * tile, (tx + 1) * tile, (ty + 1) * tile))
            rgb = c.convert('RGB')
            quads = [
                rgb.crop((0, 0, half, half)), rgb.crop((half, 0, tile, half)),
                rgb.crop((0, half, half, tile)), rgb.crop((half, half, tile, tile)),
            ]
            means = [tuple(sum(ch) / len(ch) for ch in zip(*q.getdata())) for q in quads]
            spread = max(
                sum((a - b) ** 2 for a, b in zip(m1, m2)) ** 0.5
                for m1 in means for m2 in means
            )
            greenness = -(means[0][1] - (means[0][0] + means[0][2]) / 2)
            score = (round(spread), greenness)
            if best_score is None or score < best_score:
                best, best_score = c, score
    return best


def tile_ground(cell: Image.Image, tile: int, w: int, h: int) -> Image.Image:
    """Fill w x h px by repeating one field cell — what the courtyard floor is."""
    out = Image.new('RGBA', (w, h))
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            out.paste(cell, (x, y))
    return out


def hero_frame(sheet_path: str, meta_path: str) -> Image.Image:
    meta = json.load(open(meta_path))
    fw, fh, cols = meta['frameWidth'], meta['frameHeight'], meta['columns']
    sheet = Image.open(sheet_path).convert('RGBA')
    return sheet.crop((0, 0, fw, fh))


def scaled(im: Image.Image, factor: float) -> Image.Image:
    return im.resize((max(1, round(im.width * factor)), max(1, round(im.height * factor))), NEAREST)


def label(draw: ImageDraw.ImageDraw, xy, text, colour=INK):
    draw.text(xy, text, fill=colour)


def build(out_path, tileset_path, props, overlays, hero, zoom, tile, tile_index):
    grass = Image.open(tileset_path).convert('RGBA')
    cell = field_cell(grass, tile, tile_index)
    tile_px = round(tile * zoom)

    def ground(w_px: int, h_px: int) -> Image.Image:
        """Ground at GAME scale: tile at native, scale once, then trim to size."""
        native = tile_ground(cell, tile, round(w_px / zoom) + tile, round(h_px / zoom) + tile)
        return scaled(native, zoom).crop((0, 0, w_px, h_px))

    hero_im = None
    if hero:
        sheet, meta = hero.split(':', 1)
        hero_im = scaled(hero_frame(sheet, meta), (100 / json.load(open(meta))['frameHeight']) * zoom)

    # ---- panel A: each prop on ground, beside the hero, at game scale --------
    items = [(lab, scaled(Image.open(p).convert('RGBA'), zoom)) for lab, p in props]
    strip_h = max([i.height for _, i in items] + [hero_im.height if hero_im else 0]) + PAD * 2
    strip_w = PAD + (hero_im.width + PAD if hero_im else 0) + sum(i.width + PAD for _, i in items)
    strip_w = max(strip_w, 640)

    panel_a = ground(strip_w, strip_h)
    floor = strip_h - PAD
    x = PAD
    marks = []
    if hero_im:
        panel_a.paste(hero_im, (x, floor - hero_im.height), hero_im)
        marks.append(('hero  100px', x, hero_im.width))
        x += hero_im.width + PAD
    for lab, im in items:
        panel_a.paste(im, (x, floor - im.height), im)
        marks.append((f'{lab}  {round(im.width / zoom)}x{round(im.height / zoom)}px', x, im.width))
        x += im.width + PAD

    # ---- panel B: scatter density, with and without ------------------------
    sw, sh = 640, 400
    bare = ground(sw, sh)
    dressed = bare.copy()
    rnd = random.Random(11)
    all_scatter = [scaled(Image.open(p).convert('RGBA'), zoom) for _, p in props + overlays]
    if all_scatter:
        for _ in range(26):
            im = rnd.choice(all_scatter)
            px = rnd.randrange(-im.width // 3, sw - im.width // 2)
            py = rnd.randrange(-im.height // 3, sh - im.height // 2)
            dressed.alpha_composite(im, (max(0, px), max(0, py)))

    # ---- assemble ----------------------------------------------------------
    W = max(panel_a.width, bare.width + dressed.width + PAD) + PAD * 2
    H = LABEL_H + panel_a.height + PAD + LABEL_H + max(bare.height, dressed.height) + PAD * 2 + LABEL_H
    canvas = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(canvas)

    y = PAD
    label(d, (PAD, y), f'AT GAME SCALE (zoom {zoom}) ON THE SHIPPED GROUND — {tile_px}px tiles')
    y += LABEL_H
    canvas.paste(panel_a, (PAD, y), panel_a)
    for text, mx, _ in marks:
        label(d, (PAD + mx, y + panel_a.height + 2), text, DIM)
    y += panel_a.height + PAD + LABEL_H

    label(d, (PAD, y - LABEL_H + 4), 'SCATTER DENSITY — bare ground (left) vs dressed (right)')
    canvas.paste(bare, (PAD, y), bare)
    canvas.paste(dressed, (PAD + bare.width + PAD, y), dressed)

    canvas.convert('RGB').save(out_path)
    print(f'wrote {out_path}  {canvas.width}x{canvas.height}')


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    out = argv[0]
    tileset = hero = tile_index = None
    tile = 32
    zoom = 1.5
    props, overlays = [], []
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == '--tileset':
            tileset = argv[i + 1]; i += 2
        elif a == '--zoom':
            zoom = float(argv[i + 1]); i += 2
        elif a == '--tile':
            tile = int(argv[i + 1]); i += 2
        elif a == '--tile-index':
            tile_index = int(argv[i + 1]); i += 2
        elif a == '--hero':
            hero = argv[i + 1]; i += 2
        elif a == '--prop':
            lab, path = argv[i + 1].split('=', 1); props.append((lab, path)); i += 2
        elif a == '--overlay':
            lab, path = argv[i + 1].split('=', 1); overlays.append((lab, path)); i += 2
        else:
            raise SystemExit(f'unknown flag {a}')
    if not tileset:
        raise SystemExit('--tileset is required')
    build(out, tileset, props, overlays, hero, zoom, tile, tile_index)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
