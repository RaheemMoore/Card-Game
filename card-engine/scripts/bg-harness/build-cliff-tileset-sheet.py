#!/usr/bin/env python3
"""Review sheet for castle-cliff-rock-wang-32 — the tiles, the shapes, the palette.

Three bands, because three different questions get asked about a tileset and a
picture of the raw 128x128 answers none of them:

  1. THE SHEET, 4x AND LABELLED. Which cell is which index, and what the four
     corner bits mean. This is the band you check a packing against.
  2. WHAT IT PAINTS. The same set run over a maze region. A tileset is only ever
     judged by the shapes it makes, not by its tiles — a set can look fine cell
     by cell and still stair-step every corner.
  3. THE PALETTE. All 47 swatches at the size you actually click them, because
     the point of indexing was hand-editing and a palette you cannot see is not
     a palette you can use.

    python scripts/bg-harness/build-cliff-tileset-sheet.py
"""
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
TSDIR = os.path.join(ROOT, "public", "assets", "kits", "halo-stone-castle", "ground", "tilesets")
SHEET = os.path.join(TSDIR, "castle-cliff-rock-wang-32.png")

BG = (26, 24, 30)
INK = (232, 226, 214)
DIM = (140, 132, 122)

MAZE = [
    "..........................",
    "..####.....####....####...",
    "..####.....#..#....#......",
    "..####.....#..#....#......",
    "..##.......#..######......",
    "..##.......#..............",
    "..##.#####.#####..####....",
    "..##.#...#.....#..#..#....",
    ".....#...#######..#..#....",
    ".....#............####....",
    "..........................",
]


def band_sheet(sheet, scale=4):
    """The 16 cells, blown up, each labelled with its index and corner bits."""
    t = 32 * scale
    pad, gap, top = 18, 10, 26
    w = pad * 2 + 4 * t + 3 * gap
    h = top + 4 * (t + top) + pad
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    for i in range(16):
        r, c = divmod(i, 4)
        x = pad + c * (t + gap)
        y = top + r * (t + top)
        cell = sheet.crop(((i % 4) * 32, (i // 4) * 32, (i % 4) * 32 + 32, (i // 4) * 32 + 32))
        im.paste(cell.resize((t, t), Image.NEAREST), (x, y))
        d.rectangle([x - 1, y - 1, x + t, y + t], outline=(70, 66, 62))
        bits = f"{i:04b}"
        d.text((x, y - 16), f"{i:2d}", fill=INK)
        d.text((x + 26, y - 16), f"TL{bits[0]} TR{bits[1]} BL{bits[2]} BR{bits[3]}", fill=DIM)
    return im


def band_maze(sheet, scale=3):
    """The set painted over a region — corners coloured, tiles chosen for you."""
    up = lambda x, y: (0 <= y < len(MAZE) and 0 <= x < len(MAZE[y]) and MAZE[y][x] == "#")  # noqa: E731
    cw, ch = len(MAZE[0]) - 1, len(MAZE) - 1
    out = Image.new("RGB", (cw * 32, ch * 32), BG)
    for y in range(ch):
        for x in range(cw):
            i = up(x, y) * 8 + up(x + 1, y) * 4 + up(x, y + 1) * 2 + up(x + 1, y + 1) * 1
            out.paste(sheet.crop(((i % 4) * 32, (i // 4) * 32, (i % 4) * 32 + 32, (i // 4) * 32 + 32)),
                      (x * 32, y * 32))
    return out.resize((out.width * scale // 2, out.height * scale // 2), Image.NEAREST)


def band_palette(sw=34, cols=16):
    hexes = [l.strip() for l in open(os.path.join(TSDIR, "castle-cliff-rock.hex"), encoding="utf-8") if l.strip()]
    rows = (len(hexes) + cols - 1) // cols
    im = Image.new("RGB", (cols * sw + 20, rows * sw + 34), BG)
    d = ImageDraw.Draw(im)
    d.text((10, 8), f"castle-cliff-rock.gpl — {len(hexes)} swatches + index 0 transparent", fill=INK)
    for i, hx in enumerate(hexes):
        r, c = divmod(i, cols)
        x, y = 10 + c * sw, 26 + r * sw
        d.rectangle([x, y, x + sw - 4, y + sw - 4], fill=tuple(int(hx[j:j + 2], 16) for j in (0, 2, 4)),
                    outline=(70, 66, 62))
    return im


def main():
    sheet = Image.open(SHEET).convert("RGB")
    bands = [("the 16 tiles — index and corner bits", band_sheet(sheet)),
             ("what it paints — corners marked, tiles chosen automatically", band_maze(sheet)),
             ("the palette — edit one swatch, every tile using it repaints", band_palette())]

    pad, hdr = 24, 30
    w = max(b.width for _, b in bands) + pad * 2
    h = 46 + sum(b.height + hdr + pad for _, b in bands)
    out = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(out)
    d.text((pad, 16), "castle-cliff-rock-wang-32  —  32px corner-wang cliff plateau", fill=INK)
    y = 46
    for title, b in bands:
        d.text((pad, y + 8), title, fill=DIM)
        out.paste(b, (pad, y + hdr))
        y += hdr + b.height + pad
    dst = os.path.join(TSDIR, "castle-cliff-rock-wang-32.SHEET.png")
    out.save(dst)
    print(f"{dst}  {out.width}x{out.height}")


if __name__ == "__main__":
    main()
