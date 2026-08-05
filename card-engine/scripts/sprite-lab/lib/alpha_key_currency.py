"""
Alpha-key backgrounds from the currency PNGs while preserving internal shadows.

Approach: brightness-based floodfill from the image edges. Only pixels
reachable from the border AND darker than `bg_threshold` get alpha-out.
Internal dark facets on the crystal are unreachable from the border (they're
surrounded by brighter crystal pixels), so they stay opaque.

For the coin, the outer black doesn't wrap into any interior — the coin fills
the frame — so a simple flood works there too.
"""

from PIL import Image
from collections import deque
import os

ROOT = "/Users/rdmoore/Claude Projects/Card Game/card-engine/public/assets/economy"


def luminance(r: int, g: int, b: int) -> int:
    return (299 * r + 587 * g + 114 * b) // 1000


def clean_by_floodfill(
    src_path: str,
    out_path: str,
    hard_threshold: int = 40,   # any bg pixel this dark → alpha 0
    soft_threshold: int = 90,   # bg pixels up to this → partial alpha (soft edge)
) -> None:
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # 1. Mark seed set: border pixels darker than soft_threshold
    visited = [[False] * w for _ in range(h)]
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if luminance(r, g, b) < soft_threshold:
                visited[y][x] = True
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if luminance(r, g, b) < soft_threshold:
                visited[y][x] = True
                queue.append((x, y))

    # 2. Flood fill through connected dark pixels
    while queue:
        x, y = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if luminance(r, g, b) < soft_threshold:
                    visited[ny][nx] = True
                    queue.append((nx, ny))

    # 3. Apply alpha: hard cutoff below hard_threshold; ramped between the two
    changed = 0
    ramp = max(1, soft_threshold - hard_threshold)
    for y in range(h):
        for x in range(w):
            if not visited[y][x]:
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = luminance(r, g, b)
            if lum <= hard_threshold:
                new_alpha = 0
            else:
                # 0 at hard_threshold → up to 255 at soft_threshold
                new_alpha = int(((lum - hard_threshold) / ramp) * 255)
            if new_alpha < a:
                px[x, y] = (r, g, b, new_alpha)
                changed += 1

    img.save(out_path, "PNG")
    print(f"{os.path.basename(src_path)}: {changed} pixels alpha-adjusted")


for name in ("crystal-premium.png", "coin-gold.png"):
    path = os.path.join(ROOT, name)
    clean_by_floodfill(path, path)
