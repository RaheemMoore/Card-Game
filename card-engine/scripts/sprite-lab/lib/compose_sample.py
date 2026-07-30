#!/usr/bin/env python3
"""
Compose the pixel-courtyard sample background from generated tiles.

Deliberately pre-composed into ONE background PNG rather than autotiled at
runtime. This is a decision artifact — its job is to answer "does a pixel
courtyard look right with our hero", not to be the production map. Building a
real autotile renderer before that question is answered would be work spent on
a direction that may be rejected.

The tileset is a 4x4 grid of 32px corner tiles; tile 15 is pure stone and tile 0
pure grass (measured, not guessed). Wall pieces come from the 56-piece building
kit.

Usage: compose_sample.py <sample_dir> <out.png>
"""
import os
import sys
from PIL import Image

TILE = 32
STONE, GRASS = 15, 0
W_TILES, H_TILES = 32, 24  # 1024 x 768


def tile_from_grid(grid: Image.Image, index: int) -> Image.Image:
    cols = grid.width // TILE
    ty, tx = divmod(index, cols)
    return grid.crop((tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE))


def main(sample_dir: str, out_path: str) -> None:
    grid = Image.open(os.path.join(sample_dir, 'ground-tiles.png')).convert('RGBA')
    stone = tile_from_grid(grid, STONE)
    grass = tile_from_grid(grid, GRASS)

    scene = Image.new('RGBA', (W_TILES * TILE, H_TILES * TILE), (0, 0, 0, 255))

    # Grass border, flagstone courtyard inside it — the walkable area.
    for ty in range(H_TILES):
        for tx in range(W_TILES):
            edge = tx < 2 or tx >= W_TILES - 2 or ty < 3 or ty >= H_TILES - 2
            scene.paste(grass if edge else stone, (tx * TILE, ty * TILE))

    # A wall run along the top. tile_1 is a straight wall segment; its pieces are
    # taller than a ground tile (52x87) because walls carry height.
    wall_path = os.path.join(sample_dir, 'wall-tile_1.png')
    if os.path.exists(wall_path):
        wall = Image.open(wall_path).convert('RGBA')
        y = TILE * 3 - wall.height + 12  # sit the wall base just inside the grass
        x = 0
        while x < scene.width:
            scene.alpha_composite(wall, (x, max(y, 0)))
            x += wall.width
    scene.save(out_path)
    print(f"{out_path}  {scene.size[0]}x{scene.size[1]}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
