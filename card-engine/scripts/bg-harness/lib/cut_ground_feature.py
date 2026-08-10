#!/usr/bin/env python3
"""Cut a GROUND FEATURE (pond, clearing, scorch, crater) out of its surround.

Why this is not key_white.py or cut_flat_background.py: both of those flood a
flat, pale, uniform background from the frame edge. A ground feature is not
generated on white — it is generated sitting IN terrain, because that is the only
composition this model will draw at a flat top-down angle at all (see
configs/pond.json _the_risk, and castle-grand-topdown.json _the_finding). So the
thing to remove is textured grass, and the thing to keep is everything the grass
encloses.

The method is flood-fill from the frame edge across pixels that look like the
SURROUND, not a global colour threshold:

  * A tuft of grass sitting ON the bank is an island the flood never reaches, so
    it survives — which is right, it is part of the pond.
  * A lily pad or a green shrub inside the water likewise survives.
  * A global "remove green" pass would have eaten all three.

The flood alone is not enough, though, and the first run proved it: a pebble lying
out in the open grass is ALSO an island the flood never reaches, so it survived as
a speck floating in space beside the pond. The mask is therefore reduced to its
largest connected component. That single rule separates the two cases correctly —
a tuft on the bank is attached to the bank and stays, a pebble in the grass is
detached and goes — where a size threshold would have had to guess.

The surround colour is sampled from the frame border itself rather than passed
in, so a dusk plate or a dirt clearing needs no new flag.

    python lib/cut_ground_feature.py <in.png> <out.png>
           [--tolerance 42] [--close 2] [--report]

--report prints the kept footprint and the flatness of the result, which is the
number that decides whether a redraw actually produced pixel art (real kit art
runs ~59%; a downsampled painting runs ~1%).
"""
import argparse
from collections import deque

from PIL import Image, ImageFilter


def flatness(img):
    """Share of 4-neighbour pairs that are EXACTLY equal, over opaque pixels.

    The measure CLAUDE.md records for telling real pixel art from a shrunk
    painting. Transparent pixels are excluded so a large cut-away margin cannot
    inflate the score to meaninglessness.
    """
    a = img.convert("RGBA")
    w, h = a.size
    p = a.load()
    same = total = 0
    for y in range(h):
        for x in range(w):
            if p[x, y][3] < 128:
                continue
            for dx, dy in ((1, 0), (0, 1)):
                nx, ny = x + dx, y + dy
                if nx >= w or ny >= h or p[nx, ny][3] < 128:
                    continue
                total += 1
                if p[x, y][:3] == p[nx, ny][:3]:
                    same += 1
    return 100.0 * same / total if total else 0.0


def border_colours(img, step=3):
    seen = {}
    w, h = img.size
    p = img.load()
    for x in range(0, w, step):
        for y in (0, h - 1):
            seen[p[x, y][:3]] = seen.get(p[x, y][:3], 0) + 1
    for y in range(0, h, step):
        for x in (0, w - 1):
            seen[p[x, y][:3]] = seen.get(p[x, y][:3], 0) + 1
    # Keep the colours that actually make up the border, not every stray pebble
    # that happens to touch it.
    ranked = sorted(seen.items(), key=lambda kv: -kv[1])
    cut = max(2, len(ranked) // 3)
    return [c for c, _ in ranked[:cut]]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--tolerance", type=int, default=42,
                    help="how far a pixel may sit from a border colour and still count as surround")
    ap.add_argument("--close", type=int, default=2,
                    help="morphological close passes on the kept mask, to bridge speckled bank edges")
    ap.add_argument("--keep-debris", action="store_true",
                    help="skip the largest-component reduction, keeping every detached speck")
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()

    img = Image.open(a.src).convert("RGB")
    w, h = img.size
    p = img.load()
    refs = border_colours(img)
    tol2 = a.tolerance * a.tolerance

    def is_surround(c):
        for r in refs:
            d = (c[0] - r[0]) ** 2 + (c[1] - r[1]) ** 2 + (c[2] - r[2]) ** 2
            if d <= tol2:
                return True
        return False

    # Flood the surround inward from every frame edge pixel.
    out = [[False] * w for _ in range(h)]  # True == surround, to be cut
    q = deque()

    def push(x, y):
        if 0 <= x < w and 0 <= y < h and not out[y][x] and is_surround(p[x, y]):
            out[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    keep = Image.new("L", (w, h), 0)
    kp = keep.load()
    for y in range(h):
        for x in range(w):
            if not out[y][x]:
                kp[x, y] = 255
    for _ in range(a.close):
        keep = keep.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))

    if not a.keep_debris:
        kp = keep.load()
        best, seen = None, [[False] * w for _ in range(h)]
        for sy in range(h):
            for sx in range(w):
                if kp[sx, sy] == 0 or seen[sy][sx]:
                    continue
                comp, dq = [], deque([(sx, sy)])
                seen[sy][sx] = True
                while dq:
                    x, y = dq.popleft()
                    comp.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and kp[nx, ny]:
                            seen[ny][nx] = True
                            dq.append((nx, ny))
                if best is None or len(comp) > len(best):
                    best = comp
        dropped = Image.new("L", (w, h), 0)
        dp = dropped.load()
        for x, y in best:
            dp[x, y] = 255
        keep = dropped

    res = img.convert("RGBA")
    res.putalpha(keep)
    bbox = res.getbbox()
    res = res.crop(bbox)
    res.save(a.dst)

    print(f"{a.src} {w}x{h} -> {a.dst} {res.width}x{res.height}  (cut box {bbox})")
    if a.report:
        kept = sum(1 for y in range(res.height) for x in range(res.width) if res.load()[x, y][3] > 127)
        print(f"   kept {kept} px ({100 * kept / (res.width * res.height):.0f}% of its own box)")
        print(f"   flatness {flatness(res):.1f}%   (kit art ~59%, downsampled painting ~1%)")


if __name__ == "__main__":
    main()
