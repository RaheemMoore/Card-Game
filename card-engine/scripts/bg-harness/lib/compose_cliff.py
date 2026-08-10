#!/usr/bin/env python3
"""Paint a cliff plateau from an ASCII map, the way an autotiler does.

THE LESSON THIS EXISTS TO TEACH. The old cliffs were big fixed sprites that got
stretched to length — so a cliff could only ever be a straight bar, and every
corner was a stair-step. A connectable kit inverts that: you do not place cliff
PIECES, you paint a REGION, and each cell then asks its four neighbours "are you
plateau or air?" and picks its own tile. Shape becomes free. Corners, inlets,
peninsulas and lone pillars all fall out of the same 56 tiles.

    python lib/compose_cliff.py <kit-dir> <map.txt> <out.png> [--tile 32]

The map is plain text, '#' for plateau and '.' for lower ground:

    ..........
    ..######..
    ..##..##..
    ..######..
    ..........

THE RULE EACH CELL FOLLOWS, which is the whole autotiler:

  count how many of N/E/S/W are OUTSIDE the region
    0  and every diagonal inside  -> floor
    0  but a diagonal is outside  -> outer_corners-<that diagonal>   (a concave nook)
    1                             -> sides-<the open direction>
    2 adjacent                    -> corners-<those two>             (a convex corner)
    2 opposite                    -> outer_multi-NS or -EW           (a ridge)
    3                             -> outer_multi-<the three>
    4                             -> outer_multi-NESW                (a lone pillar)

WHY THE TILES OVERLAP. Each is 52x111 for a 32px cell: the extra width is the
shoulder that laps over its neighbour, and the extra height is the 3-tile wall
hanging below. They are drawn back-to-front, north row first, so a nearer row's
wall correctly covers the row behind it. Drawn on their own width instead of the
cell size, the kit would look broken when it is not.
"""
import argparse
import json
import os

from PIL import Image

DIRS = {"N": (0, -1), "E": (1, 0), "S": (0, 1), "W": (-1, 0)}
DIAGS = {"NE": (1, -1), "SE": (1, 1), "SW": (-1, 1), "NW": (-1, -1)}


def load_kit(d):
    tiles, roles = {}, {}
    for f in sorted(os.listdir(d)):
        if f.endswith(".png"):
            role = f[3:-4]
            roles[role] = Image.open(os.path.join(d, f)).convert("RGBA")
    return roles


def pick(role_for, inside, x, y):
    """Which tile this cell wants. Returns a role name."""
    open_dirs = [d for d, (dx, dy) in DIRS.items() if not inside(x + dx, y + dy)]
    n = len(open_dirs)

    if n == 4:
        return "outer_multi-NESW"
    if n == 3:
        return "outer_multi-" + "".join(d for d in "NESW" if d in open_dirs)
    if n == 2:
        a, b = sorted(open_dirs, key="NESW".index)
        if {a, b} in ({"N", "S"}, {"E", "W"}):
            return f"outer_multi-{a}{b}"
        # Adjacent pair = a convex corner. The kit names them NE/SE/SW/NW.
        for name in ("NE", "SE", "SW", "NW"):
            if set(name) == {a, b}:
                return f"corners-{name}"
    if n == 1:
        return f"sides-{open_dirs[0]}"

    # Fully surrounded orthogonally, but a diagonal may still be missing — that
    # is a concave nook, and it is what `outer_corners-*` are for. Without this
    # branch an L-shaped plateau gets a square notch instead of a turned corner.
    for name, (dx, dy) in DIAGS.items():
        if not inside(x + dx, y + dy):
            return f"outer_corners-{name}"
    return "floor"


def compose(kit_dir, grid, tile=32, bg=None, stride_y=24):
    """stride_y comes from tile_rules.stack_stride_px, and it is not `tile`.

    The grid is 32 wide but only 24 TALL on screen: at this view angle a square
    ground cell foreshortens, which is exactly the depth that makes it read as
    top-down rather than flat. Spacing rows by 32 leaves gaps between them and
    makes a perfectly good kit look broken.

    Every tile is aligned by the FLOOR tile's own content box (x10, y79 in the
    52x111 canvas) rather than by canvas corners, because each tile parks its art
    at a different offset — the floor is a small patch low-left, sides-N is a
    tall strip near the top. Aligning canvases instead of cells scatters them.
    """
    roles = load_kit(kit_dir)
    h, w = len(grid), max(len(r) for r in grid)
    inside = lambda x, y: 0 <= x < w and 0 <= y < h and x < len(grid[y]) and grid[y][x] == "#"  # noqa: E731

    import numpy as _np
    fa = _np.asarray(roles["floor"])
    fys, fxs = _np.where(fa[:, :, 3] > 0)
    ax, ay = int(fxs.min()), int(fys.min())          # the cell's anchor inside a tile

    any_tile = roles["floor"]
    W = w * tile + (any_tile.width - tile) + 8
    H = h * stride_y + any_tile.height + 8

    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if bg is not None:
        canvas = Image.new("RGBA", (W, H), bg)

    missing = set()
    # North row first: a nearer row's hanging wall must draw OVER the row behind.
    for y in range(h):
        for x in range(w):
            if not inside(x, y):
                continue
            role = pick(roles, inside, x, y)
            im = roles.get(role)
            if im is None:
                missing.add(role)
                im = roles.get("floor")
            canvas.alpha_composite(im, (x * tile - ax + 4, y * stride_y - ay + 4))
    if missing:
        print("  no tile for:", ", ".join(sorted(missing)))
    return canvas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("kit")
    ap.add_argument("map")
    ap.add_argument("out")
    ap.add_argument("--tile", type=int, default=32)
    a = ap.parse_args()
    grid = [l.rstrip("\n") for l in open(a.map, encoding="utf-8") if l.strip()]
    im = compose(a.kit, grid, a.tile)
    im.save(a.out)
    print(f"{len(grid[0])}x{len(grid)} cells -> {im.width}x{im.height}  {a.out}")


if __name__ == "__main__":
    main()
