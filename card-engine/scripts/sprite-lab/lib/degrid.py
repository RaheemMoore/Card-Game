#!/usr/bin/env python3
"""
Strip the painted 1px grid line from the edge of every tile in a tileset.

THE DEFECT. The halo-stone-castle ground tilesets were generated with a solid
dark frame painted around each 32x32 tile — one uniform colour, all four edges,
every tile. Measured on `castle-ground-grass-dirt-wang-32.png`: the frame sits at
luminance **34** against an interior of **~105**. Laid down as a floor that reads
as a hard black lattice over the whole courtyard, and it is the single loudest
difference between our castle and the top-down games Raheem is aiming at — those
have the same 32px module underneath and no visible grid at all. Diagnosed
2026-08-08 while comparing `/castle` against a reference screenshot.

It is baked into the art, so no camera, filter or `pixelArt` setting can remove
it. The tile has to be repaired.

WHY EDGE-REPLICATION AND NOT A REDRAW. The interior 30x30 of each tile is good
art we already paid for; only the ring is wrong. Replicating the neighbouring
interior pixel outward costs zero generations, is exactly reversible, and keeps
every wang transition intact because the frame is present on all four edges of
*every* tile in the set — including the transition tiles — so no tile is treated
differently from its neighbours.

ROWS BEFORE COLUMNS, DELIBERATELY. Doing rows first leaves the four corner pixels
still frame-coloured (row 0's own col 0 came from row 1's col 0, which is frame);
the column pass then overwrites them from the interior diagonal. Reverse the
order and you get the same result by the mirror argument, but doing only one of
the two passes leaves a dotted line of corners that is somehow worse than the
full grid, because it reads as noise instead of structure.

REFUSES TO GUESS. A tileset whose ring is not a single uniform colour is either
already fixed or was never gridded — `castle-ground-grass-paving-wang-32.png` has
21 colours in its ring because its art genuinely runs to the tile edge. Those are
skipped with a message rather than smeared, unless `--force` is passed.

Usage:
  degrid.py <in.png|dir> <out.png|dir> [--tile=32] [--ring=1]
                                       [--dry-run] [--force]
"""
import os
import sys

import numpy as np
from PIL import Image

DEFAULT_TILE = 32
DEFAULT_RING = 1


def ring_pixels(a: np.ndarray, ring: int) -> np.ndarray:
    """Every pixel within `ring` of a tile's border, as an (N, C) array."""
    h, w = a.shape[:2]
    mask = np.zeros((h, w), dtype=bool)
    mask[:ring, :] = True
    mask[-ring:, :] = True
    mask[:, :ring] = True
    mask[:, -ring:] = True
    return a[mask]


def inspect_tile(a: np.ndarray, ring: int):
    """Return (uniform, ring_rgba, interior_luma, ring_luma) for one tile."""
    edge = ring_pixels(a, ring)
    uniform = bool(np.all(edge == edge[0]))
    inner = a[ring:-ring, ring:-ring]

    def luma(p):
        p = p.astype(np.float64)
        return 0.299 * p[..., 0] + 0.587 * p[..., 1] + 0.114 * p[..., 2]

    return uniform, tuple(int(v) for v in edge[0]), float(luma(inner).mean()), float(luma(edge).mean())


def degrid_tile(a: np.ndarray, ring: int) -> np.ndarray:
    """Replicate the first interior row/column outward over the frame."""
    out = a.copy()
    for r in range(ring):
        out[r, :] = out[ring, :]
        out[-(r + 1), :] = out[-(ring + 1), :]
    for r in range(ring):
        out[:, r] = out[:, ring]
        out[:, -(r + 1)] = out[:, -(ring + 1)]
    return out


def degrid_sheet(path: str, out_path: str, tile: int, ring: int, dry_run: bool, force: bool) -> bool:
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    h, w = a.shape[:2]
    name = os.path.basename(path)

    if w % tile or h % tile:
        print(f'  SKIP {name}: {w}x{h} is not a whole number of {tile}px tiles')
        return False

    cols, rows = w // tile, h // tile
    checked = []
    for ty in range(rows):
        for tx in range(cols):
            sub = a[ty * tile:(ty + 1) * tile, tx * tile:(tx + 1) * tile]
            checked.append(inspect_tile(sub, ring))

    uniform_count = sum(1 for c in checked if c[0])
    if uniform_count < len(checked) and not force:
        print(f'  SKIP {name}: only {uniform_count}/{len(checked)} tiles have a '
              f'uniform {ring}px ring — art may run to the edge (--force to override)')
        return False

    sample = next((c for c in checked if c[0]), checked[0])
    print(f'  {name}: {cols}x{rows} tiles, ring={sample[1]} '
          f'luma {sample[3]:.0f} vs interior {sample[2]:.0f}')

    if dry_run:
        return True

    out = a.copy()
    for ty in range(rows):
        for tx in range(cols):
            y0, x0 = ty * tile, tx * tile
            out[y0:y0 + tile, x0:x0 + tile] = degrid_tile(
                a[y0:y0 + tile, x0:x0 + tile], ring)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)) or '.', exist_ok=True)
    Image.fromarray(out, 'RGBA').save(out_path)
    print(f'    -> {out_path}')
    return True


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    flags = [a for a in argv if a.startswith('--')]
    if len(args) < 2:
        print(__doc__)
        return 2

    def flag_val(name, default):
        for f in flags:
            if f.startswith(f'--{name}='):
                return int(f.split('=', 1)[1])
        return default

    tile = flag_val('tile', DEFAULT_TILE)
    ring = flag_val('ring', DEFAULT_RING)
    dry_run = '--dry-run' in flags
    force = '--force' in flags

    src, dst = args[0], args[1]
    print(f'degrid: tile={tile} ring={ring}{" (dry run)" if dry_run else ""}')

    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        names = sorted(n for n in os.listdir(src) if n.lower().endswith('.png'))
        done = sum(degrid_sheet(os.path.join(src, n), os.path.join(dst, n),
                                tile, ring, dry_run, force) for n in names)
        print(f'degrid: {done}/{len(names)} sheets processed')
    else:
        degrid_sheet(src, dst, tile, ring, dry_run, force)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
